import enum
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionType(str, enum.Enum):
    single = "single"      # ровно один правильный вариант
    multiple = "multiple"  # один и более правильных вариантов
    boolean = "boolean"    # верно / неверно
    short = "short"        # короткий ответ (число/слово), автопроверка по совпадению


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    test_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    type: Mapped[QuestionType] = mapped_column(
        SAEnum(QuestionType, name="question_type"), nullable=False
    )
    text: Mapped[str] = mapped_column(String(2000), nullable=False)
    # options: [{"id": "a", "text": "..."}, ...]; для short пустой список
    options: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # correct: id правильных вариантов ["a", "c"]; для short - строки-ответы ["12", "12 см"]
    correct: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    test = relationship("Test", back_populates="questions")
