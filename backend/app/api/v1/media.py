import uuid

from fastapi import APIRouter, Request, Response, UploadFile

from app.core.deps import CurrentTeacher, DbSession
from app.core.rate_limit import limiter
from app.services import media_service, test_service

router = APIRouter(tags=["media"])


@router.post("/tests/{test_id}/images")
@limiter.limit("120/hour")
async def upload_question_image(
    request: Request,
    test_id: uuid.UUID,
    file: UploadFile,
    teacher: CurrentTeacher,
    db: DbSession,
):
    test_service.get_owned_test(db, teacher.id, test_id)
    data = await file.read()
    media = media_service.save_image(db, teacher.id, data)
    return {"url": f"/api/v1/media/{media.id}"}


@router.get("/media/{media_id}")
def get_media(media_id: uuid.UUID, db: DbSession):
    media = media_service.get_media(db, media_id)
    return Response(
        content=media.data,
        media_type=media.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
