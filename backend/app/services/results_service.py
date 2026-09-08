from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Assignment,
    Attempt,
    AttemptStatus,
    Class,
    ClassMember,
    Test,
    User,
)
from app.services import class_service, grading
from app.services.assignment_service import get_school_assignment


def assignment_results(db: Session, teacher: User, assignment_id: uuid.UUID) -> dict:
    assignment = get_school_assignment(db, teacher, assignment_id)
    test = db.get(Test, assignment.test_id)
    klass = db.get(Class, assignment.class_id)

    students = db.execute(
        select(User)
        .join(ClassMember, ClassMember.student_id == User.id)
        .where(ClassMember.class_id == assignment.class_id)
        .order_by(User.full_name)
    ).scalars().all()

    attempts = db.scalars(
        select(Attempt).where(Attempt.assignment_id == assignment_id)
    ).all()
    by_student: dict[uuid.UUID, list[Attempt]] = {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(a)

    rows = []
    percents: list[float] = []
    submitted_count = 0
    for s in students:
        s_attempts = by_student.get(s.id, [])
        finished = [a for a in s_attempts if a.status in (AttemptStatus.submitted, AttemptStatus.expired)]
        used = len(finished)
        best = max(finished, key=lambda a: a.percent, default=None)
        if best is not None:
            submitted_count += 1
            percents.append(best.percent)
        rows.append(
            {
                "student_id": s.id,
                "student_name": s.full_name,
                "student_login": s.username or "",
                "attempts_used": used,
                "best_attempt_id": best.id if best else None,
                "best_score": best.score if best else None,
                "max_score": best.max_score if best else None,
                "best_percent": best.percent if best else None,
                "grade": grading.grade_letter(best.percent, test.grade_thresholds) if best else None,
                "last_activity": max((a.submitted_at or a.started_at for a in s_attempts), default=None),
                "status": best.status if best else None,
            }
        )

    return {
        "assignment_id": assignment_id,
        "test_title": test.title,
        "class_name": class_service.display_name(klass),
        "total_students": len(students),
        "submitted_count": submitted_count,
        "average_percent": round(sum(percents) / len(percents), 1) if percents else None,
        "rows": rows,
    }


def attempt_review(db: Session, teacher: User, attempt_id: uuid.UUID) -> dict:
    attempt = db.scalar(
        select(Attempt).where(Attempt.id == attempt_id).options(selectinload(Attempt.answers))
    )
    if attempt is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")
    assignment = db.get(Assignment, attempt.assignment_id)
    klass = db.get(Class, assignment.class_id)
    if klass is None or klass.school_id != teacher.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Попытка не найдена")

    test = db.scalar(
        select(Test).where(Test.id == assignment.test_id).options(selectinload(Test.questions))
    )
    student = db.get(User, attempt.student_id)
    by_id = {str(q.id): q for q in test.questions}
    ordered = [by_id[qid] for qid in attempt.question_order if qid in by_id]
    ans_by_q = {str(a.question_id): a for a in attempt.answers}

    answers = []
    for q in ordered:
        a = ans_by_q.get(str(q.id))
        answers.append(
            {
                "question": {
                    "id": q.id,
                    "position": q.position,
                    "type": q.type,
                    "text": q.text,
                    "options": q.options,
                    "correct": q.correct,
                    "points": q.points,
                },
                "selected": a.selected if a else [],
                "is_correct": a.is_correct if a else False,
            }
        )

    return {
        "id": attempt.id,
        "student_name": student.full_name,
        "student_login": student.username or "",
        "attempt_no": attempt.attempt_no,
        "status": attempt.status,
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percent": attempt.percent,
        "grade": grading.grade_letter(attempt.percent, test.grade_thresholds),
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "answers": answers,
    }
