from __future__ import annotations

import uuid
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import RefreshSession, School, User, UserRole
from app.schemas.auth import ChangePasswordIn, LoginIn, RegisterTeacherIn

_CREDENTIALS_ERROR = HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный логин или пароль")

# фиктивный argon2-хеш: сравниваем с ним, когда пользователь не найден,
# чтобы время ответа не зависело от существования логина (защита от перечисления)
_DUMMY_HASH = hash_password("dummy-password-for-constant-time-compare")


def revoke_all_sessions(db: Session, user_id: uuid.UUID) -> None:
    """Отзывает все refresh-сессии пользователя (смена/сброс пароля, компрометация)."""
    for s in db.scalars(
        select(RefreshSession).where(
            RefreshSession.user_id == user_id, RefreshSession.revoked.is_(False)
        )
    ):
        s.revoked = True


def _issue_pair(db: Session, user: User) -> tuple[str, str]:
    access = create_access_token(user.id, user.role.value)
    refresh, jti, exp = create_refresh_token(user.id)
    db.add(RefreshSession(jti=jti, user_id=user.id, expires_at=exp))
    return access, refresh


def school_by_code(db: Session, code: str) -> School:
    from app.services import school_service

    school = school_service.get_by_signup_code(db, code)
    if school is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Школа с таким кодом не найдена")
    return school


def register_teacher(db: Session, data: RegisterTeacherIn) -> tuple[User, str, str]:
    school = school_by_code(db, data.school_code)

    email = data.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        role=UserRole.teacher,
        school_id=school.id,
    )
    db.add(user)
    db.flush()
    access, refresh = _issue_pair(db, user)
    return user, access, refresh


def login(db: Session, data: LoginIn) -> tuple[User, str, str]:
    key = data.login.strip().lower()
    user = db.scalar(select(User).where(or_(User.email == key, User.username == key)))
    password_ok = verify_password(
        data.password, user.password_hash if user is not None else _DUMMY_HASH
    )
    school_archived = (
        user is not None
        and user.school_id is not None
        and db.scalar(
            select(School.archived_at).where(School.id == user.school_id)
        )
        is not None
    )
    # единый ответ для «нет такого логина», «неверный пароль», «аккаунт отключен»
    # и «школа в архиве», чтобы нельзя было перечислять пользователей по коду ответа
    if user is None or not password_ok or not user.is_active or school_archived:
        raise _CREDENTIALS_ERROR
    access, refresh = _issue_pair(db, user)
    return user, access, refresh


def change_password(db: Session, user: User, data: ChangePasswordIn) -> None:
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Текущий пароль неверный")
    user.password_hash = hash_password(data.new_password)
    revoke_all_sessions(db, user.id)
    db.flush()


def refresh_tokens(db: Session, token: str) -> tuple[User, str, str]:
    try:
        payload = decode_token(token, "refresh")
        jti = payload["jti"]
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный refresh-токен")

    session = db.scalar(select(RefreshSession).where(RefreshSession.jti == jti))
    if session is None or session.revoked or session.user_id != user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Сессия недействительна")
    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Сессия истекла")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")

    # ротация: старый refresh отзываем
    session.revoked = True
    access, new_refresh = _issue_pair(db, user)
    return user, access, new_refresh


def logout(db: Session, token: str) -> None:
    try:
        payload = decode_token(token, "refresh")
        jti = payload["jti"]
    except (jwt.PyJWTError, KeyError):
        return
    session = db.scalar(select(RefreshSession).where(RefreshSession.jti == jti))
    if session is not None:
        session.revoked = True
