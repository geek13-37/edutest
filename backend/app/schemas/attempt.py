import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.models import AttemptStatus
from app.schemas.common import ORMModel, StrictModel
from app.schemas.question import QuestionForStudent, QuestionOut


class AnswerIn(StrictModel):
    question_id: uuid.UUID
    selected: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("selected")
    @classmethod
    def _limit_item_length(cls, v: list[str]) -> list[str]:
        if any(len(s) > 200 for s in v):
            raise ValueError("ответ слишком длинный")
        return v


class AttemptStateOut(ORMModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    attempt_no: int
    status: AttemptStatus
    started_at: datetime
    deadline_at: datetime | None
    test_title: str
    time_limit_min: int | None
    questions: list[QuestionForStudent]
    answers: dict[str, list[str]]  # question_id -> selected


class AttemptResultOut(ORMModel):
    """Что видит ученик после сдачи: только процент."""

    id: uuid.UUID
    status: AttemptStatus
    percent: float
    submitted_at: datetime | None


class AnswerReviewOut(ORMModel):
    question: QuestionOut
    selected: list[str]
    is_correct: bool


class AttemptReviewOut(ORMModel):
    """Полный разбор, только для учителя."""

    id: uuid.UUID
    student_name: str
    student_login: str
    attempt_no: int
    status: AttemptStatus
    score: int
    max_score: int
    percent: float
    grade: str
    started_at: datetime
    submitted_at: datetime | None
    answers: list[AnswerReviewOut]
