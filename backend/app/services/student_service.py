from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Class, ClassMember, School, User, UserRole
from app.services.class_service import get_school_class
from app.services.password_words import generate_password

MAX_BULK = 60


def _next_username(db: Session, school: School) -> str:
    for _ in range(200):
        school.student_seq += 1
        candidate = f"{school.login_prefix}-{school.student_seq:02d}"
        if not db.scalar(select(User.id).where(User.username == candidate)):
            return candidate
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Не удалось сгенерировать логин")


def _require_school(teacher: User) -> uuid.UUID:
    if teacher.school_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "У учителя не указана школа")
    return teacher.school_id


def create_student(db: Session, teacher: User, class_id: uuid.UUID, full_name: str) -> dict:
    school_id = _require_school(teacher)
    klass = get_school_class(db, teacher, class_id)
    school = db.get(School, school_id)

    username = _next_username(db, school)
    password = generate_password()
    student = User(
        username=username,
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        role=UserRole.student,
        school_id=school_id,
    )
    db.add(student)
    db.flush()
    db.add(ClassMember(class_id=klass.id, student_id=student.id))
    db.flush()
    return {"id": student.id, "full_name": student.full_name, "username": username, "password": password}


def create_students_bulk(db: Session, teacher: User, class_id: uuid.UUID, names: list[str]) -> list[dict]:
    cleaned = [n.strip() for n in names if n.strip()]
    if not cleaned:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Список имен пуст")
    if len(cleaned) > MAX_BULK:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"За раз можно создать не больше {MAX_BULK} учеников")
    return [create_student(db, teacher, class_id, name) for name in cleaned]


def reset_password(db: Session, teacher: User, student_id: uuid.UUID) -> dict:
    from app.services.auth_service import revoke_all_sessions

    school_id = _require_school(teacher)
    student = db.get(User, student_id)
    if student is None or student.role != UserRole.student or student.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ученик не найден")
    password = generate_password()
    student.password_hash = hash_password(password)
    revoke_all_sessions(db, student.id)
    db.flush()
    return {"id": student.id, "full_name": student.full_name, "username": student.username, "password": password}


def search_school_students(db: Session, teacher: User, query: str, limit: int = 20) -> list[User]:
    school_id = _require_school(teacher)
    stmt = select(User).where(User.school_id == school_id, User.role == UserRole.student)
    q = query.strip()
    if q:
        stmt = stmt.where(or_(User.full_name.ilike(f"%{q}%"), User.username.ilike(f"%{q}%")))
    return list(db.scalars(stmt.order_by(User.full_name).limit(limit)).all())


def add_existing_member(db: Session, teacher: User, class_id: uuid.UUID, student_id: uuid.UUID) -> None:
    school_id = _require_school(teacher)
    get_school_class(db, teacher, class_id)
    student = db.get(User, student_id)
    if student is None or student.role != UserRole.student or student.school_id != school_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ученик не найден в вашей школе")
    exists = db.scalar(
        select(ClassMember).where(
            ClassMember.class_id == class_id, ClassMember.student_id == student_id
        )
    )
    if exists is None:
        db.add(ClassMember(class_id=class_id, student_id=student_id))
        db.flush()


def list_members(db: Session, teacher: User, class_id: uuid.UUID) -> list[tuple[ClassMember, User]]:
    get_school_class(db, teacher, class_id)
    rows = db.execute(
        select(ClassMember, User)
        .join(User, User.id == ClassMember.student_id)
        .where(ClassMember.class_id == class_id)
        .order_by(User.full_name)
    ).all()
    return [(m, u) for m, u in rows]
