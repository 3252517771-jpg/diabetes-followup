from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    real_name: str = Field(min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=20)
    department: str | None = Field(default=None, max_length=100)
    role_code: str = Field(default="doctor", max_length=50)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class UserRead(BaseModel):
    id: int
    username: str
    real_name: str
    department: str | None
    status: int
    roles: list[str]

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
