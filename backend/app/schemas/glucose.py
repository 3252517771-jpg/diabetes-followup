from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BloodGlucoseRecordCreate(BaseModel):
    value: Decimal = Field(gt=0, le=50, decimal_places=2)
    measure_time: datetime
    category: str = Field(max_length=20)
    source: str = Field(default="staff", max_length=10)
    notes: str | None = Field(default=None, max_length=500)


class BloodGlucoseRecordRead(BaseModel):
    id: int
    patient_id: int
    patient_name: str | None = None
    value: Decimal
    measure_time: datetime
    category: str
    is_abnormal: bool
    abnormal_reason: str | None = None
    source: str
    notes: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GlucoseTrendPoint(BaseModel):
    date: date
    fasting_avg: float | None = None
    postprandial_avg: float | None = None
    bedtime_avg: float | None = None
    random_avg: float | None = None


class GlucoseTrend(BaseModel):
    days: int
    points: list[GlucoseTrendPoint]
    compliance_rate: float


class GlucoseStats(BaseModel):
    days: int
    total_records: int
    abnormal_count: int
    abnormal_rate: float
    fasting_avg: float | None = None
    postprandial_avg: float | None = None
    bedtime_avg: float | None = None
    random_avg: float | None = None
    latest_record: BloodGlucoseRecordRead | None = None


class GlucoseOverview(BaseModel):
    days: int
    patient_count: int
    total_records: int
    abnormal_count: int
    abnormal_rate: float
    category_distribution: dict[str, int]
    daily_record_counts: list[dict[str, int | str]]
    recent_abnormal_records: list[BloodGlucoseRecordRead]
