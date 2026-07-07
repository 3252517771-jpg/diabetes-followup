from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diet import DietRecommendation
from app.models.followup import FollowupPlan
from app.models.glucose import BloodGlucoseRecord
from app.models.notification import NotificationLog
from app.models.patient import Patient
from app.models.user import User
from app.schemas.dashboard import (
    DashboardDistributionItem,
    DashboardGlucoseTrend,
    DashboardPatientOverview,
    DashboardPendingItem,
    DashboardStats,
    DashboardTrendPoint,
)


class DashboardService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    async def get_stats(self) -> DashboardStats:
        patients = await self._accessible_patients()
        patient_ids = [patient.id for patient in patients]
        records = await self._recent_glucose_records(patient_ids, days=30)
        compliance_rate = round(
            (sum(1 for record in records if not record.is_abnormal) / len(records) * 100) if records else 0.0,
            2,
        )
        following_count = sum(1 for patient in patients if patient.status == "following")
        pending_items = await self._pending_counts(patient_ids)
        return DashboardStats(
            patient_count=len(patients),
            following_count=following_count,
            compliance_rate=compliance_rate,
            todo_count=sum(pending_items.values()),
        )

    async def get_glucose_trend(self, days: int) -> DashboardGlucoseTrend:
        patients = await self._accessible_patients()
        patient_ids = [patient.id for patient in patients]
        records = await self._recent_glucose_records(patient_ids, days=days)
        grouped: dict[tuple[date, str], list[float]] = defaultdict(list)
        for record in records:
            grouped[(record.measure_time.date(), record.category)].append(float(record.value))

        today = date.today()
        points = []
        for offset in reversed(range(days)):
            current = today - timedelta(days=offset)
            fasting_values = grouped.get((current, "fasting"), [])
            post_values = grouped.get((current, "postprandial"), [])
            points.append(
                DashboardTrendPoint(
                    date=current.isoformat(),
                    fasting_avg=round(sum(fasting_values) / len(fasting_values), 2) if fasting_values else None,
                    postprandial_avg=round(sum(post_values) / len(post_values), 2) if post_values else None,
                )
            )
        return DashboardGlucoseTrend(days=days, points=points)

    async def get_patient_distribution(self) -> DashboardPatientOverview:
        patients = await self._accessible_patients()
        patient_ids = [patient.id for patient in patients]
        status_counts = Counter(patient.status for patient in patients)
        pending_counts = await self._pending_counts(patient_ids)

        return DashboardPatientOverview(
            status_distribution=[
                DashboardDistributionItem(status=status, count=count)
                for status, count in sorted(status_counts.items(), key=lambda item: item[0])
            ],
            pending_items=[
                DashboardPendingItem(key=key, label=label, count=count)
                for key, label, count in [
                    ("diet_pending", "待审核推荐", pending_counts["diet_pending"]),
                    ("followup_overdue", "逾期随访", pending_counts["followup_overdue"]),
                    ("patient_unread", "患者未读通知", pending_counts["patient_unread"]),
                ]
            ],
        )

    async def _accessible_patients(self) -> list[Patient]:
        roles = set(self.current_user.__dict__.get("role_codes", []))
        query = select(Patient)
        if "admin" not in roles and "chief" not in roles and "department_head" not in roles:
            query = query.where(Patient.responsible_doctor_id == self.current_user.id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _recent_glucose_records(self, patient_ids: list[int], *, days: int) -> list[BloodGlucoseRecord]:
        if not patient_ids:
            return []
        start_time = datetime.combine(date.today() - timedelta(days=days - 1), time.min)
        result = await self.db.execute(
            select(BloodGlucoseRecord).where(
                BloodGlucoseRecord.patient_id.in_(patient_ids),
                BloodGlucoseRecord.measure_time >= start_time,
            )
        )
        return list(result.scalars().all())

    async def _pending_counts(self, patient_ids: list[int]) -> dict[str, int]:
        if not patient_ids:
            return {"diet_pending": 0, "followup_overdue": 0, "patient_unread": 0}

        diet_query = select(DietRecommendation).where(
            DietRecommendation.patient_id.in_(patient_ids),
            DietRecommendation.review_status == "pending",
        )
        followup_query = select(FollowupPlan).where(
            FollowupPlan.patient_id.in_(patient_ids),
            FollowupPlan.status == "active",
            FollowupPlan.end_date.is_not(None),
            FollowupPlan.end_date < date.today(),
        )
        patient_notification_query = select(NotificationLog).where(
            NotificationLog.recipient_type == "patient",
            NotificationLog.recipient_id.in_(patient_ids),
            NotificationLog.status.in_(["unread", "failed"]),
        )

        diet_result = await self.db.execute(diet_query)
        followup_result = await self.db.execute(followup_query)
        notification_result = await self.db.execute(patient_notification_query)
        return {
            "diet_pending": len(list(diet_result.scalars().all())),
            "followup_overdue": len(list(followup_result.scalars().all())),
            "patient_unread": len(list(notification_result.scalars().all())),
        }
