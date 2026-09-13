import uuid
from datetime import datetime

from pydantic import EmailStr, Field, model_validator

from app.schemas.admin import SchoolAdminOut
from app.schemas.common import ORMModel, StrictModel


class SchoolRequestCreateIn(StrictModel):
    school_name: str = Field(min_length=3, max_length=300)
    city: str = Field(min_length=2, max_length=120)
    region: str = Field(default="", max_length=160)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=32)
    comment: str = Field(default="", max_length=2000)
    # honeypot: обычный пользователь его не видит и не заполняет, боты - заполняют
    website: str = Field(default="", max_length=200)

    @model_validator(mode="after")
    def _require_contact(self) -> "SchoolRequestCreateIn":
        if not self.contact_email and not self.contact_phone:
            raise ValueError("Укажите email или телефон для связи")
        return self


class SchoolRequestOut(ORMModel):
    id: uuid.UUID
    school_name: str
    city: str
    region: str
    contact_name: str
    contact_email: str | None
    contact_phone: str | None
    comment: str
    status: str
    created_at: datetime
    decided_at: datetime | None
    reject_reason: str | None
    result_school_id: uuid.UUID | None
    signup_code: str | None = None


class SchoolRequestRejectIn(StrictModel):
    reason: str | None = Field(default=None, max_length=500)


class SchoolRequestApproveOut(ORMModel):
    request: SchoolRequestOut
    school: SchoolAdminOut
