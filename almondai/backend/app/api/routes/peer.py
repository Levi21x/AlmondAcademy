from __future__ import annotations

from datetime import date
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.config import get_settings
from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.peer.aggregation_service import AggregationService

router = APIRouter(prefix="/api/v1/peer", tags=["peer"])


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@router.post("/run-aggregation")
async def run_aggregation(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
    service: AggregationService = Depends(AggregationService),
):
    settings = get_settings()
    if not settings.admin_key:
        raise HTTPException(
            status_code=503,
            detail={"error": True, "message": "Admin key not configured", "code": "ADMIN_KEY_NOT_CONFIGURED"},
        )
    if not x_admin_key or x_admin_key != settings.admin_key:
        raise HTTPException(status_code=401, detail={"error": True, "message": "Invalid admin key", "code": "UNAUTHORIZED"})

    summary = await service.run_full_aggregation()
    return _success(summary)


@router.get("/benchmark")
async def get_benchmark(user=Depends(require_auth), service: AggregationService = Depends(AggregationService)):
    benchmark = await service.get_or_recalculate_benchmark(user["user_id"])
    if not benchmark:
        return _success(
            {
                "percentile_rank": 0,
                "cohort_label": "getting_started",
                "questions_percentile": 0,
                "completion_percentile": 0,
                "streak_percentile": 0,
                "mcq_accuracy_percentile": 0,
            }
        )

    return _success(
        {
            "percentile_rank": _safe_int(benchmark.get("percentile_rank", 0)),
            "cohort_label": str(benchmark.get("cohort_label") or "getting_started"),
            "questions_percentile": _safe_int(benchmark.get("questions_percentile", 0)),
            "completion_percentile": _safe_int(benchmark.get("completion_percentile", 0)),
            "streak_percentile": _safe_int(benchmark.get("streak_percentile", 0)),
            "mcq_accuracy_percentile": _safe_int(benchmark.get("mcq_accuracy_percentile", 0)),
        }
    )


@router.get("/struggling-topics")
async def get_struggling_topics(user=Depends(require_auth)):
    client = get_supabase_admin_client()

    insights = (
        client.table("platform_insights")
        .select("topic,subject,student_count,insight_data")
        .eq("insight_type", "struggling_topic")
        .order("student_count", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )

    my_struggles = (
        client.table("student_struggle_patterns")
        .select("topic")
        .eq("user_id", user["user_id"])
        .eq("is_resolved", False)
        .execute()
        .data
        or []
    )
    mine = {str(row.get("topic", "")).strip().lower() for row in my_struggles}

    payload: List[Dict[str, Any]] = []
    for row in insights:
        topic = str(row.get("topic") or "")
        subject = str(row.get("subject") or "General")
        payload.append(
            {
                "topic": topic,
                "subject": subject,
                "student_count": _safe_int(row.get("student_count", 0)),
                "message": f"{_safe_int(row.get('student_count', 0))} students are currently struggling with this topic",
                "is_also_your_struggle": topic.strip().lower() in mine,
            }
        )

    return _success(payload)


@router.get("/notifications")
async def get_notifications(user=Depends(require_auth), service: AggregationService = Depends(AggregationService)):
    await service.generate_notifications_for_user(user["user_id"])
    client = get_supabase_admin_client()

    rows = (
        client.table("peer_notifications")
        .select("id,notification_type,title,message,action_url,is_read,created_at")
        .eq("user_id", user["user_id"])
        .eq("is_read", False)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )

    return _success(rows)


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    updated = (
        client.table("peer_notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", user["user_id"])
        .execute()
    )

    if not updated.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Notification not found", "code": "NOTIFICATION_NOT_FOUND"})

    return _success({"id": notification_id, "is_read": True})


@router.get("/insights")
async def get_peer_insights(user=Depends(require_auth), service: AggregationService = Depends(AggregationService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    benchmark = await service.get_or_recalculate_benchmark(user_id)
    if not benchmark:
        benchmark = {
            "percentile_rank": 0,
            "cohort_label": "getting_started",
            "questions_percentile": 0,
            "completion_percentile": 0,
            "streak_percentile": 0,
            "mcq_accuracy_percentile": 0,
        }

    struggles_resp = await get_struggling_topics(user=user)
    platform_struggles = struggles_resp["data"][:3]

    top_patterns = (
        client.table("platform_insights")
        .select("insight_data")
        .eq("insight_type", "top_performer_pattern")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    top_performer_insights = []
    if top_patterns:
        top_performer_insights = list((top_patterns[0].get("insight_data") or {}).get("insights") or [])

    today = date.today().isoformat()
    my_usage = (
        client.table("daily_usage")
        .select("questions_asked")
        .eq("user_id", user_id)
        .eq("date", today)
        .limit(1)
        .execute()
        .data
        or []
    )
    your_questions_today = _safe_int(my_usage[0].get("questions_asked", 0)) if my_usage else 0

    cohort_label = str(benchmark.get("cohort_label") or "getting_started")
    cohort_users = (
        client.table("student_benchmarks")
        .select("user_id")
        .eq("cohort_label", cohort_label)
        .execute()
        .data
        or []
    )
    cohort_ids = [str(row.get("user_id")) for row in cohort_users if row.get("user_id")]

    cohort_avg = 0
    if cohort_ids:
        cohort_usage = (
            client.table("daily_usage")
            .select("questions_asked")
            .in_("user_id", cohort_ids)
            .eq("date", today)
            .execute()
            .data
            or []
        )
        if cohort_usage:
            cohort_avg = int(round(sum(_safe_int(row.get("questions_asked", 0)) for row in cohort_usage) / len(cohort_usage)))

    gap = max(cohort_avg - your_questions_today, 0)
    if gap > 0:
        cohort_message = f"You are asking {gap} fewer questions than students at your level today"
    else:
        cohort_message = "You are at or above your cohort average today"

    weekly = (
        client.table("platform_insights")
        .select("subject,insight_data")
        .eq("insight_type", "weekly_trend")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    hot_subject = "General"
    reason = "Platform intelligence is still warming up"
    if weekly:
        data = weekly[0].get("insight_data") or {}
        hot_subject = str(data.get("hot_subject") or weekly[0].get("subject") or "General")
        reason = str(data.get("reason") or reason)

    data = {
        "benchmark": {
            "percentile_rank": _safe_int(benchmark.get("percentile_rank", 0)),
            "cohort_label": str(benchmark.get("cohort_label") or "getting_started"),
            "questions_percentile": _safe_int(benchmark.get("questions_percentile", 0)),
            "completion_percentile": _safe_int(benchmark.get("completion_percentile", 0)),
            "streak_percentile": _safe_int(benchmark.get("streak_percentile", 0)),
            "mcq_accuracy_percentile": _safe_int(benchmark.get("mcq_accuracy_percentile", 0)),
        },
        "platform_struggles": platform_struggles,
        "top_performer_insights": top_performer_insights,
        "cohort_comparison": {
            "your_questions_today": your_questions_today,
            "cohort_average_questions": cohort_avg,
            "gap": gap,
            "message": cohort_message,
        },
        "trending_this_week": {
            "hot_subject": hot_subject,
            "reason": reason,
        },
    }

    return _success(data)
