from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.followup import FollowupPlan, FollowupStage, FollowupTemplate, StageTask
from app.models.patient import Patient
from app.models.user import User
from app.schemas.common import PageData
from app.schemas.followup import (
    FollowupPlanCreate,
    FollowupPlanRead,
    FollowupPlanUpdate,
    FollowupStageCreate,
    FollowupStageRead,
    FollowupTemplateCreate,
    FollowupTemplateRead,
    FollowupTemplateUpdate,
    StageTaskRead,
)

PLAN_STATUSES = {"active", "paused", "completed", "cancelled"}


class FollowupService:
    def __init__(self, db: AsyncSession, current_user: User):
        self.db = db
        self.current_user = current_user

    async def list_templates(
        self,
        *,
        page: int,
        size: int,
        scope: str | None = None,
        search: str | None = None,
    ) -> PageData[FollowupTemplateRead]:
        query = self._scoped_template_query()
        count_query = self._scoped_template_query()

        if scope == "public":
            query = query.where(FollowupTemplate.is_public.is_(True))
            count_query = count_query.where(FollowupTemplate.is_public.is_(True))
        elif scope in {"mine", "private"}:
            query = query.where(FollowupTemplate.creator_id == self.current_user.id)
            count_query = count_query.where(FollowupTemplate.creator_id == self.current_user.id)
        if search:
            keyword = f"%{search.strip()}%"
            query = query.where(FollowupTemplate.name.like(keyword))
            count_query = count_query.where(FollowupTemplate.name.like(keyword))

        total = await self.db.scalar(select(func.count()).select_from(count_query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(FollowupTemplate.updated_at.desc(), FollowupTemplate.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        templates = list(result.scalars().all())
        return PageData(
            items=[await self._build_template_read(template, include_stages=False) for template in templates],
            total=total,
            page=page,
            size=size,
        )

    async def get_template(self, template_id: int) -> FollowupTemplateRead:
        template = await self._get_accessible_template(template_id)
        return await self._build_template_read(template, include_stages=True)

    async def create_template(self, payload: FollowupTemplateCreate) -> FollowupTemplateRead:
        template = FollowupTemplate(
            name=payload.name,
            description=payload.description,
            applicable_type=payload.applicable_type,
            total_days=payload.total_days or self._calculate_total_days(payload.stages),
            creator_id=self.current_user.id,
            is_public=payload.is_public,
            is_active=True,
        )
        self.db.add(template)
        await self.db.flush()
        await self._create_stages(template.id, payload.stages)
        await self.db.commit()
        await self.db.refresh(template)
        return await self.get_template(template.id)

    async def update_template(
        self,
        template_id: int,
        payload: FollowupTemplateUpdate,
    ) -> FollowupTemplateRead:
        template = await self._get_owned_template(template_id)
        template.name = payload.name
        template.description = payload.description
        template.applicable_type = payload.applicable_type
        template.total_days = payload.total_days or self._calculate_total_days(payload.stages)
        template.is_public = payload.is_public
        template.is_active = payload.is_active

        await self._delete_template_children(template.id)
        await self._create_stages(template.id, payload.stages)
        await self.db.commit()
        return await self.get_template(template.id)

    async def delete_template(self, template_id: int) -> None:
        template = await self._get_owned_template(template_id)
        active_plan_count = await self.db.scalar(
            select(func.count()).select_from(
                select(FollowupPlan.id).where(FollowupPlan.template_id == template.id).subquery()
            )
        )
        if active_plan_count:
            template.is_active = False
        else:
            await self._delete_template_children(template.id)
            await self.db.delete(template)
        await self.db.commit()

    async def copy_template(self, template_id: int) -> FollowupTemplateRead:
        source = await self.get_template(template_id)
        payload = FollowupTemplateCreate(
            name=f"{source.name} Copy",
            description=source.description,
            applicable_type=source.applicable_type,
            total_days=source.total_days,
            is_public=False,
            stages=[
                FollowupStageCreate(
                    stage_order=stage.stage_order,
                    stage_name=stage.stage_name,
                    start_day_offset=stage.start_day_offset,
                    duration_days=stage.duration_days,
                    tasks=[
                        {
                            "task_type": task.task_type,
                            "executor": task.executor,
                            "frequency": task.frequency,
                            "remind_before_minutes": task.remind_before_minutes,
                            "description": task.description,
                        }
                        for task in stage.tasks
                    ],
                )
                for stage in source.stages
            ],
        )
        return await self.create_template(payload)

    async def list_plans(
        self,
        *,
        page: int,
        size: int,
        patient_id: int | None = None,
        status_value: str | None = None,
    ) -> PageData[FollowupPlanRead]:
        query = self._scoped_plan_query()
        count_query = self._scoped_plan_query()
        if patient_id is not None:
            await self._get_accessible_patient(patient_id)
            query = query.where(FollowupPlan.patient_id == patient_id)
            count_query = count_query.where(FollowupPlan.patient_id == patient_id)
        if status_value:
            self._ensure_plan_status(status_value)
            query = query.where(FollowupPlan.status == status_value)
            count_query = count_query.where(FollowupPlan.status == status_value)

        total = await self.db.scalar(select(func.count()).select_from(count_query.subquery())) or 0
        result = await self.db.execute(
            query.order_by(FollowupPlan.updated_at.desc(), FollowupPlan.id.desc())
            .offset((page - 1) * size)
            .limit(size)
        )
        plans = list(result.scalars().all())
        return PageData(
            items=[await self._build_plan_read(plan, include_template=False) for plan in plans],
            total=total,
            page=page,
            size=size,
        )

    async def get_plan(self, plan_id: int) -> FollowupPlanRead:
        plan = await self._get_accessible_plan(plan_id)
        return await self._build_plan_read(plan, include_template=True)

    async def create_plan(self, payload: FollowupPlanCreate) -> FollowupPlanRead:
        patient = await self._get_accessible_patient(payload.patient_id)
        template = None
        if payload.template_id is not None:
            template = await self._get_accessible_template(payload.template_id)
        end_date = payload.end_date
        if end_date is None and template is not None and template.total_days:
            end_date = payload.start_date + timedelta(days=template.total_days - 1)

        plan = FollowupPlan(
            template_id=payload.template_id,
            patient_id=payload.patient_id,
            creator_id=self.current_user.id,
            name=payload.name or (template.name if template else "Custom followup plan"),
            start_date=payload.start_date,
            end_date=end_date,
            current_stage=1,
            status="active",
        )
        patient.status = "following"
        self.db.add(plan)
        await self.db.commit()
        await self.db.refresh(plan)
        return await self.get_plan(plan.id)

    async def update_plan(self, plan_id: int, payload: FollowupPlanUpdate) -> FollowupPlanRead:
        plan = await self._get_accessible_plan(plan_id)
        if payload.status is not None:
            self._ensure_plan_status(payload.status)
            plan.status = payload.status
        if payload.name is not None:
            plan.name = payload.name
        if payload.start_date is not None:
            plan.start_date = payload.start_date
        if payload.end_date is not None:
            plan.end_date = payload.end_date
        if plan.end_date is not None and plan.end_date < plan.start_date:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid plan date range")
        if payload.current_stage is not None:
            plan.current_stage = payload.current_stage
        await self.db.commit()
        return await self.get_plan(plan.id)

    def _scoped_template_query(self) -> Select[tuple[FollowupTemplate]]:
        return select(FollowupTemplate).where(
            FollowupTemplate.is_active.is_(True),
            or_(
                FollowupTemplate.is_public.is_(True),
                FollowupTemplate.creator_id == self.current_user.id,
            ),
        )

    def _scoped_plan_query(self) -> Select[tuple[FollowupPlan]]:
        query = select(FollowupPlan).join(Patient, Patient.id == FollowupPlan.patient_id)
        roles = set(self.current_user.__dict__.get("role_codes", []))
        if "admin" in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin users cannot manage followup")
        if "chief" in roles or "department_head" in roles:
            return query
        return query.where(Patient.responsible_doctor_id == self.current_user.id)

    async def _get_accessible_patient(self, patient_id: int) -> Patient:
        roles = set(self.current_user.__dict__.get("role_codes", []))
        query = select(Patient).where(Patient.id == patient_id)
        if "chief" not in roles and "department_head" not in roles:
            query = query.where(Patient.responsible_doctor_id == self.current_user.id)
        patient = await self.db.scalar(query)
        if patient is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        return patient

    async def _get_accessible_template(self, template_id: int) -> FollowupTemplate:
        template = await self.db.scalar(self._scoped_template_query().where(FollowupTemplate.id == template_id))
        if template is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return template

    async def _get_owned_template(self, template_id: int) -> FollowupTemplate:
        template = await self._get_accessible_template(template_id)
        if template.creator_id != self.current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify another user's template")
        return template

    async def _get_accessible_plan(self, plan_id: int) -> FollowupPlan:
        plan = await self.db.scalar(self._scoped_plan_query().where(FollowupPlan.id == plan_id))
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
        return plan

    async def _create_stages(self, template_id: int, stages: list[FollowupStageCreate]) -> None:
        for stage_payload in stages:
            stage = FollowupStage(
                template_id=template_id,
                stage_order=stage_payload.stage_order,
                stage_name=stage_payload.stage_name,
                start_day_offset=stage_payload.start_day_offset,
                duration_days=stage_payload.duration_days,
            )
            self.db.add(stage)
            await self.db.flush()
            for task_payload in stage_payload.tasks:
                self.db.add(
                    StageTask(
                        stage_id=stage.id,
                        task_type=task_payload.task_type,
                        executor=task_payload.executor,
                        frequency=task_payload.frequency,
                        remind_before_minutes=task_payload.remind_before_minutes,
                        description=task_payload.description,
                    )
                )
        await self.db.flush()

    async def _delete_template_children(self, template_id: int) -> None:
        stage_ids = (
            await self.db.execute(select(FollowupStage.id).where(FollowupStage.template_id == template_id))
        ).scalars().all()
        if stage_ids:
            await self.db.execute(delete(StageTask).where(StageTask.stage_id.in_(stage_ids)))
            await self.db.execute(delete(FollowupStage).where(FollowupStage.id.in_(stage_ids)))

    async def _build_template_read(
        self,
        template: FollowupTemplate,
        *,
        include_stages: bool,
    ) -> FollowupTemplateRead:
        stages = await self._load_template_stages(template.id) if include_stages else []
        counts = await self._template_counts(template.id)
        data = FollowupTemplateRead.model_validate(template).model_dump()
        data.update(counts)
        data["stages"] = stages
        return FollowupTemplateRead(**data)

    async def _load_template_stages(self, template_id: int) -> list[FollowupStageRead]:
        result = await self.db.execute(
            select(FollowupStage)
            .where(FollowupStage.template_id == template_id)
            .order_by(FollowupStage.stage_order.asc(), FollowupStage.id.asc())
        )
        stages = []
        for stage in result.scalars().all():
            task_result = await self.db.execute(
                select(StageTask).where(StageTask.stage_id == stage.id).order_by(StageTask.id.asc())
            )
            tasks = [StageTaskRead.model_validate(task) for task in task_result.scalars().all()]
            stage_data = FollowupStageRead.model_validate(stage).model_dump()
            stage_data["tasks"] = tasks
            stages.append(FollowupStageRead(**stage_data))
        return stages

    async def _template_counts(self, template_id: int) -> dict[str, int]:
        stage_ids = (
            await self.db.execute(select(FollowupStage.id).where(FollowupStage.template_id == template_id))
        ).scalars().all()
        if not stage_ids:
            return {"stage_count": 0, "task_count": 0}
        task_count = await self.db.scalar(select(func.count()).select_from(StageTask).where(StageTask.stage_id.in_(stage_ids)))
        return {"stage_count": len(stage_ids), "task_count": task_count or 0}

    async def _build_plan_read(self, plan: FollowupPlan, *, include_template: bool) -> FollowupPlanRead:
        patient = await self.db.get(Patient, plan.patient_id)
        template_read = await self.get_template(plan.template_id) if include_template and plan.template_id else None
        data = FollowupPlanRead.model_validate(plan).model_dump()
        data["patient_name"] = patient.name if patient else None
        data["progress_percent"] = self._plan_progress(plan)
        data["overdue_task_count"] = self._overdue_task_count(plan, template_read)
        data["template"] = template_read
        return FollowupPlanRead(**data)

    def _plan_progress(self, plan: FollowupPlan) -> float:
        if plan.status == "completed":
            return 100.0
        if plan.status in {"paused", "cancelled"}:
            return 0.0
        end_date = plan.end_date or plan.start_date
        total_days = max((end_date - plan.start_date).days + 1, 1)
        elapsed_days = max((date.today() - plan.start_date).days + 1, 0)
        return round(min(elapsed_days / total_days * 100, 100), 2)

    def _overdue_task_count(
        self,
        plan: FollowupPlan,
        template: FollowupTemplateRead | None,
    ) -> int:
        if plan.status != "active" or template is None:
            return 0
        today = date.today()
        count = 0
        for stage in template.stages:
            stage_end = plan.start_date + timedelta(days=stage.start_day_offset + stage.duration_days - 1)
            if stage_end < today and (plan.current_stage or 1) <= stage.stage_order:
                count += len(stage.tasks)
        return count

    def _calculate_total_days(self, stages: list[FollowupStageCreate]) -> int | None:
        if not stages:
            return None
        return max(stage.start_day_offset + stage.duration_days for stage in stages)

    def _ensure_plan_status(self, status_value: str) -> None:
        if status_value not in PLAN_STATUSES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid plan status")
