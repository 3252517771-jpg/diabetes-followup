from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PatientTagRead(BaseModel):
    id: int
    name: str
    color: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientTagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class PatientTagUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str | None = Field(default=None, max_length=7)


class PatientTagAssignRequest(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)


class ResponsibleDoctorRead(BaseModel):
    id: int
    real_name: str
    department: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    gender: int | None = Field(default=None, ge=0, le=2)
    age: int | None = Field(default=None, ge=0, le=120)
    phone: str | None = Field(default=None, max_length=20)
    diagnosis_type: str | None = Field(default=None, max_length=20)
    severity: str | None = Field(default=None, max_length=10)
    status: str = Field(default="enrolled", max_length=20)
    auto_push_enabled: bool = False
    notes: str | None = Field(default=None, max_length=2000)
    server_chan_key: str | None = Field(default=None, max_length=64)


class PatientCreate(PatientBase):
    responsible_doctor_id: int | None = None
    tag_ids: list[int] = Field(default_factory=list)


class PatientUpdate(PatientBase):
    responsible_doctor_id: int | None = None
    tag_ids: list[int] | None = None


class PatientListItem(BaseModel):
    id: int
    name: str
    gender: int | None = None
    age: int | None = None
    phone: str | None = None
    diagnosis_type: str | None = None
    severity: str | None = None
    status: str
    responsible_doctor: ResponsibleDoctorRead | None = None
    tags: list[PatientTagRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PatientDetail(PatientListItem):
    auto_push_enabled: bool = False
    notes: str | None = None
    server_chan_key: str | None = None
