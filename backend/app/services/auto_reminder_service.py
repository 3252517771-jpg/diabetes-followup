from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.followup import FollowupPlan, FollowupStage, StageTask
from app.models.glucose import BloodGlucoseRecord
from app.models.notification import NotificationLog
from app.models.patient import Patient
from app.models.user import User
from app.services.notification_service import NotificationService
from app.services.push_service import PushService


@dataclass
class ReminderRunSummary:
    glucose_due: int = 0
    glucose_sent: int = 0
    followup_due: int = 0
    followup_sent: int = 0

    def to_dict(self) -> dict[str, int]:
        return {
            "glucose_due": self.glucose_due,
            "glucose_sent": self.glucose_sent,
            "followup_due": self.followup_due,
            "followup_sent": self.followup_sent,
        }


class AutoReminderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.push_service = PushService()
        self.notification_service = NotificationService(db, self._system_user())

    async def run(self, *, run_date: date | None = None) -> ReminderRunSummary:
        target_date = run_date or date.today()
        summary = ReminderRunSummary()
        self.db.expire_all()
        patients = await self._list_auto_push_patients()

        for patient in patients:
            if await self._should_send_glucose_reminder(patient, target_date):
                summary.glucose_due += 1
                sent = await self._send_glucose_reminder(patient, target_date)
                summary.glucose_sent += int(sent)

            if await self._should_send_followup_reminder(patient, target_date):
                summary.followup_due += 1
                sent = await self._send_followup_reminder(patient, target_date)
                summary.followup_sent += int(sent)

        await self.db.commit()
        return summary

    async def _list_auto_push_patients(self) -> list[Patient]:
        result = await self.db.execute(
            select(Patient).where(Patient.auto_push_enabled.is_(True)).order_by(Patient.id.asc())
        )
        return list(result.scalars().all())

    async def _should_send_glucose_reminder(self, patient: Patient, target_date: date) -> bool:
        start = datetime.combine(target_date, time.min)
        end = datetime.combine(target_date, time.max)

        existing_record = await self.db.scalar(
            select(BloodGlucoseRecord.id).where(
                BloodGlucoseRecord.patient_id == patient.id,
                BloodGlucoseRecord.measure_time >= start,
                BloodGlucoseRecord.measure_time <= end,
            )
        )
        if existing_record is not None:
            return False
        return not await self._already_sent(patient.id, "glucose_daily_reminder", target_date)

    async def _should_send_followup_reminder(self, patient: Patient, target_date: date) -> bool:
        active_plans = list(
            (
                await self.db.execute(
                    select(FollowupPlan).where(
                        FollowupPlan.patient_id == patient.id,
                        FollowupPlan.status == "active",
                        FollowupPlan.start_date <= target_date,
                        or_(FollowupPlan.end_date.is_(None), FollowupPlan.end_date >= target_date),
                    )
                )
            ).scalars().all()
        )
        if not active_plans:
            return False

        if await self._already_sent(patient.id, "followup_task_reminder", target_date):
            return False

        for plan in active_plans:
            stage = await self._resolve_current_stage(plan, target_date)
            if stage is None:
                continue

            tasks = list(
                (
                    await self.db.execute(
                        select(StageTask).where(
                            StageTask.stage_id == stage.id,
                            StageTask.executor == "patient",
                        )
                    )
                ).scalars().all()
            )
            if tasks:
                return True
        return False

    async def _resolve_current_stage(self, plan: FollowupPlan, target_date: date) -> FollowupStage | None:
        elapsed_days = max((target_date - plan.start_date).days, 0)
        stages = list(
            (
                await self.db.execute(
                    select(FollowupStage)
                    .where(FollowupStage.template_id == plan.template_id)
                    .order_by(FollowupStage.stage_order.asc())
                )
            ).scalars().all()
        )
        for stage in stages:
            start_offset = stage.start_day_offset
            end_offset = start_offset + stage.duration_days
            if start_offset <= elapsed_days < end_offset:
                return stage
        return stages[-1] if stages else None

    async def _send_glucose_reminder(self, patient: Patient, target_date: date) -> bool:
        title = f"血糖录入提醒：{patient.name}"
        body = (
            f"{patient.name}，今天还没有血糖记录。\n"
            "请在今日完成至少 1 次血糖录入，方便医生跟踪变化。"
        )
        return await self._push_and_log(
            patient=patient,
            title=title,
            body=body,
            notification_type="glucose_daily_reminder",
        )

    async def _send_followup_reminder(self, patient: Patient, target_date: date) -> bool:
        title = f"随访任务提醒：{patient.name}"
        body = (
            f"{patient.name}，今天有待完成的随访任务。\n"
            "请根据计划完成血糖记录或其他随访事项。"
        )
        return await self._push_and_log(
            patient=patient,
            title=title,
            body=body,
            notification_type="followup_task_reminder",
        )

    async def _push_and_log(
        self,
        *,
        patient: Patient,
        title: str,
        body: str,
        notification_type: str,
    ) -> bool:
        send_key = patient.server_chan_key or self.settings.server_chan_key
        success, fail_reason = await self.push_service.send_server_chan(send_key, title, body)
        await self.notification_service.create_patient_push_log(
            patient_id=patient.id,
            title=title,
            body=body,
            success=success,
            notification_type=notification_type,
            fail_reason=fail_reason,
        )
        return success

    async def _already_sent(self, patient_id: int, notification_type: str, target_date: date) -> bool:
        result = await self.db.execute(
            select(NotificationLog).where(
                NotificationLog.recipient_type == "patient",
                NotificationLog.recipient_id == patient_id,
                NotificationLog.content_sent.contains(notification_type),
            )
        )
        for item in result.scalars().all():
            if item.sent_at and item.sent_at.date() == target_date:
                return True
        return False

    def _system_user(self) -> User:
        user = User(
            username="system",
            password_hash="",
            real_name="System",
            phone=None,
            department="system",
            status=1,
        )
        user.id = 0
        user.role_codes = ["admin"]
        return user
