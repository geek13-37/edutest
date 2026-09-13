from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.base import utcnow
from app.models import School, SchoolRequest, SchoolRequestStatus, User
from app.services import audit_service, school_service
from app.services.school_service import normalize


def create_request(
    db: Session,
    *,
    school_name: str,
    city: str,
    region: str = "",
    contact_name: str,
    contact_email: str | None,
    contact_phone: str | None,
    comment: str = "",
    honeypot: str = "",
) -> SchoolRequest | None:
    if honeypot:
        return None
    req = SchoolRequest(
        school_name=normalize(school_name),
        city=normalize(city),
        region=normalize(region),
        contact_name=normalize(contact_name),
        contact_email=contact_email,
        contact_phone=contact_phone.strip() if contact_phone else None,
        comment=comment.strip(),
    )
    db.add(req)
    db.flush()
    return req


def list_requests(db: Session, *, req_status: SchoolRequestStatus | None = None) -> list[SchoolRequest]:
    stmt = (
        select(SchoolRequest)
        .options(selectinload(SchoolRequest.result_school))
        .order_by(SchoolRequest.created_at.desc())
    )
    if req_status is not None:
        stmt = stmt.where(SchoolRequest.status == req_status)
    return list(db.scalars(stmt).all())


def find_approved_by_contact_email(
    db: Session, *, school_id: uuid.UUID, email: str
) -> SchoolRequest | None:
    """Заявка, по которой создана эта школа, если email совпадает с контактным.

    Используется, чтобы автоматически сделать завучем того, кто подавал заявку,
    без отдельного письма о назначении - он и так получает код на этот email.
    """
    return db.scalar(
        select(SchoolRequest).where(
            SchoolRequest.result_school_id == school_id,
            SchoolRequest.status == SchoolRequestStatus.approved,
            func.lower(SchoolRequest.contact_email) == email.lower(),
        )
    )


def get(db: Session, request_id: uuid.UUID, *, for_update: bool = False) -> SchoolRequest:
    stmt = select(SchoolRequest).where(SchoolRequest.id == request_id)
    if for_update:
        stmt = stmt.with_for_update()
    req = db.scalar(stmt)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Заявка не найдена")
    return req


def _ensure_pending(req: SchoolRequest) -> None:
    if req.status != SchoolRequestStatus.pending:
        raise HTTPException(status.HTTP_409_CONFLICT, "Заявка уже рассмотрена")


def approve_request(
    db: Session, request_id: uuid.UUID, *, actor: User
) -> tuple[SchoolRequest, School]:
    req = get(db, request_id, for_update=True)
    _ensure_pending(req)
    school = school_service.create_school(
        db,
        name=req.school_name,
        city=req.city,
        region=req.region,
        created_by=actor.id,
        actor=actor,
    )
    req.status = SchoolRequestStatus.approved
    req.decided_at = utcnow()
    req.decided_by = actor.id
    req.result_school_id = school.id
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school_request.approve",
        target_type="school_request",
        target_id=req.id,
        target_label=req.school_name,
        summary=f"Заявка «{req.school_name}» одобрена, создана школа",
    )
    return req, school


def reject_request(
    db: Session, request_id: uuid.UUID, *, reason: str | None, actor: User
) -> SchoolRequest:
    req = get(db, request_id, for_update=True)
    _ensure_pending(req)
    req.status = SchoolRequestStatus.rejected
    req.decided_at = utcnow()
    req.decided_by = actor.id
    req.reject_reason = normalize(reason) if reason else None
    db.flush()
    audit_service.record(
        db,
        actor=actor,
        action="school_request.reject",
        target_type="school_request",
        target_id=req.id,
        target_label=req.school_name,
        summary=f"Заявка «{req.school_name}» отклонена",
    )
    return req
