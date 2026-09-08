import uuid

from fastapi import APIRouter, Response, status

from app.core.deps import CurrentTeacher, DbSession
from app.schemas.klass import ClassCreateIn, ClassOut, ClassUpdateIn
from app.services import class_service

router = APIRouter(prefix="/classes", tags=["classes"])


def _to_out(klass, count: int, *, creator_name: str, is_mine: bool) -> ClassOut:
    return ClassOut(
        id=klass.id,
        display_name=class_service.display_name(klass),
        name=klass.name,
        letter=klass.letter,
        grade=class_service.current_grade(klass),
        graduation_year=klass.graduation_year,
        archived=klass.archived,
        created_at=klass.created_at,
        members_count=count,
        created_by_name=creator_name,
        is_mine=is_mine,
    )


@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(data: ClassCreateIn, teacher: CurrentTeacher, db: DbSession):
    klass = class_service.create_class(db, teacher, data)
    return _to_out(klass, 0, creator_name=teacher.full_name, is_mine=True)


@router.get("", response_model=list[ClassOut])
def list_classes(teacher: CurrentTeacher, db: DbSession):
    return [
        _to_out(
            c,
            n,
            creator_name=creator.full_name,
            is_mine=creator.id == teacher.id,
        )
        for c, creator, n in class_service.list_school_classes(db, teacher)
    ]


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    klass = class_service.get_school_class(db, teacher, class_id)
    return _to_out(
        klass,
        class_service._members_count(db, klass.id),
        creator_name=klass.teacher.full_name,
        is_mine=klass.teacher_id == teacher.id,
    )


@router.patch("/{class_id}", response_model=ClassOut)
def update_class(class_id: uuid.UUID, data: ClassUpdateIn, teacher: CurrentTeacher, db: DbSession):
    klass = class_service.update_class(db, teacher, class_id, data)
    return _to_out(
        klass,
        class_service._members_count(db, klass.id),
        creator_name=klass.teacher.full_name,
        is_mine=klass.teacher_id == teacher.id,
    )


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: uuid.UUID, teacher: CurrentTeacher, db: DbSession):
    class_service.delete_class(db, teacher, class_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
