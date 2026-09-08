from datetime import date

from app.services.class_naming import current_grade, display_name, graduation_year_for
from tests.conftest import auth, admin_token, create_school, make_class, register_teacher


def test_grade_auto_increment():
    gy = graduation_year_for(6, date(2025, 3, 1))
    assert display_name(name=None, letter="А", graduation_year=gy, today=date(2025, 8, 31)) == "6А"
    assert display_name(name=None, letter="А", graduation_year=gy, today=date(2025, 9, 1)) == "7А"
    assert current_grade(gy, date(2026, 9, 1)) == 8


def test_school_code_and_login_prefix(client):
    atok = admin_token(client)
    s1 = create_school(client, atok, name="МАОУ «СОШ № 3»", city="Северодвинск")
    s2 = create_school(client, atok, name="МБОУ «СОШ № 3»", city="Архангельск")
    assert s1["login_prefix"] != s2["login_prefix"]  # коллизия номера разрешена
    assert s1["signup_code"] != s2["signup_code"]
    # формат кода: слово + 4 цифры
    assert s1["signup_code"][-4:].isdigit() and s1["signup_code"][:-4].isalpha()


def test_class_parallel_and_custom(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    teacher = register_teacher(client, "c1@e.com", school_code=school["signup_code"])
    r = client.post("/api/v1/classes", json={"grade": 6, "letter": "а"}, headers=auth(teacher))
    assert r.status_code == 201 and r.json()["letter"] == "А"
    r2 = client.post("/api/v1/classes", json={"name": "Кружок физики"}, headers=auth(teacher))
    assert r2.json()["display_name"] == "Кружок физики"
