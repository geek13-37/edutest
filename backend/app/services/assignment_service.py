from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Assignment,
    Attempt,
    AttemptStatus,
    Class,
    ClassMember,
    Question,
    Test,
    User,
)
from app.schemas.assignment import AssignmentCreateIn
from app.services import class_service
from app.services.class_service import get_school_class
from app.services.test_service import get_owned_test


def create_assignment(db: Session, teacher: User, data: AssignmentCreateIn) -> Assignment:
    test = get_owned_test(db, teacher.id, data.test_id)
    if test.status.value != "published":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Сначала опубликуйте тест")
    get_school_class(db, teacher, data.class_id)

    assignment = Assignment(
        test_id=test.id,
        class_id=data.class_id,
        assigned_by=teacher.id,
        opens_at=data.opens_at,
        closes_at=data.closes_at,
        max_attempts=data.max_attempts,
    )
    db.add(assignment)
    db.flush()
    return assignment


def count_teacher_assignments(db: Session, teacher: User) -> int:
    return db.scalar(
        select(func.count(Assignment.id)).where(Assignment.assigned_by == teacher.id)
    ) or 0


def get_school_assignment(db: Session, teacher: User, assignment_id: uuid.UUID) -> Assignment:
    row = db.execute(
        select(Assignment)
        .join(Class, Class.id == Assignment.class_id)
        .where(Assignment.id == assignment_id, Class.school_id == teacher.school_id)
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Назначение не найдено")
    return row


def list_class_assignments(db: Session, teacher: User, class_id: uuid.UUID) -> list[Assignment]:
    get_school_class(db, teacher, class_id)
    return list(
        db.scalars(
            select(Assignment)
            .where(Assignment.class_id == class_id)
            .order_by(Assignment.created_at.desc())
        ).all()
    )


def delete_assignment(db: Session, teacher: User, assignment_id: uuid.UUID) -> None:
    db.delete(get_school_assignment(db, teacher, assignment_id))


def is_open(assignment: Assignment, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    if assignment.opens_at and now < assignment.opens_at:
        return False
    if assignment.closes_at and now > assignment.closes_at:
        return False
    return True


def _student_assignments_query(db: Session, student_id: uuid.UUID):
    return (
        db.execute(
            select(Assignment, Test, Class)
            .join(Test, Test.id == Assignment.test_id)
            .join(Class, Class.id == Assignment.class_id)
            .join(ClassMember, ClassMember.class_id == Class.id)
            .where(ClassMember.student_id == student_id)
            .order_by(Assignment.created_at.desc())
        )
        .all()
    )


def student_assignment_view(db: Session, student_id: uuid.UUID) -> list[dict]:
    rows = _student_assignments_query(db, student_id)
    out: list[dict] = []
    for assignment, test, klass in rows:
        attempts = list(
            db.scalars(
                select(Attempt).where(
                    Attempt.assignment_id == assignment.id,
                    Attempt.student_id == student_id,
                )
            ).all()
        )
        used = sum(1 for a in attempts if a.status != AttemptStatus.in_progress)
        active = next((a for a in attempts if a.status == AttemptStatus.in_progress), None)
        finished = [a for a in attempts if a.status == AttemptStatus.submitted]
        best = max((a.percent for a in finished), default=None)
        left = None if assignment.max_attempts is None else max(0, assignment.max_attempts - used)
        qcount = db.scalar(
            select(func.count(Question.id)).where(Question.test_id == test.id)
        ) or 0
        out.append(
            {
                "id": assignment.id,
                "test_title": test.title,
                "test_description": test.description,
                "class_name": class_service.display_name(klass),
                "questions_count": qcount,
                "time_limit_min": test.time_limit_min,
                "opens_at": assignment.opens_at,
                "closes_at": assignment.closes_at,
                "max_attempts": assignment.max_attempts,
                "attempts_used": used,
                "attempts_left": left,
                "best_percent": best,
                "is_open": is_open(assignment),
                "active_attempt_id": active.id if active else None,
            }
        )
    return out


def get_student_assignment(db: Session, student_id: uuid.UUID, assignment_id: uuid.UUID) -> tuple[Assignment, Test]:
    row = db.execute(
        select(Assignment, Test)
        .join(Test, Test.id == Assignment.test_id)
        .join(ClassMember, ClassMember.class_id == Assignment.class_id)
        .where(
            Assignment.id == assignment_id,
            ClassMember.student_id == student_id,
        )
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Назначение не найдено")
    return row[0], row[1]
