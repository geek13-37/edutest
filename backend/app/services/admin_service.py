from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import School, User, UserRole
from app.services import audit_service
from app.services.password_words import generate_password


def list_teachers(db: Session, school_id: uuid.UUID | None = None) -> list[dict]:
    stmt = (
        select(User, School)
        .outerjoin(School, School.id == User.school_id)
        .where(User.role == UserRole.teacher)
        .order_by(User.full_name)
    )
    if school_id is not None:
        stmt = stmt.where(User.school_id == school_id)
    rows = db.execute(stmt).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "is_active": u.is_active,
            "school_id": u.school_id,
            "school_name": s.name if s else None,
            "created_at": u.created_at,
        }
        for u, s in rows
    ]


def create_teacher(
    db: Session, *, full_name: str, email: str, school_id: uuid.UUID, actor: User | None = None
) -> dict:
    school = db.get(School, school_id)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Школа не найдена")
    email = email.lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует")
    password = generate_password()
    teacher = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        role=UserRole.teacher,
        school_id=school_id,
    )
    db.add(teacher)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="teacher.create",
        target_type="teacher",
        target_id=teacher.id,
        target_label=f"{teacher.full_name} ({teacher.email})",
        summary=f"Создан учитель {teacher.full_name} для школы «{school.name}»",
    )
    return {"id": teacher.id, "full_name": teacher.full_name, "email": teacher.email, "password": password}


def _get_teacher(db: Session, teacher_id: uuid.UUID) -> User:
    user = db.get(User, teacher_id)
    if user is None or user.role != UserRole.teacher:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Учитель не найден")
    return user


def set_teacher_active(
    db: Session, teacher_id: uuid.UUID, active: bool, actor: User | None = None
) -> User:
    teacher = _get_teacher(db, teacher_id)
    teacher.is_active = active
    if not active:
        # отключённый учитель не должен продолжать работать по старым токенам
        from app.services.auth_service import revoke_all_sessions

        revoke_all_sessions(db, teacher.id)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="teacher.activate" if active else "teacher.deactivate",
        target_type="teacher",
        target_id=teacher.id,
        target_label=f"{teacher.full_name} ({teacher.email})",
        summary=("Учитель включен: " if active else "Учитель отключен: ") + teacher.full_name,
    )
    return teacher


def reset_teacher_password(
    db: Session, teacher_id: uuid.UUID, actor: User | None = None
) -> dict:
    from app.services.auth_service import revoke_all_sessions

    teacher = _get_teacher(db, teacher_id)
    password = generate_password()
    teacher.password_hash = hash_password(password)
    revoke_all_sessions(db, teacher.id)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="teacher.reset_password",
        target_type="teacher",
        target_id=teacher.id,
        target_label=f"{teacher.full_name} ({teacher.email})",
        summary=f"Сброшен пароль учителя {teacher.full_name}",
    )
    return {"id": teacher.id, "full_name": teacher.full_name, "email": teacher.email, "password": password}


def list_admins(db: Session) -> list[User]:
    return list(
        db.scalars(
            select(User).where(User.role == UserRole.admin).order_by(User.full_name)
        ).all()
    )


def create_admin(
    db: Session, *, full_name: str, email: str, password: str, actor: User | None = None
) -> User:
    email = email.lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует")
    admin = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        role=UserRole.admin,
    )
    db.add(admin)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="admin.create",
        target_type="admin",
        target_id=admin.id,
        target_label=f"{admin.full_name} ({admin.email})",
        summary=f"Создан администратор {admin.full_name}",
    )
    return admin
