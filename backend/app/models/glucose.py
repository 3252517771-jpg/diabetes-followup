from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BloodGlucoseRecord(Base):
    __tablename__ = "blood_glucose_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patient.id"), nullable=False, index=True)
    value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    measure_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    is_abnormal: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    abnormal_reason: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(
        String(10), nullable=False, default="patient", server_default="patient"
    )
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
