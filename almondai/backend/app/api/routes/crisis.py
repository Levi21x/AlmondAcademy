from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.crisis.chief_resident import build_chief_resident_briefing, stream_chief_resident_opening
from app.services.crisis.crisis_generator import generate_crisis_plan, generate_war_room_strategy
from app.services.crisis.last_night import generate_last_night_plan
from app.services.crisis.orchestrator import activate_war_room
from app.services.crisis.panic import detect_panic
from app.services.crisis.readiness import compute_readiness_score
from app.services.llm.openrouter_client import OPENROUTER_MODELS, OpenRouterLLMClient
from app.services.rag.pipeline import AlmondRAGPipeline

router = APIRouter(prefix="/api/v1/crisis", tags=["crisis"])
rag_pipeline = AlmondRAGPipeline()


# ── Request / response models ──────────────────────────────────────────────────

class ActivateCrisisPayload(BaseModel):
    exam_name: str = Field(min_length=2, max_length=200)
    exam_date: date
    subjects: List[str] = Field(min_length=1)
    preparation_level: Literal["zero", "little", "moderate", "good"] = "zero"
    available_hours_per_day: float = Field(default=8.0, ge=2.0, le=18.0)
    stress_level: int = Field(default=5, ge=1, le=10)
    mode: Literal["standard", "last_night"] = "standard"
    message: str = ""  # optional panic-detection text from the user


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


class LastNightPayload(BaseModel):
    exam_name: str = Field(min_length=2, max_length=200)
    subjects: List[str] = Field(min_length=1)
    hours_available: float = Field(ge=1.0, le=12.0)


