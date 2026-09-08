from tests.conftest import auth, admin_token, create_school, login, register_teacher


def test_admin_schools_crud_and_code_regen(client):
    atok = admin_token(client)
    school = create_school(client, atok, name="МАОУ «Лицей № 5»", city="Тестоград")
    assert school["teachers_count"] == 0 and school["students_count"] == 0

    old_code = school["signup_code"]
    r = client.post(f"/api/v1/admin/schools/{school['id']}/regenerate-code", headers=auth(atok))
    assert r.status_code == 200 and r.json()["signup_code"] != old_code

    # старый код больше не работает
    bad = client.post(
        "/api/v1/auth/register",
        json={"email": "z@e.com", "password": "password123", "full_name": "Z Z", "school_code": old_code},
    )
    assert bad.status_code == 404

    lst = client.get("/api/v1/admin/schools", headers=auth(atok)).json()
    assert any(s["id"] == school["id"] for s in lst)


def test_admin_creates_teacher_directly(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    r = client.post(
        "/api/v1/admin/teachers",
        json={"full_name": "Прямой Учитель", "email": "direct@e.com", "school_id": school["id"]},
        headers=auth(atok),
    )
    assert r.status_code == 201
    creds = r.json()
    assert creds["password"]
    # созданный учитель может войти и работать
    ttok = login(client, "direct@e.com", creds["password"])
    assert client.get("/api/v1/classes", headers=auth(ttok)).status_code == 200

    teachers = client.get("/api/v1/admin/teachers", headers=auth(atok)).json()
    assert any(t["email"] == "direct@e.com" and t["school_name"] == school["name"] for t in teachers)


def test_admin_stats_and_admins(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    register_teacher(client, "s1@e.com", school_code=school["signup_code"])

    stats = client.get("/api/v1/admin/stats", headers=auth(atok)).json()
    assert stats["schools"] == 1 and stats["teachers"] == 1

    r = client.post(
        "/api/v1/admin/admins",
        json={"full_name": "Второй Админ", "email": "admin2@e.com", "password": "adminpass123"},
        headers=auth(atok),
    )
    assert r.status_code == 201
    assert login(client, "admin2@e.com", "adminpass123")


def test_teacher_reset_password_by_admin(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    ttok = register_teacher(client, "rp@e.com", school_code=school["signup_code"])
    tid = client.get("/api/v1/auth/me", headers=auth(ttok)).json()["id"]
    r = client.post(f"/api/v1/admin/teachers/{tid}/reset-password", headers=auth(atok))
    assert r.status_code == 200
    assert login(client, "rp@e.com", r.json()["password"])
