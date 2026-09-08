from fastapi import APIRouter

from app.core.deps import CurrentTeacher
from app.services import catalog_service

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/curriculum")
def get_curriculum(teacher: CurrentTeacher):
    """Дерево школьной программы: предмет -> класс -> тема."""
    return catalog_service.curriculum()


@router.get("/exams")
def get_exams(teacher: CurrentTeacher):
    """Дерево экзаменов: экзамен -> предмет -> задание."""
    return catalog_service.exams()