class CrisisAskPayload(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _is_premium(service: AuthService, user_id: str) -> bool:
    subscription = service.get_active_subscription(user_id)
    return (subscription or {}).get("plan_type", "free") != "free"


def _get_activation_row(client, user_id: str) -> Dict[str, Any]:
    existing = (
        client.table("crisis_activations")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if existing:
        return existing[0]
    created = (
        client.table("crisis_activations")
        .insert({"user_id": user_id, "free_activation_used": False, "total_activations": 0})
        .execute()
    )
    if not created.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to initialise activation state", "code": "CRISIS_ACTIVATION_INIT_FAILED"},
        )
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
        item["completed_topics"] = completed

    return list(bucket.values())


def _get_topic_level_data(
    client, user_id: str, selected_subjects: List[str]
) -> List[Dict[str, Any]]:
    """Per-topic metadata with completion status and weakness signals, used by War Room engines."""
    subjects = client.table("syllabus_subjects").select("id,name").execute().data or []
    subject_map = {s["id"]: s["name"] for s in subjects}
    subject_name_to_id: Dict[str, str] = {
        s["name"]: s["id"] for s in subjects if s.get("name") in selected_subjects
    }
    if not subject_name_to_id:
        return []

    selected_ids = list(subject_name_to_id.values())
    topics = (
        client.table("syllabus_topics")
        .select("id,subject_id,name,difficulty,is_high_yield,neet_pg_relevant")
        .in_("subject_id", selected_ids)
        .execute()
        .data
        or []
    )
    if not topics:
        return []

    topic_ids = [t["id"] for t in topics]
    progress_rows = (
        client.table("student_topic_progress")
        .select("topic_id,status")
        .eq("user_id", user_id)
        .in_("topic_id", topic_ids)
        .execute()
        .data
        or []
    ) if topic_ids else []
    progress_map = {r["topic_id"]: r["status"] for r in progress_rows}

    weakness_map: Dict[str, str] = {}
    try:
        weakness_rows = (
            client.table("weakness_interventions")
            .select("topic,subject,priority")
            .eq("user_id", user_id)
            .eq("is_resolved", False)
            .in_("subject", selected_subjects)
            .execute()
            .data
            or []
        )
        for w in weakness_rows:
            key = f"{(w.get('subject') or '').lower()}:{(w.get('topic') or '').lower()}"
            weakness_map[key] = str(w.get("priority") or "medium")
    except Exception:
        pass

    result: List[Dict[str, Any]] = []
    for topic in topics:
        subject_name = subject_map.get(topic.get("subject_id"), "Unknown")
        key = f"{subject_name.lower()}:{(topic.get('name') or '').lower()}"
        result.append(
            {
                "id": str(topic.get("id", "")),
                "name": str(topic.get("name", "")),
                "subject": subject_name,
                "difficulty": str(topic.get("difficulty") or "medium"),
                "is_high_yield": bool(topic.get("is_high_yield")),
                "neet_pg_relevant": bool(topic.get("neet_pg_relevant")),
                "status": str(progress_map.get(topic.get("id"), "not_started")),
                "weakness_priority": weakness_map.get(key),
            }
        )
    return result


def _get_weakness_readiness(client, user_id: str) -> int:
    """Latest overall readiness score from weakness_analyses (0-100), or 50 if absent."""
    try:
        rows = (
            client.table("weakness_analyses")
            .select("overall_readiness_score")
            .eq("user_id", user_id)
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        if rows and rows[0].get("overall_readiness_score") is not None:
            return max(0, min(100, int(rows[0]["overall_readiness_score"])))
    except Exception:
        pass
    return 50


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
            rows.append({"day_number": day_number, "topic_name": topic, "subject": subject})
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
    # Include strategy so frontend gets it in a single fetch
    if "strategy" not in payload:
        payload["strategy"] = {}
    return payload


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/activation-status")
def get_activation_status(user=Depends(require_auth), service: AuthService = Depends(AuthService)):
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    activation = _get_activation_row(client=client, user_id=user_id)
    active = _get_active_session(client=client, user_id=user_id)
    premium = _is_premium(service=service, user_id=user_id)

    return _success(
        {
            "can_activate": True,
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

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"},
        )

    student_category = profile.get("student_category") or "sprinter"
    subject_progress = _get_subject_progress(
        client=client, user_id=user_id, selected_subjects=payload.subjects
    )
    topic_data = _get_topic_level_data(
        client=client, user_id=user_id, selected_subjects=payload.subjects
    )
    weakness_readiness = _get_weakness_readiness(client=client, user_id=user_id)

    days_remaining = (payload.exam_date - date.today()).days
    if days_remaining < 1:
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Exam date must be in the future", "code": "INVALID_EXAM_DATE"},
        )

    # Deterministic readiness + panic (instant)
    readiness_result = compute_readiness_score(
        subject_progress=subject_progress,
        days_remaining=days_remaining,
        hours_per_day=payload.available_hours_per_day,
        weakness_readiness=weakness_readiness,
        stress_level=payload.stress_level,
    )
    panic_result = detect_panic(
        stress_level=payload.stress_level,
        readiness_score=readiness_result["readiness_score"],
        days_remaining=days_remaining,
        message=payload.message,
    )

    # Run War Room strategy + day-by-day plan concurrently
    strategy_coro = generate_war_room_strategy(
        exam_name=payload.exam_name,
        exam_date=payload.exam_date,
        days_remaining=days_remaining,
        subjects=payload.subjects,
        available_hours_per_day=payload.available_hours_per_day,
        student_category=student_category,
        topic_data=topic_data,
        subject_progress=subject_progress,
        readiness_result=readiness_result,
        panic_result=panic_result,
        preparation_level=payload.preparation_level,
    )
    plan_coro = generate_crisis_plan(
        user_id=user_id,
        exam_name=payload.exam_name,
        exam_date=payload.exam_date,
        subjects=payload.subjects,
        preparation_level=payload.preparation_level,
        available_hours_per_day=payload.available_hours_per_day,
        student_category=student_category,
        subject_progress=subject_progress,
        panic_softening_factor=panic_result.get("softening_factor", 1.0),
    )

    results = await asyncio.gather(strategy_coro, plan_coro, return_exceptions=True)

    llm_strategy = results[0]
    plan = results[1]

    if isinstance(plan, Exception):
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to generate crisis plan", "code": "CRISIS_PLAN_FAILED"},
        )
    if isinstance(llm_strategy, Exception):
        llm_strategy = {}

    # Merge deterministic results with LLM strategy
    strategy: Dict[str, Any] = {
        "readiness": readiness_result,
        "panic": panic_result,
        **{k: v for k, v in llm_strategy.items() if k not in ("_fallback", "_error")},
    }

    readiness_score = readiness_result.get("readiness_score", 0)

    # Archive any existing active session
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
                "stress_level": payload.stress_level,
                "mode": payload.mode,
                "readiness_score": readiness_score,
                "strategy": strategy,
                "crisis_plan": plan,
                "current_day": 1,
                "is_active": True,
            }
        )
        .execute()
    )
    if not inserted.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to create crisis session", "code": "CRISIS_SESSION_CREATE_FAILED"},
        )

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

    activation_update: Dict[str, Any] = {
        "total_activations": int(activation.get("total_activations", 0) or 0) + 1,
    }
    client.table("crisis_activations").update(activation_update).eq("id", activation["id"]).execute()

    return _success(_with_progress(client=client, user_id=user_id, session_row=session))


