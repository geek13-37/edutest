import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Query, Response, status
from fastapi.responses import StreamingResponse

from app.core.deps import CurrentAdmin, DbSession
from app.schemas.admin import (
    AdminCreateIn,
    AdminOut,
    AnalyticsOut,
    AuditListOut,
    SchoolAdminOut,
    SchoolCreateIn,
    SchoolUpdateIn,
    SetActiveIn,
    StatsOut,
    TeacherAdminOut,
    TeacherCreateIn,
    TeacherCredentials,
)
from app.services import (
    admin_service,
    analytics_service,
    audit_service,
    export_service,
    school_service,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _school_out(entry: dict) -> SchoolAdminOut:
    s = entry["school"]
    return SchoolAdminOut(
        id=s.id,
        name=s.name,
        city=s.city,
        region=s.region,
        login_prefix=s.login_prefix,
        signup_code=s.signup_code,
        teachers_count=entry["teachers"],
        students_count=entry["students"],
        created_at=s.created_at,
        archived_at=s.archived_at,
    )


def _school_with_counts(db, school) -> SchoolAdminOut:
    t, st = school_service._counts(db, school.id)
    return _school_out({"school": school, "teachers": t, "students": st})


@router.get("/stats", response_model=StatsOut)
def stats(admin: CurrentAdmin, db: DbSession):
    return school_service.school_stats(db)


@router.get("/analytics", response_model=AnalyticsOut)
def analytics(admin: CurrentAdmin, db: DbSession):
    return analytics_service.platform_analytics(db)


@router.get("/audit", response_model=AuditListOut)
def audit_log(
    admin: CurrentAdmin,
    db: DbSession,
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    rows, total = audit_service.list_events(
        db, action=action, target_type=target_type, limit=limit, offset=offset
    )
    items = [
        {
            "id": r.id,
            "actor_label": r.actor_label,
            "action": r.action,
            "action_label": audit_service.ACTION_LABELS.get(r.action, r.action),
            "target_type": r.target_type,
            "target_label": r.target_label,
            "summary": r.summary,
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return {"items": items, "total": total}


# ── Школы ────────────────────────────────────────────────
@router.get("/schools", response_model=list[SchoolAdminOut])
def list_schools(
    admin: CurrentAdmin,
    db: DbSession,
    scope: Literal["active", "archived", "all"] = Query(default="active"),
):
    return [_school_out(e) for e in school_service.list_schools(db, scope=scope)]


@router.post("/schools", response_model=SchoolAdminOut, status_code=status.HTTP_201_CREATED)
def create_school(data: SchoolCreateIn, admin: CurrentAdmin, db: DbSession):
    school = school_service.create_school(
        db, name=data.name, city=data.city, region=data.region, created_by=admin.id, actor=admin,
    )
    return _school_with_counts(db, school)


@router.patch("/schools/{school_id}", response_model=SchoolAdminOut)
def update_school(school_id: uuid.UUID, data: SchoolUpdateIn, admin: CurrentAdmin, db: DbSession):
    school = school_service.update_school(
        db, school_id, name=data.name, city=data.city, region=data.region, actor=admin
    )
    return _school_with_counts(db, school)


@router.post("/schools/{school_id}/regenerate-code", response_model=SchoolAdminOut)
def regenerate_code(school_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    school = school_service.regenerate_signup_code(db, school_id, actor=admin)
    return _school_with_counts(db, school)


@router.post("/schools/{school_id}/archive", response_model=SchoolAdminOut)
def archive_school(school_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    school = school_service.archive_school(db, school_id, actor=admin)
    return _school_with_counts(db, school)


@router.post("/schools/{school_id}/restore", response_model=SchoolAdminOut)
def restore_school(school_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    school = school_service.restore_school(db, school_id, actor=admin)
    return _school_with_counts(db, school)


@router.delete("/schools/{school_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_school(school_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    school_service.delete_school(db, school_id, actor=admin)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/schools/{school_id}/export.xlsx")
def export_school(school_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    school = school_service.get(db, school_id)
    stream = export_service.export_school_xlsx(db, school_id)
    audit_service.record(
        db,
        actor=admin,
        action="school.export",
        target_type="school",
        target_id=school.id,
        target_label=f"{school.name}, {school.city}",
        summary=f"Выгружены данные школы «{school.name}»",
    )
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        stream,
        media_type=_XLSX,
        headers={"Content-Disposition": f'attachment; filename="school_{stamp}.xlsx"'},
    )


# ── Учителя ──────────────────────────────────────────────
@router.get("/teachers", response_model=list[TeacherAdminOut])
def list_teachers(
    admin: CurrentAdmin, db: DbSession, school_id: uuid.UUID | None = Query(default=None)
):
    return admin_service.list_teachers(db, school_id)


@router.post("/teachers", response_model=TeacherCredentials, status_code=status.HTTP_201_CREATED)
def create_teacher(data: TeacherCreateIn, admin: CurrentAdmin, db: DbSession):
    return admin_service.create_teacher(
        db, full_name=data.full_name, email=data.email, school_id=data.school_id, actor=admin
    )


@router.patch("/teachers/{teacher_id}/active", response_model=TeacherAdminOut)
def set_teacher_active(
    teacher_id: uuid.UUID, data: SetActiveIn, admin: CurrentAdmin, db: DbSession
):
    return _teacher_out(
        db, admin_service.set_teacher_active(db, teacher_id, data.is_active, actor=admin)
    )


@router.post("/teachers/{teacher_id}/reset-password", response_model=TeacherCredentials)
def reset_teacher_password(teacher_id: uuid.UUID, admin: CurrentAdmin, db: DbSession):
    return admin_service.reset_teacher_password(db, teacher_id, actor=admin)


# ── Администраторы ───────────────────────────────────────
@router.get("/admins", response_model=list[AdminOut])
def list_admins(admin: CurrentAdmin, db: DbSession):
    return admin_service.list_admins(db)


@router.post("/admins", response_model=AdminOut, status_code=status.HTTP_201_CREATED)
def create_admin(data: AdminCreateIn, admin: CurrentAdmin, db: DbSession):
    return admin_service.create_admin(
        db, full_name=data.full_name, email=data.email, password=data.password, actor=admin
    )


def _teacher_out(db, t) -> TeacherAdminOut:
    from app.models import School

    school = db.get(School, t.school_id) if t.school_id else None
    return TeacherAdminOut(
        id=t.id,
        full_name=t.full_name,
        email=t.email,
        is_active=t.is_active,
        school_id=t.school_id,
        school_name=school.name if school else None,
        created_at=t.created_at,
    )
