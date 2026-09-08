"""Каталог-справочник: программа и экзаменационные задания."""
from tests.conftest import auth, teacher_in_new_school


def test_catalog_requires_auth(client):
    assert client.get("/api/v1/catalog/curriculum").status_code == 401
    assert client.get("/api/v1/catalog/exams").status_code == 401


def test_curriculum_tree(client):
    ttok, _, _ = teacher_in_new_school(client, email="cat1@e.com")
    data = client.get("/api/v1/catalog/curriculum", headers=auth(ttok)).json()
    subjects = data["subjects"]
    assert len(subjects) >= 10
    keys = [
        t["key"]
        for s in subjects
        for g in s["grades"]
        for t in g["topics"]
    ]
    assert len(keys) == len(set(keys)) and len(keys) > 200
    # у каждой темы есть имя и подсказка
    assert all(t.get("name") and t.get("hint") for s in subjects for g in s["grades"] for t in g["topics"])


def test_exams_tree(client):
    ttok, _, _ = teacher_in_new_school(client, email="cat2@e.com")
    data = client.get("/api/v1/catalog/exams", headers=auth(ttok)).json()
    exam_keys = {e["key"] for e in data["exams"]}
    assert {"oge", "ege", "vpr"} <= exam_keys
    tasks = [t for e in data["exams"] for s in e["subjects"] for t in s["tasks"]]
    assert len(tasks) > 100
    assert all(t["question_type"] in ("single", "multiple", "boolean", "short") for t in tasks)
    task_keys = [t["key"] for t in tasks]
    assert len(task_keys) == len(set(task_keys))
