from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Media

MAX_BYTES = 2 * 1024 * 1024  # 2 МБ на картинку


def _sniff(data: bytes) -> str | None:
    """Определяет тип по сигнатуре, а не по заголовку клиента."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def save_image(db: Session, user_id: uuid.UUID, data: bytes) -> Media:
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Пустой файл")
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Картинка больше 2 МБ")
    content_type = _sniff(data)
    if content_type is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Поддерживаются JPEG, PNG, WebP и GIF")

    media = Media(content_type=content_type, byte_size=len(data), data=data, created_by=user_id)
    db.add(media)
    db.flush()
    return media


def get_media(db: Session, media_id: uuid.UUID) -> Media:
    media = db.get(Media, media_id)
    if media is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Файл не найден")
    return media
