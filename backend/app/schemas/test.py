import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.models import TestStatus
from app.schemas.common import ORMModel, StrictModel
from app.schemas.question import QuestionIn, QuestionOut

GRADE_KEYS = {"5", "4", "3", "2"}


class TestCreateIn(StrictModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(default="", max_length=2000)
    subject: str | None = Field(default=None, max_length=60)
    grade: int | None = Field(default=None, ge=1, le=11)
    topic: str | None = Field(default=None, max_length=200)
    template_ref: str | None = Field(default=None, max_length=80)


class TestUpdateIn(StrictModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    grade_thresholds: dict[str, int] | None = None
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None
    time_limit_min: int | None = Field(default=None, ge=1, le=600)

    @field_validator("grade_thresholds")
    @classmethod
    def _valid_thresholds(cls, v: dict[str, int] | None):
        if v is None:
            return v
        if set(v.keys()) != GRADE_KEYS:
            raise ValueError("пороги должны содержать ровно ключи 5,4,3,2")
        vals = [v[k] for k in ("5", "4", "3", "2")]
        if not all(0 <= x <= 100 for x in vals):
            raise ValueError("пороги должны быть в диапазоне 0..100")
        if not (vals[0] > vals[1] > vals[2] > vals[3]):
            raise ValueError("пороги должны строго убывать: 5 > 4 > 3 > 2")
        return v


class QuestionsReplaceIn(StrictModel):
    questions: list[QuestionIn] = Field(min_length=0, max_length=100)


class TestOut(ORMModel):
    id: uuid.UUID
    title: str
    description: str
    status: TestStatus
    grade_thresholds: dict
    shuffle_questions: bool
    shuffle_options: bool
    time_limit_min: int | None
    subject: str | None = None
    grade: int | None = None
    topic: str | None = None
    template_ref: str | None = None
    created_at: datetime
    updated_at: datetime
    questions_count: int = 0


class TestDetailOut(TestOut):
    questions: list[QuestionOut] = []


class AIGenerateIn(StrictModel):
    prompt: str = Field(min_length=3, max_length=2000)
    count: int = Field(default=5, ge=1, le=20)
    mode: str = Field(default="replace", pattern="^(replace|append)$")


class AIReviseIn(StrictModel):
    prompt: str = Field(min_length=3, max_length=2000)
    # текущий черновик вопросов с экрана редактора (может быть еще не сохранен)
    questions: list[QuestionIn] = Field(min_length=1, max_length=100)


class AIQuestionsOut(StrictModel):
    questions: list[QuestionIn]
