from datetime import timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.diet import DietRecommendation
from app.models.glucose import BloodGlucoseRecord
from app.models.notification import NotificationLog
from app.models.patient import Patient
from app.schemas.glucose import BloodGlucoseRecordRead
from app.schemas.h5 import (
    H5AccessLinkRead,
    H5GlucoseCreate,
    H5GlucoseUpdate,
    H5PatientInfo,
    H5RecentGlucoseRecordRead,
    H5TaskItem,
)
from app.utils.security import create_access_token, decode_access_token


class H5Service:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    async def create_access_link(self, patient_id: int) -> H5AccessLinkRead:
        patient = await self.db.get(Patient, patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        token = create_access_token(
            {"sub": str(patient.id), "scope": "h5_patient"},
            expires_delta=timedelta(hours=24),
        )
        base_url = self.settings.h5_public_base_url.rstrip("/")
        return H5AccessLinkRead(
            patient_id=patient.id,
            access_token=token,
            access_url=f"{base_url}/h5/glucose?token={token}",
            expires_in_minutes=1440,
        )

    async def get_patient_info(self, token: str, phone_last4: str) -> H5PatientInfo:
        patient = await self._get_patient_by_token(token, phone_last4)
        return H5PatientInfo(
            id=patient.id,
            name=patient.name,
            gender=patient.gender,
            age=patient.age,
            diagnosis_type=patient.diagnosis_type,
            severity=patient.severity,
            phone_masked=self._mask_phone(patient.phone),
        )

    async def get_tasks(self, token: str, phone_last4: str) -> list[H5TaskItem]:
        patient = await self._get_patient_by_token(token, phone_last4)
        tasks = [
            H5TaskItem(
                key="glucose",
                title="Record glucose",
                description="Submit today's glucose data for doctor follow-up.",
            ),
        ]
        pending_recommendation = await self.db.scalar(
            select(DietRecommendation).where(
                DietRecommendation.patient_id == patient.id,
                DietRecommendation.review_status == "approved",
            )
        )
        if pending_recommendation:
            tasks.append(
                H5TaskItem(
                    key="diet",
                    title="View diet recommendation",
                    description="Review the latest approved diet guidance.",
                )
            )
        return tasks

    async def create_glucose_record(
        self,
        token: str,
        phone_last4: str,
        payload: H5GlucoseCreate,
    ) -> BloodGlucoseRecordRead:
        patient = await self._get_patient_by_token(token, phone_last4)
        is_abnormal, reason = self._judge_abnormal(payload.category, payload.value)
        record = BloodGlucoseRecord(
            patient_id=patient.id,
            value=payload.value,
            measure_time=payload.measure_time,
            category=payload.category,
            source="patient",
            notes=payload.notes,
            is_abnormal=is_abnormal,
            abnormal_reason=reason,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return BloodGlucoseRecordRead.model_validate(record)

    async def list_recent_glucose_records(
        self,
        token: str,
        phone_last4: str,
        *,
        limit: int,
    ) -> list[H5RecentGlucoseRecordRead]:
        patient = await self._get_patient_by_token(token, phone_last4)
        result = await self.db.execute(
            select(BloodGlucoseRecord)
            .where(
                BloodGlucoseRecord.patient_id == patient.id,
                BloodGlucoseRecord.source == "patient",
            )
            .order_by(BloodGlucoseRecord.measure_time.desc(), BloodGlucoseRecord.id.desc())
            .limit(limit)
        )
        return [
            H5RecentGlucoseRecordRead(**BloodGlucoseRecordRead.model_validate(record).model_dump(), editable=True)
            for record in result.scalars().all()
        ]

    async def update_glucose_record(
        self,
        token: str,
        phone_last4: str,
        record_id: int,
        payload: H5GlucoseUpdate,
    ) -> BloodGlucoseRecordRead:
        patient = await self._get_patient_by_token(token, phone_last4)
        record = await self.db.scalar(
            select(BloodGlucoseRecord).where(
                BloodGlucoseRecord.id == record_id,
                BloodGlucoseRecord.patient_id == patient.id,
                BloodGlucoseRecord.source == "patient",
            )
        )
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Glucose record not found")

        is_abnormal, reason = self._judge_abnormal(payload.category, payload.value)
        record.value = payload.value
        record.measure_time = payload.measure_time
        record.category = payload.category
        record.notes = payload.notes
        record.is_abnormal = is_abnormal
        record.abnormal_reason = reason

        await self.db.commit()
        await self.db.refresh(record)
        return BloodGlucoseRecordRead.model_validate(record)

    async def list_notifications(self, token: str, phone_last4: str) -> list[dict]:
        patient = await self._get_patient_by_token(token, phone_last4)
        result = await self.db.execute(
            select(NotificationLog)
            .where(NotificationLog.recipient_type == "patient", NotificationLog.recipient_id == patient.id)
            .order_by(NotificationLog.sent_at.desc(), NotificationLog.id.desc())
        )
        notifications = []
        for item in result.scalars().all():
            notifications.append(
                {
                    "id": item.id,
                    "status": item.status,
                    "channel": item.channel,
                    "content": item.content_sent,
                    "sent_at": item.sent_at.isoformat(),
                    "fail_reason": item.fail_reason,
                }
            )
        return notifications

    async def _get_patient_by_token(self, token: str, phone_last4: str) -> Patient:
        try:
            payload = decode_access_token(token)
            patient_id = int(payload["sub"])
            scope = payload.get("scope")
        except (ValueError, KeyError, TypeError):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid H5 token")

        if scope != "h5_patient":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid H5 scope")

        patient = await self.db.get(Patient, patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        self._assert_phone_last4(patient, phone_last4)
        return patient

    def _assert_phone_last4(self, patient: Patient, phone_last4: str) -> None:
        normalized = "".join(char for char in (phone_last4 or "") if char.isdigit())
        if len(normalized) != 4:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Phone last 4 digits are required",
            )
        if not patient.phone or len(patient.phone) < 4:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient phone is not configured for H5 verification",
            )
        if patient.phone[-4:] != normalized:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phone verification failed")

    def _mask_phone(self, phone: str | None) -> str | None:
        if not phone:
            return None
        if len(phone) <= 4:
            return phone
        prefix = phone[:3] if len(phone) >= 7 else phone[:-4]
        return f"{prefix}****{phone[-4:]}"

    def _judge_abnormal(self, category: str, value) -> tuple[bool, str | None]:
        ranges = {
            "fasting": ("3.9", "6.1"),
            "postprandial": ("3.9", "7.8"),
            "bedtime": ("3.9", "7.0"),
            "random": ("3.9", "11.1"),
        }
        if category not in ranges:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid glucose category")

        low, high = ranges[category]
        if value < Decimal(low):
            return True, "low"
        if value > Decimal(high):
            return True, "high"
        return False, None
