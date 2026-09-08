"""Демо-данные для локальной разработки: uv run python scripts/seed.py"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import School, User, UserRole
from app.schemas.assignment import AssignmentCreateIn
from app.schemas.auth import RegisterTeacherIn
from app.schemas.klass import ClassCreateIn
from app.schemas.question import QuestionIn
from app.schemas.test import TestCreateIn
from app.services import admin_service, assignment_service, auth_service, class_service, school_service, test_service
from app.services.student_service import create_students_bulk

ADMIN = {"email": "admin@edutest.example.com", "password": "admin12345", "full_name": "Главный Админ"}
TEACHER = {"email": "teacher@edutest.example.com", "password": "password123", "full_name": "Анна Петровна"}
DEMO_SCHOOL = {"name": "МАОУ «СОШ № 3»", "city": "Северодвинск", "region": "Архангельская область"}
STUDENT_NAMES = ["Иван Смирнов", "Мария Кузнецова", "Петр Соколов", "Ольга Новикова", "Артем Морозов"]

QUESTIONS = [
    QuestionIn(type="single", text="Сколько будет 7 умножить на 8?",
               options=[{"id": "a", "text": "54"}, {"id": "b", "text": "56"}, {"id": "c", "text": "48"}, {"id": "d", "text": "64"}],
               correct=["b"], points=1),
    QuestionIn(type="multiple", text="Какие числа делятся на 3 без остатка?",
               options=[{"id": "a", "text": "9"}, {"id": "b", "text": "10"}, {"id": "c", "text": "12"}, {"id": "d", "text": "14"}],
               correct=["a", "c"], points=2),
    QuestionIn(type="boolean", text="Периметр квадрата со стороной 5 равен 20.",
               options=[{"id": "true", "text": "Верно"}, {"id": "false", "text": "Неверно"}],
               correct=["true"], points=1),
]


def main() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == ADMIN["email"])):
            print("Демо-данные уже созданы, пропускаю.")
            return

        admin = admin_service.create_admin(db, **ADMIN)
        db.flush()

        school = school_service.create_school(
            db, name=DEMO_SCHOOL["name"], city=DEMO_SCHOOL["city"],
            region=DEMO_SCHOOL["region"], created_by=admin.id,
        )
        db.flush()

        teacher, _, _ = auth_service.register_teacher(
            db, RegisterTeacherIn(**TEACHER, school_code=school.signup_code)
        )
        db.flush()

        klass = class_service.create_class(db, teacher, ClassCreateIn(grade=6, letter="А"))
        db.flush()
        creds = create_students_bulk(db, teacher, klass.id, STUDENT_NAMES)

        test = test_service.create_test(
            db, teacher.id,
            TestCreateIn(title="Математика: разминка", description="Короткий тест на счет"),
        )
        test_service.replace_questions(db, teacher.id, test.id, QUESTIONS)
        test_service.set_status(db, teacher.id, test.id, True)
        assignment_service.create_assignment(
            db, teacher, AssignmentCreateIn(test_id=test.id, class_id=klass.id, max_attempts=2)
        )
        db.commit()

        print(f"Админ:   {ADMIN['email']} / {ADMIN['password']}")
        print(f"Учитель: {TEACHER['email']} / {TEACHER['password']}")
        print(f"Школа:   {school.name}, {school.city}")
        print(f"Код регистрации учителей школы: {school.signup_code}")
        print(f"Класс:   {class_service.display_name(klass)}")
        print("Ученики (логин / пароль):")
        for c in creds:
            print(f"  {c['full_name']:<20} {c['username']:<8} {c['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
