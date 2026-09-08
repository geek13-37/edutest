"""Создать первого администратора.

    docker compose run --rm backend python scripts/create_admin.py
    # берет ADMIN_EMAIL / ADMIN_PASSWORD из окружения, либо аргументы:
    python scripts/create_admin.py admin@example.com 'сильный-пароль' 'Иван Админов'

Запускается также при старте контейнера backend (см. Dockerfile): если
ADMIN_EMAIL / ADMIN_PASSWORD не заданы, скрипт молча выходит.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import User, UserRole
from app.services import admin_service


def main() -> None:
    args = sys.argv[1:]
    email = args[0] if len(args) > 0 else settings.admin_email
    password = args[1] if len(args) > 1 else settings.admin_password
    full_name = args[2] if len(args) > 2 else "Администратор"

    if not email or not password:
        print("ADMIN_EMAIL / ADMIN_PASSWORD не заданы, пропускаю создание администратора.")
        return
    if len(password) < 8:
        print("Пароль должен быть не короче 8 символов")
        raise SystemExit(1)

    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == email.lower()))
        if existing:
            if existing.role == UserRole.admin:
                print(f"Администратор {email} уже существует.")
                return
            print(f"Пользователь {email} уже есть, но не администратор. Отмена.")
            raise SystemExit(1)
        admin_service.create_admin(db, full_name=full_name, email=email, password=password)
        db.commit()
        print(f"Администратор создан: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
