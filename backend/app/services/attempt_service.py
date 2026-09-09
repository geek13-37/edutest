from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Assignment, Attempt, AttemptAnswer, AttemptStatus, Question, Test
from app.services import grading
from app.services.assignment_service import get_student_assignment, is_open


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ordered_questions(test: Test, attempt: Attempt) -> list[Question]:
    by_id = {str(q.id): q for q in test.questions}
    return [by_id[qid] for qid in attempt.question_order if qid in by_id]


def _student_options(question: Question, attempt: Attempt) -> list[dict]:
    order = attempt.option_orders.get(str(question.id))
    if not order:
        return question.options
    by_id = {o["id"]: o for o in question.options}
    return [by_id[oid] for oid in order if oid in by_id]


def _expire_if_needed(db: Session, attempt: Attempt) -> Attempt:
    if attempt.status == AttemptStatus.in_progress and attempt.deadline_at and _now() > attempt.deadline_at:
        _finalize(db, attempt, expired=True)
    return attempt


def start_attempt(db: Session, student_id: uuid.UUID, assignment_id: uuid.UUID) -> Attempt:
    assignment, test = get_student_assignment(db, student_id, assignment_id)
    test = db.scalar(
        select(Test).where(Test.id == test.id).options(selectinload(Test.questions))
    )
    if test.status.value != "published" or not test.questions:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Тест недоступен")
    if not is_open(assignment):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Тест сейчас закрыт")

    existing = list(
        db.scalars(
            select(Attempt).where(
                Attempt.assignment_id == assignment_id,
                Attempt.student_id == student_id,
            )
        ).all()
    )
    active = next((a for a in existing if a.status == AttemptStatus.in_progress), None)
    if active:
        return _expire_if_needed(db, active)

    used = sum(1 for a in existing if a.status != AttemptStatus.in_progress)
    if assignment.max_attempts is not None and used >= assignment.max_attempts:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Попытки закончились")

    questions = list(test.questions)
    q_ids = [str(q.id) for q in questions]
    if test.shuffle_questions:
        random.shuffle(q_ids)

    option_orders: dict[str, list[str]] = {}
    if test.shuffle_options:
        for q in questions:
            if q.type.value == "boolean":
                continue
            oids = [o["id"] for o in q.options]
            random.shuffle(oids)
            option_orders[str(q.id)] = oids

    started = _now()
    deadline = None
    if test.time_limit_min:
        deadline = started + timedelta(minutes=test.time_limit_min)
    if assignment.closes_at:
        deadline = min(deadline, assignment.closes_at) if deadline else assignment.closes_at

    attempt = Attempt(
        assignment_id=assignment_id,
        student_id=student_id,
        attempt_no=used + 1,
        status=AttemptStatus.in_progress,
        started_at=started,
        deadline_at=deadline,
        question_order=q_ids,
        option_orders=option_orders,
        max_score=sum(q.points for q in questions),
    )
    db.add(attempt)
    db.flush()
    return attempt


def _load_attempt(db: Session, attempt_id: uuid.UUID) -> tuple[Attempt, Test]:
    attempt = db.scalar(
        select(Attempt).where(Attempt.id == attempt_id).options(selectinload(Attempt.answers))
    )
    if attempt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")
    assignment = db.get(Assignment, attempt.assignment_id)
    test = db.scalar(
        select(Test).where(Test.id == assignment.test_id).options(selectinload(Test.questions))
    )
    return attempt, test


def get_attempt_state(db: Session, student_id: uuid.UUID, attempt_id: uuid.UUID) -> dict:
    attempt, test = _load_attempt(db, attempt_id)
    if attempt.student_id != student_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")
    _expire_if_needed(db, attempt)

    questions = _ordered_questions(test, attempt)
    payload_questions = []
    for pos, q in enumerate(questions):
        payload_questions.append(
            {
                "id": q.id,
                "position": pos,
                "type": q.type,
                "text": q.text,
                "image_url": q.image_url,
                "options": _student_options(q, attempt),
                "points": q.points,
            }
        )
    answers = {str(a.question_id): a.selected for a in attempt.answers}
    return {
        "id": attempt.id,
        "assignment_id": attempt.assignment_id,
        "attempt_no": attempt.attempt_no,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "deadline_at": attempt.deadline_at,
        "test_title": test.title,
        "time_limit_min": test.time_limit_min,
        "questions": payload_questions,
        "answers": answers,
    }


def save_answer(db: Session, student_id: uuid.UUID, attempt_id: uuid.UUID, question_id: uuid.UUID, selected: list[str]) -> None:
    attempt, test = _load_attempt(db, attempt_id)
    if attempt.student_id != student_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")
    if attempt.status != AttemptStatus.in_progress:
        raise HTTPException(status.HTTP_409_CONFLICT, "Попытка уже завершена")
    if attempt.deadline_at and _now() > attempt.deadline_at:
        _finalize(db, attempt, expired=True)
        raise HTTPException(status.HTTP_409_CONFLICT, "Время вышло")

    question = next((q for q in test.questions if q.id == question_id), None)
    if question is None or str(question_id) not in attempt.question_order:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Вопрос не из этой попытки")

    if question.type.value == "short":
        raw = (selected[0].strip() if selected and selected[0] else "")[:200]
        cleaned = [raw] if raw else []
    else:
        valid_ids = {o["id"] for o in question.options}
        cleaned = [s for s in dict.fromkeys(selected) if s in valid_ids]
        if question.type.value in ("single", "boolean") and len(cleaned) > 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Для этого вопроса допустим один вариант")

    row = next((a for a in attempt.answers if a.question_id == question_id), None)
    if row is None:
        db.add(
            AttemptAnswer(
                attempt_id=attempt.id,
                question_id=question_id,
                selected=cleaned,
                is_correct=False,
                answered_at=_now(),
            )
        )
    else:
        row.selected = cleaned
        row.answered_at = _now()
    db.flush()


def _finalize(db: Session, attempt: Attempt, *, expired: bool) -> Attempt:
    assignment = db.get(Assignment, attempt.assignment_id)
    test = db.scalar(
        select(Test).where(Test.id == assignment.test_id).options(selectinload(Test.questions))
    )
    questions = _ordered_questions(test, attempt)
    answers = {str(a.question_id): a.selected for a in attempt.answers}
    score, max_score, flags = grading.grade(questions, answers)

    for q, ok in zip(questions, flags):
        row = next((a for a in attempt.answers if a.question_id == q.id), None)
        if row is not None:
            row.is_correct = ok

    attempt.score = score
    attempt.max_score = max_score
    attempt.percent = grading.percent_of(score, max_score)
    attempt.status = AttemptStatus.expired if expired else AttemptStatus.submitted
    attempt.submitted_at = _now()
    db.flush()
    return attempt


def submit_attempt(db: Session, student_id: uuid.UUID, attempt_id: uuid.UUID) -> Attempt:
    attempt, _ = _load_attempt(db, attempt_id)
    if attempt.student_id != student_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")
    if attempt.status != AttemptStatus.in_progress:
        return attempt
    expired = bool(attempt.deadline_at and _now() > attempt.deadline_at)
    return _finalize(db, attempt, expired=expired)
