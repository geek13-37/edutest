FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY . .
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

# непривилегированный пользователь
RUN useradd --system --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

# доверяем X-Forwarded-For от nginx, чтобы rate limit и логи видели
# реальный IP клиента (порт backend наружу не проброшен, см. compose)
ENV FORWARDED_ALLOW_IPS="*"

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && (python scripts/create_admin.py || true) && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
