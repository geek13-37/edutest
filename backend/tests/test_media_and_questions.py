"""Картинки к вопросам, ссылки на media, порядок вопросов."""
from tests.conftest import auth, make_class, teacher_in_new_school

# валидный 1x1 PNG
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000d49444154789c6360000002000148afc90000000049454e44ae426082"
)


def _q(text="Вопрос", image_url=None):
    return {
        "type": "single",
        "text": text,
        "image_url": image_url,
        "options": [{"id": "a", "text": "1"}, {"id": "b", "text": "2"}],
        "correct": ["b"],
        "points": 1,
    }


def test_upload_image_and_attach_to_question(client):
    teacher, _, _ = teacher_in_new_school(client, email="t-img@e.com")
    tid = client.post("/api/v1/tests", json={"title": "С картинкой"}, headers=auth(teacher)).json()["id"]

    up = client.post(
        f"/api/v1/tests/{tid}/images",
        files={"file": ("p.png", PNG, "image/png")},
        headers=auth(teacher),
    )
    assert up.status_code == 200, up.text
    url = up.json()["url"]
    assert url.startswith("/api/v1/media/")

    # картинка отдаётся как есть, без авторизации
    got = client.get(url)
    assert got.status_code == 200
    assert got.headers["content-type"] == "image/png"
    assert got.content == PNG

    # ссылка сохраняется в вопросе и возвращается
    r = client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [_q(image_url=url), _q("Без картинки")]},
        headers=auth(teacher),
    )
    assert r.status_code == 200, r.text
    qs = r.json()["questions"]
    assert qs[0]["image_url"] == url
    assert qs[1]["image_url"] is None

    detail = client.get(f"/api/v1/tests/{tid}", headers=auth(teacher)).json()
    assert detail["questions"][0]["image_url"] == url


def test_external_image_url_is_dropped(client):
    teacher, _, _ = teacher_in_new_school(client, email="t-ext@e.com")
    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(teacher)).json()["id"]
    r = client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [_q(image_url="https://evil.example/x.png")]},
        headers=auth(teacher),
    )
    assert r.status_code == 200, r.text
    assert r.json()["questions"][0]["image_url"] is None


def test_non_image_rejected(client):
    teacher, _, _ = teacher_in_new_school(client, email="t-bad@e.com")
    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(teacher)).json()["id"]
    r = client.post(
        f"/api/v1/tests/{tid}/images",
        files={"file": ("x.txt", b"just text, not an image", "image/png")},
        headers=auth(teacher),
    )
    assert r.status_code == 400


def test_cannot_upload_to_foreign_test(client):
    owner, _, _ = teacher_in_new_school(client, email="owner@e.com")
    other, _, _ = teacher_in_new_school(client, email="other@e.com", school_name="Другая школа")
    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(owner)).json()["id"]
    r = client.post(
        f"/api/v1/tests/{tid}/images",
        files={"file": ("p.png", PNG, "image/png")},
        headers=auth(other),
    )
    assert r.status_code == 404


def test_student_sees_question_image(client):
    from tests.conftest import create_student, login

    teacher, _, _ = teacher_in_new_school(client, email="t-stud@e.com")
    cls = make_class(client, teacher, grade=8, letter="В")
    student = create_student(client, teacher, cls["id"], "Ученик")
    stok = login(client, student["username"], student["password"])

    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(teacher)).json()["id"]
    url = client.post(
        f"/api/v1/tests/{tid}/images",
        files={"file": ("p.png", PNG, "image/png")},
        headers=auth(teacher),
    ).json()["url"]
    client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [_q(image_url=url)]},
        headers=auth(teacher),
    )
    client.post(f"/api/v1/tests/{tid}/publish", headers=auth(teacher))
    aid = client.post(
        "/api/v1/assignments",
        json={"test_id": tid, "class_id": cls["id"]},
        headers=auth(teacher),
    ).json()["id"]

    state = client.post(f"/api/v1/assignments/{aid}/attempts", headers=auth(stok)).json()
    assert state["questions"][0]["image_url"] == url


def test_question_order_is_persisted(client):
    teacher, _, _ = teacher_in_new_school(client, email="t-ord@e.com")
    tid = client.post("/api/v1/tests", json={"title": "Тест"}, headers=auth(teacher)).json()["id"]
    client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [_q("A"), _q("B"), _q("C")]},
        headers=auth(teacher),
    )
    # переставили: C, A, B
    r = client.put(
        f"/api/v1/tests/{tid}/questions",
        json={"questions": [_q("C"), _q("A"), _q("B")]},
        headers=auth(teacher),
    )
    qs = r.json()["questions"]
    assert [q["text"] for q in qs] == ["C", "A", "B"]
    assert [q["position"] for q in qs] == [0, 1, 2]
