from tests.conftest import (
    auth,
    create_school,
    create_student,
    admin_token,
    login,
    make_class,
    register_teacher,
    teacher_in_new_school,
)


def test_teacher_register_by_school_code(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    token = register_teacher(client, "t@example.com", school_code=school["signup_code"])
    me = client.get("/api/v1/auth/me", headers=auth(token)).json()
    assert me["role"] == "teacher"
    assert me["school"]["name"] == school["name"]


def test_teacher_register_bad_code(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "x@example.com", "password": "password123", "full_name": "A B", "school_code": "НЕТ0000"},
    )
    assert r.status_code == 404


def test_school_by_code_public(client):
    atok = admin_token(client)
    school = create_school(client, atok, name="МАОУ «Гимназия № 8»", city="Архангельск")
    r = client.get(f"/api/v1/auth/school-by-code/{school['signup_code']}")
    assert r.status_code == 200
    assert r.json() == {"name": "МАОУ «Гимназия № 8»", "city": "Архангельск"}


def test_student_login_by_username(client):
    ttok, _, _ = teacher_in_new_school(client, email="t2@e.com")
    cls = make_class(client, ttok)
    student = create_student(client, ttok, cls["id"], "Иван Иванов")
    prefix, _, seq = student["username"].partition("-")
    assert prefix.isdigit() and seq == "01"
    stok = login(client, student["username"], student["password"])
    me = client.get("/api/v1/auth/me", headers=auth(stok)).json()
    assert me["role"] == "student" and me["email"] is None


def test_change_password(client):
    ttok, _, _ = teacher_in_new_school(client, email="t3@e.com")
    cls = make_class(client, ttok)
    st = create_student(client, ttok, cls["id"])
    stok = login(client, st["username"], st["password"])
    r = client.patch(
        "/api/v1/auth/me/password",
        json={"current_password": st["password"], "new_password": "новыйпароль1"},
        headers=auth(stok),
    )
    assert r.status_code == 204
    assert login(client, st["username"], "новыйпароль1")


def test_change_password_revokes_refresh_sessions(client):
    ttok, _, _ = teacher_in_new_school(client, email="rev@e.com")
    pair = client.post(
        "/api/v1/auth/login", json={"login": "rev@e.com", "password": "password123"}
    ).json()
    old_refresh = pair["refresh_token"]

    r = client.patch(
        "/api/v1/auth/me/password",
        json={"current_password": "password123", "new_password": "nadejniyparol1"},
        headers=auth(pair["access_token"]),
    )
    assert r.status_code == 204

    # старый refresh больше не работает
    bad = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert bad.status_code == 401


def test_deactivated_teacher_cannot_login(client):
    ttok, _, atok = teacher_in_new_school(client, email="t4@e.com")
    me = client.get("/api/v1/auth/me", headers=auth(ttok)).json()
    r = client.patch(
        f"/api/v1/admin/teachers/{me['id']}/active",
        json={"is_active": False},
        headers=auth(atok),
    )
    assert r.status_code == 200
    # отключённый аккаунт отвечает так же, как неверный пароль (без перечисления)
    r2 = client.post("/api/v1/auth/login", json={"login": "t4@e.com", "password": "password123"})
    assert r2.status_code == 401


def test_role_guards(client):
    ttok, _, atok = teacher_in_new_school(client, email="t5@e.com")
    # учитель не может в админку
    assert client.get("/api/v1/admin/schools", headers=auth(ttok)).status_code == 403
    # админ не проходит teacher-гард
    assert client.get("/api/v1/classes", headers=auth(atok)).status_code == 403
