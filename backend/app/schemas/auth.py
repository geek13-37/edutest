import uuid

from pydantic import EmailStr, Field

from app.models import UserRole
from app.schemas.common import ORMModel, StrictModel
from app.schemas.school import SchoolOut


class RegisterTeacherIn(StrictModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    school_code: str = Field(min_length=4, max_length=24)


class SchoolPublicOut(ORMModel):
    name: str
    city: str


class LoginIn(StrictModel):
    login: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(StrictModel):
    refresh_token: str = Field(min_length=1, max_length=2048)


class ChangePasswordIn(StrictModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class TokenPair(ORMModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr | None = None
    username: str | None = None
    full_name: str
    role: UserRole
    is_active: bool = True
    school: SchoolOut | None = None
