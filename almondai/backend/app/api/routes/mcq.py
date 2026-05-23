from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
import random
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.achievements_service import achievements_service
from app.services.almonds_service import AlmondsService
from app.services.auth_service import AuthService
from app.services.memory.memory_service import MemoryService
from app.services.streak_service import StreakService

router = APIRouter(prefix="/api/v1/mcq", tags=["mcq"])
streak_service = StreakService()
memory_service = MemoryService()
almonds_service = AlmondsService()


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _today_window() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)
    return day_start.isoformat(), day_end.isoformat()


def _is_premium(service: AuthService, user_id: str) -> bool:
    subscription = service.get_active_subscription(user_id)
    return (subscription or {}).get("plan_type", "free") != "free"


def _get_today_attempt_count(client, user_id: str) -> int:
    start_iso, end_iso = _today_window()
    result = (
        client.table("student_mcq_attempts")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("attempted_at", start_iso)
        .lt("attempted_at", end_iso)
        .execute()
    )
    return result.count or 0


def _practice_streak_days(client, user_id: str) -> int:
    rows = (
        client.table("student_mcq_attempts")
        .select("attempted_at")
        .eq("user_id", user_id)
        .order("attempted_at", desc=True)
        .limit(400)
        .execute()
        .data
        or []
    )
    if not rows:
        return 0

    day_set = {
        datetime.fromisoformat(str(row.get("attempted_at")).replace("Z", "+00:00")).date().isoformat()
        for row in rows
        if row.get("attempted_at")
    }

    streak = 0
    cursor = date.today()
    while cursor.isoformat() in day_set:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _get_question_map(client, question_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    if not question_ids:
        return {}
    rows = (
        client.table("mcq_questions")
        .select("id,subject")
        .in_("id", question_ids)
        .execute()
        .data
        or []
    )
    return {str(row["id"]): row for row in rows if row.get("id")}


def _current_correct_streak(client, user_id: str, max_scan: int = 25) -> int:
    rows = (
        client.table("student_mcq_attempts")
        .select("is_correct")
        .eq("user_id", user_id)
        .order("attempted_at", desc=True)
        .limit(max_scan)
        .execute()
        .data
        or []
    )
    streak = 0
    for row in rows:
        if bool(row.get("is_correct")):
            streak += 1
        else:
            break
    return streak


class AttemptPayload(BaseModel):
    question_id: str
    selected_option: Literal["a", "b", "c", "d"]
    time_taken_seconds: Optional[int] = Field(default=None, ge=0)
    session_id: Optional[str] = None


class CreateSessionPayload(BaseModel):
    session_type: Literal["daily", "subject", "mixed", "timed"] = "daily"
    subject: Optional[str] = None
    difficulty: Optional[Literal["easy", "medium", "hard"]] = None
    total_questions: int = Field(default=10, ge=1, le=50)


class CompleteSessionPayload(BaseModel):
    correct_answers: int = Field(ge=0)
    total_questions: int = Field(ge=0)
    time_taken_seconds: int = Field(ge=0)


class AlmondReasonPayload(BaseModel):
    reason: str = Field(default="manual")


@router.get("/questions")
def get_questions(
    subject: Optional[str] = Query(default=None),
    difficulty: Optional[Literal["easy", "medium", "hard"]] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    high_yield_only: bool = Query(default=False),
    exclude_attempted: bool = Query(default=False),
    user=Depends(require_auth),
):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    query = client.table("mcq_questions").select(
        "id,subject,topic,difficulty,question_text,option_a,option_b,option_c,option_d,is_high_yield",
        count="exact",
    )
    if subject:
        query = query.eq("subject", subject)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    if high_yield_only:
        query = query.eq("is_high_yield", True)

    rows_result = query.limit(500).execute()
    rows = rows_result.data or []
    total_available = rows_result.count or 0

    if exclude_attempted:
        start_iso, end_iso = _today_window()
        attempted_today = (
            client.table("student_mcq_attempts")
            .select("question_id")
            .eq("user_id", user_id)
            .gte("attempted_at", start_iso)
            .lt("attempted_at", end_iso)
            .execute()
            .data
            or []
        )
        attempted_ids = {str(row.get("question_id")) for row in attempted_today if row.get("question_id")}
        rows = [row for row in rows if str(row.get("id")) not in attempted_ids]

    if len(rows) > limit:
        rows = random.sample(rows, limit)

    return _success({"questions": rows, "total_available": total_available})


@router.post("/attempt")
def submit_attempt(
    payload: AttemptPayload,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    is_premium = _is_premium(service=service, user_id=user_id)
    today_limit = 10
    today_attempted = _get_today_attempt_count(client=client, user_id=user_id)
    if not is_premium and today_attempted >= today_limit:
        raise HTTPException(
            status_code=429,
            detail={
                "error": True,
                "message": "Daily MCQ limit reached. Upgrade for unlimited practice.",
                "code": "MCQ_DAILY_LIMIT_REACHED",
                "details": {"today_limit": today_limit},
            },
        )

    question_rows = (
        client.table("mcq_questions")
        .select("id,subject,topic,correct_option,explanation,question_text")
        .eq("id", payload.question_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not question_rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Question not found", "code": "QUESTION_NOT_FOUND"})

    question = question_rows[0]
    correct_option = str(question.get("correct_option") or "").lower()
    selected_option = payload.selected_option.lower()
    is_correct = selected_option == correct_option

    inserted = (
        client.table("student_mcq_attempts")
        .insert(
            {
                "user_id": user_id,
                "question_id": payload.question_id,
                "selected_option": selected_option,
                "is_correct": is_correct,
                "time_taken_seconds": payload.time_taken_seconds,
                "subject": question.get("subject"),
            }
        )
        .execute()
    )
    if not inserted.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to save attempt", "code": "ATTEMPT_SAVE_FAILED"})

    merged_achievements: List[Dict[str, Any]] = []
    seen_badges: set[str] = set()

    try:
        attempt_activity = streak_service.log_activity(
            user_id=user_id,
            activity_type="mcq_attempted",
            subject=question.get("subject"),
            topic_name=question.get("topic"),
            session_id=payload.session_id,
            metadata={
                "question_id": payload.question_id,
                "selected_option": selected_option,
                "correct_option": correct_option,
                "is_correct": is_correct,
            },
        )
        for badge in attempt_activity.get("new_achievements") or []:
            badge_key = badge.get("badge_key")
            if badge_key and badge_key not in seen_badges:
                merged_achievements.append(badge)
                seen_badges.add(badge_key)

        if is_correct:
            correct_activity = streak_service.log_activity(
                user_id=user_id,
                activity_type="mcq_correct",
                subject=question.get("subject"),
                topic_name=question.get("topic"),
                session_id=payload.session_id,
                metadata={"question_id": payload.question_id},
            )
            for badge in correct_activity.get("new_achievements") or []:
                badge_key = badge.get("badge_key")
                if badge_key and badge_key not in seen_badges:
                    merged_achievements.append(badge)
                    seen_badges.add(badge_key)
    except Exception:
        # Activity logging should not block MCQ result return.
        pass

    if not is_correct:
        try:
            memory_service.update_struggle_patterns(
                user_id=user_id,
                question=str(question.get("question_text") or ""),
                subject=question.get("subject"),
            )
        except Exception:
            pass

    almond_update = None
    if not is_correct:
        try:
            almond_update = almonds_service.lose_almond(user_id=user_id, reason="wrong_answer")
        except Exception:
            almond_update = None
    else:
        try:
            if _current_correct_streak(client=client, user_id=user_id) >= 3:
                almond_update = almonds_service.gain_almond(user_id=user_id, reason="correct_streak")
        except Exception:
            almond_update = None

    return _success(
        {
            "is_correct": is_correct,
            "correct_option": correct_option,
            "explanation": question.get("explanation") or "",
            "selected_option": selected_option,
            "subject": question.get("subject"),
            "topic": question.get("topic"),
            "almond_update": almond_update,
            "new_achievements": merged_achievements,
        }
    )


@router.get("/almonds")
def get_almonds(user=Depends(require_auth)):
    try:
        return _success(almonds_service.get_almonds(user_id=user["user_id"]))
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": str(exc), "code": "PROFILE_NOT_FOUND"},
        ) from exc


@router.post("/almonds/lose")
def lose_almond(payload: AlmondReasonPayload, user=Depends(require_auth)):
    try:
        return _success(almonds_service.lose_almond(user_id=user["user_id"], reason=payload.reason or "manual"))
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": str(exc), "code": "PROFILE_NOT_FOUND"},
        ) from exc


@router.post("/almonds/gain")
def gain_almond(payload: AlmondReasonPayload, user=Depends(require_auth)):
    try:
        return _success(almonds_service.gain_almond(user_id=user["user_id"], reason=payload.reason or "manual"))
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": str(exc), "code": "PROFILE_NOT_FOUND"},
        ) from exc


@router.post("/sessions")
def create_mcq_session(payload: CreateSessionPayload, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    created = (
        client.table("mcq_sessions")
        .insert(
            {
                "user_id": user["user_id"],
                "session_type": payload.session_type,
                "subject": payload.subject,
                "difficulty": payload.difficulty,
                "total_questions": payload.total_questions,
                "correct_answers": 0,
                "time_taken_seconds": 0,
                "completed": False,
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to create session", "code": "MCQ_SESSION_CREATE_FAILED"})

    return _success(created.data[0])


@router.patch("/sessions/{session_id}/complete")
def complete_mcq_session(session_id: str, payload: CompleteSessionPayload, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    updated = (
        client.table("mcq_sessions")
        .update(
            {
                "correct_answers": payload.correct_answers,
                "total_questions": payload.total_questions,
                "time_taken_seconds": payload.time_taken_seconds,
                "completed": True,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", session_id)
        .eq("user_id", user["user_id"])
        .execute()
    )

    if not updated.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Session not found", "code": "MCQ_SESSION_NOT_FOUND"})

    new_achievements: List[Dict[str, Any]] = []
    try:
        new_achievements = achievements_service.evaluate_and_unlock(
            user_id=user["user_id"],
            trigger="mcq_session_completed",
            context={
                "session_id": session_id,
                "correct_answers": payload.correct_answers,
                "total_questions": payload.total_questions,
                "time_taken_seconds": payload.time_taken_seconds,
                "event_hour_utc": datetime.now(timezone.utc).hour,
            },
        )
    except Exception:
        new_achievements = []

    return _success({"completed": True, "new_achievements": new_achievements})


@router.get("/stats")
def get_mcq_stats(user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    attempts = client.table("student_mcq_attempts").select("is_correct,subject,attempted_at").eq("user_id", user_id).execute().data or []
    total_attempted = len(attempts)
    total_correct = sum(1 for row in attempts if bool(row.get("is_correct")))
    accuracy = int(round((total_correct / total_attempted) * 100)) if total_attempted else 0

    subject_bucket: Dict[str, Dict[str, int]] = {}
    for row in attempts:
        subject = row.get("subject") or "General"
        if subject not in subject_bucket:
            subject_bucket[subject] = {"attempted": 0, "correct": 0}
        subject_bucket[subject]["attempted"] += 1
        if bool(row.get("is_correct")):
            subject_bucket[subject]["correct"] += 1

    by_subject = []
    for subject, counts in subject_bucket.items():
        attempted = counts["attempted"]
        correct = counts["correct"]
        sub_accuracy = int(round((correct / attempted) * 100)) if attempted else 0
        by_subject.append(
            {
                "subject": subject,
                "attempted": attempted,
                "correct": correct,
                "accuracy": sub_accuracy,
            }
        )

    by_subject.sort(key=lambda item: item["attempted"], reverse=True)

    weak_subjects = [item["subject"] for item in sorted(by_subject, key=lambda item: item["accuracy"]) if item["attempted"] >= 3][:3]
    strong_subjects = [item["subject"] for item in sorted(by_subject, key=lambda item: item["accuracy"], reverse=True) if item["attempted"] >= 3][:3]

    today_attempted = _get_today_attempt_count(client=client, user_id=user_id)
    today_limit = 9999 if _is_premium(service=service, user_id=user_id) else 10
    today_remaining = max(today_limit - today_attempted, 0) if today_limit != 9999 else None

    return _success(
        {
            "total_attempted": total_attempted,
            "total_correct": total_correct,
            "accuracy_percentage": accuracy,
            "today_attempted": today_attempted,
            "today_limit": None if today_limit == 9999 else today_limit,
            "today_remaining": today_remaining,
            "by_subject": by_subject,
            "weak_subjects": weak_subjects,
            "strong_subjects": strong_subjects,
        }
    )


@router.get("/daily-status")
def get_daily_status(user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    today_attempted = _get_today_attempt_count(client=client, user_id=user_id)

    start_iso, end_iso = _today_window()
    today_rows = (
        client.table("student_mcq_attempts")
        .select("is_correct")
        .eq("user_id", user_id)
        .gte("attempted_at", start_iso)
        .lt("attempted_at", end_iso)
        .execute()
        .data
        or []
    )
    today_correct = sum(1 for row in today_rows if bool(row.get("is_correct")))
    today_accuracy = int(round((today_correct / today_attempted) * 100)) if today_attempted else 0

    is_premium = _is_premium(service=service, user_id=user_id)
    daily_limit = None if is_premium else 10
    today_remaining = None if is_premium else max(10 - today_attempted, 0)

    return _success(
        {
            "today_attempted": today_attempted,
            "today_correct": today_correct,
            "today_accuracy": today_accuracy,
            "daily_limit": daily_limit,
            "today_remaining": today_remaining,
            "quota_complete": False if is_premium else today_attempted >= 10,
            "practice_streak_days": _practice_streak_days(client=client, user_id=user_id),
        }
    )
