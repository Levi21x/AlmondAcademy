from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.clinical.case_generator import SPECIALTIES, generate_clinical_case
from app.services.clinical.evaluator import conduct_viva_question, evaluate_case_sheet
from app.services.clinical.patient_sim import reveal_examination_findings, simulate_patient_response

router = APIRouter(prefix="/api/v1/clinical", tags=["clinical"])

ClinicalStatus = Literal[
    "history_taking", "examination", "case_sheet", "submitted", "evaluated", "viva", "completed"
]


# ── Request models ─────────────────────────────────────────────────────────────

class GenerateCaseRequest(BaseModel):
    specialty: str = Field(default="General Medicine")
    difficulty: Literal["basic", "intermediate", "advanced"] = "basic"
    custom_instruction: str = ""


class StartSessionRequest(BaseModel):
    case_id: str


class PatientRespondRequest(BaseModel):
    student_message: str = Field(min_length=1, max_length=1000)


class ExamineRequest(BaseModel):
    system: str = Field(min_length=1, max_length=100)


class SubmitCaseSheetRequest(BaseModel):
    case_sheet: Dict[str, Any]


class VivaAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=2000)
    question_index: int = Field(ge=0)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _get_session(client, session_id: str, user_id: str) -> Dict[str, Any]:
    rows = (
        client.table("clinical_sessions")
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
            detail={"error": True, "message": "Session not found", "code": "CLINICAL_SESSION_NOT_FOUND"},
        )
    return rows[0]