@router.get("/active-session")
def get_active_session(user=Depends(require_auth)):
    client = get_supabase_admin_client()
    active = _get_active_session(client=client, user_id=user["user_id"])
    if not active:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "No active crisis session", "code": "CRISIS_SESSION_NOT_FOUND"},
        )
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
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"},
        )
    return _success(_with_progress(client=client, user_id=user["user_id"], session_row=rows[0]))


@router.patch("/sessions/{session_id}/progress")
def update_progress(session_id: str, payload: ProgressPayload, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    updated = (
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
        .execute()
    )
    if not updated.data:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Topic progress row not found", "code": "CRISIS_PROGRESS_NOT_FOUND"},
        )
    return _success(updated.data[0])


@router.post("/sessions/{session_id}/recalibrate")
async def recalibrate_session(
    session_id: str,
    payload: RecalibratePayload,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
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
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"},
        )

    session = rows[0]
    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"},
        )

    preparation_level = payload.preparation_level or session.get("preparation_level") or "moderate"
    hours_per_day = payload.available_hours_per_day or float(session.get("available_hours_per_day") or 8.0)
    subject_progress = _get_subject_progress(
        client=client, user_id=user_id, selected_subjects=session.get("subjects") or []
    )

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
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to recalibrate session", "code": "CRISIS_RECALIBRATE_FAILED"},
        )

    client.table("crisis_topic_progress").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
    topic_rows = _extract_topics_from_plan(plan=recalibrated_plan)
    if topic_rows:
        client.table("crisis_topic_progress").insert(
            [
                {"session_id": session_id, "user_id": user_id, **row}
                for row in topic_rows
            ]
        ).execute()

    return _success(_with_progress(client=client, user_id=user_id, session_row=updated.data[0]))


@router.post("/sessions/{session_id}/teach")
async def teach_topic(
    session_id: str,
    payload: TeachPayload,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
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
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"},
        )

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"},
        )

    key_points_text = (
        "\n".join([f"- {point}" for point in payload.key_points])
        if payload.key_points
        else "- Focus on exam-relevant core concepts"
    )
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
Format the following teaching text into JSON.
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
        system_prompt="Return only strict JSON arrays for the requested keys.",
    )

    structured: Dict[str, Any] = {}
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


@router.post("/last-night")
async def last_night_mode(payload: LastNightPayload, user=Depends(require_auth)):
    """
    Stateless emergency plan for students with ≤ 12 hours to their exam.
    Does not create a session — purely generative.
    """
    _ = user  # auth enforced; user_id not needed for stateless generation
    try:
        plan = await generate_last_night_plan(
            exam_name=payload.exam_name,
            subjects=payload.subjects,
            hours_available=payload.hours_available,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": str(exc), "code": "LAST_NIGHT_PLAN_FAILED"},
        )
    return _success(plan)


