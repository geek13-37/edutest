from fastapi import APIRouter

from app.api.v1 import (
    admin,
    assignments,
    attempts,
    auth,
    catalog,
    classes,
    me,
    media,
    results,
    students,
    tests,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(catalog.router)
api_router.include_router(me.router)
api_router.include_router(media.router)
api_router.include_router(classes.router)
api_router.include_router(students.router)
api_router.include_router(tests.router)
api_router.include_router(assignments.router)
api_router.include_router(attempts.router)
api_router.include_router(results.router)
