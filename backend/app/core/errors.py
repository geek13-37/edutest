import logging

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

log = logging.getLogger("edutest.error")


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors = jsonable_encoder(exc.errors())
        first_msg = errors[0]["msg"] if errors else "Ошибка валидации"
        detail = first_msg.removeprefix("Value error, ") if isinstance(first_msg, str) else "Ошибка валидации"
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": detail, "errors": errors},
        )

    @app.exception_handler(IntegrityError)
    async def _integrity(request: Request, exc: IntegrityError):
        # не логируем текст исключения целиком: в нём бывают значения строк (email, хеши)
        log.warning("IntegrityError on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Конфликт данных"},
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Внутренняя ошибка сервера"},
        )
