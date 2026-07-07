from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.glucose import BloodGlucoseRecord
from app.models.patient import Patient
from app.models.user import User
from app.schemas.common import PageData
from app.schemas.glucose import (
    BloodGlucoseRecordCreate,
    BloodGlucoseRecordRead,
    GlucoseOverview,
    GlucoseStats,
    GlucoseTrend,
    GlucoseTrendPoint,
)


GLUCOSE_RANGES = {
    "fasting": (Decimal("3.9"), Decimal("6.1")),
    "postprandial": (Decimal("3.9"), Decimal("7.8")),
    "bedtime": (Decimal("3.9"), Decimal("7.0")),
    "random": (Decimal("3.9"), Decimal("11.1")),
}


class GlucoseService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    async def list_records(
        self,
        *,
        patient_id: int,
        page: int,
        size: int,
        measured_date: date | None = None,
        category: str | None = None,
    ) -> PageData[BloodGlucoseRecordRead]:
        await self._get_accessible_patient(patient_id)
        query = select(BloodGlucoseRecord).where(BloodGlucoseRecord.patient_id == patient_id)
        count_query = select(BloodGlucoseRecord).where(BloodGlucoseRecord.patient_id == patient_id)

        if measured_date is not None:
            start = datetime.combine(measured_date, time.min)
            end = datetime.combine(measured_date + timedelta(days=1), time.min)
            query = query.where(BloodGlucoseRecord.measure_time >= start, BloodGlucoseRecord.measure_time < end)
            count_query = count_query.where(
                BloodGlucoseRecord.measure_time >= start,
                BloodGlucoseRecord.measure_time < end,
            )
        if category:
            self._ensure_category(category)
            query = query.where(BloodGlucoseRecord.category == category)
            count_query = count_query.where(BloodGlucoseRecord.category == category)

        total = await self.db.scalar(select(func.count()).select_from(count_query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(BloodGlucoseRecord.measure_time.desc(), BloodGlucoseRecord.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        records = list(result.scalars().all())
        return PageData(
            items=[BloodGlucoseRecordRead.model_validate(record) for record in records],
            total=total,
            page=page,
            size=size,
        )

    async def create_record(
        self,
        *,
        patient_id: int,
        payload: BloodGlucoseRecordCreate,
    ) -> BloodGlucoseRecordRead:
        await self._get_accessible_patient(patient_id)
        self._ensure_category(payload.category)
        is_abnormal, reason = self._judge_abnormal(payload.category, payload.value)
        record = BloodGlucoseRecord(
            patient_id=patient_id,
            value=payload.value,
            measure_time=payload.measure_time,
            category=payload.category,
            is_abnormal=is_abnormal,
            abnormal_reason=reason,
            source=payload.source,
            notes=payload.notes,
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return BloodGlucoseRecordRead.model_validate(record)

    async def get_trend(self, *, patient_id: int, days: int) -> GlucoseTrend:
        await self._get_accessible_patient(patient_id)
        records = await self._records_for_patients([patient_id], days=days)
        return self._build_trend(records, days)

    async def get_stats(self, *, patient_id: int, days: int) -> GlucoseStats:
        await self._get_accessible_patient(patient_id)
        records = await self._records_for_patients([patient_id], days=days)
        latest = max(records, key=lambda item: item.measure_time, default=None)
        return GlucoseStats(
            days=days,
            total_records=len(records),
            abnormal_count=sum(1 for record in records if record.is_abnormal),
            abnormal_rate=self._rate(sum(1 for record in records if record.is_abnormal), len(records)),
            fasting_avg=self._avg(records, "fasting"),
            postprandial_avg=self._avg(records, "postprandial"),
            bedtime_avg=self._avg(records, "bedtime"),
            random_avg=self._avg(records, "random"),
            latest_record=BloodGlucoseRecordRead.model_validate(latest) if latest else None,
        )

    async def get_overview(self, *, days: int) -> GlucoseOverview:
        patients = await self._accessible_patients()
        patient_ids = [patient.id for patient in patients]
        records = await self._records_for_patients(patient_ids, days=days) if patient_ids else []
        patient_name_map = {patient.id: patient.name for patient in patients}

        category_distribution = {key: 0 for key in GLUCOSE_RANGES}
        daily_counts = defaultdict(int)
        for record in records:
            category_distribution[record.category] = category_distribution.get(record.category, 0) + 1
            daily_counts[record.measure_time.date().isoformat()] += 1

        recent_abnormal = sorted(
            [record for record in records if record.is_abnormal],
            key=lambda item: item.measure_time,
            reverse=True,
        )[:8]
        abnormal_reads = []
        for record in recent_abnormal:
            record_data = BloodGlucoseRecordRead.model_validate(record).model_dump()
            record_data["patient_name"] = patient_name_map.get(record.patient_id)
            abnormal_reads.append(BloodGlucoseRecordRead(**record_data))

        today = date.today()
        daily_record_counts = [
            {
                "date": (today - timedelta(days=offset)).isoformat(),
                "count": daily_counts.get((today - timedelta(days=offset)).isoformat(), 0),
            }
            for offset in reversed(range(days))
        ]

        abnormal_count = sum(1 for record in records if record.is_abnormal)
        return GlucoseOverview(
            days=days,
            patient_count=len(patients),
            total_records=len(records),
            abnormal_count=abnormal_count,
            abnormal_rate=self._rate(abnormal_count, len(records)),
            category_distribution=category_distribution,
            daily_record_counts=daily_record_counts,
            recent_abnormal_records=abnormal_reads,
        )

    def _scoped_patient_query(self) -> Select[tuple[Patient]]:
        roles = set(self.current_user.__dict__.get("role_codes", []))
        query = select(Patient)
        if "admin" in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin users cannot manage glucose records",
            )
        if "chief" in roles or "department_head" in roles:
            return query
        return query.where(Patient.responsible_doctor_id == self.current_user.id)

    async def _accessible_patients(self) -> list[Patient]:
        result = await self.db.execute(self._scoped_patient_query())
        return list(result.scalars().all())

    async def _get_accessible_patient(self, patient_id: int) -> Patient:
        patient = await self.db.scalar(self._scoped_patient_query().where(Patient.id == patient_id))
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        return patient

    async def _records_for_patients(self, patient_ids: list[int], *, days: int) -> list[BloodGlucoseRecord]:
        if not patient_ids:
            return []
        start = datetime.combine(date.today() - timedelta(days=days - 1), time.min)
        result = await self.db.execute(
            select(BloodGlucoseRecord)
            .where(
                BloodGlucoseRecord.patient_id.in_(patient_ids),
                BloodGlucoseRecord.measure_time >= start,
            )
            .order_by(BloodGlucoseRecord.measure_time.asc(), BloodGlucoseRecord.id.asc())
        )
        return list(result.scalars().all())

    def _build_trend(self, records: list[BloodGlucoseRecord], days: int) -> GlucoseTrend:
        grouped: dict[tuple[date, str], list[Decimal]] = defaultdict(list)
        for record in records:
            grouped[(record.measure_time.date(), record.category)].append(record.value)

        today = date.today()
        points = []
        for offset in reversed(range(days)):
            current = today - timedelta(days=offset)
            points.append(
                GlucoseTrendPoint(
                    date=current,
                    fasting_avg=self._avg_values(grouped.get((current, "fasting"), [])),
                    postprandial_avg=self._avg_values(grouped.get((current, "postprandial"), [])),
                    bedtime_avg=self._avg_values(grouped.get((current, "bedtime"), [])),
                    random_avg=self._avg_values(grouped.get((current, "random"), [])),
                )
            )

        normal_count = sum(1 for record in records if not record.is_abnormal)
        return GlucoseTrend(days=days, points=points, compliance_rate=self._rate(normal_count, len(records)))

    def _ensure_category(self, category: str) -> None:
        if category not in GLUCOSE_RANGES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid glucose category")

    def _judge_abnormal(self, category: str, value: Decimal) -> tuple[bool, str | None]:
        low, high = GLUCOSE_RANGES[category]
        if value < low:
            return True, "low"
        if value > high:
            return True, "high"
        return False, None

    def _avg(self, records: list[BloodGlucoseRecord], category: str) -> float | None:
        values = [record.value for record in records if record.category == category]
        return self._avg_values(values)

    def _avg_values(self, values: list[Decimal]) -> float | None:
        if not values:
            return None
        return round(float(sum(values) / len(values)), 2)

    def _rate(self, numerator: int, denominator: int) -> float:
        if denominator == 0:
            return 0.0
        return round(numerator / denominator * 100, 2)
