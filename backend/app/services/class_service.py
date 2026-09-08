from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Class, ClassMember, User
from app.schemas.klass import ClassCreateIn, ClassUpdateIn
from app.services import class_naming


def display_name(klass: Class) -> str:
    return class_naming.display_name(
        name=klass.name, letter=klass.letter, graduation_year=klass.graduation_year
    )


def current_grade(klass: Class) -> int | None:
    if klass.graduation_year is None:
        return None
    return class_naming.current_grade(klass.graduation_year)


def _members_count(db: Session, class_id: uuid.UUID) -> int:
    return db.scalar(
        select(func.count(ClassMember.id)).where(ClassMember.class_id == class_id)
    ) or 0


def get_school_class(db: Session, teacher: User, class_id: uuid.UUID) -> Class:
    """Класс доступен любому учителю своей школы."""
    klass = db.get(Class, class_id)
    if klass is None or klass.school_id != teacher.school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Класс не найден")
    return klass


def _apply_naming(klass: Class, *, grade, letter, name) -> None:
    if grade is not None:
        klass.letter = (letter or klass.letter or "").strip().upper()
        klass.graduation_year = class_naming.graduation_year_for(grade)
        klass.name = None
    elif name is not None:
        klass.name = name.strip()
        klass.letter = None
        klass.graduation_year = None


def create_class(db: Session, teacher: User, data: ClassCreateIn) -> Class:
    klass = Class(teacher_id=teacher.id, school_id=teacher.school_id)
    _apply_naming(klass, grade=data.grade, letter=data.letter, name=data.name)
    db.add(klass)
    db.flush()
    return klass


def list_school_classes(db: Session, teacher: User) -> list[tuple[Class, User, int]]:
    rows = db.execute(
        select(Class, User)
        .join(User, User.id == Class.teacher_id)
        .where(Class.school_id == teacher.school_id)
        .order_by(Class.archived, Class.created_at.desc())
    ).all()
    return [(c, creator, _members_count(db, c.id)) for c, creator in rows]


def update_class(db: Session, teacher: User, class_id: uuid.UUID, data: ClassUpdateIn) -> Class:
    klass = get_school_class(db, teacher, class_id)
    if data.grade is not None or data.name is not None:
        _apply_naming(klass, grade=data.grade, letter=data.letter, name=data.name)
    if data.archived is not None:
        klass.archived = data.archived
    db.flush()
    return klass


def delete_class(db: Session, teacher: User, class_id: uuid.UUID) -> None:
    db.delete(get_school_class(db, teacher, class_id))


def remove_member(db: Session, teacher: User, class_id: uuid.UUID, student_id: uuid.UUID) -> None:
    get_school_class(db, teacher, class_id)
    member = db.scalar(
        select(ClassMember).where(
            ClassMember.class_id == class_id, ClassMember.student_id == student_id
        )
    )
    if member is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ученик не найден в классе")
    db.delete(member)


def list_student_classes(db: Session, student_id: uuid.UUID) -> list[tuple[Class, User, ClassMember]]:
    rows = db.execute(
        select(Class, User, ClassMember)
        .join(ClassMember, ClassMember.class_id == Class.id)
        .join(User, User.id == Class.teacher_id)
        .where(ClassMember.student_id == student_id)
        .order_by(ClassMember.created_at.desc())
    ).all()
    return [(c, t, m) for c, t, m in rows]
