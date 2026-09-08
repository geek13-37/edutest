from fastapi import APIRouter, Request, Response, status

from app.core.deps import CurrentUser, DbSession
from app.core.rate_limit import limiter
from app.schemas.auth import (
    ChangePasswordIn,
    LoginIn,
    RefreshIn,
    RegisterTeacherIn,
    SchoolPublicOut,
    TokenPair,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/school-by-code/{code}", response_model=SchoolPublicOut)
@limiter.limit("30/minute")
def school_by_code(request: Request, code: str, db: DbSession):
    return auth_service.school_by_code(db, code)


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(request: Request, data: RegisterTeacherIn, db: DbSession):
    _, access, refresh = auth_service.register_teacher(db, data)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
def login(request: Request, data: LoginIn, db: DbSession):
    _, access, refresh = auth_service.login(db, data)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
@limiter.limit("30/minute")
def refresh(request: Request, data: RefreshIn, db: DbSession):
    _, access, new_refresh = auth_service.refresh_tokens(db, data.refresh_token)
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshIn, db: DbSession):
    auth_service.logout(db, data.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def change_password(request: Request, data: ChangePasswordIn, user: CurrentUser, db: DbSession):
    auth_service.change_password(db, user, data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
