import uuid

from fastapi import APIRouter

from app.core.deps import CurrentLead, CurrentStudent, DbSession
from app.schemas.admin import LeadStatsOut, TeacherAdminOut, TeacherCredentials
from app.schemas.assignment import StudentAssignmentOut
from app.schemas.klass import StudentClassOut
from app.services import admin_service, assignment_service, class_service, school_service

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/school/teachers", response_model=list[TeacherAdminOut])
def school_teachers(lead: CurrentLead, db: DbSession):
    return admin_service.list_teachers(db, lead.school_id)


@router.post("/school/teachers/{teacher_id}/reset-password", response_model=TeacherCredentials)
def reset_school_teacher_password(teacher_id: uuid.UUID, lead: CurrentLead, db: DbSession):
    return admin_service.reset_teacher_password(
        db, teacher_id, actor=lead, school_id=lead.school_id
    )


@router.get("/school/stats", response_model=LeadStatsOut)
def school_stats(lead: CurrentLead, db: DbSession):
    return school_service.lead_stats(db, lead.school_id)


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