@router.post("/sessions/{session_id}/ask")
async def ask_if_i_were_you(
    session_id: str,
    payload: CrisisAskPayload,
    user=Depends(require_auth),
):
    """
    Streaming SSE endpoint: 'If I Were You' tactical AI advice.
    Persists conversation to crisis_ask_messages after stream completes.
    """
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    rows = (
        client.table("crisis_sessions")
        .select("exam_name,exam_date,subjects,readiness_score,strategy,available_hours_per_day")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "CRISIS_SESSION_NOT_FOUND"},
        )

    session = rows[0]
    exam_name = session.get("exam_name", "your exam")
    exam_date_str = session.get("exam_date", "")
    try:
        days_remaining = max((date.fromisoformat(exam_date_str) - date.today()).days, 0)
    except Exception:
        days_remaining = 0

    readiness_score = int(session.get("readiness_score") or 50)
    subjects = session.get("subjects") or []
    hours_per_day = float(session.get("available_hours_per_day") or 8)
    strategy = session.get("strategy") or {}
    high_yield_must = strategy.get("high_yield", {}).get("must", [])

    # Format conversation history into the prompt (max 6 prior turns)
    history_turns = (payload.conversation_history or [])[-6:]
    history_text = ""
    for turn in history_turns:
        role_label = "Student" if turn.get("role") == "user" else "You"
        history_text += f"{role_label}: {turn.get('content', '')}\n\n"

    must_topics_preview = ", ".join(
        [f"{t.get('topic', '')} ({t.get('subject', '')})" for t in high_yield_must[:5]]
    )

    system_prompt = (
        f"You are a brilliant, experienced medical school senior advising a stressed student on exam strategy. "
        f"Student is preparing for {exam_name} with {days_remaining} days remaining. "
        f"Readiness score: {readiness_score}/100. Subjects: {', '.join(subjects)}. "
        f"Available: {hours_per_day}h/day. "
        f"Top MUST topics: {must_topics_preview or 'none identified yet'}.\n\n"
        "Speak directly and honestly, like a knowledgeable friend who knows exactly what will be tested. "
        "Give concrete, specific, actionable advice. Name actual topics. No platitudes."
    )

    user_prompt = (
        (f"PRIOR CONVERSATION:\n{history_text}" if history_text else "")
        + f"STUDENT: {payload.message}"
    )

    llm = OpenRouterLLMClient(OPENROUTER_MODELS["default"])
    collected: List[str] = []

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            async for chunk in llm.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                stream=True,
                max_tokens=800,
            ):
                collected.append(chunk)
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception:
            err_chunk = "I could not generate a response right now. Please try again."
            collected.append(err_chunk)
            yield f"data: {json.dumps(err_chunk)}\n\n"
        finally:
            yield "data: [CRISIS_STREAM_END]\n\n"
            # Persist both messages after stream completes
            full_response = "".join(collected)
            if full_response:
                try:
                    now = datetime.now(timezone.utc).isoformat()
                    client.table("crisis_ask_messages").insert(
                        [
                            {
                                "session_id": session_id,
                                "user_id": user_id,
                                "role": "user",
                                "content": payload.message,
                                "created_at": now,
                            },
                            {
                                "session_id": session_id,
                                "user_id": user_id,
                                "role": "assistant",
                                "content": full_response,
                                "created_at": now,
                            },
                        ]
                    ).execute()
                except Exception:
                    pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions/{session_id}/ask/history")
def get_ask_history(session_id: str, user=Depends(require_auth)):
    """Fetches the full 'If I Were You' conversation history for a session."""
    client = get_supabase_admin_client()
    rows = (
        client.table("crisis_ask_messages")
        .select("id,role,content,created_at")
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )
    return _success(rows)


