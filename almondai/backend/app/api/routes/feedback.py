from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


class FeedbackPayload(BaseModel):
    category: str = Field(min_length=2, max_length=40)
    message: str = Field(min_length=5, max_length=2000)


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


@router.post("")
def submit_feedback(payload: FeedbackPayload, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    category = payload.category.strip().lower()
    if category not in {"bug", "feature", "general"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": True,
                "message": "Invalid feedback category",
                "code": "INVALID_CATEGORY",
                "details": {"category": payload.category},
            },
        )

    created = (
        client.table("student_feedback")
        .insert(
            {
                "user_id": user["user_id"],
                "category": category,
                "message": payload.message.strip(),
            }
        )
        .execute()
    )
    row = (created.data or [{}])[0]
    return _success({"id": row.get("id"), "submitted": True})
