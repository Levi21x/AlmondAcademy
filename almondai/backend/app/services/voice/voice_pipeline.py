from __future__ import annotations

import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Medical Mentor system prompt
# ---------------------------------------------------------------------------
VOICE_SYSTEM_PROMPT = """You are Dr. Almond, a brilliant, warm senior doctor mentoring an MBBS student in a spoken conversation.

You speak exactly like a real doctor teaching at the bedside — natural, human, conversational.

RESPONSE RULES:
- 40 to 120 words maximum per response (15 to 45 seconds when spoken)
- Give a clear answer first, then one supporting detail or analogy
- End with a short follow-up question ONLY if it helps deepen understanding
- Never give a lecture — one clear point at a time
- Use everyday analogies before medical terminology
- Speak in warm, direct second person ("Think of it this way...", "Here's the key thing...")

STRICT FORMAT RULES:
- Plain spoken English only — zero markdown, zero bullet points, zero special characters
- No numbered lists, no asterisks, no headers
- No "Certainly", "Of course", "Great question", "Sure" openers
- Transitions: "So", "Now", "The key thing is", "Think of it this way", "What happens next is"

TEACHING STYLE:
- Analogy first, then the correct term
- Confirm understanding before moving on
- When a student seems confused, simplify one more level
- Treat every question as valid and important
"""

CATEGORY_ADDONS: dict[str, str] = {
    "survivor": " Focus on what's high-yield for exams. Be brief and direct.",
    "anxious_grinder": " Keep your tone calm and reassuring. Remind them they can do this.",
    "passionate": " Connect concepts to clinical practice and real patient scenarios.",
    "lost": " Use the simplest possible analogy. Build from absolute basics.",
    "strategic_climber": " Highlight NEET-PG relevance and pattern recognition tips.",
    "sprinter": "",
}


def _normalize_spoken_response(text: str) -> str:
    """Strip markdown and formatting artifacts so TTS sounds natural."""
    cleaned = (text or "").replace("*", "").replace("#", "").replace("_", "")
    cleaned = re.sub(r"\[.*?\]\(.*?\)", "", cleaned)   # strip markdown links
    cleaned = re.sub(r"`+[^`]*`+", "", cleaned)         # strip code spans
    cleaned = re.sub(r"\n+", " ", cleaned)
    cleaned = re.sub(r"\s*[-–—]\s+", " ", cleaned)      # strip list dashes
    cleaned = re.sub(r"\b\d+\s*[\.)]\s*", " ", cleaned) # strip numbered lists
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)

    if not cleaned:
        return "Let me think about the best way to explain that."

    # Hard cap at 1200 chars so TTS doesn't produce an absurdly long audio clip
    return cleaned[:1200]


def _normalize_content_type(raw: str | None) -> str:
    """Return a clean MIME type Sarvam accepts (strips codec parameters)."""
    if not raw:
        return "audio/webm"
    # "audio/webm;codecs=opus" → "audio/webm"
    base = raw.split(";")[0].strip().lower()
    mapping = {
        "audio/webm": "audio/webm",
        "audio/mp4": "audio/mp4",
        "audio/ogg": "audio/ogg",
        "audio/mpeg": "audio/mpeg",
        "audio/wav": "audio/wav",
        "audio/x-wav": "audio/wav",
        "audio/flac": "audio/flac",
    }
    return mapping.get(base, "audio/webm")


