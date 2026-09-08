import uuid

from fastapi import APIRouter, Response, status

from app.core.deps import CurrentTeacher, DbSession
from app.models import Class, Test
from app.schemas.assignment import AssignmentCreateIn, AssignmentOut
from app.services import assignment_service, class_service

router = APIRouter(tags=["assignments"])


def _out(db, a) -> AssignmentOut:
    test = db.get(Test, a.test_id)
    klass = db.get(Class, a.class_id)
    return AssignmentOut(
        id=a.id,
        test_id=a.test_id,
        class_id=a.class_id,
        test_title=test.title if test else "",
        class_name=class_service.display_name(klass) if klass else "",
        opens_at=a.opens_at,
        closes_at=a.closes_at,
        max_attempts=a.max_attempts,
        created_at=a.created_at,
    )


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(data: AssignmentCreateIn, teacher: CurrentTeacher, db: DbSession):
    return _out(db, assignment_service.create_assignment(db, teacher, data))


@router.get("/assignments/mine/count")
def my_assignments_count(teacher: CurrentTeacher, db: DbSession) -> dict[str, int]:
    return {"count": assignment_service.count_teacher_assignments(db, teacher)}


@router.get("/classes/{class_id}/assignments", response_model=list[AssignmentOut])
def list_class_assignments(class_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return [_out(db, a) for a in assignment_service.list_class_assignments(db, teacher, class_id)]


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    assignment_service.delete_assignment(db, teacher, assignment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
