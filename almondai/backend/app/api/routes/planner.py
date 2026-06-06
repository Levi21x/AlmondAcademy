from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.planner.plan_generator import generate_study_plan

router = APIRouter(prefix="/api/v1/planner", tags=["planner"])

ExamType = Literal["university", "neet_pg", "fmge", "internal", "other"]


class CreateExamRequest(BaseModel):
    exam_name: str = Field(min_length=1)
    exam_date: date
    exam_type: ExamType = "university"
    subjects: List[str] = Field(default_factory=list)


class GeneratePlanRequest(BaseModel):
    available_hours_per_day: float = Field(default=6.0, ge=1.0, le=16.0)
    regenerate: bool = False


class ReplanRequest(BaseModel):
    available_hours_per_day: Optional[float] = Field(default=None, ge=1.0, le=16.0)


# Replan is recommended once the student has this many past plan-days with zero study activity.
REPLAN_MISSED_DAYS_THRESHOLD = 2


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _parse_date(value: Any) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise HTTPException(status_code=500, detail={"error": True, "message": "Invalid date in database", "code": "INVALID_DB_DATE"}) from exc
    raise HTTPException(status_code=500, detail={"error": True, "message": "Unsupported date format", "code": "INVALID_DB_DATE"})


def _days_remaining(exam_day: date) -> int:
    return (exam_day - date.today()).days


def _format_exam_response(exam: Dict[str, Any], has_active_plan: bool) -> Dict[str, Any]:
    exam_day = _parse_date(exam["exam_date"])
    days = _days_remaining(exam_day)
    return {
        "id": exam["id"],
        "exam_name": exam["exam_name"],
        "exam_date": exam_day.isoformat(),
        "exam_type": exam.get("exam_type", "university"),
        "subjects": exam.get("subjects") or [],
        "days_remaining": max(days, 0),
        "is_past": days < 0,
        "has_active_plan": has_active_plan,
        "is_active": bool(exam.get("is_active", True)),
    }


