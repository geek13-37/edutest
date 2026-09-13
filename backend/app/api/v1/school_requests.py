from fastapi import APIRouter, Request, status

from app.core.deps import DbSession
from app.core.rate_limit import limiter
from app.schemas.school_request import SchoolRequestCreateIn
from app.services import school_request_service

router = APIRouter(prefix="/school-requests", tags=["school-requests"])


@router.post("", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def create_school_request(request: Request, data: SchoolRequestCreateIn, db: DbSession):
    school_request_service.create_request(
        db,
        school_name=data.school_name,
        city=data.city,
        region=data.region,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        comment=data.comment,
        honeypot=data.website,
    )
    return {"detail": "Заявка отправлена"}
