from __future__ import annotations

import asyncio
import base64
import json
import time
import uuid
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.middleware.auth_middleware import require_auth, verify_access_token
from app.services.achievements_service import achievements_service
from app.services.auth_service import AuthService
from app.services.streak_service import StreakService
from app.services.voice.voice_pipeline import VoicePipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])

# Lazy singleton — instantiated on first request, not at import time
_pipeline: VoicePipeline | None = None


def get_pipeline() -> VoicePipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = VoicePipeline()
    return _pipeline


streak_service = StreakService()


class VoiceAskRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=2000)
    subject: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    session_id: Optional[str] = None


class VoiceAskResponse(BaseModel):
    text_response: str
    session_id: str


def _success(data: Dict[str, Any]) -> Dict[str, Any]:
    return {"success": True, "data": data}


# ---------------------------------------------------------------------------
# Health check — lets the frontend verify all three providers are configured
# ---------------------------------------------------------------------------

@router.get("/health")
async def voice_health(user=Depends(require_auth)) -> Dict[str, Any]:
    settings = get_settings()
    return _success({
        "sarvam": bool(settings.sarvam_api_key),
        "groq": bool(settings.groq_api_key),
        "cartesia": bool(settings.cartesia_api_key),
        "sarvam_model": settings.sarvam_model,
        "groq_voice_model": settings.groq_voice_model,
        "cartesia_model": settings.cartesia_model,
    })


# ---------------------------------------------------------------------------
# STT — receive audio blob, return transcript
# ---------------------------------------------------------------------------

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    """Receive recorded audio and return a Sarvam STT transcript."""
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="empty audio file")

        transcript = await get_pipeline().speech_to_text(
            audio_bytes=audio_bytes,
            filename=file.filename or "audio.webm",
            content_type=file.content_type,
        )
        return _success({"transcript": transcript})
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("STT failed")
        raise HTTPException(status_code=500, detail={"error": True, "message": str(exc)}) from exc


# ---------------------------------------------------------------------------
# LLM — receive transcript, return text response
# ---------------------------------------------------------------------------

