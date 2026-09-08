from __future__ import annotations

import re
import secrets
import uuid
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models import Class as ClassModel
from app.models import School, User, UserRole
from app.services import audit_service
from app.services.code_words import generate_signup_code

_WS = re.compile(r"\s+")

SchoolScope = Literal["active", "archived", "all"]


def normalize(value: str) -> str:
    return _WS.sub(" ", value).strip()


def get(db: Session, school_id: uuid.UUID) -> School:
    school = db.get(School, school_id)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Школа не найдена")
    return school


def get_by_signup_code(db: Session, code: str) -> School | None:
    normalized = code.strip().lower()
    return db.scalar(
        select(School).where(func.lower(School.signup_code) == normalized)
    )


def _make_login_prefix(db: Session) -> str:
    """Случайный уникальный числовой префикс логинов школы, напр. 237.

    Логины учеников строятся как <префикс>-NN, поэтому префикс задается
    автоматически и не требует ввода администратором.
    """
    for width in (3, 4, 5):
        lo, hi = 10 ** (width - 1), 10 ** width - 1
        for _ in range(60):
            candidate = str(secrets.randbelow(hi - lo + 1) + lo)
            if not db.scalar(select(School.id).where(School.login_prefix == candidate)):
                return candidate
    raise HTTPException(
        status.HTTP_500_INTERNAL_SERVER_ERROR, "Не удалось сгенерировать префикс логинов"
    )


def _unique_signup_code(db: Session) -> str:
    for _ in range(50):
        code = generate_signup_code()
        if not db.scalar(select(School.id).where(func.lower(School.signup_code) == code)):
            return code
    raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Не удалось сгенерировать код")


def create_school(
    db: Session,
    *,
    name: str,
    city: str,
    region: str = "",
    created_by: uuid.UUID | None = None,
    actor: User | None = None,
) -> School:
    name, city, region = normalize(name), normalize(city), normalize(region)
    exists = db.scalar(
        select(School).where(
            func.lower(School.name) == name.lower(), func.lower(School.city) == city.lower()
        )
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Такая школа уже есть")
    school = School(
        name=name,
        city=city,
        region=region,
        login_prefix=_make_login_prefix(db),
        signup_code=_unique_signup_code(db),
        created_by=created_by,
    )
    db.add(school)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school.create",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Создана школа «{school.name}», {school.city}",
    )
    return school


def regenerate_signup_code(
    db: Session, school_id: uuid.UUID, actor: User | None = None
) -> School:
    school = get(db, school_id)
    school.signup_code = _unique_signup_code(db)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school.regenerate_code",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Перевыпущен код регистрации школы «{school.name}»",
    )
    return school


def update_school(
    db: Session,
    school_id: uuid.UUID,
    *,
    name=None,
    city=None,
    region=None,
    actor: User | None = None,
) -> School:
    school = get(db, school_id)
    changed: list[str] = []
    if name is not None and normalize(name) != school.name:
        school.name = normalize(name)
        changed.append("название")
    if city is not None and normalize(city) != school.city:
        school.city = normalize(city)
        changed.append("город")
    if region is not None and normalize(region) != school.region:
        school.region = normalize(region)
        changed.append("регион")
    db.flush()
    if changed:
        audit_service.record(
            db,
            actor=actor,
            action="school.update",
            target_type="school",
            target_id=school.id,
            target_label=f"{school.name}, {school.city}",
            summary=f"Изменена школа «{school.name}»: {', '.join(changed)}",
        )
    return school


def archive_school(db: Session, school_id: uuid.UUID, actor: User | None = None) -> School:
    from app.services.auth_service import revoke_all_sessions

    school = get(db, school_id)
    if school.archived_at is not None:
        return school
    school.archived_at = utcnow()
    for member in db.scalars(select(User).where(User.school_id == school.id)):
        revoke_all_sessions(db, member.id)
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school.archive",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Школа «{school.name}» отправлена в архив, вход заблокирован",
    )
    return school


def restore_school(db: Session, school_id: uuid.UUID, actor: User | None = None) -> School:
    school = get(db, school_id)
    if school.archived_at is None:
        return school
    school.archived_at = None
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school.restore",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Школа «{school.name}» восстановлена из архива",
    )
    return school


def delete_school(db: Session, school_id: uuid.UUID, actor: User | None = None) -> None:
    school = get(db, school_id)
    if school.archived_at is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Сначала отправьте школу в архив, затем удаляйте навсегда",
        )
    audit_service.record(
        db,
        actor=actor,
        action="school.delete",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Школа «{school.name}» удалена навсегда со всеми классами и результатами",
    )
    db.delete(school)


def _archived_school_ids(db: Session):
    return select(School.id).where(School.archived_at.is_not(None)).scalar_subquery()


def _counts(db: Session, school_id: uuid.UUID) -> tuple[int, int]:
    teachers = db.scalar(
        select(func.count(User.id)).where(
            User.school_id == school_id, User.role == UserRole.teacher
        )
    ) or 0
    students = db.scalar(
        select(func.count(User.id)).where(
            User.school_id == school_id, User.role == UserRole.student
        )
    ) or 0
    return teachers, students


def list_schools(db: Session, *, scope: SchoolScope = "active") -> list[dict]:
    stmt = select(School).order_by(School.city, School.name)
    if scope == "active":
        stmt = stmt.where(School.archived_at.is_(None))
    elif scope == "archived":
        stmt = stmt.where(School.archived_at.is_not(None))
    out = []
    for s in db.scalars(stmt).all():
        t, st = _counts(db, s.id)
        out.append({"school": s, "teachers": t, "students": st})
    return out


def school_stats(db: Session) -> dict:
    archived = _archived_school_ids(db)
    not_archived = or_(User.school_id.is_(None), User.school_id.not_in(archived))
    return {
        "schools": db.scalar(
            select(func.count(School.id)).where(School.archived_at.is_(None))
        ) or 0,
        "teachers": db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.teacher, not_archived)
        ) or 0,
        "students": db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.student, not_archived)
        ) or 0,
        "classes": db.scalar(
            select(func.count(ClassModel.id)).where(ClassModel.school_id.not_in(archived))
        ) or 0,
    }
