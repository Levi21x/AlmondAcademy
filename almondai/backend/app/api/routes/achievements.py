from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from app.middleware.auth_middleware import require_auth
from app.services.achievements_service import achievements_service

router = APIRouter(prefix="/api/v1/achievements", tags=["achievements"])


def _success(data: Dict[str, Any]) -> Dict[str, Any]:
    return {"success": True, "data": data}


@router.get("")
def get_achievements(user=Depends(require_auth)) -> Dict[str, Any]:
    payload = achievements_service.list_badges(user_id=user["user_id"])
    return _success(payload)


@router.get("/unlocked")
def get_unlocked_achievements(
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    rows = achievements_service.get_unlocked(user_id=user["user_id"], limit=limit)
    return _success({"items": rows})


@router.get("/new")
def get_new_achievements(
    since: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    normalized_since = None
    if since:
        try:
            normalized_since = datetime.fromisoformat(since.replace("Z", "+00:00")).isoformat()
        except ValueError:
            normalized_since = None

    rows = achievements_service.get_recent_unlocks(user_id=user["user_id"], since=normalized_since, limit=limit)
    server_time = datetime.now(timezone.utc).isoformat()
    return _success({"items": rows, "server_time": server_time})


@router.get("/summary")
def get_achievements_summary(user=Depends(require_auth)) -> Dict[str, Any]:
    payload = achievements_service.get_summary(user_id=user["user_id"])
    return _success(payload)
