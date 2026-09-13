"""Роль завуча: авто-назначение по email заявки, ручной тумблер, права внутри школы."""
from tests.conftest import admin_token, auth, create_school, login, register_teacher


def _approve_request(client, atok, *, contact_email):
    r = client.post(
        "/api/v1/school-requests",
        json={
            "school_name": "МАОУ СОШ №21",
            "city": "Тестбург",
            "contact_name": "Петрова Анна",
            "contact_email": contact_email,
        },
    )
    assert r.status_code == 201
    req_id = client.get(
        "/api/v1/admin/school-requests?status=pending", headers=auth(atok)
    ).json()[0]["id"]
    r = client.post(f"/api/v1/admin/school-requests/{req_id}/approve", headers=auth(atok))
    assert r.status_code == 200
    return r.json()["school"]


def test_registering_with_matching_contact_email_becomes_lead(client):
    atok = admin_token(client)
    school = _approve_request(client, atok, contact_email="anna@example.com")

    ttok = register_teacher(client, "anna@example.com", school_code=school["signup_code"])
    me = client.get("/api/v1/auth/me", headers=auth(ttok)).json()
    assert me["is_lead"] is True


def test_registering_with_different_email_is_not_lead(client):
    atok = admin_token(client)
    school = _approve_request(client, atok, contact_email="anna@example.com")

    ttok = register_teacher(client, "other@example.com", school_code=school["signup_code"])
    me = client.get("/api/v1/auth/me", headers=auth(ttok)).json()
    assert me["is_lead"] is False


def test_admin_can_toggle_lead_manually(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    register_teacher(client, "t1@example.com", school_code=school["signup_code"])
    teacher_id = client.get("/api/v1/admin/teachers", headers=auth(atok)).json()[0]["id"]

    r = client.patch(
        f"/api/v1/admin/teachers/{teacher_id}/lead", json={"is_lead": True}, headers=auth(atok)
    )
    assert r.status_code == 200
    assert r.json()["is_lead"] is True


def test_non_lead_teacher_forbidden_from_lead_endpoints(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    ttok = register_teacher(client, "t2@example.com", school_code=school["signup_code"])

    assert client.get("/api/v1/me/school/teachers", headers=auth(ttok)).status_code == 403
    assert client.get("/api/v1/me/school/stats", headers=auth(ttok)).status_code == 403


def test_lead_sees_and_manages_own_school_only(client):
    atok = admin_token(client)
    school_a = _approve_request(client, atok, contact_email="lead@a.com")
    school_b = create_school(client, atok, name="Школа Б", city="Другой город")

    lead_tok = register_teacher(client, "lead@a.com", school_code=school_a["signup_code"])
    register_teacher(client, "colleague@a.com", school_code=school_a["signup_code"])
    other_tok = register_teacher(client, "outsider@b.com", school_code=school_b["signup_code"])
    other_id = client.get("/api/v1/auth/me", headers=auth(other_tok)).json()["id"]

    teachers = client.get("/api/v1/me/school/teachers", headers=auth(lead_tok)).json()
    assert {t["email"] for t in teachers} == {"lead@a.com", "colleague@a.com"}

    stats = client.get("/api/v1/me/school/stats", headers=auth(lead_tok)).json()
    assert stats["teachers"] == 2

    # завуч не может сбросить пароль учителю чужой школы
    forbidden = client.post(
        f"/api/v1/me/school/teachers/{other_id}/reset-password", headers=auth(lead_tok)
    )
    assert forbidden.status_code == 403

    colleague_id = next(t["id"] for t in teachers if t["email"] == "colleague@a.com")
    ok = client.post(
        f"/api/v1/me/school/teachers/{colleague_id}/reset-password", headers=auth(lead_tok)
    )
    assert ok.status_code == 200
    assert ok.json()["password"]

    # новый пароль реально работает
    login(client, "colleague@a.com", ok.json()["password"])
