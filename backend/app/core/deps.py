import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import School, User, UserRole

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Не авторизован")
    try:
        payload = decode_token(creds.credentials, "access")
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный токен")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Аккаунт отключен")
    if user.school_id is not None:
        school = db.get(School, user.school_id)
        if school is not None and school.archived_at is not None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Школа отключена")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_admin(user: CurrentUser) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только администраторам")
    return user


def get_teacher(user: CurrentUser) -> User:
    if user.role != UserRole.teacher:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только учителям")
    if user.school_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Учитель не привязан к школе")
    return user


def get_student(user: CurrentUser) -> User:
    if user.role != UserRole.student:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Доступно только ученикам")
    return user


CurrentAdmin = Annotated[User, Depends(get_admin)]
CurrentTeacher = Annotated[User, Depends(get_teacher)]
CurrentStudent = Annotated[User, Depends(get_student)]
