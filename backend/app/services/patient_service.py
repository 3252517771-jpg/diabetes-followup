from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient, PatientTag, PatientTagRel
from app.models.user import User
from app.schemas.common import PageData
from app.schemas.patient import (
    PatientCreate,
    PatientDetail,
    PatientListItem,
    PatientTagAssignRequest,
    PatientTagCreate,
    PatientTagRead,
    PatientTagUpdate,
    PatientUpdate,
    ResponsibleDoctorRead,
)


class PatientService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    async def list_patients(
        self,
        *,
        page: int,
        size: int,
        search: str | None = None,
        tag: int | None = None,
        status_value: str | None = None,
        diagnosis_type: str | None = None,
        severity: str | None = None,
    ) -> PageData[PatientListItem]:
        query = self._scoped_patient_query()
        count_query = self._scoped_patient_query()

        if search:
            keyword = f"%{search.strip()}%"
            condition = or_(Patient.name.like(keyword), Patient.phone.like(keyword))
            query = query.where(condition)
            count_query = count_query.where(condition)
        if status_value:
            query = query.where(Patient.status == status_value)
            count_query = count_query.where(Patient.status == status_value)
        if diagnosis_type:
            query = query.where(Patient.diagnosis_type == diagnosis_type)
            count_query = count_query.where(Patient.diagnosis_type == diagnosis_type)
        if severity:
            query = query.where(Patient.severity == severity)
            count_query = count_query.where(Patient.severity == severity)
        if tag is not None:
            tagged_ids = select(PatientTagRel.patient_id).where(PatientTagRel.tag_id == tag)
            query = query.where(Patient.id.in_(tagged_ids))
            count_query = count_query.where(Patient.id.in_(tagged_ids))

        total = await self.db.scalar(select(func.count()).select_from(count_query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(Patient.updated_at.desc(), Patient.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        patients = list(result.scalars().all())

        return PageData(
            items=await self._build_patient_list_items(patients),
            total=total,
            page=page,
            size=size,
        )

    async def create_patient(self, payload: PatientCreate) -> PatientDetail:
        doctor_id = payload.responsible_doctor_id or self.current_user.id
        await self._ensure_doctor_access(doctor_id)

        patient = Patient(
            name=payload.name,
            gender=payload.gender,
            age=payload.age,
            phone=payload.phone,
            diagnosis_type=payload.diagnosis_type,
            severity=payload.severity,
            status=payload.status,
            responsible_doctor_id=doctor_id,
            notes=payload.notes,
            server_chan_key=payload.server_chan_key,
        )
        self.db.add(patient)
        await self.db.flush()
        await self._replace_tags(patient.id, payload.tag_ids)
        await self.db.commit()
        return await self.get_patient_detail(patient.id)

    async def get_patient_detail(self, patient_id: int) -> PatientDetail:
        patient = await self._get_accessible_patient(patient_id)
        return await self._build_patient_detail(patient)

    async def update_patient(self, patient_id: int, payload: PatientUpdate) -> PatientDetail:
        patient = await self._get_accessible_patient(patient_id)
        doctor_id = payload.responsible_doctor_id or patient.responsible_doctor_id or self.current_user.id
        await self._ensure_doctor_access(doctor_id)

        patient.name = payload.name
        patient.gender = payload.gender
        patient.age = payload.age
        patient.phone = payload.phone
        patient.diagnosis_type = payload.diagnosis_type
        patient.severity = payload.severity
        patient.status = payload.status
        patient.responsible_doctor_id = doctor_id
        patient.notes = payload.notes
        patient.server_chan_key = payload.server_chan_key

        if payload.tag_ids is not None:
            await self._replace_tags(patient.id, payload.tag_ids)

        await self.db.commit()
        return await self.get_patient_detail(patient.id)

    async def delete_patient(self, patient_id: int) -> None:
        patient = await self._get_accessible_patient(patient_id)
        await self.db.execute(delete(PatientTagRel).where(PatientTagRel.patient_id == patient.id))
        await self.db.delete(patient)
        await self.db.commit()

    async def list_patient_tags(self, patient_id: int) -> list[PatientTagRead]:
        await self._get_accessible_patient(patient_id)
        return await self._load_tags_for_patient(patient_id)

    async def assign_patient_tags(
        self,
        patient_id: int,
        payload: PatientTagAssignRequest,
    ) -> list[PatientTagRead]:
        await self._get_accessible_patient(patient_id)
        await self._replace_tags(patient_id, payload.tag_ids)
        await self.db.commit()
        return await self._load_tags_for_patient(patient_id)

    async def list_tags(self) -> list[PatientTagRead]:
        result = await self.db.execute(select(PatientTag).order_by(PatientTag.name.asc(), PatientTag.id.asc()))
        return [PatientTagRead.model_validate(tag) for tag in result.scalars().all()]

    async def create_tag(self, payload: PatientTagCreate) -> PatientTagRead:
        existing = await self.db.scalar(select(PatientTag).where(PatientTag.name == payload.name))
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag name already exists")

        tag = PatientTag(name=payload.name, color=payload.color)
        self.db.add(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        return PatientTagRead.model_validate(tag)

    async def update_tag(self, tag_id: int, payload: PatientTagUpdate) -> PatientTagRead:
        tag = await self.db.get(PatientTag, tag_id)
        if tag is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tag not found")

        existing = await self.db.scalar(
            select(PatientTag).where(PatientTag.name == payload.name, PatientTag.id != tag_id)
        )
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag name already exists")

        tag.name = payload.name
        tag.color = payload.color
        await self.db.commit()
        await self.db.refresh(tag)
        return PatientTagRead.model_validate(tag)

    def _scoped_patient_query(self) -> Select[tuple[Patient]]:
        roles = set(self.current_user.__dict__.get("role_codes", []))
        query = select(Patient)
        if "admin" in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin users cannot manage patients",
            )
        if "chief" in roles or "department_head" in roles:
            return query
        return query.where(Patient.responsible_doctor_id == self.current_user.id)

    async def _get_accessible_patient(self, patient_id: int) -> Patient:
        query = self._scoped_patient_query().where(Patient.id == patient_id)
        patient = await self.db.scalar(query)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        return patient

    async def _ensure_doctor_access(self, doctor_id: int) -> None:
        if doctor_id != self.current_user.id:
            roles = set(self.current_user.__dict__.get("role_codes", []))
            if "chief" not in roles and "department_head" not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot assign patient to another doctor",
                )
        doctor = await self.db.get(User, doctor_id)
        if doctor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    async def _replace_tags(self, patient_id: int, tag_ids: Sequence[int]) -> None:
        unique_tag_ids = list(dict.fromkeys(tag_ids))
        if unique_tag_ids:
            result = await self.db.execute(select(PatientTag.id).where(PatientTag.id.in_(unique_tag_ids)))
            existing_ids = set(result.scalars().all())
            missing = sorted(set(unique_tag_ids) - existing_ids)
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tags not found: {', '.join(str(tag_id) for tag_id in missing)}",
                )

        await self.db.execute(delete(PatientTagRel).where(PatientTagRel.patient_id == patient_id))
        for tag_id in unique_tag_ids:
            self.db.add(PatientTagRel(patient_id=patient_id, tag_id=tag_id))
        await self.db.flush()

    async def _build_patient_list_items(self, patients: Sequence[Patient]) -> list[PatientListItem]:
        if not patients:
            return []

        patient_ids = [patient.id for patient in patients]
        doctor_ids = sorted(
            {patient.responsible_doctor_id for patient in patients if patient.responsible_doctor_id is not None}
        )

        tag_map = await self._load_tags_for_patients(patient_ids)
        doctor_map: dict[int, ResponsibleDoctorRead] = {}
        if doctor_ids:
            doctor_result = await self.db.execute(select(User).where(User.id.in_(doctor_ids)))
            doctor_map = {
                doctor.id: ResponsibleDoctorRead.model_validate(doctor)
                for doctor in doctor_result.scalars().all()
            }

        return [
            PatientListItem(
                id=patient.id,
                name=patient.name,
                gender=patient.gender,
                age=patient.age,
                phone=patient.phone,
                diagnosis_type=patient.diagnosis_type,
                severity=patient.severity,
                status=patient.status,
                responsible_doctor=doctor_map.get(patient.responsible_doctor_id or -1),
                tags=tag_map.get(patient.id, []),
                created_at=patient.created_at,
                updated_at=patient.updated_at,
            )
            for patient in patients
        ]

    async def _build_patient_detail(self, patient: Patient) -> PatientDetail:
        items = await self._build_patient_list_items([patient])
        summary = items[0]
        return PatientDetail(
            **summary.model_dump(),
            notes=patient.notes,
            server_chan_key=patient.server_chan_key,
        )

    async def _load_tags_for_patient(self, patient_id: int) -> list[PatientTagRead]:
        return (await self._load_tags_for_patients([patient_id])).get(patient_id, [])

    async def _load_tags_for_patients(self, patient_ids: Sequence[int]) -> dict[int, list[PatientTagRead]]:
        if not patient_ids:
            return {}

        result = await self.db.execute(
            select(PatientTagRel.patient_id, PatientTag)
            .join(PatientTag, PatientTag.id == PatientTagRel.tag_id)
            .where(PatientTagRel.patient_id.in_(patient_ids))
            .order_by(PatientTag.name.asc(), PatientTag.id.asc())
        )
        tag_map = {patient_id: [] for patient_id in patient_ids}
        for patient_id, tag in result.all():
            tag_map.setdefault(patient_id, []).append(PatientTagRead.model_validate(tag))
        return tag_map
