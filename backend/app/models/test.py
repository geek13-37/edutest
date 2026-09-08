import enum
import uuid

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

DEFAULT_GRADE_THRESHOLDS = {"5": 90, "4": 75, "3": 50, "2": 40}


class TestStatus(str, enum.Enum):
    draft = "draft"
    published = "published"


class Test(Base, TimestampMixin):
    __tablename__ = "tests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), default="", nullable=False)

    # теги из каталога-справочника (программа / экзамен), все необязательны
    subject: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
    topic: Mapped[str | None] = mapped_column(String(200), nullable=True)
    template_ref: Mapped[str | None] = mapped_column(String(80), nullable=True)

    status: Mapped[TestStatus] = mapped_column(
        SAEnum(TestStatus, name="test_status"), default=TestStatus.draft, nullable=False
    )
    grade_thresholds: Mapped[dict] = mapped_column(
        JSONB, default=lambda: dict(DEFAULT_GRADE_THRESHOLDS), nullable=False
    )
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    time_limit_min: Mapped[int | None] = mapped_column(Integer, nullable=True)

    owner = relationship("User", back_populates="tests")
    questions = relationship(
        "Question",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )
    assignments = relationship("Assignment", back_populates="test", cascade="all, delete-orphan")
