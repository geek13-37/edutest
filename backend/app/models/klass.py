import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Class(Base, TimestampMixin):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # школа класса; классами школы управляют все ее учителя
    school_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("schools.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # учитель, создавший класс (для отображения «создал»)
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # произвольное название (используется, если класс не привязан к параллели)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # буква параллели и год окончания 11 класса, для авто-повышения номера 1 сентября
    letter: Mapped[str | None] = mapped_column(String(4), nullable=True)
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    school = relationship("School")
    teacher = relationship("User", back_populates="classes_owned")
    members = relationship("ClassMember", back_populates="klass", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="klass", cascade="all, delete-orphan")


class ClassMember(Base, TimestampMixin):
    __tablename__ = "class_members"
    __table_args__ = (UniqueConstraint("class_id", "student_id", name="uq_class_student"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    klass = relationship("Class", back_populates="members")
    student = relationship("User", back_populates="memberships")
