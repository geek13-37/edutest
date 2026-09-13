"""Публичные заявки на подключение школы и их рассмотрение админом."""
from tests.conftest import admin_token, auth, register_teacher


def _payload(**overrides):
    data = {
        "school_name": "МАОУ «СОШ № 12»",
        "city": "Тестбург",
        "region": "Тестбургская область",
        "contact_name": "Иванова Мария Петровна",
        "contact_email": "school12@example.com",
        "contact_phone": None,
        "comment": "Хотим подключить всю параллель 9х классов",
    }
    data.update(overrides)
    return data


def test_public_create_requires_email_or_phone(client):
    r = client.post(
        "/api/v1/school-requests",
        json=_payload(contact_email=None, contact_phone=None),
    )
    assert r.status_code == 422


def test_public_create_accepts_phone_only(client):
    r = client.post(
        "/api/v1/school-requests",
        json=_payload(contact_email=None, contact_phone="+7 900 000-00-00"),
    )
    assert r.status_code == 201


def test_honeypot_swallows_bot_submission(client):
    r = client.post("/api/v1/school-requests", json=_payload(website="http://spam.example"))
    assert r.status_code == 201

    atok = admin_token(client)
    listed = client.get("/api/v1/admin/school-requests", headers=auth(atok)).json()
    assert all(item["school_name"] != "МАОУ «СОШ № 12»" for item in listed)


def test_admin_list_filters_by_status(client):
    client.post("/api/v1/school-requests", json=_payload())
    atok = admin_token(client)

    pending = client.get(
        "/api/v1/admin/school-requests?status=pending", headers=auth(atok)
    ).json()
    assert len(pending) == 1
    assert pending[0]["status"] == "pending"

    approved = client.get(
        "/api/v1/admin/school-requests?status=approved", headers=auth(atok)
    ).json()
    assert approved == []


def test_approve_creates_school_with_signup_code(client):
    client.post("/api/v1/school-requests", json=_payload())
    atok = admin_token(client)
    req_id = client.get("/api/v1/admin/school-requests", headers=auth(atok)).json()[0]["id"]

    r = client.post(f"/api/v1/admin/school-requests/{req_id}/approve", headers=auth(atok))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request"]["status"] == "approved"
    assert body["school"]["name"] == "МАОУ «СОШ № 12»"
    assert body["school"]["signup_code"]
    assert body["request"]["signup_code"] == body["school"]["signup_code"]

    # код виден и при повторном чтении заявки (не только сразу после approve)
    again = client.get("/api/v1/admin/school-requests?status=approved", headers=auth(atok)).json()
    assert again[0]["signup_code"] == body["school"]["signup_code"]

    # код рабочий - учитель может им зарегистрироваться
    register_teacher(client, "new@e.com", school_code=body["school"]["signup_code"])


def test_reject_stores_reason_and_blocks_double_decision(client):
    client.post("/api/v1/school-requests", json=_payload())
    atok = admin_token(client)
    req_id = client.get("/api/v1/admin/school-requests", headers=auth(atok)).json()[0]["id"]

    r = client.post(
        f"/api/v1/admin/school-requests/{req_id}/reject",
        json={"reason": "Дубликат заявки"},
        headers=auth(atok),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert r.json()["reject_reason"] == "Дубликат заявки"

    again = client.post(
        f"/api/v1/admin/school-requests/{req_id}/reject", json={}, headers=auth(atok)
    )
    assert again.status_code == 409


def test_school_requests_require_admin(client):
    client.post("/api/v1/school-requests", json=_payload())
    r = client.get("/api/v1/admin/school-requests")
    assert r.status_code == 401
