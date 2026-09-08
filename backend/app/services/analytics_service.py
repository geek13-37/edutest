from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Assignment,
    Attempt,
    AttemptStatus,
    Class,
    School,
    User,
    UserRole,
)

FINISHED = (AttemptStatus.submitted, AttemptStatus.expired)
WEEKS = 12
RECENT_DAYS = 30


def _week_start(value: datetime) -> date:
    value = value.astimezone(timezone.utc)
    return (value - timedelta(days=value.weekday())).date()


def _finished_attempts_stmt():
    """Завершенные попытки школ, которые сейчас не в архиве."""
    return (
        select(Attempt, School.id.label("school_id"))
        .join(Assignment, Assignment.id == Attempt.assignment_id)
        .join(Class, Class.id == Assignment.class_id)
        .join(School, School.id == Class.school_id)
        .where(Attempt.status.in_(FINISHED), School.archived_at.is_(None))
    )


def platform_analytics(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    this_week = now - timedelta(days=now.weekday())
    this_week = this_week.replace(hour=0, minute=0, second=0, microsecond=0)
    weeks = [(this_week - timedelta(weeks=i)).date() for i in range(WEEKS - 1, -1, -1)]
    start = datetime.combine(weeks[0], datetime.min.time(), tzinfo=timezone.utc)
    recent = now - timedelta(days=RECENT_DAYS)

    schools_by_week: dict[date, int] = {}
    for row in db.execute(
        select(School.created_at).where(
            School.created_at >= start, School.archived_at.is_(None)
        )
    ):
        schools_by_week[_week_start(row[0])] = schools_by_week.get(_week_start(row[0]), 0) + 1

    teachers_by_week: dict[date, int] = {}
    for row in db.execute(
        select(User.created_at).where(
            User.created_at >= start, User.role == UserRole.teacher
        )
    ):
        teachers_by_week[_week_start(row[0])] = teachers_by_week.get(_week_start(row[0]), 0) + 1

    attempts_by_week: dict[date, int] = {}
    attempts_sub = _finished_attempts_stmt().subquery()
    for row in db.execute(
        select(attempts_sub.c.submitted_at, attempts_sub.c.started_at).where(
            func.coalesce(attempts_sub.c.submitted_at, attempts_sub.c.started_at) >= start
        )
    ):
        wk = _week_start(row[0] or row[1])
        attempts_by_week[wk] = attempts_by_week.get(wk, 0) + 1

    weekly = [
        {
            "week_start": wk.isoformat(),
            "new_schools": schools_by_week.get(wk, 0),
            "new_teachers": teachers_by_week.get(wk, 0),
            "attempts": attempts_by_week.get(wk, 0),
        }
        for wk in weeks
    ]

    # ── топ активных школ за 30 дней ──────────────────────
    top_rows = db.execute(
        select(
            School.id,
            School.name,
            School.city,
            func.count(Attempt.id),
            func.avg(Attempt.percent),
        )
        .join(Assignment, Assignment.id == Attempt.assignment_id)
        .join(Class, Class.id == Assignment.class_id)
        .join(School, School.id == Class.school_id)
        .where(
            Attempt.status.in_(FINISHED),
            School.archived_at.is_(None),
            func.coalesce(Attempt.submitted_at, Attempt.started_at) >= recent,
        )
        .group_by(School.id, School.name, School.city)
        .order_by(func.count(Attempt.id).desc())
        .limit(8)
    ).all()
    top_schools = [
        {
            "school_id": str(sid),
            "name": name,
            "city": city,
            "attempts": int(cnt),
            "avg_percent": round(float(avg), 1) if avg is not None else None,
        }
        for sid, name, city, cnt, avg in top_rows
    ]

    # ── спящие школы: активные, но без прохождений за 30 дней ──
    active_recent = {row[0] for row in db.execute(
        select(Class.school_id)
        .join(Assignment, Assignment.class_id == Class.id)
        .join(Attempt, Attempt.assignment_id == Assignment.id)
        .where(
            Attempt.status.in_(FINISHED),
            func.coalesce(Attempt.submitted_at, Attempt.started_at) >= recent,
        )
        .distinct()
    )}
    last_activity: dict[str, datetime] = {}
    for sid, ts in db.execute(
        select(
            School.id,
            func.max(func.coalesce(Attempt.submitted_at, Attempt.started_at)),
        )
        .join(Class, Class.school_id == School.id)
        .join(Assignment, Assignment.class_id == Class.id)
        .join(Attempt, Attempt.assignment_id == Assignment.id)
        .group_by(School.id)
    ):
        if ts is not None:
            last_activity[str(sid)] = ts

    dormant = []
    for s in db.scalars(
        select(School).where(School.archived_at.is_(None)).order_by(School.created_at)
    ):
        if s.id in active_recent:
            continue
        la = last_activity.get(str(s.id))
        dormant.append(
            {
                "school_id": str(s.id),
                "name": s.name,
                "city": s.city,
                "created_at": s.created_at.isoformat(),
                "last_activity": la.isoformat() if la else None,
            }
        )
        if len(dormant) >= 20:
            break

    # ── сводные показатели ───────────────────────────────
    fin = _finished_attempts_stmt().subquery()
    attempts_total = db.scalar(select(func.count()).select_from(fin)) or 0
    tests_conducted = db.scalar(
        select(func.count(func.distinct(fin.c.assignment_id)))
    ) or 0
    avg_percent = db.scalar(select(func.avg(fin.c.percent)))

    return {
        "weekly": weekly,
        "top_schools": top_schools,
        "dormant_schools": dormant,
        "totals": {
            "attempts_total": int(attempts_total),
            "tests_conducted": int(tests_conducted),
            "avg_percent": round(float(avg_percent), 1) if avg_percent is not None else None,
        },
    }
