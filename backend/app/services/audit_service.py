from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AuditLog, User

# человекочитаемые названия действий (для фильтра и вывода в интерфейсе)
ACTION_LABELS: dict[str, str] = {
    "school.create": "Создана школа",
    "school.update": "Изменена школа",
    "school.regenerate_code": "Перевыпущен код школы",
    "school.archive": "Школа отправлена в архив",
    "school.restore": "Школа восстановлена из архива",
    "school.delete": "Школа удалена навсегда",
    "school.export": "Выгружены данные школы",
    "teacher.create": "Создан учитель",
    "teacher.activate": "Учитель включен",
    "teacher.deactivate": "Учитель отключен",
    "teacher.reset_password": "Сброшен пароль учителя",
    "admin.create": "Создан администратор",
}

TARGET_LABELS: dict[str, str] = {
    "school": "Школа",
    "teacher": "Учитель",
    "admin": "Администратор",
}


def actor_label(actor: User | None) -> str:
    if actor is None:
        return "Система"
    handle = actor.email or actor.username or ""
    return f"{actor.full_name} ({handle})" if handle else actor.full_name


def record(
    db: Session,
    *,
    actor: User | None,
    action: str,
    target_type: str,
    target_id: uuid.UUID | None,
    target_label: str,
    summary: str,
    meta: dict | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor.id if actor is not None else None,
        actor_label=actor_label(actor),
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        summary=summary,
        meta=meta or {},
    )
    db.add(entry)
    return entry


def list_events(
    db: Session,
    *,
    action: str | None = None,
    target_type: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[AuditLog], int]:
    conds = []
    if action:
        conds.append(AuditLog.action == action)
    if target_type:
        conds.append(AuditLog.target_type == target_type)

    total = db.scalar(select(func.count(AuditLog.id)).where(*conds)) or 0
    rows = list(
        db.scalars(
            select(AuditLog)
            .where(*conds)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    return rows, total
