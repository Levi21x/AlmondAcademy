from __future__ import annotations
import json
import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator

from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS
from app.services.llm.model_router import route_model
from app.services.rag.pipeline import AlmondRAGPipeline
from app.services.search.tavily_service import TavilySearchService
from app.services.streak_service import StreakService
from app.core.database import get_supabase_admin_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/doubt-solver", tags=["doubt-solver"])
rag_pipeline = AlmondRAGPipeline()
streak_service = StreakService()
tavily_service = TavilySearchService()

GEMINI_DAILY_LIMIT = 20
CLAUDE_DAILY_LIMIT = 10
PREMIUM_SESSION_LIMIT = 15
PREMIUM_DASHBOARD_SOURCE = "dashboard_quick_session"
SYLLABUS_UPDATE_MARKER_PREFIX = "[SYLLABUS_UPDATED:"
SYLLABUS_UPDATE_MARKER_SUFFIX = "]"
MIN_SESSION_MESSAGES_FOR_PROGRESS = 6
MASTERY_SIGNAL_PATTERNS = [
    r"\bunderstand(?:ing)?\b",
    r"\bgot\s+it\b",
    r"\bclear\s+now\b",
    r"\bthat\s+makes\s+sense\b",
    r"\bready\s+for\s+(?:mcq|practice|questions?)\b",
]

# Agentic in-chat actions: the tutor may emit [ACTION:...] markers the app turns into
# confirm-chips. Markers are filtered out of the visible stream and validated server-side
# before any action event is emitted. See _ActionMarkerStreamFilter / _validate_action_markers.
ACTION_MARKER_SENTINEL = "[ACTION:"
ACTION_MARKER_RE = re.compile(r"\[ACTION:([a-zA-Z_]+)(?::([^\]]*))?\]")
ACTION_EVENT_PREFIX = "[ALMOND_ACTION:"
ALLOWED_VISUAL_TYPES = {"flowchart", "mind_map", "decision_tree"}


class _ActionMarkerStreamFilter:
    """Withholds any text that could be part of an ``[ACTION:...]`` marker so markers
    never reach the user, while emitting all other text as soon as it is provably safe.

    ``feed()`` returns the safe-to-display text for a chunk; complete markers are collected
    in ``captured``. ``flush()`` returns any trailing safe text at end of stream (an
    incomplete marker prefix is dropped).
    """

    def __init__(self) -> None:
        self._buffer = ""
        self.captured: List[str] = []

    def feed(self, chunk: str) -> str:
        self._buffer += chunk
        emit: List[str] = []

        while self._buffer:
            idx = self._buffer.find("[")
            if idx == -1:
                emit.append(self._buffer)
                self._buffer = ""
                break

            if idx > 0:
                emit.append(self._buffer[:idx])
                self._buffer = self._buffer[idx:]

            # self._buffer now starts with '['
            if len(self._buffer) < len(ACTION_MARKER_SENTINEL):
                # Not enough chars to decide — withhold only if still a viable prefix.
                if ACTION_MARKER_SENTINEL.startswith(self._buffer):
                    break
                emit.append("[")
                self._buffer = self._buffer[1:]
                continue

            if self._buffer.startswith(ACTION_MARKER_SENTINEL):
                close = self._buffer.find("]")
                if close == -1:
                    break  # marker not yet complete — withhold
                self.captured.append(self._buffer[: close + 1])
                self._buffer = self._buffer[close + 1 :]
                continue

            # '[' not starting a marker — emit it and keep scanning.
            emit.append("[")
            self._buffer = self._buffer[1:]

        return "".join(emit)

    def flush(self) -> str:
        remaining = self._buffer
        self._buffer = ""
        # A leftover that is (a prefix of) the sentinel is an incomplete marker → drop it.
        if remaining.startswith(ACTION_MARKER_SENTINEL) or ACTION_MARKER_SENTINEL.startswith(remaining):
            return ""
        return remaining


