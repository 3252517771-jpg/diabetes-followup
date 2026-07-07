from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FollowupTemplate(Base):
    __tablename__ = "followup_template"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    applicable_type: Mapped[str | None] = mapped_column(String(50))
    total_days: Mapped[int | None] = mapped_column(Integer)
    creator_id: Mapped[int | None] = mapped_column(ForeignKey("sys_user.id"))
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="1"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class FollowupStage(Base):
    __tablename__ = "followup_stage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("followup_template.id"), nullable=False)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    stage_name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_day_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)


class StageTask(Base):
    __tablename__ = "stage_task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stage_id: Mapped[int] = mapped_column(ForeignKey("followup_stage.id"), nullable=False)
    task_type: Mapped[str] = mapped_column(String(30), nullable=False)
    executor: Mapped[str] = mapped_column(String(20), nullable=False)
    frequency: Mapped[str | None] = mapped_column(String(50))
    remind_before_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    description: Mapped[str | None] = mapped_column(String(200))


class FollowupPlan(Base):
    __tablename__ = "followup_plan"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("followup_template.id"))
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"), nullable=False, index=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("sys_user.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date)
    current_stage: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