@router.post("/ask-text")
async def ask_voice_text(
    payload: VoiceAskRequest,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> Dict[str, Any]:
    """Receive transcript, run Groq inference, return text response."""
    try:
        profile = service.get_profile(user["user_id"])
        student_category = profile.get("student_category", "sprinter") if profile else "sprinter"

        session_id = payload.session_id or str(uuid.uuid4())

        text_response = await get_pipeline().get_ai_response(
            transcript=payload.transcript,
            conversation_history=payload.conversation_history,
            subject=payload.subject,
            student_category=student_category,
        )

        merged_achievements: List[Dict[str, Any]] = []
        seen_badges: set[str] = set()

        try:
            activity_row = streak_service.log_activity(
                user_id=user["user_id"],
                activity_type="question_asked",
                subject=payload.subject,
                session_id=session_id,
                metadata={"source": "voice", "transcript_length": len(payload.transcript)},
            )
            for badge in activity_row.get("new_achievements") or []:
                badge_key = badge.get("badge_key")
                if badge_key and badge_key not in seen_badges:
                    merged_achievements.append(badge)
                    seen_badges.add(badge_key)
        except Exception:
            logger.exception("Voice activity logging failed (non-fatal)")

        try:
            voice_achievements = achievements_service.evaluate_and_unlock(
                user_id=user["user_id"],
                trigger="voice_used",
                context={"source": "voice", "event_hour_utc": datetime.now(timezone.utc).hour},
            )
            for badge in voice_achievements:
                badge_key = badge.get("badge_key")
                if badge_key and badge_key not in seen_badges:
                    merged_achievements.append(badge)
                    seen_badges.add(badge_key)
        except Exception:
            logger.exception("Voice achievement evaluation failed (non-fatal)")

        body = VoiceAskResponse(text_response=text_response, session_id=session_id).model_dump()
        body["new_achievements"] = merged_achievements
        return _success(body)

    except Exception as exc:
        logger.exception("Voice ask failed")
        raise HTTPException(status_code=500, detail={"error": True, "message": str(exc)}) from exc


# ---------------------------------------------------------------------------
# TTS — receive text, return MP3 bytes
# ---------------------------------------------------------------------------

@router.post("/speak")
async def speak_text(payload: dict, user=Depends(require_auth)) -> Response:
    """Receive text and return Cartesia MP3 audio bytes."""
    try:
        text = str(payload.get("text", "")).strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        # Hard cap to prevent extremely long TTS requests
        if len(text) > 1000:
            text = text[:1000]

        audio_bytes = await get_pipeline().text_to_speech(text)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Length": str(len(audio_bytes)),
                "Cache-Control": "no-cache",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("TTS failed")
        raise HTTPException(status_code=500, detail={"error": True, "message": str(exc)}) from exc


# ---------------------------------------------------------------------------
# Streaming WebSocket — real-time turn pipeline
#
#   client                                   server
#   ------                                   ------
#   {type:"config", subject, session_id,
#          history:[{role,content}...] }  -->
#   <binary audio frames (one utterance)> -->
#   {type:"audio_end"}                    -->
#                                         <--  {type:"transcript", text}
#                                         <--  {type:"sentence", index, text}
#                                         <--  {type:"audio", index, mime, data(b64)}
#                                              ... (repeats per sentence) ...
#                                         <--  {type:"done", session_id, full_text}
#   {type:"cancel"}  (barge-in)           -->  (server stops sending further audio)
# ---------------------------------------------------------------------------

def _log_voice_turn(user_id: str, subject: Optional[str], session_id: str, transcript_len: int) -> None:
    """Best-effort streak + achievement logging. Never blocks the audio path."""
    try:
        streak_service.log_activity(
            user_id=user_id,
            activity_type="question_asked",
            subject=subject,
            session_id=session_id,
            metadata={"source": "voice", "transcript_length": transcript_len},
        )
    except Exception:
        logger.exception("Voice activity logging failed (non-fatal)")
    try:
        achievements_service.evaluate_and_unlock(
            user_id=user_id,
            trigger="voice_used",
            context={"source": "voice", "event_hour_utc": datetime.now(timezone.utc).hour},
        )
    except Exception:
        logger.exception("Voice achievement evaluation failed (non-fatal)")


@router.websocket("/ws")
async def voice_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    # ---- Auth: token comes as a query param (WS can't set Authorization) ----
    token = websocket.query_params.get("token", "")
    try:
        user = verify_access_token(token)
    except Exception:
        await websocket.send_json({"type": "error", "message": "Authentication failed"})
        await websocket.close(code=1008)
        return

    pipeline = get_pipeline()
    auth_service = AuthService()
    try:
        profile = auth_service.get_profile(user["user_id"])
        student_category = profile.get("student_category", "sprinter") if profile else "sprinter"
    except Exception:
        student_category = "sprinter"

    cancel_event = asyncio.Event()
    current_task: asyncio.Task | None = None
    audio_buf = bytearray()
    cfg: Dict[str, Any] = {"subject": None, "session_id": str(uuid.uuid4()), "history": [], "mime": "audio/wav"}

    async def process_turn(audio_bytes: bytes, conf: Dict[str, Any]) -> None:
        session_id = conf.get("session_id") or str(uuid.uuid4())
        t0 = time.perf_counter()           # audio_end received
        t_stt: float | None = None
        t_first_llm_token: float | None = None
        t_first_sentence: float | None = None
        t_first_audio: float | None = None
        sentence_tts_ms: List[float] = []

        try:
            if cancel_event.is_set():
                return

            transcript = await pipeline.speech_to_text(
                audio_bytes=audio_bytes,
                filename="utterance.wav",
                content_type=conf.get("mime") or "audio/wav",
            )
            t_stt = time.perf_counter()
            transcript = (transcript or "").strip()
            await websocket.send_json({
                "type": "transcript",
                "text": transcript,
                "session_id": session_id,
                "stt_ms": round((t_stt - t0) * 1000),
            })

            if not transcript or cancel_event.is_set():
                await websocket.send_json({"type": "done", "session_id": session_id, "full_text": ""})
                return

            full: List[str] = []
            idx = 0
            async for sentence in pipeline.stream_spoken_sentences(
                transcript=transcript,
                conversation_history=conf.get("history") or [],
                subject=conf.get("subject"),
                student_category=student_category,
            ):
                if cancel_event.is_set():
                    break

                if t_first_sentence is None:
                    t_first_sentence = time.perf_counter()

                full.append(sentence)
                await websocket.send_json({"type": "sentence", "index": idx, "text": sentence})

                t_tts_start = time.perf_counter()
                try:
                    audio = await pipeline.text_to_speech(sentence)
                except Exception:
                    logger.exception("Sentence TTS failed; skipping audio for sentence %d", idx)
                    audio = b""
                t_tts_end = time.perf_counter()
                sentence_tts_ms.append(round((t_tts_end - t_tts_start) * 1000))

                if cancel_event.is_set():
                    break
                if audio:
                    if t_first_audio is None:
                        t_first_audio = time.perf_counter()
                    await websocket.send_json({
                        "type": "audio",
                        "index": idx,
                        "mime": "audio/mpeg",
                        "data": base64.b64encode(audio).decode("ascii"),
                    })
                idx += 1

            t_done = time.perf_counter()

            # Build timing breakdown (all values in ms, rounded)
            timing: Dict[str, Any] = {
                "stt_ms":          round((t_stt - t0) * 1000) if t_stt else None,
                "llm_first_sentence_ms": round((t_first_sentence - t_stt) * 1000) if (t_first_sentence and t_stt) else None,
                "first_tts_ms":    sentence_tts_ms[0] if sentence_tts_ms else None,
                "time_to_first_audio_ms": round((t_first_audio - t0) * 1000) if t_first_audio else None,
                "total_ms":        round((t_done - t0) * 1000),
                "sentence_tts_ms": sentence_tts_ms,
                "audio_bytes":     len(audio_bytes),
            }
            logger.info("Voice turn timing: %s", timing)

            await websocket.send_json({
                "type": "timing",
                "timing": timing,
            })
            await websocket.send_json({
                "type": "done",
                "session_id": session_id,
                "full_text": " ".join(full),
                "cancelled": cancel_event.is_set(),
            })

            # Fire-and-forget logging AFTER audio is delivered (doesn't add latency)
            if not cancel_event.is_set():
                await asyncio.to_thread(
                    _log_voice_turn, user["user_id"], conf.get("subject"), session_id, len(transcript)
                )
        except WebSocketDisconnect:
            raise
        except Exception as exc:
            logger.exception("Voice stream turn failed")
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            # Binary audio frame
            if message.get("bytes") is not None:
                audio_buf.extend(message["bytes"])
                continue

            text = message.get("text")
            if not text:
                continue

            try:
                msg = json.loads(text)
            except Exception:
                continue

            mtype = msg.get("type")

            if mtype == "config":
                cfg = {
                    "subject": msg.get("subject"),
                    "session_id": msg.get("session_id") or str(uuid.uuid4()),
                    "history": msg.get("history") or [],
                    "mime": msg.get("mime") or "audio/wav",
                }
                audio_buf.clear()

            elif mtype == "audio_end":
                # Cancel any in-flight turn (barge-in / rapid re-ask) before starting a new one
                if current_task and not current_task.done():
                    cancel_event.set()
                    try:
                        await current_task
                    except Exception:
                        pass
                cancel_event.clear()

                utterance = bytes(audio_buf)
                audio_buf.clear()
                if len(utterance) < 200:  # too small to be speech
                    await websocket.send_json({"type": "done", "session_id": cfg["session_id"], "full_text": ""})
                    continue
                current_task = asyncio.create_task(process_turn(utterance, dict(cfg)))

            elif mtype == "cancel":
                cancel_event.set()

            elif mtype == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Voice WebSocket error")
    finally:
        cancel_event.set()
        if current_task and not current_task.done():
            try:
                await current_task
            except Exception:
                pass