def _validate_action_markers(client, markers: List[str], fallback_subject: Optional[str]) -> List[Dict[str, Any]]:
    """Parse captured ``[ACTION:...]`` markers into validated, de-duplicated action dicts.

    Markers that reference an unknown verb, subject, or topic are dropped — so a free
    model that hallucinates an action simply produces no chip. Capped at 2 suggestions.
    """
    actions: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for raw in markers:
        match = ACTION_MARKER_RE.search(raw)
        if not match:
            continue
        verb = (match.group(1) or "").strip().lower()
        arg = (match.group(2) or "").strip()
        action: Optional[Dict[str, Any]] = None

        if verb == "replan":
            action = {"type": "replan", "label": "Replan my schedule"}

        elif verb == "mcq":
            subject = (arg or (fallback_subject or "")).strip()
            if subject:
                rows = client.table("syllabus_subjects").select("name").ilike("name", subject).limit(1).execute().data or []
                if rows:
                    canonical = str(rows[0].get("name") or subject)
                    action = {"type": "mcq", "subject": canonical, "label": f"Practice {canonical} MCQs"}

        elif verb == "mark_done":
            if arg:
                rows = client.table("syllabus_topics").select("id,name").ilike("name", f"%{arg}%").limit(1).execute().data or []
                if rows:
                    canonical = str(rows[0].get("name") or arg)
                    action = {"type": "mark_done", "topic": canonical, "topic_id": rows[0].get("id"), "label": f"Mark '{canonical}' complete"}

        elif verb == "visual":
            parts = [p.strip() for p in arg.split(":", 1)]
            vtype = parts[0].lower() if parts and parts[0] else ""
            vtopic = parts[1].strip() if len(parts) > 1 else ""
            if vtype in ALLOWED_VISUAL_TYPES and vtopic:
                action = {"type": "visual", "visual_type": vtype, "topic": vtopic, "label": f"Visualise {vtopic}"}

        if not action:
            continue
        key = json.dumps(action, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        actions.append(action)

    return actions[:2]

ModelChoice = Literal["auto", "openai", "groq", "gemini", "claude"]

DETAILED_MODEL_SIGNALS = (
    "explain",
    "why",
    "how does",
    "mechanism",
    "understand",
    "detail",
    "deep",
    "[deep explain]",
    "clinical",
    "compare",
    "difference between",
)

FAST_LOOKUP_SIGNALS = (
    "what is",
    "define",
    "list",
    "name",
    "which",
    "when",
    "where",
)

STUCK_SIGNALS = (
    "i don't understand",
    "i dont understand",
    "explain again",
    "simpler",
    "simple words",
)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    subject: Optional[str] = None
    mode: Optional[str] = None
    session_id: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    stream: bool = True
    model: ModelChoice = "auto"
    search_enabled: bool = False
    source: Optional[str] = None
    quick_mode: bool = False

    @field_validator("conversation_history")
    @classmethod
    def cap_history(cls, value: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return value[-10:]


def _success(data: Dict[str, Any]) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _conversation_user_text(conversation_history: List[Dict[str, Any]]) -> str:
    user_content: List[str] = []
    for turn in conversation_history:
        if str(turn.get("role") or "").lower() != "user":
            continue
        user_content.append(str(turn.get("content") or ""))
    return " ".join(user_content).lower()


def select_model(
    question: str,
    conversation_history: List[Dict[str, Any]],
    mode: str = "auto",
    is_premium: bool = False,
    student_category: str = "sprinter",
) -> str:
    return route_model(
        question=question,
        mode=mode,
        is_premium=is_premium,
        conversation_length=len(conversation_history or []),
        student_category=student_category,
    ).value


def _check_limit(service: AuthService, user_id: str) -> JSONResponse | None:
    settings = get_settings()
    llm_provider = (settings.llm_provider or "").lower()
    is_unlimited = llm_provider == "groq"

    usage = service.ensure_daily_usage(user_id)
    subscription = service.get_active_subscription(user_id)
    plan_type = (subscription or {}).get("plan_type", "free")
    is_premium = plan_type != "free"
    questions_asked = int(usage.get("questions_asked", 0))

    if not is_unlimited:
        if not is_premium and questions_asked >= 15:
            return JSONResponse(
                status_code=429,
                content={
                    "error": True,
                    "message": "Daily limit reached. Upgrade for unlimited access.",
                    "code": "DAILY_LIMIT_REACHED",
                },
            )

    return None


def _check_model_limit(client, user_id: str, model: str) -> JSONResponse | None:
    """Check per-model daily limits for Gemini and Claude."""
    if model not in {"gemini", "claude"}:
        return None

    limit = GEMINI_DAILY_LIMIT if model == "gemini" else CLAUDE_DAILY_LIMIT
    activity_type = "question_asked"
    today = datetime.now(timezone.utc).date().isoformat()

    try:
        result = (
            client.table("study_activity")
            .select("id")
            .eq("user_id", user_id)
            .eq("activity_type", activity_type)
            .gte("created_at", f"{today}T00:00:00+00:00")
            .execute()
        )
        count = len(result.data or [])
    except Exception:
        count = 0

    if count >= limit:
        message = (
            "You have reached today's detailed-response limit. Continue in standard tutor mode."
            if model == "gemini"
            else "You have reached today's Claude usage limit."
        )
        return JSONResponse(
            status_code=429,
            content={
                "error": True,
                "message": message,
                "code": f"{model.upper()}_DAILY_LIMIT_REACHED",
            },
        )
    return None


def _premium_status_payload(premium_sessions_used: int) -> Dict[str, Any]:
    remaining = max(PREMIUM_SESSION_LIMIT - premium_sessions_used, 0)
    return {
        "premium_sessions_used": premium_sessions_used,
        "premium_sessions_limit": PREMIUM_SESSION_LIMIT,
        "premium_sessions_remaining": remaining,
        "can_use_premium_session": remaining > 0,
    }


def _consume_dashboard_premium_session(service: AuthService, user_id: str) -> JSONResponse | None:
    usage = service.ensure_daily_usage(user_id)
    premium_sessions_used = int(usage.get("premium_sessions_used") or 0)

    if premium_sessions_used >= PREMIUM_SESSION_LIMIT:
        return JSONResponse(
            status_code=429,
            content={
                "error": True,
                "code": "PREMIUM_SESSION_LIMIT",
                "message": (
                    "You have used your 15 free high-yield sessions today. "
                    "Upgrade to Premium for unlimited access."
                ),
            },
        )

    service.client.table("daily_usage").update({"premium_sessions_used": premium_sessions_used + 1}).eq("id", usage["id"]).execute()
    return None


def _is_dashboard_premium_claude_request(payload: AskRequest) -> bool:
    return payload.model == "claude" and (payload.source or "").strip().lower() == PREMIUM_DASHBOARD_SOURCE


def _log_model_activity(client, user_id: str, model: str, session_id: str | None = None) -> None:
    """Log Gemini/Claude query to study_activity for daily limit tracking."""
    if model == "groq":
        return
    try:
        client.table("study_activity").insert(
            {
                "user_id": user_id,
                "activity_type": "question_asked",
                "session_id": session_id,
            }
        ).execute()
    except Exception as exc:
        logger.warning(f"Failed to log model activity (non-critical): {exc}")


def _create_session(client, user_id: str, subject: str | None, mode: str | None) -> str:
    created = (
        client.table("chat_sessions")
        .insert(
            {
                "user_id": user_id,
                "title": "New Conversation",
                "subject": subject,
                "mode": mode,
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to create chat session", "code": "CHAT_SESSION_CREATE_FAILED"})
    return str(created.data[0]["id"])


def _save_message(client, session_id: str, user_id: str, role: str, content: str) -> None:
    client.table("chat_messages").insert(
        {"session_id": session_id, "user_id": user_id, "role": role, "content": content}
    ).execute()
    now_iso = datetime.now(timezone.utc).isoformat()
    client.table("chat_sessions").update({"last_message_at": now_iso, "updated_at": now_iso}).eq("id", session_id).eq("user_id", user_id).execute()

    if role == "user":
        try:
            asyncio.create_task(_generate_and_set_session_title(session_id=session_id, user_id=user_id, first_user_message=content))
        except Exception:
            logger.exception("Failed to queue autogenerated session title")


def _session_message_count(client, session_id: str, user_id: str) -> int:
    try:
        rows = (
            client.table("chat_messages")
            .select("id")
            .eq("session_id", session_id)
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        return len(rows)
    except Exception:
        logger.exception("Failed to count session messages")
        return 0


def _extract_topic_candidate(question: str) -> str | None:
    text = (question or "").strip()
    if not text:
        return None

    explain_pattern = re.compile(r"(?:explain|teach|revise|help\s+me\s+with)\s+(.+?)(?:\s+for\s+my|\?|$)", re.IGNORECASE)
    explain_match = explain_pattern.search(text)
    if explain_match and explain_match.group(1):
        return explain_match.group(1).strip()[:120]

    normalized = re.sub(r"\s+", " ", text).strip(" .,!?")
    if 3 <= len(normalized) <= 120:
        return normalized
    return None


def _has_mastery_signal(assistant_answer: str) -> bool:
    content = (assistant_answer or "").lower()
    if not content:
        return False
    return any(re.search(pattern, content) for pattern in MASTERY_SIGNAL_PATTERNS)


def _mark_topic_in_progress_if_needed(
    client,
    user_id: str,
    subject_name: str | None,
    topic_name: str | None,
    session_id: str,
) -> str | None:
    if not topic_name:
        return None

    subject_id = None
    if subject_name:
        subject_rows = (
            client.table("syllabus_subjects")
            .select("id,name")
            .ilike("name", subject_name)
            .limit(1)
            .execute()
            .data
            or []
        )
        if subject_rows:
            subject_id = subject_rows[0].get("id")

    topic_query = client.table("syllabus_topics").select("id,name,subject_id")
    if subject_id:
        topic_query = topic_query.eq("subject_id", subject_id)
    topic_rows = topic_query.ilike("name", f"%{topic_name}%").limit(1).execute().data or []
    if not topic_rows:
        return None

    topic = topic_rows[0]
    topic_id = topic["id"]
    canonical_topic_name = str(topic.get("name") or topic_name)

    existing_rows = (
        client.table("student_topic_progress")
        .select("id,status")
        .eq("user_id", user_id)
        .eq("topic_id", topic_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if existing_rows:
        existing = existing_rows[0]
        if existing.get("status") in {"in_progress", "completed"}:
            return None
        (
            client.table("student_topic_progress")
            .update({"status": "in_progress", "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", existing["id"])
            .execute()
        )
    else:
        (
            client.table("student_topic_progress")
            .insert({"user_id": user_id, "topic_id": topic_id, "status": "in_progress"})
            .execute()
        )

    try:
        streak_service.log_activity(
            user_id=user_id,
            activity_type="topic_started",
            subject=subject_name,
            topic_name=canonical_topic_name,
            session_id=session_id,
            metadata={"source": "ai_tutor_auto_progress"},
        )
    except Exception:
        logger.exception("Failed to log topic_started activity for auto-progress")

    return canonical_topic_name


def _maybe_apply_tutor_auto_progress(
    client,
    user_id: str,
    subject_name: str | None,
    question: str,
    assistant_answer: str,
    session_id: str,
) -> str | None:
    if not _has_mastery_signal(assistant_answer):
        return None

    total_messages = _session_message_count(client=client, session_id=session_id, user_id=user_id)
    if total_messages < MIN_SESSION_MESSAGES_FOR_PROGRESS:
        return None

    topic_name = _extract_topic_candidate(question)
    if not topic_name:
        return None

    try:
        return _mark_topic_in_progress_if_needed(
            client=client,
            user_id=user_id,
            subject_name=subject_name,
            topic_name=topic_name,
            session_id=session_id,
        )
    except Exception:
        logger.exception("Failed to auto-update topic progress from tutor session")
        return None


async def _generate_and_set_session_title(session_id: str, user_id: str, first_user_message: str) -> None:
    try:
        client = get_supabase_admin_client()
        session_result = client.table("chat_sessions").select("title").eq("id", session_id).eq("user_id", user_id).limit(1).execute()
        current_title = (session_result.data or [{}])[0].get("title")
        if current_title and current_title != "New Conversation":
            return

        prompt = (
            "Generate a short conversation title from this first user message. "
            "Rules: 3-6 words, no quotes, no punctuation at the end, title case, medically relevant if possible.\n\n"
            f"User message: {first_user_message.strip()}"
        )
        system_prompt = "You create concise chat titles. Return only the title text."

        try:
            llm = OpenRouterLLMClient(OPENROUTER_MODELS["fast"])
            generated = (await llm.generate_sync(prompt=prompt, system_prompt=system_prompt)).strip()
            lines = generated.splitlines()
            title = (lines[0].strip() if lines else "")[:80]
        except Exception:
            logger.exception("AI title generation failed, using fallback title")
            title = ""

        if not title:
            title = (first_user_message.strip()[:50] or "New Conversation")

        client.table("chat_sessions").update({"title": title}).eq("id", session_id).eq("user_id", user_id).execute()
    except Exception:
        logger.exception("Failed to set autogenerated session title")


@router.post("/ask")
async def ask_question(
    payload: AskRequest,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
):
    profile = service.get_profile(user["user_id"])
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": True,
                "message": "Profile not found",
                "code": "PROFILE_NOT_FOUND",
                "details": {},
            },
        )

    limit_response = _check_limit(service=service, user_id=user["user_id"])
    if limit_response is not None:
        return limit_response

    client = get_supabase_admin_client()

    student_category = profile.get("student_category") or "sprinter"
    teaching_style = profile.get("teaching_style") or "conversational"
    mode = payload.mode or profile.get("mode")

    subscription = service.get_active_subscription(user["user_id"])
    is_premium = (subscription or {}).get("plan_type", "free") != "free"
    model = payload.model or "auto"

    memory_context = ""
    try:
        memory_context = rag_pipeline.memory_service.get_memory_context(
            user_id=user["user_id"],
            current_question=payload.question,
            subject=payload.subject,
        )
    except Exception:
        memory_context = ""

    resolved_model = select_model(
        question=payload.question,
        conversation_history=payload.conversation_history,
        mode=model,
        is_premium=is_premium,
        student_category=student_category,
    )

    is_dashboard_premium_session = _is_dashboard_premium_claude_request(payload)
    if is_dashboard_premium_session:
        premium_limit_response = _consume_dashboard_premium_session(service=service, user_id=user["user_id"])
        if premium_limit_response is not None:
            return premium_limit_response

    if not is_dashboard_premium_session:
        model_limit_response = _check_model_limit(client=client, user_id=user["user_id"], model=resolved_model)
        if model_limit_response is not None:
            if model == "auto" and resolved_model == "gemini":
                model = "openai"
                resolved_model = "openai"
            else:
                return model_limit_response

    session_id = payload.session_id or _create_session(client=client, user_id=user["user_id"], subject=payload.subject, mode=mode)

    # Run Tavily search if requested
    web_search_context = ""
    if payload.search_enabled:
        try:
            loop = asyncio.get_running_loop()
            web_search_context = await loop.run_in_executor(
                None, lambda: tavily_service.search(payload.question)
            )
        except Exception:
            logger.exception("Tavily search error — continuing without web context")
            web_search_context = ""

    if payload.stream:
        async def event_stream() -> AsyncGenerator[str, None]:
            assistant_buffer: List[str] = []
            completed = False
            syllabus_update_topic: str | None = None
            action_filter = _ActionMarkerStreamFilter()
            try:
                yield f"data: [SESSION_ID:{session_id}]\n\n"
                async for chunk in rag_pipeline.process_question(
                    user_id=user["user_id"],
                    question=payload.question,
                    student_category=student_category,
                    teaching_style=teaching_style,
                    conversation_history=payload.conversation_history,
                    subject_filter=payload.subject,
                    stream=True,
                    model=model,
                    is_premium=is_premium,
                    memory_context=memory_context,
                    web_search_context=web_search_context,
                    quick_mode=payload.quick_mode,
                ):
                    safe_text = action_filter.feed(str(chunk))
                    if safe_text:
                        assistant_buffer.append(safe_text)
                        yield f"data: {json.dumps(safe_text)}\n\n"

                tail = action_filter.flush()
                if tail:
                    assistant_buffer.append(tail)
                    yield f"data: {json.dumps(tail)}\n\n"
                completed = True

                full_assistant_response = "".join(assistant_buffer)
                syllabus_update_topic = _maybe_apply_tutor_auto_progress(
                    client=client,
                    user_id=user["user_id"],
                    subject_name=payload.subject,
                    question=payload.question,
                    assistant_answer=full_assistant_response,
                    session_id=session_id,
                )
                if syllabus_update_topic:
                    marker = f"{SYLLABUS_UPDATE_MARKER_PREFIX}{syllabus_update_topic}{SYLLABUS_UPDATE_MARKER_SUFFIX}"
                    yield f"data: {json.dumps(marker)}\n\n"

                if action_filter.captured:
                    try:
                        suggested_actions = _validate_action_markers(client, action_filter.captured, payload.subject)
                    except Exception:
                        logger.exception("Failed to validate tutor action markers")
                        suggested_actions = []
                    for suggested_action in suggested_actions:
                        action_payload = ACTION_EVENT_PREFIX + json.dumps(suggested_action, separators=(",", ":")) + "]"
                        yield f"data: {json.dumps(action_payload)}\n\n"

                yield "data: [ALMOND_STREAM_END]\n\n"
            except ValueError as exc:
                logger.exception("Configuration error while generating streamed response")
                yield f"data: Configuration error: {str(exc)}\n\n"
                yield "data: [ALMOND_STREAM_END]\n\n"
            except Exception:
                logger.exception("Failed to stream doubt solver response")
                yield "data: AlmondAI could not process your request right now due to a temporary network issue.\n\n"
                yield "data: [ALMOND_STREAM_END]\n\n"
            finally:
                if completed:
                    try:
                        _save_message(client=client, session_id=session_id, user_id=user["user_id"], role="user", content=payload.question)
                        _save_message(
                            client=client,
                            session_id=session_id,
                            user_id=user["user_id"],
                            role="assistant",
                            content="".join(assistant_buffer),
                        )
                    except Exception:
                        logger.exception("Failed to persist chat messages")

                    try:
                        service.increment_usage_question(user["user_id"])
                    except Exception:
                        logger.exception("Failed to increment usage after streamed response")

                    try:
                        streak_service.log_activity(
                            user_id=user["user_id"],
                            activity_type="question_asked",
                            subject=payload.subject,
                            session_id=session_id,
                            metadata={"source": "chat", "stream": True},
                        )
                    except Exception:
                        logger.exception("Failed to log question_asked activity")

                    if not is_dashboard_premium_session:
                        _log_model_activity(client=client, user_id=user["user_id"], model=resolved_model, session_id=session_id)

        return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"X-Session-ID": session_id})

    try:
        answer = await rag_pipeline.process_question_sync(
            user_id=user["user_id"],
            question=payload.question,
            student_category=student_category,
            teaching_style=teaching_style,
            conversation_history=payload.conversation_history,
            subject_filter=payload.subject,
            model=model,
            is_premium=is_premium,
            memory_context=memory_context,
            web_search_context=web_search_context,
            quick_mode=payload.quick_mode,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": True,
                "message": str(exc),
                "code": "LLM_CONFIG_ERROR",
                "details": {},
            },
        ) from exc

    _save_message(client=client, session_id=session_id, user_id=user["user_id"], role="user", content=payload.question)
    _save_message(client=client, session_id=session_id, user_id=user["user_id"], role="assistant", content=answer)
    syllabus_update_topic = _maybe_apply_tutor_auto_progress(
        client=client,
        user_id=user["user_id"],
        subject_name=payload.subject,
        question=payload.question,
        assistant_answer=answer,
        session_id=session_id,
    )
    service.increment_usage_question(user["user_id"])
    new_achievements: List[Dict[str, Any]] = []
    try:
        activity_row = streak_service.log_activity(
            user_id=user["user_id"],
            activity_type="question_asked",
            subject=payload.subject,
            session_id=session_id,
            metadata={"source": "chat", "stream": False},
        )
        new_achievements = list(activity_row.get("new_achievements") or [])
    except Exception:
        logger.exception("Failed to log question_asked activity")
    if not is_dashboard_premium_session:
        _log_model_activity(client=client, user_id=user["user_id"], model=resolved_model, session_id=session_id)

    response = JSONResponse(
        content=_success(
            {
                "answer": answer,
                "session_id": session_id,
                "syllabus_update_topic": syllabus_update_topic,
                "new_achievements": new_achievements,
            }
        )
    )
    response.headers["X-Session-ID"] = session_id
    return response


@router.get("/premium-session-status")
def get_premium_session_status(user=Depends(require_auth), service: AuthService = Depends(AuthService)) -> Dict[str, Any]:
    usage = service.ensure_daily_usage(user["user_id"])
    premium_sessions_used = int(usage.get("premium_sessions_used") or 0)
    return _success(_premium_status_payload(premium_sessions_used=premium_sessions_used))


@router.get("/status")
def get_doubt_solver_status(
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> Dict[str, Any]:
    try:
        settings = get_settings()
        llm_provider = (settings.llm_provider or "").lower()
        is_unlimited = llm_provider == "groq"

        usage = service.ensure_daily_usage(user["user_id"])
        subscription = service.get_active_subscription(user["user_id"])
        is_premium = (subscription or {}).get("plan_type", "free") != "free"
        questions_asked = int(usage.get("questions_asked", 0))
        if is_unlimited:
            return {
                "success": True,
                "data": {
                    "questions_asked_today": questions_asked,
                    "daily_limit": None,
                    "is_premium": True,
                    "questions_remaining": None,
                    "unlimited": True,
                },
            }

        daily_limit = 15
        questions_remaining = 999999 if is_premium else max(daily_limit - questions_asked, 0)
        return {
            "success": True,
            "data": {
                "questions_asked_today": questions_asked,
                "daily_limit": daily_limit,
                "is_premium": is_premium,
                "questions_remaining": questions_remaining,
                "unlimited": False,
            },
        }
    except Exception:
        return {
            "success": True,
            "data": {
                "questions_asked_today": 0,
                "daily_limit": None,
                "is_premium": True,
                "questions_remaining": None,
                "unlimited": True,
            },
        }
