import uuid

from fastapi import APIRouter

from app.core.deps import CurrentStudent, DbSession
from app.schemas.attempt import AnswerIn, AttemptResultOut, AttemptStateOut
from app.services import attempt_service

router = APIRouter(tags=["attempts"])


@router.post("/assignments/{assignment_id}/attempts", response_model=AttemptStateOut)
def start_attempt(assignment_id: uuid.UUID, student: CurrentStudent, db: DbSession):
    attempt = attempt_service.start_attempt(db, student.id, assignment_id)
    return attempt_service.get_attempt_state(db, student.id, attempt.id)


@router.get("/attempts/{attempt_id}", response_model=AttemptStateOut)
def get_attempt(attempt_id: uuid.UUID, student: CurrentStudent, db: DbSession):
    return attempt_service.get_attempt_state(db, student.id, attempt_id)


@router.patch("/attempts/{attempt_id}/answers", status_code=204)
def save_answer(attempt_id: uuid.UUID, data: AnswerIn, student: CurrentStudent, db: DbSession):
    attempt_service.save_answer(db, student.id, attempt_id, data.question_id, data.selected)


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResultOut)
def submit_attempt(attempt_id: uuid.UUID, student: CurrentStudent, db: DbSession):
    attempt = attempt_service.submit_attempt(db, student.id, attempt_id)
    return AttemptResultOut(
        id=attempt.id,
        status=attempt.status,
        percent=attempt.percent,
        submitted_at=attempt.submitted_at,
    )
