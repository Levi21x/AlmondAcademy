from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.visual.visual_generator import VisualGenerator

router = APIRouter(prefix="/api/v1/visuals", tags=["visuals"])
generator = VisualGenerator()

VisualType = Literal["flowchart", "timeline", "comparison", "decision_tree", "mind_map", "process"]


class GenerateVisualPayload(BaseModel):
    topic: str = Field(min_length=2, max_length=160)
    visual_type: VisualType = "flowchart"
    subject: Optional[str] = None


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "topic": row.get("topic") or "",
        "subject": row.get("subject"),
        "visual_type": row.get("visual_type") or "flowchart",
        "visual_data": row.get("visual_data") or {},
        "explanation": row.get("explanation") or "",
        "created_at": row.get("created_at"),
    }


@router.post("/generate")
async def generate_visual(payload: GenerateVisualPayload, user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    subscription = service.get_active_subscription(user["user_id"])
    is_premium = (subscription or {}).get("plan_type", "free") != "free"

    if not is_premium:
        now = datetime.now(timezone.utc)
        day_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        today_rows = (
            client.table("visual_explanations")
            .select("id")
            .eq("user_id", user["user_id"])
            .gte("created_at", day_start.isoformat())
            .lt("created_at", day_end.isoformat())
            .execute()
            .data
            or []
        )
        if len(today_rows) >= 2:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": True,
                    "message": "Free plan includes 2 visual generations per day. Upgrade for unlimited visuals.",
                    "code": "VISUAL_DAILY_LIMIT_REACHED",
                },
            )

    generated = await generator.generate(
        topic=payload.topic.strip(),
        visual_type=payload.visual_type,
        subject=payload.subject.strip() if payload.subject else None,
    )

    created = (
        client.table("visual_explanations")
        .insert(
            {
                "user_id": user["user_id"],
                "topic": generated["topic"],
                "subject": generated.get("subject"),
                "visual_type": generated["type"],
                "prompt_used": generated.get("prompt_used"),
                "visual_data": generated["content"],
                "explanation": generated.get("summary"),
            }
        )
        .execute()
    )

    if not created.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to save visual", "code": "VISUAL_SAVE_FAILED"})

    visual = _normalize_row(created.data[0])
    return _success(visual)


@router.get("/library")
def get_visual_library(limit: int = 20, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    safe_limit = min(max(limit, 1), 100)

    rows = (
        client.table("visual_explanations")
        .select("id,topic,subject,visual_type,visual_data,explanation,created_at")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(safe_limit)
        .execute()
        .data
        or []
    )

    return _success([_normalize_row(row) for row in rows])


@router.get("/{visual_id}")
def get_visual(visual_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    rows = (
        client.table("visual_explanations")
        .select("id,topic,subject,visual_type,visual_data,explanation,created_at")
        .eq("id", visual_id)
        .eq("user_id", user["user_id"])
        .limit(1)
        .execute()
        .data
        or []
    )

    if not rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Visual not found", "code": "VISUAL_NOT_FOUND"})

    return _success(_normalize_row(rows[0]))


@router.delete("/{visual_id}")
def delete_visual(visual_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    deleted = (
        client.table("visual_explanations")
        .delete()
        .eq("id", visual_id)
        .eq("user_id", user["user_id"])
        .execute()
    )

    if not deleted.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Visual not found", "code": "VISUAL_NOT_FOUND"})

    return _success({"deleted": True, "id": visual_id})
