"""Тип вопроса «короткий ответ»: автопроверка по совпадению, теги теста."""
from tests.conftest import auth, create_student, login, make_class, teacher_in_new_school

SHORT_QUESTIONS = [
    {"type": "short", "text": "Сколько будет 7 умножить на 3?", "options": [], "correct": ["21"], "points": 1},
    {"type": "short", "text": "Столица России?", "options": [], "correct": ["Москва", "г. Москва"], "points": 1},
]


def _publish_short_test(client, teacher, **tags):
    payload = {"title": "Короткие ответы", **tags}
    tid = client.post("/api/v1/tests", json=payload, headers=auth(teacher)).json()["id"]
    r = client.put(
        f"/api/v1/tests/{tid}/questions", json={"questions": SHORT_QUESTIONS}, headers=auth(teacher)
    )
    assert r.status_code == 200, r.text
    # options у short нормализуются в пустой список
    assert all(q["options"] == [] for q in r.json()["questions"])
    assert client.post(f"/api/v1/tests/{tid}/publish", headers=auth(teacher)).status_code == 200
    return tid


def test_short_question_autograding(client):
    ttok, _, _ = teacher_in_new_school(client, email="short1@e.com")
    cls = make_class(client, ttok, grade=6, letter="А")
    student = create_student(client, ttok, cls["id"], "Короткий Ученик")
    stok = login(client, student["username"], student["password"])

    tid = _publish_short_test(client, ttok)
    aid = client.post(
        "/api/v1/assignments", json={"test_id": tid, "class_id": cls["id"]}, headers=auth(ttok)
    ).json()["id"]

    state = client.post(f"/api/v1/assignments/{aid}/attempts", headers=auth(stok)).json()
    q = {x["text"]: x["id"] for x in state["questions"]}
    assert all(x["options"] == [] for x in state["questions"])

    # нормализация: пробелы и регистр не важны
    client.patch(
        f"/api/v1/attempts/{state['id']}/answers",
        json={"question_id": q["Сколько будет 7 умножить на 3?"], "selected": ["  21 "]},
        headers=auth(stok),
    )
    client.patch(
        f"/api/v1/attempts/{state['id']}/answers",
        json={"question_id": q["Столица России?"], "selected": ["МОСКВА"]},
        headers=auth(stok),
    )
    res = client.post(f"/api/v1/attempts/{state['id']}/submit", headers=auth(stok)).json()
    assert res["percent"] == 100.0

    rows = client.get(f"/api/v1/assignments/{aid}/results", headers=auth(ttok)).json()["rows"]
    assert rows[0]["best_percent"] == 100.0


def test_short_question_wrong_answer(client):
    ttok, _, _ = teacher_in_new_school(client, email="short2@e.com")
    cls = make_class(client, ttok, grade=6, letter="Б")
    student = create_student(client, ttok, cls["id"], "Ошибочный Ученик")
    stok = login(client, student["username"], student["password"])

    tid = _publish_short_test(client, ttok)
    aid = client.post(
        "/api/v1/assignments", json={"test_id": tid, "class_id": cls["id"]}, headers=auth(ttok)
    ).json()["id"]
    state = client.post(f"/api/v1/assignments/{aid}/attempts", headers=auth(stok)).json()
    q = {x["text"]: x["id"] for x in state["questions"]}
    client.patch(
        f"/api/v1/attempts/{state['id']}/answers",
        json={"question_id": q["Сколько будет 7 умножить на 3?"], "selected": ["22"]},
        headers=auth(stok),
    )
    res = client.post(f"/api/v1/attempts/{state['id']}/submit", headers=auth(stok)).json()
    assert res["percent"] == 0.0


def test_short_question_validation(client):
    ttok, _, _ = teacher_in_new_school(client, email="short3@e.com")
    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(ttok)).json()["id"]
    bad = client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [{"type": "short", "text": "Пусто?", "options": [], "correct": ["  "], "points": 1}]},
        headers=auth(ttok),
    )
    assert bad.status_code == 422


def test_test_tags_and_filter(client):
    ttok, _, _ = teacher_in_new_school(client, email="tags@e.com")
    client.post(
        "/api/v1/tests",
        json={"title": "По программе", "subject": "Математика", "grade": 6, "topic": "Дроби", "template_ref": "math-6-fraction-actions"},
        headers=auth(ttok),
    )
    client.post("/api/v1/tests", json={"title": "Без тегов"}, headers=auth(ttok))

    all_tests = client.get("/api/v1/tests", headers=auth(ttok)).json()
    tagged = next(t for t in all_tests if t["title"] == "По программе")
    assert tagged["subject"] == "Математика" and tagged["grade"] == 6
    assert tagged["template_ref"] == "math-6-fraction-actions"

    filtered = client.get("/api/v1/tests?subject=Математика", headers=auth(ttok)).json()
    assert [t["title"] for t in filtered] == ["По программе"]
