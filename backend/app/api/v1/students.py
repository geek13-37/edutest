import uuid
from datetime import datetime

from fastapi import APIRouter, Query, Request, Response, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.core.deps import CurrentTeacher, DbSession
from app.core.rate_limit import limiter
from app.schemas.klass import ClassMemberOut
from app.schemas.student import (
    AddMemberIn,
    HandoutRequest,
    StudentBulkCreateIn,
    StudentCreateIn,
    StudentCredentials,
    StudentOut,
)
from app.services import class_service, handout_service, student_service

router = APIRouter(tags=["students"])


@router.get("/classes/{class_id}/members", response_model=list[ClassMemberOut])
def list_members(class_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return [
        ClassMemberOut(
            id=m.id,
            student_id=u.id,
            full_name=u.full_name,
            username=u.username,
            joined_at=m.created_at,
        )
        for m, u in student_service.list_members(db, teacher, class_id)
    ]


@router.post(
    "/classes/{class_id}/students",
    response_model=StudentCredentials,
    status_code=status.HTTP_201_CREATED,
)
def create_student(class_id: uuid.UUID, data: StudentCreateIn, teacher: CurrentTeacher, db: DbSession):
    return student_service.create_student(db, teacher, class_id, data.full_name)


@router.post(
    "/classes/{class_id}/students/bulk",
    response_model=list[StudentCredentials],
    status_code=status.HTTP_201_CREATED,
)
def create_students_bulk(
    class_id: uuid.UUID, data: StudentBulkCreateIn, teacher: CurrentTeacher, db: DbSession
):
    return student_service.create_students_bulk(db, teacher, class_id, data.names)


@router.post("/classes/{class_id}/members", status_code=status.HTTP_204_NO_CONTENT)
def add_member(class_id: uuid.UUID, data: AddMemberIn, teacher: CurrentTeacher, db: DbSession):
    student_service.add_existing_member(db, teacher, class_id, data.student_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/classes/{class_id}/members/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(class_id: uuid.UUID, student_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    class_service.remove_member(db, teacher, class_id, student_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/students", response_model=list[StudentOut])
def search_students(
    teacher: CurrentTeacher,
    db: DbSession,
    q: str = Query(default="", max_length=120),
):
    return student_service.search_school_students(db, teacher, q)


@router.post("/students/{student_id}/reset-password", response_model=StudentCredentials)
@limiter.limit("30/minute")
def reset_password(request: Request, student_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    return student_service.reset_password(db, teacher, student_id)


@router.post("/classes/{class_id}/handouts.pdf")
@limiter.limit("20/minute")
def handouts_pdf(
    request: Request, class_id: uuid.UUID, data: HandoutRequest, teacher: CurrentTeacher, db: DbSession
):
    klass = class_service.get_school_class(db, teacher, class_id)
    school = teacher.school.name if teacher.school else None
    login_url = settings.cors_origins[0] + "/login" if settings.cors_origins else "/login"
    stream = handout_service.build_handouts_pdf(
        class_name=f"Класс {class_service.display_name(klass)}",
        school_name=school,
        login_url=login_url,
        items=[i.model_dump() for i in data.items],
    )
    stamp = datetime.now().strftime("%Y%m%d")
    return StreamingResponse(
        stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="logins_{stamp}.pdf"'},
    )