# ─────────────────────────────────────────────────────────────────────────────
# War Room v2 — multi-agent activation (SSE)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/activate/stream")
async def activate_crisis_stream(
    payload: ActivateCrisisPayload,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
    """
    SSE endpoint that activates the full War Room:
    - Assembles all agents concurrently via orchestrator
    - Streams Chief Resident opening in real-time
    - Creates session + queues deep-agent jobs
    """
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    days_remaining = (payload.exam_date - date.today()).days
    if days_remaining < 1:
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Exam date must be in the future", "code": "INVALID_EXAM_DATE"},
        )

    profile = service.get_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Profile not found", "code": "PROFILE_NOT_FOUND"},
        )

    student_category = profile.get("student_category") or "sprinter"

    # Snapshot all DB state before streaming starts
    subject_progress = _get_subject_progress(
        client=client, user_id=user_id, selected_subjects=payload.subjects
    )
    topic_data = _get_topic_level_data(
        client=client, user_id=user_id, selected_subjects=payload.subjects
    )
    weakness_readiness = _get_weakness_readiness(client=client, user_id=user_id)

    readiness_result = compute_readiness_score(
        subject_progress=subject_progress,
        days_remaining=days_remaining,
        hours_per_day=payload.available_hours_per_day,
        weakness_readiness=weakness_readiness,
        stress_level=payload.stress_level,
    )
    panic_result = detect_panic(
        stress_level=payload.stress_level,
        readiness_score=readiness_result["readiness_score"],
        days_remaining=days_remaining,
        message=payload.message,
    )

    # Fetch jar items for this (possibly pre-existing) session
    jar_items: List[Dict[str, Any]] = []
    existing_session = _get_active_session(client=client, user_id=user_id)
    if existing_session:
        jar_rows = (
            client.table("almond_jar_items")
            .select("*")
            .eq("session_id", existing_session["id"])
            .eq("user_id", user_id)
            .eq("is_processed", True)
            .execute()
            .data
            or []
        )
        jar_items = jar_rows

    async def event_stream() -> AsyncGenerator[str, None]:
        try:
            # Phase 1: Announce team formation
            yield f"data: {json.dumps({'type': 'status', 'message': 'Assembling your War Room team...'})}\n\n"
            await asyncio.sleep(0.1)

            # Phase 2: Run all agents
            war_room = await activate_war_room(
                exam_name=payload.exam_name,
                exam_date=payload.exam_date,
                days_remaining=days_remaining,
                hours_per_day=payload.available_hours_per_day,
                subjects=payload.subjects,
                preparation_level=payload.preparation_level,
                student_category=student_category,
                topic_data=topic_data,
                subject_progress=subject_progress,
                readiness_result=readiness_result,
                panic_result=panic_result,
                jar_items=jar_items,
                stress_level=payload.stress_level,
                user_id=user_id,
                session_id=existing_session["id"] if existing_session else "",
            )

            # Phase 3: Announce agent results
            yield f"data: {json.dumps({'type': 'agents_ready', 'results': war_room['agent_results']})}\n\n"
            await asyncio.sleep(0.1)

            # Phase 4: Persist session
            crisis_plan = war_room["crisis_plan"]
            strategy = war_room["strategy"]

            client.table("crisis_sessions").update({"is_active": False}).eq("user_id", user_id).eq("is_active", True).execute()

            activation = _get_activation_row(client=client, user_id=user_id)

            inserted = (
                client.table("crisis_sessions")
                .insert({
                    "user_id": user_id,
                    "exam_name": payload.exam_name,
                    "exam_date": payload.exam_date.isoformat(),
                    "days_remaining": days_remaining,
                    "subjects": payload.subjects,
                    "preparation_level": payload.preparation_level,
                    "available_hours_per_day": payload.available_hours_per_day,
                    "stress_level": payload.stress_level,
                    "mode": payload.mode,
                    "readiness_score": readiness_result.get("readiness_score", 0),
                    "strategy": strategy,
                    "crisis_plan": crisis_plan,
                    "current_day": 1,
                    "is_active": True,
                    "jar_enabled": True,
                    "team_status": "active",
                })
                .execute()
            )
            session_id = inserted.data[0]["id"] if inserted.data else None

            if session_id:
                topic_rows = _extract_topics_from_plan(plan=crisis_plan)
                if topic_rows:
                    client.table("crisis_topic_progress").insert(
                        [{"session_id": session_id, "user_id": user_id, **row} for row in topic_rows]
                    ).execute()

                # Queue deep-agent jobs (non-blocking)
                deep_jobs = [
                    {"session_id": session_id, "user_id": user_id, "job_type": "mock_paper", "payload": {"exam_name": payload.exam_name, "subjects": payload.subjects}},
                    {"session_id": session_id, "user_id": user_id, "job_type": "cheat_sheet", "payload": {"exam_name": payload.exam_name, "subjects": payload.subjects}},
                    {"session_id": session_id, "user_id": user_id, "job_type": "knowing_vs_scoring", "payload": {"exam_name": payload.exam_name}},
                ]
                try:
                    client.table("almond_jar_jobs").insert(deep_jobs).execute()
                except Exception:
                    pass

                # Update activation counter
                client.table("crisis_activations").update({
                    "total_activations": int(activation.get("total_activations", 0) or 0) + 1,
                }).eq("id", activation["id"]).execute()

                yield f"data: {json.dumps({'type': 'session_created', 'session_id': session_id})}\n\n"
                await asyncio.sleep(0.05)

            # Phase 5: Stream Chief Resident opening
            yield f"data: {json.dumps({'type': 'chief_resident_start'})}\n\n"
            async for chunk in stream_chief_resident_opening(war_room):
                yield f"data: {json.dumps({'type': 'chief_resident_text', 'text': chunk})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
        finally:
            yield "data: [CRISIS_STREAM_END]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions/{session_id}/live")
