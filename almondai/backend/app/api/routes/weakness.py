from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.weakness.weakness_analyzer import WeaknessAnalyzer

router = APIRouter(prefix="/api/v1/weakness", tags=["weakness"])
analyzer = WeaknessAnalyzer()


class AnalyzePayload(BaseModel):
    subject: Optional[str] = None


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _priority_order(priority: str) -> int:
    mapping = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return mapping.get(priority, 9)


def _safe_time_ago(iso_value: str | None) -> str:
    if not iso_value:
        return "Never"
    try:
        dt = datetime.fromisoformat(str(iso_value).replace("Z", "+00:00"))
    except Exception:
        return "Never"

    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    seconds = int((now - dt).total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds // 60} minutes ago"
    if seconds < 86400:
        return f"{seconds // 3600} hours ago"
    return f"{seconds // 86400} days ago"


@router.post("/analyze")
async def run_analysis(payload: AnalyzePayload | None = None, user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    subscription = service.get_active_subscription(user_id)
    is_premium = (subscription or {}).get("plan_type", "free") != "free"
    if not is_premium:
        latest = (
            client.table("weakness_analyses")
            .select("generated_at")
            .eq("user_id", user_id)
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if latest and latest[0].get("generated_at"):
            last_dt = datetime.fromisoformat(str(latest[0]["generated_at"]).replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - last_dt < timedelta(days=7):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": True,
                        "message": "Free plan allows one insights analysis per week. Upgrade for unlimited insights.",
                        "code": "WEAKNESS_WEEKLY_LIMIT_REACHED",
                    },
                )

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"})

    subject = payload.subject if payload else None

    analysis = await analyzer.analyze_student(user_id=user_id, subject_filter=subject)
    weak_topics = [*analysis["critical_gaps"], *analysis["high_risk"]]
    interventions = await analyzer.generate_interventions(
        user_id=user_id,
        weak_topics=weak_topics,
        student_category=profile.get("student_category") or "sprinter",
    )

    analysis_type = "subject" if subject else "full"
    created = (
        client.table("weakness_analyses")
        .insert(
            {
                "user_id": user_id,
                "analysis_type": analysis_type,
                "subject": subject,
                "weakness_scores": analysis["weakness_scores"],
                "critical_gaps": analysis["critical_gaps"],
                "strong_areas": analysis["strong_areas"],
                "overall_readiness_score": analysis["overall_readiness_score"],
                "estimated_marks_at_risk": analysis["estimated_marks_at_risk"],
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to save weakness analysis", "code": "WEAKNESS_ANALYSIS_SAVE_FAILED"})

    analysis_id = str(created.data[0]["id"])

    if interventions:
        client.table("weakness_interventions").insert(
            [
                {
                    "user_id": user_id,
                    "analysis_id": analysis_id,
                    "topic": row["topic"],
                    "subject": row["subject"],
                    "weakness_score": row["weakness_score"],
                    "intervention_plan": row["intervention_plan"],
                    "priority": row["priority"],
                }
                for row in interventions
            ]
        ).execute()

    return _success(
        {
            "analysis_id": analysis_id,
            "overall_readiness_score": analysis["overall_readiness_score"],
            "estimated_marks_at_risk": analysis["estimated_marks_at_risk"],
            "generated_at": created.data[0].get("generated_at"),
            "critical_gaps": analysis["critical_gaps"],
            "high_risk": analysis["high_risk"],
            "moderate_risk": analysis["moderate_risk"],
            "strong_areas": analysis["strong_areas"],
            "interventions": interventions,
        }
    )


@router.get("/latest")
def get_latest(user=Depends(require_auth)):
    client = get_supabase_admin_client()
    rows = (
        client.table("weakness_analyses")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "No analysis found", "code": "WEAKNESS_ANALYSIS_NOT_FOUND"})

    latest = rows[0]
    all_scores = latest.get("weakness_scores") or []
    critical_gaps = [row for row in all_scores if int(row.get("weakness_score", 0) or 0) > 75]
    high_risk = [row for row in all_scores if 51 <= int(row.get("weakness_score", 0) or 0) <= 75]
    moderate_risk = [row for row in all_scores if 26 <= int(row.get("weakness_score", 0) or 0) <= 50]

    interventions = (
        client.table("weakness_interventions")
        .select("id,topic,subject,weakness_score,priority,intervention_plan,is_resolved,resolved_at,created_at")
        .eq("user_id", user["user_id"])
        .eq("analysis_id", str(latest.get("id")))
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )

    return _success(
        {
            "analysis_id": str(latest.get("id")),
            "overall_readiness_score": int(latest.get("overall_readiness_score", 0) or 0),
            "estimated_marks_at_risk": int(latest.get("estimated_marks_at_risk", 0) or 0),
            "generated_at": latest.get("generated_at"),
            "critical_gaps": critical_gaps,
            "high_risk": high_risk,
            "moderate_risk": moderate_risk,
            "strong_areas": latest.get("strong_areas") or [],
            "interventions": interventions,
        }
    )


@router.get("/interventions")
def get_interventions(user=Depends(require_auth)):
    client = get_supabase_admin_client()
    rows = (
        client.table("weakness_interventions")
        .select("id,analysis_id,topic,subject,weakness_score,intervention_plan,priority,is_resolved,resolved_at,created_at")
        .eq("user_id", user["user_id"])
        .eq("is_resolved", False)
        .execute()
        .data
        or []
    )
    rows.sort(key=lambda row: (_priority_order(str(row.get("priority"))), -int(row.get("weakness_score", 0) or 0)))
    return _success(rows)


@router.patch("/interventions/{intervention_id}/resolve")
def resolve_intervention(intervention_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    updated = (
        client.table("weakness_interventions")
        .update(
            {
                "is_resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", intervention_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Intervention not found", "code": "INTERVENTION_NOT_FOUND"})

    return _success({"resolved": True, "id": intervention_id})


@router.get("/quick-summary")
def get_quick_summary(user=Depends(require_auth)):
    client = get_supabase_admin_client()
    rows = (
        client.table("weakness_analyses")
        .select("id,overall_readiness_score,generated_at,weakness_scores")
        .eq("user_id", user["user_id"])
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )

    if not rows:
        return _success(
            {
                "has_analysis": False,
                "last_analyzed": "Never",
                "critical_count": 0,
                "high_risk_count": 0,
                "overall_readiness_score": 0,
                "top_3_gaps": [],
            }
        )

    latest = rows[0]
    scores = latest.get("weakness_scores") or []
    sorted_scores = sorted(scores, key=lambda row: int(row.get("weakness_score", 0) or 0), reverse=True)
    critical_count = len([row for row in scores if int(row.get("weakness_score", 0) or 0) > 75])
    high_risk_count = len([row for row in scores if 51 <= int(row.get("weakness_score", 0) or 0) <= 75])

    top_3_gaps = [
        {
            "topic": row.get("topic"),
            "subject": row.get("subject"),
            "weakness_score": int(row.get("weakness_score", 0) or 0),
        }
        for row in sorted_scores[:3]
    ]

    return _success(
        {
            "has_analysis": True,
            "last_analyzed": _safe_time_ago(latest.get("generated_at")),
            "critical_count": critical_count,
            "high_risk_count": high_risk_count,
            "overall_readiness_score": int(latest.get("overall_readiness_score", 0) or 0),
            "top_3_gaps": top_3_gaps,
        }
    )
