from __future__ import annotations

from datetime import date, datetime, timezone
import json
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.crisis.crisis_generator import generate_crisis_plan
from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS
from app.services.rag.pipeline import AlmondRAGPipeline

router = APIRouter(prefix="/api/v1/crisis", tags=["crisis"])
rag_pipeline = AlmondRAGPipeline()


class ActivateCrisisPayload(BaseModel):
    exam_name: str = Field(min_length=2, max_length=200)
    exam_date: date
    subjects: List[str] = Field(min_length=1)
    preparation_level: Literal["zero", "little", "moderate", "good"] = "zero"
    available_hours_per_day: float = Field(default=8.0, ge=2.0, le=18.0)


class ProgressPayload(BaseModel):
    day_number: int = Field(ge=1)
    topic_name: str = Field(min_length=1)
    is_completed: bool


class RecalibratePayload(BaseModel):
    preparation_level: Optional[Literal["zero", "little", "moderate", "good"]] = None
    available_hours_per_day: Optional[float] = Field(default=None, ge=2.0, le=18.0)


class TeachPayload(BaseModel):
    topic_name: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    key_points: List[str] = Field(default_factory=list)
    exam_tip: str = ""


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _is_premium(service: AuthService, user_id: str) -> bool:
    subscription = service.get_active_subscription(user_id)
    return (subscription or {}).get("plan_type", "free") != "free"


