import uuid
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentTeacher, DbSession
from app.schemas.attempt import AttemptReviewOut
from app.schemas.results import AssignmentResultsOut
from app.services import export_service, results_service

router = APIRouter(tags=["results"])

_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/assignments/{assignment_id}/results", response_model=AssignmentResultsOut)
def assignment_results(assignment_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return results_service.assignment_results(db, teacher, assignment_id)


@router.get("/assignments/{assignment_id}/results/export.xlsx")
def export_results(assignment_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    stream = export_service.export_assignment_results_xlsx(db, teacher, assignment_id)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        stream,
        media_type=_XLSX,
        headers={"Content-Disposition": f'attachment; filename="results_{stamp}.xlsx"'},
    )


@router.get("/attempts/{attempt_id}/review", response_model=AttemptReviewOut)
def attempt_review(attempt_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return results_service.attempt_review(db, teacher, attempt_id)
