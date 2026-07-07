from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StageTaskBase(BaseModel):
    task_type: str = Field(max_length=30)
    executor: str = Field(max_length=20)
    frequency: str | None = Field(default=None, max_length=50)
    remind_before_minutes: int = Field(default=0, ge=0)
    description: str | None = Field(default=None, max_length=200)


class StageTaskCreate(StageTaskBase):
    pass


class StageTaskRead(StageTaskBase):
    id: int
    stage_id: int

    model_config = ConfigDict(from_attributes=True)


class FollowupStageBase(BaseModel):
    stage_order: int = Field(ge=1)
    stage_name: str = Field(min_length=1, max_length=50)
    start_day_offset: int = Field(ge=0)
    duration_days: int = Field(ge=1)


class FollowupStageCreate(FollowupStageBase):
    tasks: list[StageTaskCreate] = Field(default_factory=list)


class FollowupStageRead(FollowupStageBase):
    id: int
    template_id: int
    tasks: list[StageTaskRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FollowupTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    applicable_type: str | None = Field(default=None, max_length=50)
    total_days: int | None = Field(default=None, ge=1)
    is_public: bool = True
    stages: list[FollowupStageCreate] = Field(default_factory=list)


class FollowupTemplateUpdate(FollowupTemplateCreate):
    is_active: bool = True


class FollowupTemplateRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    applicable_type: str | None = None
    total_days: int | None = None
    creator_id: int | None = None
    is_public: bool
    is_active: bool
    stage_count: int = 0
    task_count: int = 0
    stages: list[FollowupStageRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FollowupPlanCreate(BaseModel):
    patient_id: int
    template_id: int | None = None
    name: str | None = Field(default=None, max_length=100)
    start_date: date
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "FollowupPlanCreate":
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class FollowupPlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    current_stage: int | None = Field(default=None, ge=1)
    status: str | None = Field(default=None, max_length=20)


class FollowupPlanRead(BaseModel):
    id: int
    template_id: int | None = None
    patient_id: int
    patient_name: str | None = None
    creator_id: int
    name: str
    start_date: date
    end_date: date | None = None
    current_stage: int | None = None
    status: str
    progress_percent: float = 0.0
    overdue_task_count: int = 0
    template: FollowupTemplateRead | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
