from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Question, Test, TestStatus
from app.schemas.question import QuestionIn
from app.schemas.test import TestCreateIn, TestUpdateIn


def get_owned_test(db: Session, owner_id: uuid.UUID, test_id: uuid.UUID, *, with_questions: bool = False) -> Test:
    stmt = select(Test).where(Test.id == test_id)
    if with_questions:
        stmt = stmt.options(selectinload(Test.questions))
    test = db.scalar(stmt)
    if test is None or test.owner_id != owner_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")
    return test


def questions_count(db: Session, test_id: uuid.UUID) -> int:
    return db.scalar(select(func.count(Question.id)).where(Question.test_id == test_id)) or 0


def create_test(db: Session, owner_id: uuid.UUID, data: TestCreateIn) -> Test:
    test = Test(
        owner_id=owner_id,
        title=data.title.strip(),
        description=data.description.strip(),
        subject=data.subject,
        grade=data.grade,
        topic=data.topic,
        template_ref=data.template_ref,
    )
    db.add(test)
    db.flush()
    return test


def list_tests(
    db: Session, owner_id: uuid.UUID, *, subject: str | None = None
) -> list[tuple[Test, int]]:
    stmt = select(Test).where(Test.owner_id == owner_id)
    if subject:
        stmt = stmt.where(Test.subject == subject)
    tests = db.scalars(stmt.order_by(Test.updated_at.desc())).all()
    return [(t, questions_count(db, t.id)) for t in tests]


def update_test(db: Session, owner_id: uuid.UUID, test_id: uuid.UUID, data: TestUpdateIn) -> Test:
    test = get_owned_test(db, owner_id, test_id)
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(test, field, value)
    db.flush()
    return test


def delete_test(db: Session, owner_id: uuid.UUID, test_id: uuid.UUID) -> None:
    test = get_owned_test(db, owner_id, test_id)
    db.delete(test)


def replace_questions(db: Session, owner_id: uuid.UUID, test_id: uuid.UUID, questions: list[QuestionIn]) -> Test:
    test = get_owned_test(db, owner_id, test_id, with_questions=True)
    for q in list(test.questions):
        db.delete(q)
    db.flush()
    for pos, q in enumerate(questions):
        db.add(
            Question(
                test_id=test.id,
                position=pos,
                type=q.type,
                text=q.text.strip(),
                image_url=q.image_url,
                options=[o.model_dump() for o in q.options],
                correct=list(q.correct),
                points=q.points,
            )
        )
    db.flush()
    db.refresh(test)
    return test


def set_status(db: Session, owner_id: uuid.UUID, test_id: uuid.UUID, published: bool) -> Test:
    test = get_owned_test(db, owner_id, test_id, with_questions=True)
    if published and len(test.questions) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нельзя опубликовать тест без вопросов")
    test.status = TestStatus.published if published else TestStatus.draft
    db.flush()
    return test


def questions_as_ai_payload(test: Test) -> list[dict]:
    return [
        {
            "type": q.type.value,
            "text": q.text,
            "image_url": q.image_url,
            "options": q.options,
            "correct": q.correct,
            "points": q.points,
        }
        for q in test.questions
    ]
