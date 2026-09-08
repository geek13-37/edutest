"""Журнал действий, архив школ, экспорт, аналитика."""
from tests.conftest import (
    auth,
    admin_token,
    create_school,
    create_student,
    login,
    make_class,
    register_teacher,
    run_submitted_attempt,
    teacher_in_new_school,
)


def test_archive_blocks_login_and_restore_brings_it_back(client):
    atok = admin_token(client)
    school = create_school(client, atok, name="МАОУ «СОШ № 9»", city="Тестбург")
    ttok = register_teacher(client, "arch@e.com", school_code=school["signup_code"])

    # до архива учитель работает
    assert client.get("/api/v1/classes", headers=auth(ttok)).status_code == 200

    r = client.post(f"/api/v1/admin/schools/{school['id']}/archive", headers=auth(atok))
    assert r.status_code == 200 and r.json()["archived_at"] is not None

    # старый токен больше не действует
    assert client.get("/api/v1/classes", headers=auth(ttok)).status_code == 403
    # и заново войти нельзя (единый 401)
    bad = client.post(
        "/api/v1/auth/login", json={"login": "arch@e.com", "password": "password123"}
    )
    assert bad.status_code == 401

    # школа скрыта из списка по умолчанию, видна в архиве
    active = client.get("/api/v1/admin/schools", headers=auth(atok)).json()
    assert all(s["id"] != school["id"] for s in active)
    archived = client.get("/api/v1/admin/schools?scope=archived", headers=auth(atok)).json()
    assert any(s["id"] == school["id"] for s in archived)

    # восстановление возвращает доступ
    client.post(f"/api/v1/admin/schools/{school['id']}/restore", headers=auth(atok))
    again = login(client, "arch@e.com", "password123")
    assert client.get("/api/v1/classes", headers=auth(again)).status_code == 200


def test_hard_delete_requires_archive_first(client):
    atok = admin_token(client)
    school = create_school(client, atok)

    assert client.delete(f"/api/v1/admin/schools/{school['id']}", headers=auth(atok)).status_code == 409

    client.post(f"/api/v1/admin/schools/{school['id']}/archive", headers=auth(atok))
    assert client.delete(f"/api/v1/admin/schools/{school['id']}", headers=auth(atok)).status_code == 204
    assert all(
        s["id"] != school["id"]
        for s in client.get("/api/v1/admin/schools?scope=all", headers=auth(atok)).json()
    )


def test_audit_log_records_actions(client):
    atok = admin_token(client)
    school = create_school(client, atok, name="МАОУ «Гимназия № 2»", city="Аудитбург")
    client.post(f"/api/v1/admin/schools/{school['id']}/archive", headers=auth(atok))

    log = client.get("/api/v1/admin/audit", headers=auth(atok)).json()
    assert log["total"] >= 2
    actions = {e["action"] for e in log["items"]}
    assert {"school.create", "school.archive"} <= actions
    assert all(e["actor_label"] for e in log["items"])

    filtered = client.get(
        "/api/v1/admin/audit?action=school.archive", headers=auth(atok)
    ).json()
    assert filtered["items"] and all(e["action"] == "school.archive" for e in filtered["items"])
    assert filtered["items"][0]["action_label"] == "Школа отправлена в архив"


def test_school_export_xlsx(client):
    ttok, school, atok = teacher_in_new_school(client, email="exp@e.com")
    cls = make_class(client, ttok, grade=7, letter="В")
    student = create_student(client, ttok, cls["id"], "Экспорт Ученик")
    stok = login(client, student["username"], student["password"])
    run_submitted_attempt(client, ttok, stok, cls["id"])

    r = client.get(f"/api/v1/admin/schools/{school['id']}/export.xlsx", headers=auth(atok))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert r.content[:2] == b"PK" and len(r.content) > 1000


def test_analytics_shape_and_totals(client):
    ttok, school, atok = teacher_in_new_school(client, email="an@e.com")
    cls = make_class(client, ttok, grade=8, letter="А")
    student = create_student(client, ttok, cls["id"], "Аналитика Ученик")
    stok = login(client, student["username"], student["password"])
    run_submitted_attempt(client, ttok, stok, cls["id"])

    a = client.get("/api/v1/admin/analytics", headers=auth(atok)).json()
    assert len(a["weekly"]) == 12
    assert a["totals"]["attempts_total"] >= 1
    assert a["totals"]["tests_conducted"] >= 1
    assert any(s["school_id"] == school["id"] for s in a["top_schools"])
    assert a["weekly"][-1]["attempts"] >= 1


def test_archived_school_hidden_from_stats(client):
    atok = admin_token(client)
    school = create_school(client, atok)
    register_teacher(client, "st@e.com", school_code=school["signup_code"])

    before = client.get("/api/v1/admin/stats", headers=auth(atok)).json()
    assert before["schools"] == 1 and before["teachers"] == 1

    client.post(f"/api/v1/admin/schools/{school['id']}/archive", headers=auth(atok))
    after = client.get("/api/v1/admin/stats", headers=auth(atok)).json()
    assert after["schools"] == 0 and after["teachers"] == 0