def _get_activation_row(client, user_id: str) -> Dict[str, Any]:
    existing = client.table("crisis_activations").select("*").eq("user_id", user_id).limit(1).execute().data or []
    if existing:
        return existing[0]
    created = (
        client.table("crisis_activations")
        .insert(
            {
                "user_id": user_id,
                "free_activation_used": False,
                "total_activations": 0,
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to initialize activation state", "code": "CRISIS_ACTIVATION_INIT_FAILED"})
    return created.data[0]


def _get_active_session(client, user_id: str) -> Dict[str, Any] | None:
    rows = (
        client.table("crisis_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _get_subject_progress(client, user_id: str, selected_subjects: List[str]) -> List[Dict[str, Any]]:
    subjects = client.table("syllabus_subjects").select("id,name,year").execute().data or []
    topics = client.table("syllabus_topics").select("id,subject_id").execute().data or []

    progress_rows = (
        client.table("student_topic_progress")
        .select("topic_id,status")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    progress_by_topic = {row.get("topic_id"): row.get("status") for row in progress_rows}

    subject_index = {subject["id"]: subject for subject in subjects}
    bucket: Dict[str, Dict[str, Any]] = {}
    for subject in subjects:
        if subject.get("name") not in selected_subjects:
            continue
        bucket[subject["name"]] = {
            "subject_name": subject["name"],
            "year": subject.get("year"),
            "total_topics": 0,
            "completed": 0,
            "in_progress": 0,
            "needs_revision": 0,
            "not_started": 0,
            "completion_percentage": 0,
        }

    for topic in topics:
        subject = subject_index.get(topic.get("subject_id"))
        if not subject:
            continue
        name = subject.get("name")
        if name not in bucket:
            continue

        stats = bucket[name]
        stats["total_topics"] += 1
        status = progress_by_topic.get(topic.get("id"), "not_started")
        if status == "completed":
            stats["completed"] += 1
        elif status == "in_progress":
            stats["in_progress"] += 1
        elif status == "needs_revision":
            stats["needs_revision"] += 1
        else:
            stats["not_started"] += 1

    for item in bucket.values():
        total = max(int(item.get("total_topics", 0) or 0), 1)
        completed = int(item.get("completed", 0) or 0)
        item["completion_percentage"] = int(round((completed / total) * 100))

    return list(bucket.values())


def _extract_topics_from_plan(plan: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    days = plan.get("days") if isinstance(plan, dict) else []
    if not isinstance(days, list):
        return rows

    for day in days:
        if not isinstance(day, dict):
            continue
        day_number = int(day.get("day") or 0)
        if day_number < 1:
            continue
        for block in day.get("hours") or []:
            if not isinstance(block, dict):
                continue
            topic = str(block.get("topic") or "").strip()
            subject = str(block.get("subject") or "").strip()
            if not topic or not subject:
                continue
            rows.append(
                {
                    "day_number": day_number,
                    "topic_name": topic,
                    "subject": subject,
                }
            )

    return rows


def _with_progress(client, user_id: str, session_row: Dict[str, Any]) -> Dict[str, Any]:
    session_id = str(session_row.get("id"))
    progress_rows = (
        client.table("crisis_topic_progress")
        .select("id,day_number,topic_name,subject,is_completed,completed_at")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .order("day_number", desc=False)
        .execute()
        .data
        or []
    )
    payload = dict(session_row)
    payload["topic_progress"] = progress_rows
    return payload


@router.get("/activation-status")
def get_activation_status(user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    activation = _get_activation_row(client=client, user_id=user_id)
    active = _get_active_session(client=client, user_id=user_id)
    premium = _is_premium(service=service, user_id=user_id)

    can_activate = premium or not bool(activation.get("free_activation_used", False))

    return _success(
        {
            "can_activate": can_activate,
            "free_activation_used": bool(activation.get("free_activation_used", False)),
            "is_premium": premium,
            "active_session": _with_progress(client=client, user_id=user_id, session_row=active) if active else None,
        }
    )


@router.post("/activate")
async def activate_crisis_mode(
    payload: ActivateCrisisPayload,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    activation = _get_activation_row(client=client, user_id=user_id)
    premium = _is_premium(service=service, user_id=user_id)

    if not premium and bool(activation.get("free_activation_used", False)):
        raise HTTPException(
            status_code=403,
            detail={
                "error": True,
                "message": "You have used your free Crisis Mode activation. Upgrade to AlmondAI Premium for unlimited access.",
                "code": "CRISIS_FREE_ACTIVATION_USED",
            },
        )

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"})

    subject_progress = _get_subject_progress(client=client, user_id=user_id, selected_subjects=payload.subjects)

    plan = await generate_crisis_plan(
        user_id=user_id,
        exam_name=payload.exam_name,
        exam_date=payload.exam_date,
        subjects=payload.subjects,
        preparation_level=payload.preparation_level,
        available_hours_per_day=payload.available_hours_per_day,
        student_category=profile.get("student_category") or "sprinter",
        subject_progress=subject_progress,
    )

    days_remaining = (payload.exam_date - date.today()).days

    # Keep only one active crisis session.
    client.table("crisis_sessions").update({"is_active": False}).eq("user_id", user_id).eq("is_active", True).execute()

    inserted = (
        client.table("crisis_sessions")
        .insert(
            {
                "user_id": user_id,
                "exam_name": payload.exam_name,
                "exam_date": payload.exam_date.isoformat(),
                "days_remaining": days_remaining,
                "subjects": payload.subjects,
                "preparation_level": payload.preparation_level,
                "available_hours_per_day": payload.available_hours_per_day,
                "crisis_plan": plan,
                "current_day": 1,
                "is_active": True,
            }
        )
        .execute()
    )
    if not inserted.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to create crisis session", "code": "CRISIS_SESSION_CREATE_FAILED"})

    session = inserted.data[0]
    session_id = str(session["id"])

    topic_rows = _extract_topics_from_plan(plan=plan)
    if topic_rows:
        client.table("crisis_topic_progress").insert(
            [
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "day_number": row["day_number"],
                    "topic_name": row["topic_name"],
                    "subject": row["subject"],
                }
                for row in topic_rows
            ]
        ).execute()

    activation_update = {
        "total_activations": int(activation.get("total_activations", 0) or 0) + 1,
    }
    if not premium:
        activation_update["free_activation_used"] = True
        activation_update["free_activation_used_at"] = datetime.now(timezone.utc).isoformat()

    client.table("crisis_activations").update(activation_update).eq("id", activation["id"]).execute()

    return _success(_with_progress(client=client, user_id=user_id, session_row=session))


@router.get("/active-session")
def get_active_session(user=Depends(require_auth)):
    client = get_supabase_admin_client()
    active = _get_active_session(client=client, user_id=user["user_id"])
    if not active:
        raise HTTPException(status_code=404, detail={"error": True, "message": "No active crisis session", "code": "CRISIS_SESSION_NOT_FOUND"})
    return _success(_with_progress(client=client, user_id=user["user_id"], session_row=active))


@router.get("/sessions/{session_id}")
def get_session(session_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    rows = (
        client.table("crisis_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user["user_id"])
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"})
    return _success(_with_progress(client=client, user_id=user["user_id"], session_row=rows[0]))


@router.patch("/sessions/{session_id}/progress")
def update_progress(session_id: str, payload: ProgressPayload, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    query = (
        client.table("crisis_topic_progress")
        .update(
            {
                "is_completed": payload.is_completed,
                "completed_at": datetime.now(timezone.utc).isoformat() if payload.is_completed else None,
            }
        )
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .eq("day_number", payload.day_number)
        .eq("topic_name", payload.topic_name)
    )
    updated = query.execute()
    if not updated.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Topic progress row not found", "code": "CRISIS_PROGRESS_NOT_FOUND"})

    return _success(updated.data[0])


@router.post("/sessions/{session_id}/recalibrate")
async def recalibrate_session(session_id: str, payload: RecalibratePayload, user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    rows = (
        client.table("crisis_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"})

    session = rows[0]
    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"})

    subject_progress = _get_subject_progress(client=client, user_id=user_id, selected_subjects=session.get("subjects") or [])

    preparation_level = payload.preparation_level or session.get("preparation_level") or "moderate"
    hours_per_day = payload.available_hours_per_day or float(session.get("available_hours_per_day") or 8.0)

    recalibrated_plan = await generate_crisis_plan(
        user_id=user_id,
        exam_name=session.get("exam_name") or "Exam",
        exam_date=date.fromisoformat(session.get("exam_date")),
        subjects=session.get("subjects") or [],
        preparation_level=preparation_level,
        available_hours_per_day=hours_per_day,
        student_category=profile.get("student_category") or "sprinter",
        subject_progress=subject_progress,
    )

    updated = (
        client.table("crisis_sessions")
        .update(
            {
                "crisis_plan": recalibrated_plan,
                "preparation_level": preparation_level,
                "available_hours_per_day": hours_per_day,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to recalibrate session", "code": "CRISIS_RECALIBRATE_FAILED"})

    # Refresh per-topic rows for upcoming days.
    client.table("crisis_topic_progress").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
    topic_rows = _extract_topics_from_plan(plan=recalibrated_plan)
    if topic_rows:
        client.table("crisis_topic_progress").insert(
            [
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "day_number": row["day_number"],
                    "topic_name": row["topic_name"],
                    "subject": row["subject"],
                }
                for row in topic_rows
            ]
        ).execute()

    return _success(_with_progress(client=client, user_id=user_id, session_row=updated.data[0]))


@router.post("/sessions/{session_id}/teach")
async def teach_topic(session_id: str, payload: TeachPayload, user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    rows = (
        client.table("crisis_sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"})

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"})

    key_points_text = "\n".join([f"- {point}" for point in payload.key_points]) if payload.key_points else "- Focus on exam-relevant core concepts"
    focus_prompt = (
        f"Teach me {payload.topic_name} from {payload.subject} for emergency exam preparation. "
        f"Include rapid conceptual explanation, high-yield memory hooks, likely exam traps, and ultra-practical revision summary.\n"
        f"Planned key points:\n{key_points_text}\n"
        f"Exam tip from plan: {payload.exam_tip or 'n/a'}"
    )

    teaching_content = await rag_pipeline.process_question_sync(
        user_id=user_id,
        question=focus_prompt,
        student_category=profile.get("student_category") or "sprinter",
        teaching_style=profile.get("teaching_style") or "conversational",
        conversation_history=[],
        subject_filter=payload.subject,
    )

    structuring_prompt = f"""
You will format the following teaching text into JSON fields.
Return only valid JSON with keys:
- mnemonics: string[]
- exam_questions: string[]
- what_to_remember: string[]

Teaching text:
{teaching_content}
"""

    llm = OpenRouterLLMClient(OPENROUTER_MODELS["fast"])
    structured_raw = await llm.generate_sync(
        prompt=structuring_prompt,
        system_prompt="Return only strict JSON arrays for requested keys.",
    )

    structured = {}
    try:
        structured = json.loads(structured_raw)
        if not isinstance(structured, dict):
            structured = {}
    except Exception:
        structured = {}

    return _success(
        {
            "topic": payload.topic_name,
            "subject": payload.subject,
            "teaching_content": teaching_content,
            "mnemonics": structured.get("mnemonics") if isinstance(structured.get("mnemonics"), list) else [],
            "exam_questions": structured.get("exam_questions") if isinstance(structured.get("exam_questions"), list) else [],
            "what_to_remember": structured.get("what_to_remember") if isinstance(structured.get("what_to_remember"), list) else [],
        }
    )
