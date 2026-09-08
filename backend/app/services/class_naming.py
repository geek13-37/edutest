"""Отображаемое имя класса с авто-повышением номера параллели 1 сентября."""
from __future__ import annotations

from datetime import date

MAX_GRADE = 11


def current_school_end_year(today: date | None = None) -> int:
    """Календарный год, которым заканчивается текущий учебный год.

    1 сентября и позже -> учебный год заканчивается в следующем календарном году.
    """
    today = today or date.today()
    return today.year + 1 if today.month >= 9 else today.year


def graduation_year_for(grade: int, today: date | None = None) -> int:
    """По номеру класса «сейчас» вычисляет год окончания школы (конец 11 класса)."""
    return current_school_end_year(today) + (MAX_GRADE - grade)


def current_grade(graduation_year: int, today: date | None = None) -> int:
    return MAX_GRADE - (graduation_year - current_school_end_year(today))


def display_name(
    *,
    name: str | None,
    letter: str | None,
    graduation_year: int | None,
    today: date | None = None,
) -> str:
    if graduation_year is not None:
        grade = current_grade(graduation_year, today)
        letter = (letter or "").strip()
        if grade < 1:
            return f"{letter} (еще не набран)".strip()
        if grade > MAX_GRADE:
            return f"Выпуск {graduation_year}" + (f", {letter}" if letter else "")
        return f"{grade}{letter}"
    return name or "Класс"
