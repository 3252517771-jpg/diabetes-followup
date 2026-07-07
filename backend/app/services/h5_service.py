from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diet import DietRecommendation
from app.models.glucose import BloodGlucoseRecord
from app.models.notification import NotificationLog
from app.models.patient import Patient
from app.schemas.glucose import BloodGlucoseRecordRead
from app.schemas.h5 import H5AccessLinkRead, H5GlucoseCreate, H5PatientInfo, H5TaskItem
from app.utils.security import create_access_token, decode_access_token


class H5Service:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_access_link(self, patient_id: int) -> H5AccessLinkRead:
        patient = await self.db.get(Patient, patient_id)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        token = create_access_token(
            {"sub": str(patient.id), "scope": "h5_patient"},
            expires_delta=timedelta(hours=12),
        )
        return H5AccessLinkRead(
            patient_id=patient.id,
            access_token=token,
            access_url=f"http://127.0.0.1:5174/h5/glucose?token={token}",
            expires_in_minutes=720,
        )

    async def get_patient_info(self, token: str) -> H5PatientInfo:
        patient = await self._get_patient_by_token(token)
        return H5PatientInfo(
            id=patient.id,
            name=patient.name,
            gender=patient.gender,
            age=patient.age,
            diagnosis_type=patient.diagnosis_type,
            severity=patient.severity,
        )

    async def get_tasks(self, token: str) -> list[H5TaskItem]:
        patient = await self._get_patient_by_token(token)
        tasks = [
            H5TaskItem(key="glucose", title="记录血糖", description="填写今日血糖数据，帮助医生追踪变化。"),
        ]
        pending_recommendation = await self.db.scalar(
            select(DietRecommendation).where(
                DietRecommendation.patient_id == patient.id,
                DietRecommendation.review_status == "approved",
            )
        )
        if pending_recommendation:
            tasks.append(H5TaskItem(key="diet", title="查看饮食推荐", description="查看最新通过审核的饮食建议。"))
        return tasks

    async def create_glucose_record(self, token: str, payload: H5GlucoseCreate) -> BloodGlucoseRecordRead:
        patient = await self._get_patient_by_token(token)
        record = BloodGlucoseRecord(
            patient_id=patient.id,
            value=payload.value,
            measure_time=payload.measure_time,
            category=payload.category,
            source="patient",
            notes=payload.notes,
            is_abnormal=False,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return BloodGlucoseRecordRead.model_validate(record)

    async def list_notifications(self, token: str) -> list[dict]:
        patient = await self._get_patient_by_token(token)
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

    async def _get_patient_by_token(self, token: str) -> Patient:
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
        return patient
