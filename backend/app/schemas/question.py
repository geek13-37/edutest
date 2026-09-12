import uuid

from pydantic import Field, field_validator, model_validator

from app.models import QuestionType
from app.schemas.common import ORMModel, StrictModel


class OptionIn(StrictModel):
    id: str = Field(min_length=1, max_length=8)
    text: str = Field(min_length=1, max_length=500)


class QuestionIn(StrictModel):
    type: QuestionType
    text: str = Field(min_length=1, max_length=2000)
    options: list[OptionIn] = Field(default_factory=list, max_length=10)
    correct: list[str] = Field(min_length=1, max_length=10)
    points: int = Field(default=1, ge=1, le=100)

    @field_validator("options")
    @classmethod
    def _unique_option_ids(cls, v: list[OptionIn]) -> list[OptionIn]:
        ids = [o.id for o in v]
        if len(ids) != len(set(ids)):
            raise ValueError("id вариантов должны быть уникальны")
        return v

    @model_validator(mode="after")
    def _check(self):
        if self.type == QuestionType.short:
            # correct - это приемлемые строки-ответы, не id вариантов
            answers = [a.strip() for a in self.correct if a.strip()]
            if not answers:
                raise ValueError("для короткого ответа нужен хотя бы один вариант ответа")
            if any(len(a) > 100 for a in answers):
                raise ValueError("вариант ответа слишком длинный (максимум 100 символов)")
            self.correct = list(dict.fromkeys(answers))
            self.options = []
            return self

        if len(self.options) < 2:
            raise ValueError("нужно минимум 2 варианта ответа")
        option_ids = {o.id for o in self.options}
        if not set(self.correct).issubset(option_ids):
            raise ValueError("correct ссылается на несуществующий вариант")
        if len(set(self.correct)) != len(self.correct):
            raise ValueError("correct содержит дубликаты")
        if self.type in (QuestionType.single, QuestionType.boolean) and len(self.correct) != 1:
            raise ValueError("для этого типа вопроса должен быть ровно один правильный вариант")
        if self.type == QuestionType.multiple and len(self.correct) < 2:
            raise ValueError("для вопроса с несколькими вариантами нужно минимум 2 правильных")
        if self.type == QuestionType.boolean and len(self.options) != 2:
            raise ValueError("вопрос верно/неверно должен иметь ровно 2 варианта")
        return self


class QuestionOut(ORMModel):
    id: uuid.UUID
    position: int
    type: QuestionType
    text: str
    options: list
    correct: list
    points: int


class QuestionForStudent(ORMModel):
    """Вопрос без правильных ответов, уходит ученику."""

    id: uuid.UUID
    position: int
    type: QuestionType
    text: str
    options: list
    points: int
