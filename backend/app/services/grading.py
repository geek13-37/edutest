"""Чистые функции оценивания. Никогда не вызываются на клиенте."""
from __future__ import annotations

import re
from collections.abc import Iterable

from app.models import Question, QuestionType

_WS = re.compile(r"\s+")


def _norm_short(value: str) -> str:
    """Нормализация короткого ответа: регистр, пробелы, запятая как разделитель дробей."""
    value = _WS.sub(" ", value.strip().lower())
    value = value.replace(",", ".")
    return value


def is_answer_correct(question: Question, selected: Iterable[str]) -> bool:
    selected = list(selected)
    if question.type == QuestionType.short:
        if not selected or not selected[0].strip():
            return False
        given = _norm_short(selected[0])
        return any(given == _norm_short(c) for c in question.correct)
    selected_set = set(selected)
    correct_set = set(question.correct)
    # все-или-ничего: полное совпадение множеств
    return selected_set == correct_set and len(selected_set) > 0


def grade(questions: list[Question], answers: dict[str, list[str]]) -> tuple[int, int, list[bool]]:
    """Возвращает (score, max_score, [is_correct по вопросам в порядке questions])."""
    score = 0
    max_score = 0
    flags: list[bool] = []
    for q in questions:
        max_score += q.points
        ok = is_answer_correct(q, answers.get(str(q.id), []))
        flags.append(ok)
        if ok:
            score += q.points
    return score, max_score, flags


def percent_of(score: int, max_score: int) -> float:
    if max_score <= 0:
        return 0.0
    return round(score / max_score * 100, 1)


def grade_letter(percent: float, thresholds: dict[str, int]) -> str:
    for key in ("5", "4", "3", "2"):
        if percent >= thresholds.get(key, 0):
            return key
    return "1"
