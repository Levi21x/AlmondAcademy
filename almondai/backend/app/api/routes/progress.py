from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

IST = timezone(timedelta(hours=5, minutes=30))

from fastapi import APIRouter, Depends, Query

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.streak_service import StreakService

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])
streak_service = StreakService()


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _time_ago(iso_value: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
    except Exception:
        return "just now"

    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


def _empty_weekly_days(today_date: date | None = None) -> Dict[str, Any]:
    today = today_date or datetime.now(IST).date()
    start = today - timedelta(days=6)
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    days = []
    for i in range(7):
        day = start + timedelta(days=i)
        days.append(
            {
                "date": day.isoformat(),
                "day_label": labels[day.weekday()],
                "questions_asked": 0,
                "topics_completed": 0,
                "was_active": False,
            }
        )

    return {"days": days}


def _fetch_topics_with_subjects(client) -> List[Dict[str, Any]]:
    topics = client.table("syllabus_topics").select("id,subject_id").execute().data or []
    subjects = client.table("syllabus_subjects").select("id,name,year").execute().data or []
    subject_map = {subject["id"]: subject for subject in subjects}

    hydrated = []
    for topic in topics:
        subject = subject_map.get(topic["subject_id"], {})
        hydrated.append(
            {
                "id": topic["id"],
                "subject_id": topic["subject_id"],
                "subject_name": subject.get("name", "Unknown"),
                "year": subject.get("year", 0),
            }
        )
    return hydrated


@router.get("/overview")
def get_overview(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    streak = streak_service.get_streak(user_id)

    topics = _fetch_topics_with_subjects(client)
    topic_ids = [topic["id"] for topic in topics]

    progress_rows = []
    if topic_ids:
        progress_rows = (
            client.table("student_topic_progress")
            .select("topic_id,status")
            .eq("user_id", user_id)
            .in_("topic_id", topic_ids)
            .execute()
            .data
            or []
        )

    status_by_topic = {row["topic_id"]: row["status"] for row in progress_rows}

    total_topics = len(topics)
    completed = 0
    in_progress = 0
    needs_revision = 0

    for topic in topics:
        status = status_by_topic.get(topic["id"], "not_started")
        if status == "completed":
            completed += 1
        elif status == "in_progress":
            in_progress += 1
        elif status == "needs_revision":
            needs_revision += 1

    not_started = max(total_topics - completed - in_progress - needs_revision, 0)
    overall_percentage = int(round((completed / total_topics) * 100)) if total_topics else 0

    now = datetime.now(timezone.utc)
    today = now.date()
    week_start = today - timedelta(days=6)

    activity_rows = (
        client.table("study_activity")
        .select("activity_type,created_at")
        .eq("user_id", user_id)
        .gte("created_at", datetime.combine(week_start, datetime.min.time(), tzinfo=timezone.utc).isoformat())
        .execute()
        .data
        or []
    )

    today_questions = 0
    today_topics_completed = 0
    today_topics_started = 0

    week_questions = 0
    week_topics_completed = 0
    active_days = set()

    for row in activity_rows:
        created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        created_day = created.date()
        active_days.add(created_day.isoformat())
        activity_type = row.get("activity_type")

        if activity_type == "question_asked":
            week_questions += 1
            if created_day == today:
                today_questions += 1
        if activity_type == "topic_completed":
            week_topics_completed += 1
            if created_day == today:
                today_topics_completed += 1
        if activity_type == "topic_started" and created_day == today:
            today_topics_started += 1

    return _success(
        {
            "streak": {
                "current_streak": int(streak.get("current_streak", 0) or 0),
                "longest_streak": int(streak.get("longest_streak", 0) or 0),
                "total_active_days": int(streak.get("total_active_days", 0) or 0),
                "last_active_date": streak.get("last_active_date"),
            },
            "syllabus": {
                "total_topics": total_topics,
                "completed": completed,
                "in_progress": in_progress,
                "needs_revision": needs_revision,
                "not_started": not_started,
                "overall_percentage": overall_percentage,
            },
            "today": {
                "questions_asked": today_questions,
                "topics_completed": today_topics_completed,
                "topics_started": today_topics_started,
            },
            "this_week": {
                "questions_asked": week_questions,
                "topics_completed": week_topics_completed,
                "active_days": len(active_days),
            },
        }
    )


@router.get("/activity")
def get_activity(
    limit: int = Query(default=20, ge=1, le=100),
    activity_type: Optional[str] = Query(default=None),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    query = (
        client.table("study_activity")
        .select("id,activity_type,subject,topic_name,created_at")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(limit)
    )
    if activity_type:
        query = query.eq("activity_type", activity_type)

    rows = query.execute().data or []
    data = [
        {
            **row,
            "time_ago": _time_ago(row["created_at"]),
        }
        for row in rows
    ]

    return _success(data)


@router.get("/weekly")
def get_weekly(user=Depends(require_auth)) -> Dict[str, Any]:
    today = datetime.now(IST).date()
    seven_days_ago = today - timedelta(days=6)

    try:
        client = get_supabase_admin_client()
        user_id = user["user_id"]

        rows = (
            client.table("study_activity")
            .select("activity_type,created_at")
            .eq("user_id", user_id)
            .gte("created_at", datetime.combine(seven_days_ago, datetime.min.time(), tzinfo=IST).isoformat())
            .execute()
            .data
            or []
        )

        empty = _empty_weekly_days(today_date=today)
        bucket = {day["date"]: day for day in empty["days"]}

        for row in rows:
            created_at = row.get("created_at")
            if not created_at:
                continue
            created = datetime.fromisoformat(str(created_at).replace("Z", "+00:00"))
            key = created.astimezone(IST).date().isoformat()
            if key not in bucket:
                continue
            bucket[key]["was_active"] = True
            if row.get("activity_type") == "question_asked":
                bucket[key]["questions_asked"] += 1
            if row.get("activity_type") == "topic_completed":
                bucket[key]["topics_completed"] += 1

        ordered = [bucket[(seven_days_ago + timedelta(days=i)).isoformat()] for i in range(7)]
        return _success({"days": ordered})
    except Exception:
        return _success(_empty_weekly_days(today_date=today))


@router.get("/subjects")
def get_subjects_progress(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    subjects = client.table("syllabus_subjects").select("id,name,year").order("sort_order", desc=False).execute().data or []
    topics = client.table("syllabus_topics").select("id,subject_id").execute().data or []

    topic_ids = [topic["id"] for topic in topics]
    progress_rows = []
    if topic_ids:
        progress_rows = (
            client.table("student_topic_progress")
            .select("topic_id,status")
            .eq("user_id", user_id)
            .in_("topic_id", topic_ids)
            .execute()
            .data
            or []
        )

    activity_rows = (
        client.table("study_activity")
        .select("subject,activity_type")
        .eq("user_id", user_id)
        .eq("activity_type", "question_asked")
        .execute()
        .data
        or []
    )

    questions_by_subject: Dict[str, int] = {}
    for row in activity_rows:
        subject = row.get("subject")
        if not subject:
            continue
        questions_by_subject[subject] = questions_by_subject.get(subject, 0) + 1

    progress_by_topic = {row["topic_id"]: row["status"] for row in progress_rows}

    subject_stats: Dict[str, Dict[str, int]] = {
        subject["id"]: {"total": 0, "completed": 0, "in_progress": 0, "needs_revision": 0} for subject in subjects
    }

    for topic in topics:
        subject_id = topic["subject_id"]
        if subject_id not in subject_stats:
            continue
        subject_stats[subject_id]["total"] += 1
        status = progress_by_topic.get(topic["id"], "not_started")
        if status == "completed":
            subject_stats[subject_id]["completed"] += 1
        elif status == "in_progress":
            subject_stats[subject_id]["in_progress"] += 1
        elif status == "needs_revision":
            subject_stats[subject_id]["needs_revision"] += 1

    payload = []
    for subject in subjects:
        stats = subject_stats.get(subject["id"], {"total": 0, "completed": 0, "in_progress": 0, "needs_revision": 0})
        total = stats["total"]
        completed = stats["completed"]
        in_progress = stats["in_progress"]
        needs_revision = stats["needs_revision"]
        not_started = max(total - completed - in_progress - needs_revision, 0)
        percentage = int(round((completed / total) * 100)) if total else 0

        payload.append(
            {
                "subject_name": subject["name"],
                "year": subject["year"],
                "total_topics": total,
                "completed": completed,
                "in_progress": in_progress,
                "needs_revision": needs_revision,
                "not_started": not_started,
                "completion_percentage": percentage,
                "questions_asked": questions_by_subject.get(subject["name"], 0),
            }
        )

    return _success(payload)


@router.get("/streak")
def get_streak(user=Depends(require_auth)) -> Dict[str, Any]:
    streak_service.update_streak(user["user_id"])
    streak = streak_service.get_streak(user["user_id"])
    return _success(
        {
            "current_streak": int(streak.get("current_streak", 0) or 0),
            "longest_streak": int(streak.get("longest_streak", 0) or 0),
            "last_active_date": streak.get("last_active_date"),
            "streak_started_date": streak.get("streak_started_date"),
            "total_active_days": int(streak.get("total_active_days", 0) or 0),
        }
    )
