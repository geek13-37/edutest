import uuid

from pydantic import Field

from app.schemas.common import ORMModel, StrictModel


class StudentCreateIn(StrictModel):
    full_name: str = Field(min_length=2, max_length=120)


class StudentBulkCreateIn(StrictModel):
    names: list[str] = Field(min_length=1, max_length=60)


class AddMemberIn(StrictModel):
    student_id: uuid.UUID


class StudentCredentials(ORMModel):
    """Логин и пароль в открытом виде, отдается только при создании/сбросе."""

    id: uuid.UUID
    full_name: str
    username: str
    password: str


class StudentOut(ORMModel):
    id: uuid.UUID
    full_name: str
    username: str | None


class HandoutItem(StrictModel):
    full_name: str = Field(min_length=1, max_length=120)
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=64)


class HandoutRequest(StrictModel):
    items: list[HandoutItem] = Field(min_length=1, max_length=60)