class VoicePipeline:
    """Voice mode pipeline: Sarvam (STT) → Groq (LLM) → Cartesia (TTS).

    Initialized lazily so a missing or invalid API key doesn't crash the
    FastAPI app at import time — it only fails at the first voice request.
    """

    _llm: Any = None

    @property
    def llm(self) -> Any:
        if self._llm is None:
            from app.services.llm.groq_client import GroqLLMClient
            self._llm = GroqLLMClient()
        return self._llm

    # ------------------------------------------------------------------
    # STT — Sarvam
    # ------------------------------------------------------------------

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        content_type: str | None = None,
    ) -> str:
        settings = get_settings()
        if not settings.sarvam_api_key:
            raise ValueError("SARVAM_API_KEY not set. Add it to backend/.env")

        clean_type = _normalize_content_type(content_type)

        # Derive extension from clean MIME type when the filename is generic
        if filename in {"audio.webm", "audio.mp4", "recording.webm", "recording.mp4", "blob"}:
            ext_map = {
                "audio/mp4": "mp4", "audio/ogg": "ogg",
                "audio/mpeg": "mp3", "audio/wav": "wav",
                "audio/flac": "flac",
            }
            ext = ext_map.get(clean_type, "webm")
            filename = f"recording.{ext}"

        url = "https://api.sarvam.ai/speech-to-text"
        headers = {"api-subscription-key": settings.sarvam_api_key}
        data = {
            "model": settings.sarvam_model,
            "language_code": settings.sarvam_language_code,
        }
        files = {"file": (filename, audio_bytes, clean_type)}

        logger.debug("Sarvam STT: filename=%s content_type=%s size=%d", filename, clean_type, len(audio_bytes))

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, data=data, files=files)

        if resp.status_code != 200:
            logger.error("Sarvam STT failed %s: %s", resp.status_code, resp.text[:300])
            raise RuntimeError(f"Sarvam STT error {resp.status_code}: {resp.text[:200]}")

        body = resp.json()
        # Sarvam can return "transcript" or "text" depending on model/version
        transcript = body.get("transcript") or body.get("text") or ""
        logger.debug("Sarvam transcript: %r", transcript[:100])
        return str(transcript).strip()

    # ------------------------------------------------------------------
    # LLM — Groq
    # ------------------------------------------------------------------

    async def get_ai_response(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        subject: str | None = None,
        student_category: str = "sprinter",
    ) -> str:
        settings = get_settings()
        system = VOICE_SYSTEM_PROMPT + CATEGORY_ADDONS.get(student_category, "")
        if subject:
            system += f" The student is currently studying {subject}."

        # Keep last 8 turns (4 exchanges) for context without ballooning tokens
        safe_history: list[dict[str, str]] = []
        for item in (conversation_history or [])[-8:]:
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                safe_history.append({"role": role, "content": content})

        messages = [
            {"role": "system", "content": system},
            *safe_history,
            {"role": "user", "content": transcript.strip()},
        ]

        raw = await self.llm.generate_with_messages(
            messages=messages,
            max_tokens=200,
            model=settings.groq_voice_model,
        )
        return _normalize_spoken_response(raw)

    # ------------------------------------------------------------------
    # TTS — Cartesia
    # ------------------------------------------------------------------

    async def text_to_speech(self, text: str) -> bytes:
        settings = get_settings()
        if not settings.cartesia_api_key:
            raise ValueError("CARTESIA_API_KEY not set. Add it to backend/.env")

        url = "https://api.cartesia.ai/tts/bytes"
        headers = {
            "X-API-Key": settings.cartesia_api_key,
            "Cartesia-Version": settings.cartesia_version,
            "Content-Type": "application/json",
        }
        payload = {
            "model_id": settings.cartesia_model,
            "transcript": text,
            "voice": {"mode": "id", "id": settings.cartesia_voice_id},
            "language": "en",
            "output_format": {
                "container": "mp3",
                "encoding": "mp3",
                "sample_rate": 44100,
            },
        }

        logger.debug("Cartesia TTS: model=%s voice=%s chars=%d", settings.cartesia_model, settings.cartesia_voice_id, len(text))

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)

        if resp.status_code != 200:
            logger.error("Cartesia TTS failed %s: %s", resp.status_code, resp.text[:300])
            raise RuntimeError(f"Cartesia TTS error {resp.status_code}: {resp.text[:200]}")

        return resp.content
