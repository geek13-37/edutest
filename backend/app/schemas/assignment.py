import uuid
from datetime import datetime

from pydantic import Field, model_validator

from app.schemas.common import ORMModel, StrictModel


class AssignmentCreateIn(StrictModel):
    test_id: uuid.UUID
    class_id: uuid.UUID
    opens_at: datetime | None = None
    closes_at: datetime | None = None
    max_attempts: int | None = Field(default=1, ge=1, le=50)

    @model_validator(mode="after")
    def _check_window(self):
        if self.opens_at and self.closes_at and self.opens_at >= self.closes_at:
            raise ValueError("closes_at должен быть позже opens_at")
        return self


class AssignmentOut(ORMModel):
    id: uuid.UUID
    test_id: uuid.UUID
    class_id: uuid.UUID
    test_title: str
    class_name: str
    opens_at: datetime | None
    closes_at: datetime | None
    max_attempts: int | None
    created_at: datetime


class StudentAssignmentOut(ORMModel):
    id: uuid.UUID
    test_title: str
    test_description: str
    class_name: str
    questions_count: int
    time_limit_min: int | None
    opens_at: datetime | None
    closes_at: datetime | None
    max_attempts: int | None
    attempts_used: int
    attempts_left: int | None
    best_percent: float | None
    is_open: bool
    active_attempt_id: uuid.UUID | None
