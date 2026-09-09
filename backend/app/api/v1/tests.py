import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.core.deps import CurrentTeacher, DbSession
from app.core.rate_limit import limiter
from app.schemas.question import QuestionOut
from app.schemas.test import (
    AIGenerateIn,
    AIQuestionsOut,
    AIReviseIn,
    QuestionsReplaceIn,
    TestCreateIn,
    TestDetailOut,
    TestOut,
    TestUpdateIn,
)
from app.services import test_service
from app.services.ai_service import AIService

router = APIRouter(prefix="/tests", tags=["tests"])


def _out(test, count: int) -> TestOut:
    dto = TestOut.model_validate(test)
    dto.questions_count = count
    return dto


def _detail(test) -> TestDetailOut:
    dto = TestDetailOut.model_validate(test)
    dto.questions_count = len(test.questions)
    dto.questions = [QuestionOut.model_validate(q) for q in test.questions]
    return dto


@router.post("", response_model=TestOut, status_code=status.HTTP_201_CREATED)
def create_test(data: TestCreateIn, teacher: CurrentTeacher, db: DbSession):
    return _out(test_service.create_test(db, teacher.id, data), 0)


@router.get("", response_model=list[TestOut])
def list_tests(
    teacher: CurrentTeacher, db: DbSession, subject: str | None = Query(default=None)
):
    return [_out(t, n) for t, n in test_service.list_tests(db, teacher.id, subject=subject)]


@router.get("/{test_id}", response_model=TestDetailOut)
def get_test(test_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return _detail(test_service.get_owned_test(db, teacher.id, test_id, with_questions=True))


@router.patch("/{test_id}", response_model=TestDetailOut)
def update_test(test_id: uuid.UUID, data: TestUpdateIn, teacher: CurrentTeacher, db: DbSession):
    test_service.update_test(db, teacher.id, test_id, data)
    return _detail(test_service.get_owned_test(db, teacher.id, test_id, with_questions=True))


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(test_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    test_service.delete_test(db, teacher.id, test_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{test_id}/questions", response_model=TestDetailOut)
def replace_questions(test_id: uuid.UUID, data: QuestionsReplaceIn, teacher: CurrentTeacher, db: DbSession):
    test = test_service.replace_questions(db, teacher.id, test_id, data.questions)
    return _detail(test)


@router.post("/{test_id}/publish", response_model=TestDetailOut)
def publish(test_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    test_service.set_status(db, teacher.id, test_id, True)
    return _detail(test_service.get_owned_test(db, teacher.id, test_id, with_questions=True))


@router.post("/{test_id}/unpublish", response_model=TestDetailOut)
def unpublish(test_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    test_service.set_status(db, teacher.id, test_id, False)
    return _detail(test_service.get_owned_test(db, teacher.id, test_id, with_questions=True))


@router.post("/{test_id}/ai/generate", response_model=AIQuestionsOut)
@limiter.limit("20/hour")
async def ai_generate(
    request: Request, test_id: uuid.UUID, data: AIGenerateIn, teacher: CurrentTeacher, db: DbSession
):
    test = test_service.get_owned_test(db, teacher.id, test_id, with_questions=True)
    try:
        generated = await AIService.generate(data.prompt, data.count)
    except RuntimeError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    if data.mode == "append":
        existing = [
            {"type": q.type.value, "text": q.text, "options": q.options, "correct": q.correct, "points": q.points}
            for q in test.questions
        ]
        merged = existing + [q.model_dump() for q in generated]
        return AIQuestionsOut.model_validate({"questions": merged})
    return AIQuestionsOut(questions=generated)


@router.post("/{test_id}/ai/revise", response_model=AIQuestionsOut)
@limiter.limit("20/hour")
async def ai_revise(
    request: Request, test_id: uuid.UUID, data: AIReviseIn, teacher: CurrentTeacher, db: DbSession
):
    # правим тот черновик, что сейчас на экране, а не сохраненную версию
    test_service.get_owned_test(db, teacher.id, test_id)
    current = [
        {"type": q.type.value, "text": q.text, "options": [o.model_dump() for o in q.options],
         "correct": list(q.correct), "points": q.points}
        for q in data.questions
    ]
    try:
        revised = await AIService.revise(current, data.prompt)
    except RuntimeError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    return AIQuestionsOut(questions=revised)
