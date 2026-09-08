from fastapi import APIRouter

from app.core.deps import CurrentStudent, DbSession
from app.schemas.assignment import StudentAssignmentOut
from app.schemas.klass import StudentClassOut
from app.services import assignment_service, class_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/classes", response_model=list[StudentClassOut])
def my_classes(student: CurrentStudent, db: DbSession):
    return [
        StudentClassOut(
            id=c.id,
            display_name=class_service.display_name(c),
            teacher_name=t.full_name,
            joined_at=m.created_at,
        )
        for c, t, m in class_service.list_student_classes(db, student.id)
    ]


@router.get("/assignments", response_model=list[StudentAssignmentOut])
def my_assignments(student: CurrentStudent, db: DbSession):
    return assignment_service.student_assignment_view(db, student.id)
