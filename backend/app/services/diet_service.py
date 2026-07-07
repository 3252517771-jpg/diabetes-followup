from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import Select, distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.diet import DietRecommendation
from app.models.glucose import BloodGlucoseRecord
from app.models.patient import Patient
from app.models.user import Role, User, UserRole
from app.schemas.common import PageData
from app.schemas.diet import (
    DietRecommendationContent,
    DietRecommendationGenerateRequest,
    DietRecommendationRead,
    DietRecommendationReviewRequest,
)
from app.services.ai_recommend_service import AIRecommendService
from app.services.notification_service import NotificationService
from app.services.push_service import PushService


class DietService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user
        self.settings = get_settings()
        self.ai_service = AIRecommendService()
        self.push_service = PushService()
        self.notification_service = NotificationService(db, current_user)

    async def generate_recommendation(
        self,
        payload: DietRecommendationGenerateRequest,
    ) -> DietRecommendationRead:
        patient = await self._get_accessible_patient(payload.patient_id)
        context = await self._build_ai_context(patient, payload)
        content = await self.ai_service.generate_recommendation(context)

        recommendation = DietRecommendation(
            patient_id=patient.id,
            generate_method="ai",
            content=content,
            review_status="pending",
            push_status="unpushed",
        )
        self.db.add(recommendation)
        await self.db.flush()

        reviewer_ids = await self._get_reviewer_ids(patient.responsible_doctor_id)
        title = f"AI饮食推荐待审核：{patient.name}"
        body = "已生成新的饮食推荐，请尽快完成审核并决定是否推送给患者。"
        for recipient_id in reviewer_ids:
            await self.notification_service.create_user_notification(
                recipient_id=recipient_id,
                title=title,
                body=body,
                notification_type="todo",
                action_label="查看推荐",
                action_path="/diet",
            )

        await self.db.commit()
        await self.db.refresh(recommendation)
        return await self.get_recommendation(recommendation.id)

    async def list_recommendations(
        self,
        *,
        page: int,
        size: int,
        patient_id: int | None = None,
        status_value: str | None = None,
    ) -> PageData[DietRecommendationRead]:
        query = self._scoped_recommendation_query()
        if patient_id is not None:
            await self._get_accessible_patient(patient_id)
            query = query.where(DietRecommendation.patient_id == patient_id)
        if status_value:
            query = query.where(DietRecommendation.review_status == status_value)

        rows = list(
            (
                await self.db.execute(
                    query.order_by(DietRecommendation.created_at.desc(), DietRecommendation.id.desc())
                )
            ).scalars().all()
        )
        total = len(rows)
        start = (page - 1) * size
        end = start + size
        items = [await self._build_recommendation_read(row) for row in rows[start:end]]
        return PageData(items=items, total=total, page=page, size=size)

    async def get_recommendation(self, recommendation_id: int) -> DietRecommendationRead:
        recommendation = await self._get_accessible_recommendation(recommendation_id)
        return await self._build_recommendation_read(recommendation)

    async def approve_recommendation(
        self,
        recommendation_id: int,
        payload: DietRecommendationReviewRequest,
    ) -> DietRecommendationRead:
        recommendation = await self._get_accessible_recommendation(recommendation_id)
        patient = await self._get_accessible_patient(recommendation.patient_id)

        recommendation.review_status = "approved"
        recommendation.reviewer_id = self.current_user.id
        recommendation.review_comment = payload.review_comment
        recommendation.reviewed_at = datetime.now(UTC).replace(tzinfo=None)
        if payload.edited_content is not None:
            recommendation.content = payload.edited_content.model_dump()

        title = f"饮食推荐已通过：{patient.name}"
        body = self._build_push_body(patient.name, recommendation.content)
        send_key = patient.server_chan_key or self.settings.server_chan_key
        success, fail_reason = await self.push_service.send_server_chan(send_key, title, body)
        recommendation.push_status = "pushed" if success else "failed"

        await self.notification_service.create_patient_push_log(
            patient_id=patient.id,
            title=title,
            body=body,
            success=success,
            fail_reason=fail_reason,
        )

        await self.notification_service.create_user_notification(
            recipient_id=patient.responsible_doctor_id or self.current_user.id,
            title=title,
            body="饮食推荐审核已完成，患者推送结果已更新。",
            notification_type="notification",
            action_label="查看详情",
            action_path=f"/patients/{patient.id}",
        )

        await self.db.commit()
        return await self.get_recommendation(recommendation.id)

    async def reject_recommendation(
        self,
        recommendation_id: int,
        payload: DietRecommendationReviewRequest,
    ) -> DietRecommendationRead:
        recommendation = await self._get_accessible_recommendation(recommendation_id)
        patient = await self._get_accessible_patient(recommendation.patient_id)

        recommendation.review_status = "rejected"
        recommendation.reviewer_id = self.current_user.id
        recommendation.review_comment = payload.review_comment
        recommendation.reviewed_at = datetime.now(UTC).replace(tzinfo=None)
        if payload.edited_content is not None:
            recommendation.content = payload.edited_content.model_dump()

        await self.notification_service.create_user_notification(
            recipient_id=patient.responsible_doctor_id or self.current_user.id,
            title=f"饮食推荐已驳回：{patient.name}",
            body="该推荐需要重新生成或手动调整后再提交审核。",
            notification_type="todo",
            action_label="重新处理",
            action_path="/diet",
        )
        await self.db.commit()
        return await self.get_recommendation(recommendation.id)

    def _scoped_recommendation_query(self) -> Select[tuple[DietRecommendation]]:
        query = select(DietRecommendation).join(Patient, Patient.id == DietRecommendation.patient_id)
        roles = set(self.current_user.__dict__.get("role_codes", []))
        if "admin" in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin users cannot manage diet recommendations")
        if {"chief", "department_head", "nutritionist"} & roles:
            return query
        return query.where(Patient.responsible_doctor_id == self.current_user.id)

    async def _get_accessible_patient(self, patient_id: int) -> Patient:
        roles = set(self.current_user.__dict__.get("role_codes", []))
        query = select(Patient).where(Patient.id == patient_id)
        if not ({"chief", "department_head", "nutritionist"} & roles):
            query = query.where(Patient.responsible_doctor_id == self.current_user.id)
        patient = await self.db.scalar(query)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        return patient

    async def _get_accessible_recommendation(self, recommendation_id: int) -> DietRecommendation:
        recommendation = await self.db.scalar(
            self._scoped_recommendation_query().where(DietRecommendation.id == recommendation_id)
        )
        if recommendation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet recommendation not found")
        return recommendation

    async def _build_ai_context(
        self,
        patient: Patient,
        payload: DietRecommendationGenerateRequest,
    ) -> dict:
        records = list(
            (
                await self.db.execute(
                    select(BloodGlucoseRecord)
                    .where(BloodGlucoseRecord.patient_id == patient.id)
                    .order_by(BloodGlucoseRecord.measure_time.desc())
                    .limit(6)
                )
            ).scalars().all()
        )
        glucose_summary = [
            {
                "value": float(record.value),
                "category": record.category,
                "measure_time": record.measure_time.isoformat(),
                "abnormal_reason": record.abnormal_reason,
            }
            for record in records
        ]
        return {
            "patient_name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "diagnosis_type": patient.diagnosis_type,
            "severity": patient.severity,
            "preferred_calories": payload.preferred_calories,
            "additional_prompt": payload.additional_prompt,
            "recent_glucose_records": glucose_summary,
            "notes": patient.notes,
        }

    async def _get_reviewer_ids(self, fallback_doctor_id: int | None) -> list[int]:
        result = await self.db.execute(
            select(distinct(User.id))
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(Role.role_code == "nutritionist", User.status == 1)
        )
        ids = list(result.scalars().all())
        if fallback_doctor_id and fallback_doctor_id not in ids:
            ids.append(fallback_doctor_id)
        if not ids:
            ids.append(self.current_user.id)
        return ids

    async def _build_recommendation_read(self, recommendation: DietRecommendation) -> DietRecommendationRead:
        patient = await self.db.get(Patient, recommendation.patient_id)
        reviewer = await self.db.get(User, recommendation.reviewer_id) if recommendation.reviewer_id else None
        content = DietRecommendationContent.model_validate(recommendation.content)
        return DietRecommendationRead(
            id=recommendation.id,
            patient_id=recommendation.patient_id,
            patient_name=patient.name if patient else None,
            generate_method=recommendation.generate_method,
            content=content,
            review_status=recommendation.review_status,
            reviewer_id=recommendation.reviewer_id,
            reviewer_name=reviewer.real_name if reviewer else None,
            review_comment=recommendation.review_comment,
            push_status=recommendation.push_status,
            push_target_type=self._push_target_type(patient),
            push_target_label=self._push_target_label(patient),
            created_at=recommendation.created_at,
            reviewed_at=recommendation.reviewed_at,
        )

    def _build_push_body(self, patient_name: str, content: dict) -> str:
        meal_lines = []
        for meal in content.get("meals", []):
            foods = "、".join(meal.get("foods", []))
            meal_lines.append(f"- {meal.get('meal_type', '餐次')}: {foods}")
        return "\n".join(
            [
                f"{patient_name} 的饮食推荐已审核通过：",
                *meal_lines,
                f"总热量：{content.get('total_calories', 0)} kcal",
                f"备注：{content.get('notes', '')}",
            ]
        )

    def _push_target_type(self, patient: Patient | None) -> str:
        if patient and patient.server_chan_key:
            return "patient_key"
        if self.settings.server_chan_key:
            return "system_default"
        return "missing"

    def _push_target_label(self, patient: Patient | None) -> str:
        if patient and patient.server_chan_key:
            return f"患者专属 SendKey ({self._mask_key(patient.server_chan_key)})"
        if self.settings.server_chan_key:
            return f"系统默认 SendKey ({self._mask_key(self.settings.server_chan_key)})"
        return "未配置 SendKey，审核通过后不会成功推送"

    def _mask_key(self, key: str) -> str:
        if len(key) <= 8:
            return key
        return f"{key[:4]}...{key[-4:]}"
