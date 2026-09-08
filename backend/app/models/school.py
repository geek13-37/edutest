import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class School(Base, TimestampMixin):
    __tablename__ = "schools"
    __table_args__ = (UniqueConstraint("name", "city", name="uq_school_name_city"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False, default="", index=True)
    region: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    # префикс логинов учеников этой школы (номер школы или короткий код), глобально уникален
    login_prefix: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    # код, по которому учителя регистрируются в этой школе
    signup_code: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    # счетчик для генерации порядковых номеров учеников
    student_seq: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL", use_alter=True, name="fk_schools_created_by"),
        nullable=True,
    )
    # мягкое удаление: непустое значение = школа в архиве (скрыта, вход заблокирован)
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    users = relationship("User", back_populates="school", foreign_keys="User.school_id")

    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None
