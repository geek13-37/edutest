from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        for k, v in _SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        if settings.is_prod:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_bytes: int, exempt_prefixes: tuple[str, ...] = ()):
        super().__init__(app)
        self.max_bytes = max_bytes
        self.exempt_prefixes = exempt_prefixes

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(p) or path.endswith(p) for p in self.exempt_prefixes):
            return await call_next(request)
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > self.max_bytes:
                    return JSONResponse({"detail": "Слишком большой запрос"}, status_code=413)
            except ValueError:
                return JSONResponse({"detail": "Некорректный Content-Length"}, status_code=400)
        return await call_next(request)
