"""Справочник-каталог для шаблонов тестов: школьная программа и задания ОГЭ/ЕГЭ/ВПР.

Данные лежат в app/data/*.json и меняются правкой файлов (не через интерфейс).
Загружаются один раз при импорте модуля.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_DATA = Path(__file__).resolve().parent.parent / "data"


def _load(name: str) -> dict:
    with (_DATA / name).open(encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def curriculum() -> dict:
    return _load("curriculum.json")


@lru_cache(maxsize=1)
def exams() -> dict:
    return _load("exam_tasks.json")


@lru_cache(maxsize=1)
def _topics_by_key() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for subject in curriculum()["subjects"]:
        for grade in subject["grades"]:
            for topic in grade["topics"]:
                out[topic["key"]] = {
                    "subject": subject["name"],
                    "subject_key": subject["key"],
                    "grade": grade["grade"],
                    **topic,
                }
    return out


@lru_cache(maxsize=1)
def _tasks_by_key() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for exam in exams()["exams"]:
        for subject in exam["subjects"]:
            for task in subject["tasks"]:
                out[task["key"]] = {
                    "exam": exam["name"],
                    "exam_key": exam["key"],
                    "grade": subject.get("grade", exam.get("grade")),
                    "subject": subject["name"],
                    "subject_key": subject["key"],
                    **task,
                }
    return out


def find_topic(key: str) -> dict | None:
    return _topics_by_key().get(key)


def find_task(key: str) -> dict | None:
    return _tasks_by_key().get(key)


def prompt_for(ref: str) -> dict | None:
    """Собирает данные для мастера: название теста и затравку промпта ИИ."""
    topic = find_topic(ref)
    if topic is not None:
        title = f"{topic['subject']}, {topic['grade']} класс: {topic['name']}"
        prompt = (
            f"Предмет: {topic['subject']}, {topic['grade']} класс. "
            f"Тема: {topic['name']}. {topic.get('hint', '')} "
            "Составь вопросы разных типов по этой теме школьной программы."
        ).strip()
        return {"title": title, "prompt": prompt, "question_type": None, "count": 5}

    task = find_task(ref)
    if task is not None:
        title = f"{task['exam']} {task['subject']}, задание {task['no']}: {task['title']}"
        qtype = task.get("question_type", "short")
        count = int(task.get("count", 3))
        checks = task.get("checks") or task["title"]
        manual_note = (
            " Это задание с развёрнутым ответом: составь закрытую тренировку по той же теме."
            if task.get("manual")
            else ""
        )
        prompt = (
            f"{task['exam']} по предмету «{task['subject']}», задание номер {task['no']}: {task['title']}. "
            f"Проверяется: {checks}. "
            f"Составь {count} тренировочных вопросов в формате этого задания "
            f"(тип вопроса: {qtype}). Уровень: {task.get('difficulty', 'базовый')}.{manual_note}"
        ).strip()
        return {"title": title, "prompt": prompt, "question_type": qtype, "count": count}

    return None


def _assert_unique_keys() -> None:
    """Проверка целостности каталога, вызывается тестом."""
    topic_keys = [
        t["key"]
        for s in curriculum()["subjects"]
        for g in s["grades"]
        for t in g["topics"]
    ]
    task_keys = [
        t["key"]
        for e in exams()["exams"]
        for s in e["subjects"]
        for t in s["tasks"]
    ]
    for label, keys in (("curriculum topics", topic_keys), ("exam tasks", task_keys)):
        if len(keys) != len(set(keys)):
            dupes = sorted({k for k in keys if keys.count(k) > 1})
            raise ValueError(f"дубли ключей в {label}: {dupes}")
