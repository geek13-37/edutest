"""Сквозной сценарий и школьная видимость классов."""
from tests.conftest import (
    auth,
    create_student,
    login,
    make_class,
    register_teacher,
    teacher_in_new_school,
)

QUESTIONS = [
    {"type": "single", "text": "2 + 2 = ?",
     "options": [{"id": "a", "text": "3"}, {"id": "b", "text": "4"}, {"id": "c", "text": "5"}],
     "correct": ["b"], "points": 1},
    {"type": "multiple", "text": "Четные числа?",
     "options": [{"id": "a", "text": "2"}, {"id": "b", "text": "3"}, {"id": "c", "text": "4"}, {"id": "d", "text": "7"}],
     "correct": ["a", "c"], "points": 2},
    {"type": "boolean", "text": "Земля круглая",
     "options": [{"id": "true", "text": "Верно"}, {"id": "false", "text": "Неверно"}],
     "correct": ["true"], "points": 1},
]


def _published_test(client, teacher):
    tid = client.post("/api/v1/tests", json={"title": "Математика"}, headers=auth(teacher)).json()["id"]
    assert client.put(
        f"/api/v1/tests/{tid}/questions", json={"questions": QUESTIONS}, headers=auth(teacher)
    ).status_code == 200
    assert client.post(f"/api/v1/tests/{tid}/publish", headers=auth(teacher)).status_code == 200
    return tid


def test_full_flow(client):
    teacher, _, _ = teacher_in_new_school(client, email="teacher@e.com")
    cls = make_class(client, teacher, grade=7, letter="Б")
    student = create_student(client, teacher, cls["id"], "Петя Ученик")
    stok = login(client, student["username"], student["password"])

    assert client.get("/api/v1/assignments/mine/count", headers=auth(teacher)).json()["count"] == 0

    tid = _published_test(client, teacher)
    aid = client.post(
        "/api/v1/assignments",
        json={"test_id": tid, "class_id": cls["id"], "max_attempts": 2},
        headers=auth(teacher),
    ).json()["id"]

    assert client.get("/api/v1/assignments/mine/count", headers=auth(teacher)).json()["count"] == 1

    my = client.get("/api/v1/me/assignments", headers=auth(stok)).json()
    assert len(my) == 1

    state = client.post(f"/api/v1/assignments/{aid}/attempts", headers=auth(stok)).json()
    qids = {q["text"]: q["id"] for q in state["questions"]}
    for text, sel in [("2 + 2 = ?", ["b"]), ("Четные числа?", ["a"]), ("Земля круглая", ["true"])]:
        client.patch(
            f"/api/v1/attempts/{state['id']}/answers",
            json={"question_id": qids[text], "selected": sel},
            headers=auth(stok),
        )
    res = client.post(f"/api/v1/attempts/{state['id']}/submit", headers=auth(stok)).json()
    assert res["percent"] == 50.0

    rows = client.get(f"/api/v1/assignments/{aid}/results", headers=auth(teacher)).json()["rows"]
    assert rows[0]["grade"] == "3"


def test_second_teacher_sees_and_manages_school_classes(client):
    t1, school, _ = teacher_in_new_school(client, email="t1@e.com")
    # второй учитель регистрируется по тому же коду школы
    t2 = register_teacher(client, "t2@e.com", school_code=school["signup_code"], name="Второй Учитель")

    cls = make_class(client, t1, grade=8, letter="А")
    # t2 видит класс, созданный t1
    classes = client.get("/api/v1/classes", headers=auth(t2)).json()
    assert len(classes) == 1
    assert classes[0]["is_mine"] is False
    assert classes[0]["created_by_name"] == "Учитель Тестов"

    # t2 может завести ученика в этот класс
    st = create_student(client, t2, cls["id"], "Ученик От Т2")
    members = client.get(f"/api/v1/classes/{cls['id']}/members", headers=auth(t1)).json()
    assert any(m["full_name"] == "Ученик От Т2" for m in members)

    # t2 может назначить свой тест этому классу
    tid = _published_test(client, t2)
    r = client.post(
        "/api/v1/assignments",
        json={"test_id": tid, "class_id": cls["id"]},
        headers=auth(t2),
    )
    assert r.status_code == 201


def test_other_school_isolation(client):
    t1, _, _ = teacher_in_new_school(client, email="a1@e.com", school_name="МАОУ «СОШ № 1»", city="Городраз")
    t2, _, _ = teacher_in_new_school(client, email="a2@e.com", school_name="МАОУ «СОШ № 2»", city="Гордва")
    cls = make_class(client, t1)
    assert client.get(f"/api/v1/classes/{cls['id']}", headers=auth(t2)).status_code == 404
    assert client.get("/api/v1/classes", headers=auth(t2)).json() == []


def test_bulk_and_pdf(client):
    teacher, _, _ = teacher_in_new_school(client, email="bt@e.com")
    cls = make_class(client, teacher)
    creds = client.post(
        f"/api/v1/classes/{cls['id']}/students/bulk",
        json={"names": ["Аня С", "Боря П", "Вера К"]},
        headers=auth(teacher),
    ).json()
    prefix = creds[0]["username"].split("-")[0]
    assert prefix.isdigit()
    assert {c["username"] for c in creds} == {f"{prefix}-01", f"{prefix}-02", f"{prefix}-03"}
    pdf = client.post(
        f"/api/v1/classes/{cls['id']}/handouts.pdf",
        json={"items": [{"full_name": c["full_name"], "username": c["username"], "password": c["password"]} for c in creds]},
        headers=auth(teacher),
    )
    assert pdf.status_code == 200 and pdf.content[:5] == b"%PDF-"
