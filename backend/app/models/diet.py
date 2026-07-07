from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DietRecord(Base):
    __tablename__ = "diet_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"), nullable=False, index=True)
    meal_type: Mapped[str] = mapped_column(String(10), nullable=False)
    food_items: Mapped[str] = mapped_column(Text, nullable=False)
    record_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )


class DietRecommendation(Base):
    __tablename__ = "diet_recommendation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"), nullable=False, index=True)
    generate_method: Mapped[str] = mapped_column(String(10), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="pending", server_default="pending", index=True
    )
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("sys_user.id"))
    review_comment: Mapped[str | None] = mapped_column(String(500))
    push_status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="unpushed", server_default="unpushed"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
