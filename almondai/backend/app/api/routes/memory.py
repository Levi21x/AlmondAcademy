from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.memory.memory_service import MemoryService


router = APIRouter(prefix="/api/v1/memory", tags=["memory"])
memory_service = MemoryService()


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _time_ago(iso_value: str | None) -> str:
    if not iso_value:
        return "just now"
    try:
        dt = datetime.fromisoformat(str(iso_value).replace("Z", "+00:00"))
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
    return f"{seconds // 86400} days ago"


@router.get("/insights")
def get_memory_insights(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    struggle_rows = memory_service.get_struggle_patterns(user_id=user_id, limit=25)
    formatted_patterns = [
        {
            "topic": row.get("topic"),
            "subject": row.get("subject"),
            "mention_count": int(row.get("mention_count", 0) or 0),
            "last_mentioned": _time_ago(row.get("last_mentioned_at")),
            "is_resolved": bool(row.get("is_resolved", False)),
        }
        for row in struggle_rows
    ]

    sessions_result = (
        client.table("chat_sessions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total_conversations = sessions_result.count or 0

    messages_result = (
        client.table("chat_messages")
        .select("session_id")
        .eq("user_id", user_id)
        .execute()
    )
    _ = messages_result

    sessions_with_subjects = (
        client.table("chat_sessions")
        .select("subject")
        .eq("user_id", user_id)
        .not_.is_("subject", "null")
        .execute()
    )
    subjects_covered = list(
        set(
            [
                row.get("subject")
                for row in (sessions_with_subjects.data or [])
                if row.get("subject")
            ]
        )
    )

    topics_result = (
        client.table("student_topic_progress")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .execute()
    )
    topics_covered_count = topics_result.count or 0

    latest_summary_rows = (
        client.table("student_memory_summaries")
        .select("content,strong_topics,weak_topics,study_patterns,generated_at")
        .eq("user_id", user_id)
        .eq("summary_type", "weekly")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )

    latest_summary = None
    if latest_summary_rows:
        row = latest_summary_rows[0]
        study_patterns = row.get("study_patterns") or {}
        latest_summary = {
            "summary": row.get("content") or "",
            "strong_areas": row.get("strong_topics") or [],
            "weak_areas": row.get("weak_topics") or [],
            "recommended_focus": study_patterns.get("recommended_focus") or [],
            "study_pattern": study_patterns.get("study_pattern") or "",
            "encouragement": study_patterns.get("encouragement") or "",
            "generated_at": row.get("generated_at"),
        }

    return _success(
        {
            "struggle_patterns": formatted_patterns,
            "memory_stats": {
                "total_interactions": total_conversations,
                "topics_covered": topics_covered_count,
                "subjects_covered": subjects_covered,
                "collection_exists": True if total_conversations > 0 else False,
            },
            "latest_summary": latest_summary,
        }
    )


@router.post("/weekly-summary")
async def generate_weekly_summary(user=Depends(require_auth)) -> Dict[str, Any]:
    try:
        summary = await memory_service.generate_weekly_summary(user_id=user["user_id"])
        return _success(summary)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": "Failed to generate weekly summary",
                "code": "WEEKLY_SUMMARY_FAILED",
                "details": {"reason": str(exc)},
            },
        ) from exc


@router.patch("/struggles/{topic}/resolve")
def resolve_struggle(topic: str, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    decoded_topic = unquote(topic)

    updated = (
        client.table("student_struggle_patterns")
        .update(
            {
                "is_resolved": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("user_id", user["user_id"])
        .eq("topic", decoded_topic)
        .execute()
    )

    if not updated.data:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "message": "Struggle pattern not found",
                "code": "STRUGGLE_NOT_FOUND",
                "details": {},
            },
        )

    return _success({"resolved": True, "topic": decoded_topic})


@router.get("/summary")
def get_latest_summary(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    rows = (
        client.table("student_memory_summaries")
        .select("content,strong_topics,weak_topics,study_patterns,generated_at")
        .eq("user_id", user["user_id"])
        .eq("summary_type", "weekly")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )

    if not rows:
        return _success(None)

    row = rows[0]
    study_patterns = row.get("study_patterns") or {}

    return _success(
        {
            "summary": row.get("content") or "",
            "strong_areas": row.get("strong_topics") or [],
            "weak_areas": row.get("weak_topics") or [],
            "recommended_focus": study_patterns.get("recommended_focus") or [],
            "study_pattern": study_patterns.get("study_pattern") or "",
            "encouragement": study_patterns.get("encouragement") or "",
            "generated_at": row.get("generated_at"),
        }
    )
