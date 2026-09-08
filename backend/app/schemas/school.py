import uuid

from app.schemas.common import ORMModel


class SchoolOut(ORMModel):
    id: uuid.UUID
    name: str
    city: str
    region: str
