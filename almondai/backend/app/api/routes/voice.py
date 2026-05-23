from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.middleware.auth_middleware import require_auth
from app.services.achievements_service import achievements_service
from app.services.auth_service import AuthService
from app.services.streak_service import StreakService
from app.services.voice.voice_pipeline import VoicePipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])
pipeline = VoicePipeline()
streak_service = StreakService()


class VoiceAskRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=2000)
    subject: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    session_id: Optional[str] = None


class VoiceAskResponse(BaseModel):
    text_response: str
    session_id: Optional[str] = None


def _success(data: Dict[str, Any]) -> Dict[str, Any]:
    return {"success": True, "data": data}


@router.post("/ask-text")
async def ask_voice_text(
    payload: VoiceAskRequest,
    user=Depends(require_auth),
    service: AuthService = Depends(AuthService),
) -> Dict[str, Any]:
    """
    Receives transcript and returns AI text response.
    Frontend uses this to get text first and then calls /speak.
    """
    try:
        profile = service.get_profile(user["user_id"])
        student_category = (profile.get("student_category", "sprinter") if profile else "sprinter")

        text_response = await pipeline.get_ai_response(
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
                session_id=payload.session_id,
                metadata={"source": "voice", "transcript_length": len(payload.transcript)},
            )
            for badge in activity_row.get("new_achievements") or []:
                badge_key = badge.get("badge_key")
                if badge_key and badge_key not in seen_badges:
                    merged_achievements.append(badge)
                    seen_badges.add(badge_key)
        except Exception:
            logger.exception("Voice activity logging failed")

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
            logger.exception("Voice achievement evaluation failed")

        body = VoiceAskResponse(text_response=text_response, session_id=payload.session_id).model_dump()
        body["new_achievements"] = merged_achievements
        return _success(body)
    except Exception as exc:
        logger.exception("Voice ask failed")
        raise HTTPException(status_code=500, detail={"error": True, "message": str(exc)}) from exc


@router.post("/speak")
async def speak_text(payload: dict, user=Depends(require_auth)) -> Response:
    """
    Receives text and returns MP3 audio bytes.
    Frontend plays this audio directly.
    """
    try:
        text = str(payload.get("text", "")).strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        if len(text) > 1000:
            text = text[:1000]

        audio_bytes = await pipeline.text_to_speech(text)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"Content-Length": str(len(audio_bytes)), "Cache-Control": "no-cache"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("TTS failed")
        raise HTTPException(status_code=500, detail={"error": True, "message": str(exc)}) from exc


@router.get("/deepgram-token")
async def get_deepgram_token(user=Depends(require_auth)) -> Dict[str, Any]:
    """
    Returns a token for frontend STT after auth validation.
    """
    settings = get_settings()
    if not settings.deepgram_api_key:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Deepgram API key not configured"})

    return _success({"token": settings.deepgram_api_key, "language": "en-US", "model": "nova-2"})
