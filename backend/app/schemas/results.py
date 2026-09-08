import uuid
from datetime import datetime

from app.models import AttemptStatus
from app.schemas.common import ORMModel


class StudentResultRow(ORMModel):
    student_id: uuid.UUID
    student_name: str
    student_login: str
    attempts_used: int
    best_attempt_id: uuid.UUID | None
    best_score: int | None
    max_score: int | None
    best_percent: float | None
    grade: str | None
    last_activity: datetime | None
    status: AttemptStatus | None


class AssignmentResultsOut(ORMModel):
    assignment_id: uuid.UUID
    test_title: str
    class_name: str
    total_students: int
    submitted_count: int
    average_percent: float | None
    rows: list[StudentResultRow]
