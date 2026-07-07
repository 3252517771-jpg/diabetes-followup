from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SystemUserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    real_name: str = Field(min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    department: str | None = Field(default=None, max_length=100)
    role_code: str = Field(min_length=1, max_length=50)
    status: int = Field(default=1, ge=0, le=1)


class SystemUserUpdate(BaseModel):
    real_name: str = Field(min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    department: str | None = Field(default=None, max_length=100)
    role_code: str = Field(min_length=1, max_length=50)
    status: int = Field(default=1, ge=0, le=1)


class SystemUserRead(BaseModel):
    id: int
    username: str
    real_name: str
    phone: str | None = None
    department: str | None = None
    status: int
    role_code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemConfigUpdateItem(BaseModel):
    config_key: str = Field(min_length=1, max_length=50)
    config_value: str = Field(min_length=1)
    description: str | None = Field(default=None, max_length=200)


class SystemConfigRead(BaseModel):
    id: int
    config_key: str
    config_value: str
    description: str | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