def _get_subject_progress(client, user_id: str, selected_subjects: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    subjects = client.table("syllabus_subjects").select("id,name,year").order("sort_order", desc=False).execute().data or []

    if selected_subjects:
        allowed = {subject.strip().lower() for subject in selected_subjects if subject.strip()}
        subjects = [subject for subject in subjects if str(subject.get("name", "")).strip().lower() in allowed]

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

    progress_by_topic = {row["topic_id"]: row["status"] for row in progress_rows}

    counters: Dict[str, Dict[str, int]] = {
        subject["id"]: {
            "total_topics": 0,
            "completed_topics": 0,
            "in_progress_topics": 0,
            "needs_revision_topics": 0,
        }
        for subject in subjects
    }

    for topic in topics:
        subject_id = topic["subject_id"]
        if subject_id not in counters:
            continue
        counters[subject_id]["total_topics"] += 1
        status = progress_by_topic.get(topic["id"], "not_started")
        if status == "completed":
            counters[subject_id]["completed_topics"] += 1
        elif status == "in_progress":
            counters[subject_id]["in_progress_topics"] += 1
        elif status == "needs_revision":
            counters[subject_id]["needs_revision_topics"] += 1

    payload = []
    for subject in subjects:
        stats = counters.get(subject["id"], {})
        total_topics = int(stats.get("total_topics", 0))
        completed_topics = int(stats.get("completed_topics", 0))
        completion_percentage = int(round((completed_topics / total_topics) * 100)) if total_topics else 0
        payload.append(
            {
                "subject_id": subject["id"],
                "subject_name": subject["name"],
                "year": subject["year"],
                "total_topics": total_topics,
                "completed_topics": completed_topics,
                "in_progress_topics": int(stats.get("in_progress_topics", 0)),
                "needs_revision_topics": int(stats.get("needs_revision_topics", 0)),
                "completion_percentage": completion_percentage,
            }
        )

    return payload


def _get_active_exam(client, user_id: str, exam_id: str) -> Dict[str, Any] | None:
    result = (
        client.table("student_exams")
        .select("*")
        .eq("id", exam_id)
        .eq("user_id", user_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _get_latest_active_plan_row(client, user_id: str, exam_id: str) -> Dict[str, Any] | None:
    result = (
        client.table("study_plans")
        .select("*")
        .eq("user_id", user_id)
        .eq("exam_id", exam_id)
        .eq("is_active", True)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _normalize_plan_row(row: Dict[str, Any], exam: Dict[str, Any]) -> Dict[str, Any]:
    plan_data = row.get("plan_data") or {}
    exam_day = _parse_date(exam["exam_date"])
    # Spread plan_data first so the explicit authoritative values below always take precedence.
    return {
        **plan_data,
        "id": row["id"],
        "exam_id": row["exam_id"],
        "exam_name": exam.get("exam_name"),
        "exam_date": exam_day.isoformat(),
        "days_remaining": max(_days_remaining(exam_day), 0),  # Always recalculate from today.
        "generated_at": row.get("generated_at"),
        "is_active": bool(row.get("is_active", True)),
        "plan_data": plan_data,
    }


def _resolve_today_from_plan(plan: Dict[str, Any], exam_day: date) -> Dict[str, Any] | None:
    days = plan.get("days")
    if not isinstance(days, list) or not days:
        return None

    today_iso = date.today().isoformat()
    for day_entry in days:
        if str(day_entry.get("date")) == today_iso:
            return day_entry

    total_days = int(plan.get("total_days") or len(days))
    days_left_now = max((exam_day - date.today()).days, 0)
    generated_days_remaining = int(plan.get("days_remaining") or total_days)
    elapsed = max(generated_days_remaining - days_left_now, 0)
    day_number = min(max(elapsed + 1, 1), total_days)

    for day_entry in days:
        if int(day_entry.get("day", 0) or 0) == day_number:
            return day_entry

    return days[0]


def _plan_start_date(plan: Dict[str, Any]) -> date:
    days = plan.get("days")
    earliest = date.today()
    if isinstance(days, list):
        for day_entry in days:
            try:
                day_date = date.fromisoformat(str(day_entry.get("date")))
            except (TypeError, ValueError):
                continue
            earliest = min(earliest, day_date)
    return earliest


def _get_activity_dates(client, user_id: str, since: date) -> set[str]:
    """Distinct calendar dates (ISO) on which the student logged any study activity."""
    rows = (
        client.table("study_activity")
        .select("created_at")
        .eq("user_id", user_id)
        .gte("created_at", since.isoformat())
        .execute()
        .data
        or []
    )
    dates: set[str] = set()
    for row in rows:
        raw = row.get("created_at")
        if not raw:
            continue
        try:
            dates.add(date.fromisoformat(str(raw)[:10]).isoformat())
        except ValueError:
            continue
    return dates


def _compute_plan_status(plan: Dict[str, Any], activity_dates: set[str]) -> Dict[str, Any]:
    """Deterministic drift detection: how many past plan-days had no study activity."""
    days = plan.get("days")
    today = date.today()

    past_days: List[date] = []
    if isinstance(days, list):
        for day_entry in days:
            try:
                day_date = date.fromisoformat(str(day_entry.get("date")))
            except (TypeError, ValueError):
                continue
            if day_date < today:
                past_days.append(day_date)

    total_past = len(past_days)
    if total_past == 0:
        return {
            "has_plan": True,
            "missed_days": 0,
            "past_days": 0,
            "on_track_percentage": 100,
            "replan_recommended": False,
            "reason": "Your plan is on schedule.",
        }

    active_past = sum(1 for day_date in past_days if day_date.isoformat() in activity_dates)
    missed_days = total_past - active_past
    on_track = int(round((active_past / total_past) * 100))
    replan_recommended = missed_days >= REPLAN_MISSED_DAYS_THRESHOLD

    if replan_recommended:
        reason = (
            f"You have {missed_days} day(s) with no study activity. "
            "Replanning will redistribute the remaining syllabus across the days you have left."
        )
    else:
        reason = "Your plan is on schedule."

    return {
        "has_plan": True,
        "missed_days": missed_days,
        "past_days": total_past,
        "on_track_percentage": on_track,
        "replan_recommended": replan_recommended,
        "reason": reason,
    }


async def _generate_and_persist_plan(
    client,
    user_id: str,
    exam: Dict[str, Any],
    available_hours_per_day: float,
) -> Dict[str, Any]:
    """Generate a plan via the LLM and persist it as the new active plan version.

    Deactivates any prior active plan for the exam, inserts the new plan, and
    re-seeds daily_plan_progress. Raises ValueError (bad inputs) or HTTPException
    (persistence failure) for the caller to map to a response.
    """
    exam_id = exam["id"]

    profile_rows = (
        client.table("student_profiles")
        .select("student_category")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    student_category = (profile_rows[0].get("student_category") if profile_rows else None) or "sprinter"

    selected_subjects = [subject for subject in (exam.get("subjects") or []) if isinstance(subject, str) and subject.strip()]
    subject_progress = _get_subject_progress(client, user_id, selected_subjects if selected_subjects else None)
    exam_day = _parse_date(exam["exam_date"])

    plan = await generate_study_plan(
        user_id=user_id,
        exam_id=exam_id,
        exam_name=exam["exam_name"],
        exam_date=exam_day,
        student_category=student_category,
        subjects=selected_subjects,
        subject_progress=subject_progress,
        available_hours_per_day=available_hours_per_day,
    )

    client.table("study_plans").update(
        {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("user_id", user_id).eq("exam_id", exam_id).eq("is_active", True).execute()

    inserted = (
        client.table("study_plans")
        .insert(
            {
                "user_id": user_id,
                "exam_id": exam_id,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "exam_date": exam_day.isoformat(),
                "days_remaining": int(plan.get("days_remaining", 0) or 0),
                "plan_data": plan,
                "is_active": True,
            }
        )
        .execute()
    )
    if not inserted.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to save study plan", "code": "PLAN_SAVE_FAILED"})

    plan_row = inserted.data[0]
    days = plan.get("days") if isinstance(plan.get("days"), list) else []
    progress_rows = []
    for day_entry in days:
        try:
            plan_day = date.fromisoformat(str(day_entry.get("date")))
        except Exception:
            continue
        topics = day_entry.get("topics") if isinstance(day_entry.get("topics"), list) else []
        progress_rows.append(
            {
                "user_id": user_id,
                "plan_id": plan_row["id"],
                "plan_date": plan_day.isoformat(),
                "topics_planned": len(topics),
                "topics_completed": 0,
                "is_completed": False,
            }
        )

    if progress_rows:
        client.table("daily_plan_progress").upsert(progress_rows, on_conflict="user_id,plan_id,plan_date").execute()

    return plan_row


@router.post("/exams")
def create_exam(payload: CreateExamRequest, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    insert_payload = {
        "user_id": user["user_id"],
        "exam_name": payload.exam_name.strip(),
        "exam_date": payload.exam_date.isoformat(),
        "exam_type": payload.exam_type,
        "subjects": payload.subjects,
        "is_active": True,
    }

    result = client.table("student_exams").insert(insert_payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to create exam", "code": "EXAM_CREATE_FAILED"})

    return _success(_format_exam_response(result.data[0], has_active_plan=False))


@router.get("/exams")
def list_exams(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    exams = (
        client.table("student_exams")
        .select("*")
        .eq("user_id", user["user_id"])
        .eq("is_active", True)
        .order("exam_date", desc=False)
        .execute()
        .data
        or []
    )

    exam_ids = [exam["id"] for exam in exams]
    active_plan_ids = set()
    if exam_ids:
        plan_rows = (
            client.table("study_plans")
            .select("exam_id")
            .eq("user_id", user["user_id"])
            .eq("is_active", True)
            .in_("exam_id", exam_ids)
            .execute()
            .data
            or []
        )
        active_plan_ids = {row["exam_id"] for row in plan_rows}

    payload = [_format_exam_response(exam, exam["id"] in active_plan_ids) for exam in exams]
    return _success(payload)


@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: str, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    current = _get_active_exam(client, user["user_id"], exam_id)
    if not current:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Exam not found", "code": "EXAM_NOT_FOUND"})

    updated = (
        client.table("student_exams")
        .update({"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", exam_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to delete exam", "code": "EXAM_DELETE_FAILED"})

    client.table("study_plans").update({"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("exam_id", exam_id).eq("user_id", user["user_id"]).eq("is_active", True).execute()

    return _success({"deleted": True, "exam_id": exam_id})


@router.post("/exams/{exam_id}/generate-plan")
async def generate_exam_plan(exam_id: str, payload: GeneratePlanRequest, user=Depends(require_auth), service: AuthService = Depends(AuthService)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    exam = _get_active_exam(client, user_id, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Exam not found", "code": "EXAM_NOT_FOUND"})

    existing = _get_latest_active_plan_row(client, user_id, exam_id)
    if existing and not payload.regenerate:
        return _success(_normalize_plan_row(existing, exam))

    subscription = service.get_active_subscription(user_id)
    is_premium = (subscription or {}).get("plan_type", "free") != "free"
    if not is_premium and not existing:
        active_plans = (
            client.table("study_plans")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        if (active_plans.count or 0) >= 1:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": True,
                    "message": "Free plan supports one active study plan. Upgrade for unlimited plans.",
                    "code": "PLANNER_FREE_LIMIT_REACHED",
                },
            )

    try:
        plan_row = await _generate_and_persist_plan(client, user_id, exam, payload.available_hours_per_day)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": True, "message": str(exc), "code": "PLAN_GENERATION_INVALID"}) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to generate study plan", "code": "PLAN_GENERATION_FAILED", "details": {"reason": str(exc)}}) from exc

    return _success(_normalize_plan_row(plan_row, exam))


@router.get("/exams/{exam_id}/plan")
def get_exam_plan(exam_id: str, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    exam = _get_active_exam(client, user["user_id"], exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Exam not found", "code": "EXAM_NOT_FOUND"})

    plan = _get_latest_active_plan_row(client, user["user_id"], exam_id)
    if not plan:
        raise HTTPException(status_code=404, detail={"error": True, "message": "No active study plan found", "code": "PLAN_NOT_FOUND"})

    return _success(_normalize_plan_row(plan, exam))


@router.get("/today")
def get_today_plan(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    exams = (
        client.table("student_exams")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .gte("exam_date", date.today().isoformat())
        .order("exam_date", desc=False)
        .limit(5)
        .execute()
        .data
        or []
    )

    if not exams:
        return _success({"has_plan": False, "nearest_exam": None, "today": None})

    nearest_exam = exams[0]
    exam_day = _parse_date(nearest_exam["exam_date"])
    days_remaining = max(_days_remaining(exam_day), 0)

    plan_row = _get_latest_active_plan_row(client, user_id, nearest_exam["id"])
    if not plan_row:
        return _success(
            {
                "has_plan": False,
                "nearest_exam": {
                    "exam_name": nearest_exam["exam_name"],
                    "days_remaining": days_remaining,
                },
                "today": None,
            }
        )

    normalized = _normalize_plan_row(plan_row, nearest_exam)
    today_day = _resolve_today_from_plan(normalized, exam_day)

    return _success(
        {
            "has_plan": today_day is not None,
            "nearest_exam": {
                "exam_name": nearest_exam["exam_name"],
                "days_remaining": days_remaining,
            },
            "today": today_day,
        }
    )


@router.get("/exams/{exam_id}/status")
def get_plan_status(exam_id: str, user=Depends(require_auth)) -> Dict[str, Any]:
    """Drift signal for the autonomous manager: how far the student has fallen behind."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    exam = _get_active_exam(client, user_id, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Exam not found", "code": "EXAM_NOT_FOUND"})

    plan_row = _get_latest_active_plan_row(client, user_id, exam_id)
    if not plan_row:
        return _success(
            {
                "has_plan": False,
                "missed_days": 0,
                "past_days": 0,
                "on_track_percentage": 100,
                "replan_recommended": False,
                "reason": "No active study plan.",
            }
        )

    normalized = _normalize_plan_row(plan_row, exam)
    activity_dates = _get_activity_dates(client, user_id, _plan_start_date(normalized))
    status = _compute_plan_status(normalized, activity_dates)
    status["exam_name"] = exam["exam_name"]
    status["days_remaining"] = max(_days_remaining(_parse_date(exam["exam_date"])), 0)
    return _success(status)


@router.post("/exams/{exam_id}/replan")
async def replan_exam_plan(exam_id: str, payload: ReplanRequest, user=Depends(require_auth)) -> Dict[str, Any]:
    """Regenerate the active plan, compressing the remaining syllabus into the days left.

    Replanning replaces the existing active plan (no net new plan), so it is allowed
    for free users without hitting the one-active-plan limit.
    """
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    exam = _get_active_exam(client, user_id, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Exam not found", "code": "EXAM_NOT_FOUND"})

    existing = _get_latest_active_plan_row(client, user_id, exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail={"error": True, "message": "No active plan to replan. Generate a plan first.", "code": "PLAN_NOT_FOUND"})

    hours = payload.available_hours_per_day
    if hours is None:
        existing_data = existing.get("plan_data") or {}
        try:
            hours = float(existing_data.get("daily_hours", 6.0) or 6.0)
        except (TypeError, ValueError):
            hours = 6.0
        hours = min(max(hours, 1.0), 16.0)

    try:
        plan_row = await _generate_and_persist_plan(client, user_id, exam, hours)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"error": True, "message": str(exc), "code": "PLAN_GENERATION_INVALID"}) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to replan study plan", "code": "PLAN_REPLAN_FAILED", "details": {"reason": str(exc)}}) from exc

    return _success(_normalize_plan_row(plan_row, exam))