async def session_live_feed(session_id: str, user=Depends(require_auth)):
    """
    Long-lived SSE feed for nudges and artifact-ready notifications.
    Client connects once and receives events as they are produced by the background worker.
    Polls every 15s; closes after 10 minutes of inactivity.
    """
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
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "SESSION_NOT_FOUND"},
        )

    async def live_events() -> AsyncGenerator[str, None]:
        poll_count = 0
        max_polls = 40  # 40 × 15s = 10 min

        while poll_count < max_polls:
            poll_count += 1
            await asyncio.sleep(15)

            try:
                # Check for new unread artifacts
                artifacts = (
                    client.table("almond_jar_artifacts")
                    .select("id,artifact_type,title,created_at")
                    .eq("session_id", session_id)
                    .eq("user_id", user_id)
                    .eq("is_read", False)
                    .execute()
                    .data
                    or []
                )
                if artifacts:
                    yield f"data: {json.dumps({'type': 'artifacts_ready', 'artifacts': artifacts})}\n\n"

                # Check for pending nudges to fire
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc).isoformat()
                nudges = (
                    client.table("crisis_nudges")
                    .select("id,nudge_type,content")
                    .eq("session_id", session_id)
                    .eq("user_id", user_id)
                    .eq("is_sent", False)
                    .lte("scheduled_for", now)
                    .execute()
                    .data
                    or []
                )
                for nudge in nudges:
                    yield f"data: {json.dumps({'type': 'nudge', 'nudge': nudge})}\n\n"
                    client.table("crisis_nudges").update({"is_sent": True, "sent_at": now}).eq("id", nudge["id"]).execute()

                # Heartbeat
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"

            except asyncio.CancelledError:
                break
            except Exception:
                yield f"data: {json.dumps({'type': 'ping'})}\n\n"

        yield "data: [FEED_CLOSED]\n\n"

    return StreamingResponse(
        live_events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
