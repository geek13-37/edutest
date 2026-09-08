import uuid
from datetime import datetime

from pydantic import Field, model_validator

from app.schemas.common import ORMModel, StrictModel


class ClassCreateIn(StrictModel):
    grade: int | None = Field(default=None, ge=1, le=11)
    letter: str | None = Field(default=None, min_length=1, max_length=4)
    name: str | None = Field(default=None, min_length=2, max_length=120)

    @model_validator(mode="after")
    def _check(self):
        if self.grade is not None and not self.letter:
            raise ValueError("укажите букву класса")
        if self.grade is None and not self.name:
            raise ValueError("укажите параллель и букву или произвольное название")
        return self


class ClassUpdateIn(StrictModel):
    grade: int | None = Field(default=None, ge=1, le=11)
    letter: str | None = Field(default=None, min_length=1, max_length=4)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    archived: bool | None = None


class ClassMemberOut(ORMModel):
    id: uuid.UUID
    student_id: uuid.UUID
    full_name: str
    username: str | None
    joined_at: datetime


class ClassOut(ORMModel):
    id: uuid.UUID
    display_name: str
    name: str | None
    letter: str | None
    grade: int | None
    graduation_year: int | None
    archived: bool
    created_at: datetime
    members_count: int = 0
    created_by_name: str = ""
    is_mine: bool = True


class StudentClassOut(ORMModel):
    id: uuid.UUID
    display_name: str
    teacher_name: str
    joined_at: datetime
