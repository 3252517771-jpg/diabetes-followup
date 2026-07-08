from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.glucose import BloodGlucoseRecordRead


class H5PatientInfo(BaseModel):
    id: int
    name: str
    gender: int | None = None
    age: int | None = None
    diagnosis_type: str | None = None
    severity: str | None = None
    phone_masked: str | None = None


class H5AccessLinkRead(BaseModel):
    patient_id: int
    access_token: str
    access_url: str
    expires_in_minutes: int


class H5GlucoseCreate(BaseModel):
    value: Decimal = Field(gt=0, le=50, decimal_places=2)
    measure_time: datetime
    category: str = Field(max_length=20)
    notes: str | None = Field(default=None, max_length=500)


class H5GlucoseUpdate(BaseModel):
    value: Decimal = Field(gt=0, le=50, decimal_places=2)
    measure_time: datetime
    category: str = Field(max_length=20)
    notes: str | None = Field(default=None, max_length=500)


class H5TaskItem(BaseModel):
    key: str
    title: str
    description: str


class H5RecentGlucoseRecordRead(BloodGlucoseRecordRead):
    editable: bool = True