def _get_case(client, case_id: str) -> Dict[str, Any]:
    rows = (
        client.table("clinical_cases")
        .select("*")
        .eq("id", case_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Case not found", "code": "CLINICAL_CASE_NOT_FOUND"},
        )
    return rows[0]


def _update_session(client, session_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updated = (
        client.table("clinical_sessions")
        .update(updates)
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not updated.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to update session", "code": "CLINICAL_SESSION_UPDATE_FAILED"},
        )
    return updated.data[0]


def _safe_public_session(session: Dict[str, Any], case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return session with case info.
    Includes examination_findings for already-revealed systems (needed for frontend restore).
    Strips hidden_findings to prevent premature diagnosis reveal.
    """
    status = session.get("status", "history_taking")
    is_post_submit = status in ("evaluated", "viva", "completed")
    is_viva_active = status in ("viva", "completed")

    # Reconstruct only the already-revealed examination findings
    revealed_systems: List[str] = list(session.get("revealed_systems") or [])
    examination_findings: Dict[str, str] = {}
    if revealed_systems:
        hidden_exam = (case.get("hidden_findings") or {}).get("examination", {})
        for sys_key in revealed_systems:
            finding = hidden_exam.get(sys_key)
            if finding:
                examination_findings[sys_key] = str(finding)

    return {
        **session,
        "case": {
            "id": case["id"],
            "specialty": case["specialty"],
            "difficulty": case["difficulty"],
            "patient_profile": case["patient_profile"],
            "diagnosis": case["diagnosis"] if is_post_submit else None,
            "differentials": case["differentials"] if is_post_submit else None,
            # Return viva questions only when in viva/completed so frontend can restore question index
            "viva_questions": case.get("viva_questions") if is_viva_active else None,
        },
        # Piggyback revealed findings so frontend restores examination tab without extra API calls
        "examination_findings": examination_findings,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/specialties")
def list_specialties():
    """Returns the list of available specialties."""
    return _success(SPECIALTIES)


@router.get("/cases")
def list_cases(
    specialty: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    user=Depends(require_auth),
):
    """Browse the seeded case library with optional filters."""
    _ = user
    client = get_supabase_admin_client()
    query = client.table("clinical_cases").select(
        "id,specialty,difficulty,diagnosis,tags,created_at,"
        "patient_profile->age,patient_profile->sex,patient_profile->presenting_complaint"
    )
    if specialty:
        query = query.eq("specialty", specialty)
    if difficulty:
        query = query.eq("difficulty", difficulty)

    rows = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute().data or []
    return _success(rows)


@router.post("/cases/generate")
async def generate_case(payload: GenerateCaseRequest, user=Depends(require_auth)):
    """AI-generates a new clinical case and persists it to the library."""
    _ = user
    client = get_supabase_admin_client()
    try:
        case_data = await generate_clinical_case(
            specialty=payload.specialty,
            difficulty=payload.difficulty,
            custom_instruction=payload.custom_instruction,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": str(exc), "code": "CLINICAL_CASE_GENERATION_FAILED"},
        )

    inserted = client.table("clinical_cases").insert(case_data).execute()
    if not inserted.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to persist case", "code": "CLINICAL_CASE_PERSIST_FAILED"},
        )
    return _success(inserted.data[0])


@router.post("/sessions")
def start_session(payload: StartSessionRequest, user=Depends(require_auth)):
    """Start a new clinical session for a given case."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    case = _get_case(client, payload.case_id)

    inserted = (
        client.table("clinical_sessions")
        .insert(
            {
                "user_id": user_id,
                "case_id": payload.case_id,
                "status": "history_taking",
                "conversation": [],
                "case_sheet": {},
                "viva_log": [],
                "revealed_systems": [],
            }
        )
        .execute()
    )
    if not inserted.data:
        raise HTTPException(
            status_code=500,
            detail={"error": True, "message": "Failed to create session", "code": "CLINICAL_SESSION_CREATE_FAILED"},
        )

    session = inserted.data[0]
    return _success(_safe_public_session(session, case))


@router.get("/sessions")
def list_sessions(user=Depends(require_auth)):
    """Lists the user's clinical sessions."""
    client = get_supabase_admin_client()
    rows = (
        client.table("clinical_sessions")
        .select("id,case_id,status,score,created_at,completed_at")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(20)
        .execute()
        .data
        or []
    )
    return _success(rows)


@router.get("/sessions/{session_id}")
def get_session_endpoint(session_id: str, user=Depends(require_auth)):
    """Returns a full session, including case details (excluding hidden_findings if still active)."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]
    session = _get_session(client, session_id, user_id)
    case = _get_case(client, session["case_id"])
    return _success(_safe_public_session(session, case))


@router.post("/sessions/{session_id}/respond")
async def patient_respond(session_id: str, payload: PatientRespondRequest, user=Depends(require_auth)):
    """
    Student sends a history-taking question; the AI patient responds (streamed SSE).
    Saves both turns to session.conversation after streaming.
    """
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    session = _get_session(client, session_id, user_id)
    if session["status"] not in ("history_taking",):
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Session is not in history-taking phase", "code": "CLINICAL_WRONG_STATUS"},
        )

    case = _get_case(client, session["case_id"])
    conversation: List[Dict[str, Any]] = list(session.get("conversation") or [])
    collected: List[str] = []

    async def event_stream():
        nonlocal collected
        try:
            async for chunk in simulate_patient_response(
                student_question=payload.student_message,
                patient_profile=case["patient_profile"],
                hidden_findings=case["hidden_findings"],
                conversation=conversation,
                revealed_findings=list(session.get("revealed_systems") or []),
            ):
                collected.append(chunk)
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception:
            err_chunk = "I'm not sure how to answer that."
            collected.append(err_chunk)
            yield f"data: {json.dumps(err_chunk)}\n\n"
        finally:
            yield "data: [CLINICAL_STREAM_END]\n\n"
            full_response = "".join(collected)
            if full_response:
                new_conv = conversation + [
                    {"role": "student", "content": payload.student_message},
                    {"role": "patient", "content": full_response},
                ]
                try:
                    _update_session(client, session_id, user_id, {"conversation": new_conv})
                except Exception:
                    pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/sessions/{session_id}/examine")
def request_examination(session_id: str, payload: ExamineRequest, user=Depends(require_auth)):
    """
    Student requests a system examination; reveals findings for that system.
    Advances status to 'examination' on first examine call.
    """
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    session = _get_session(client, session_id, user_id)
    if session["status"] not in ("history_taking", "examination"):
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Examination not available in current status", "code": "CLINICAL_WRONG_STATUS"},
        )

    case = _get_case(client, session["case_id"])
    result = reveal_examination_findings(payload.system, case["hidden_findings"])

    revealed_systems = list(session.get("revealed_systems") or [])
    if result["key_used"] not in revealed_systems:
        revealed_systems.append(result["key_used"])

    updates: Dict[str, Any] = {
        "revealed_systems": revealed_systems,
        "status": "examination",
    }
    _update_session(client, session_id, user_id, updates)

    return _success(result)


@router.post("/sessions/{session_id}/submit")
async def submit_case_sheet(session_id: str, payload: SubmitCaseSheetRequest, user=Depends(require_auth)):
    """Student submits their completed case sheet; saves it and advances to submitted status."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    session = _get_session(client, session_id, user_id)
    if session["status"] not in ("history_taking", "examination", "case_sheet"):
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Cannot submit from current status", "code": "CLINICAL_WRONG_STATUS"},
        )

    _update_session(client, session_id, user_id, {
        "case_sheet": payload.case_sheet,
        "status": "submitted",
    })

    # Trigger evaluation immediately (not async queued — keep it simple)
    case = _get_case(client, session["case_id"])
    try:
        evaluation = await evaluate_case_sheet(
            case_sheet=payload.case_sheet,
            patient_profile=case["patient_profile"],
            hidden_findings=case["hidden_findings"],
            correct_diagnosis=case["diagnosis"],
            differentials=list(case.get("differentials") or []),
            conversation=list(session.get("conversation") or []),
        )
        score = int(evaluation.get("total_score", 0))
        _update_session(client, session_id, user_id, {
            "evaluation": evaluation,
            "score": score,
            "status": "evaluated",
        })
    except Exception as exc:
        _update_session(client, session_id, user_id, {"evaluation": {"_error": str(exc)}, "status": "evaluated"})

    # Return updated session with full case (now revealed)
    updated_session = _get_session(client, session_id, user_id)
    return _success(_safe_public_session(updated_session, case))


@router.get("/sessions/{session_id}/evaluate")
def get_evaluation(session_id: str, user=Depends(require_auth)):
    """Returns the stored AI evaluation for a session."""
    client = get_supabase_admin_client()
    session = _get_session(client, session_id, user["user_id"])
    if session["status"] not in ("evaluated", "viva", "completed"):
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Evaluation not yet available", "code": "CLINICAL_NOT_EVALUATED"},
        )
    return _success({
        "evaluation": session.get("evaluation"),
        "score": session.get("score"),
        "status": session["status"],
    })


@router.post("/sessions/{session_id}/viva")
def start_viva(session_id: str, user=Depends(require_auth)):
    """Starts the viva phase and returns the first question."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    session = _get_session(client, session_id, user_id)
    if session["status"] not in ("evaluated", "viva"):
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Session must be evaluated before viva", "code": "CLINICAL_NOT_EVALUATED"},
        )

    case = _get_case(client, session["case_id"])
    viva_questions: List[Dict[str, Any]] = list(case.get("viva_questions") or [])

    if not viva_questions:
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "No viva questions for this case", "code": "CLINICAL_NO_VIVA"},
        )

    _update_session(client, session_id, user_id, {"status": "viva"})

    return _success({
        "question_index": 0,
        "question": viva_questions[0]["question"],
        "total_questions": len(viva_questions),
    })


@router.post("/sessions/{session_id}/viva/answer")
async def answer_viva(session_id: str, payload: VivaAnswerRequest, user=Depends(require_auth)):
    """Student answers a viva question; evaluates the answer and returns the next question."""
    client = get_supabase_admin_client()
    user_id = user["user_id"]

    session = _get_session(client, session_id, user_id)
    if session["status"] != "viva":
        raise HTTPException(
            status_code=400,
            detail={"error": True, "message": "Session is not in viva mode", "code": "CLINICAL_WRONG_STATUS"},
        )

    case = _get_case(client, session["case_id"])
    viva_questions: List[Dict[str, Any]] = list(case.get("viva_questions") or [])
    viva_log: List[Dict[str, Any]] = list(session.get("viva_log") or [])

    result = await conduct_viva_question(
        viva_questions=viva_questions,
        viva_log=viva_log,
        student_answer=payload.answer,
        question_index=payload.question_index,
    )

    # Append to viva log
    viva_log.append({
        "question_index": payload.question_index,
        "question": viva_questions[payload.question_index]["question"] if payload.question_index < len(viva_questions) else "",
        "student_answer": payload.answer,
        "evaluation": result,
    })

    updates: Dict[str, Any] = {"viva_log": viva_log}
    if result.get("completed"):
        # Compute viva score
        viva_scores = [
            entry["evaluation"].get("score", 0)
            for entry in viva_log
            if isinstance(entry.get("evaluation"), dict)
        ]
        viva_max = [
            entry["evaluation"].get("max_score", 10)
            for entry in viva_log
            if isinstance(entry.get("evaluation"), dict)
        ]
        viva_pct = (
            int(round(sum(viva_scores) / max(sum(viva_max), 1) * 100))
            if viva_max
            else 0
        )
        updates["status"] = "completed"
        updates["completed_at"] = datetime.now(timezone.utc).isoformat()
        # Blend case sheet score with viva score (70/30 split)
        case_score = int(session.get("score") or 0)
        blended = int(round(case_score * 0.7 + viva_pct * 0.3))
        updates["score"] = blended

    _update_session(client, session_id, user_id, updates)
    return _success(result)
