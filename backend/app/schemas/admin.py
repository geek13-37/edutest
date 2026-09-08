import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import ORMModel, StrictModel


class SchoolCreateIn(StrictModel):
    name: str = Field(min_length=3, max_length=300)
    city: str = Field(min_length=2, max_length=120)
    region: str = Field(default="", max_length=160)


class SchoolUpdateIn(StrictModel):
    name: str | None = Field(default=None, min_length=3, max_length=300)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=160)


class SchoolAdminOut(ORMModel):
    id: uuid.UUID
    name: str
    city: str
    region: str
    login_prefix: str
    signup_code: str
    teachers_count: int
    students_count: int
    created_at: datetime
    archived_at: datetime | None = None


class TeacherAdminOut(ORMModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr | None
    is_active: bool
    school_id: uuid.UUID | None
    school_name: str | None
    created_at: datetime


class TeacherCreateIn(StrictModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    school_id: uuid.UUID


class TeacherCredentials(ORMModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr | None
    password: str


class SetActiveIn(StrictModel):
    is_active: bool


class AdminOut(ORMModel):
    id: uuid.UUID
    full_name: str
    email: EmailStr | None
    is_active: bool
    created_at: datetime


class AdminCreateIn(StrictModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class StatsOut(ORMModel):
    schools: int
    teachers: int
    students: int
    classes: int


class AuditEventOut(ORMModel):
    id: uuid.UUID
    actor_label: str
    action: str
    action_label: str
    target_type: str
    target_label: str
    summary: str
    created_at: datetime


class AuditListOut(ORMModel):
    items: list[AuditEventOut]
    total: int


class WeeklyPoint(ORMModel):
    week_start: str
    new_schools: int
    new_teachers: int
    attempts: int


class TopSchoolOut(ORMModel):
    school_id: uuid.UUID
    name: str
    city: str
    attempts: int
    avg_percent: float | None


class DormantSchoolOut(ORMModel):
    school_id: uuid.UUID
    name: str
    city: str
    created_at: datetime
    last_activity: datetime | None


class AnalyticsTotals(ORMModel):
    attempts_total: int
    tests_conducted: int
    avg_percent: float | None


class AnalyticsOut(ORMModel):
    weekly: list[WeeklyPoint]
    top_schools: list[TopSchoolOut]
    dormant_schools: list[DormantSchoolOut]
    totals: AnalyticsTotals
