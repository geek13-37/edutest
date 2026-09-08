import itertools
import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://edutest:edutest@localhost:5432/edutest_test"
)
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret-1234")
os.environ.setdefault("ENV", "test")

import pytest
from fastapi.testclient import TestClient

from app.core.deps import get_db
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client():
    def _get_db():
        db = SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


_admin_seq = itertools.count(1)


def make_admin(email=None, password="adminpass123", name="Админ"):
    """Создает администратора напрямую в БД, возвращает (email, password)."""
    from app.services import admin_service

    email = email or f"admin{next(_admin_seq)}@example.com"
    db = SessionLocal()
    try:
        admin_service.create_admin(db, full_name=name, email=email, password=password)
        db.commit()
    finally:
        db.close()
    return email, password


def login(client, login_value: str, password: str) -> str:
    r = client.post("/api/v1/auth/login", json={"login": login_value, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def admin_token(client) -> str:
    email, pw = make_admin()
    return login(client, email, pw)


def create_school(client, admin_tok, *, name="МАОУ «СОШ № 7»", city="Северодвинск") -> dict:
    r = client.post(
        "/api/v1/admin/schools",
        json={"name": name, "city": city},
        headers=auth(admin_tok),
    )
    assert r.status_code == 201, r.text
    return r.json()


def register_teacher(
    client,
    email="teacher@example.com",
    *,
    school_code,
    password="password123",
    name="Учитель Тестов",
) -> str:
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": name, "school_code": school_code},
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def teacher_in_new_school(client, *, email="teacher@example.com", school_name="МАОУ «СОШ № 7»", city="Северодвинск"):
    """Хелпер: админ + школа + учитель. Возвращает (teacher_token, school_dict, admin_token)."""
    atok = admin_token(client)
    school = create_school(client, atok, name=school_name, city=city)
    ttok = register_teacher(client, email, school_code=school["signup_code"])
    return ttok, school, atok


def make_class(client, teacher_token, *, grade=7, letter="А") -> dict:
    r = client.post(
        "/api/v1/classes", json={"grade": grade, "letter": letter}, headers=auth(teacher_token)
    )
    assert r.status_code == 201, r.text
    return r.json()


def create_student(client, teacher_token, class_id, name="Ученик Тестов") -> dict:
    r = client.post(
        f"/api/v1/classes/{class_id}/students",
        json={"full_name": name},
        headers=auth(teacher_token),
    )
    assert r.status_code == 201, r.text
    return r.json()


_SIMPLE_QUESTIONS = [
    {
        "type": "single",
        "text": "2 + 2 = ?",
        "options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}, {"id": "c", "text": "5"}],
        "correct": ["b"],
        "points": 1,
    },
]


def run_submitted_attempt(client, teacher_token, student_token, class_id) -> dict:
    """Учитель публикует тест, назначает классу, ученик проходит и сдает.

    Возвращает {"test_id", "assignment_id", "attempt_id", "percent"}.
    """
    tid = client.post(
        "/api/v1/tests", json={"title": "Проверочная"}, headers=auth(teacher_token)
    ).json()["id"]
    assert client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": _SIMPLE_QUESTIONS},
        headers=auth(teacher_token),
    ).status_code == 200
    assert client.post(f"/api/v1/tests/{tid}/publish", headers=auth(teacher_token)).status_code == 200

    aid = client.post(
        "/api/v1/assignments",
        json={"test_id": tid, "class_id": class_id},
        headers=auth(teacher_token),
    ).json()["id"]

    state = client.post(f"/api/v1/assignments/{aid}/attempts", headers=auth(student_token)).json()
    qid = state["questions"][0]["id"]
    client.patch(
        f"/api/v1/attempts/{state['id']}/answers",
        json={"question_id": qid, "selected": ["b"]},
        headers=auth(student_token),
    )
    res = client.post(f"/api/v1/attempts/{state['id']}/submit", headers=auth(student_token)).json()
    return {"test_id": tid, "assignment_id": aid, "attempt_id": state["id"], "percent": res["percent"]}
