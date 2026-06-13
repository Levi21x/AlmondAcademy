from __future__ import annotations

import logging
import re
from typing import Any, AsyncGenerator

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Medical Mentor system prompt
# ---------------------------------------------------------------------------
VOICE_SYSTEM_PROMPT = """You are Dr. Almond, a brilliant, warm senior doctor mentoring an MBBS student in a live spoken conversation.

You speak exactly like a real doctor teaching at the bedside — natural, human, conversational. This is VOICE, not text. The student is listening, not reading.

DEFAULT BEHAVIOR (almost every answer):
- Answer in 2 to 4 short spoken sentences. Quick, direct, conversational.
- Lead with the answer in the first sentence. No throat-clearing.
- One idea at a time. Add a single analogy or memory hook when it genuinely helps.
- Sound like a mentor talking, never like a textbook being read aloud.

ADAPTIVE DEPTH (read the student's intent):
- Quick factual question ("what is", "define", "which") -> one or two sentences, then stop.
- Conceptual question ("why", "how", "explain") -> 3 to 5 sentences building the intuition.
- They explicitly ask to "go deeper", "in detail", "everything about" -> give a fuller explanation, still spoken and structured.
- They mention an exam, NEET-PG, or "high yield" -> lead with what matters for the exam and the classic trap.
- They sound confused or say "I don't get it" -> drop to the simplest possible analogy and rebuild from zero.

CONVERSATIONAL RULES:
- End with a brief check-in or follow-up question ONLY when it deepens learning ("Want me to walk through the pathway?"). Not every turn.
- It is fine to be encouraging and brief: "Exactly right." "Close, but here's the catch."
- Never give a long lecture unprompted. If the topic is huge, give the headline and offer to go deeper.

STRICT SPOKEN-FORMAT RULES (this text goes straight to text-to-speech):
- Plain spoken English only. Zero markdown, zero bullet points, zero asterisks, zero headers, zero numbered lists.
- Write numbers and units the way you'd say them out loud.
- No "Certainly", "Of course", "Great question", "Sure" openers.
- Natural transitions only: "So", "Now", "Here's the key thing", "Think of it this way", "What happens next is".

TEACHING STYLE:
- Analogy first, then the precise medical term.
- Treat every question as valid and important.
- When the student is right, confirm it warmly and add one sharpening detail."""

CATEGORY_ADDONS: dict[str, str] = {
    "survivor": " Focus on what's high-yield for exams. Be brief and direct.",
    "anxious_grinder": " Keep your tone calm and reassuring. Remind them they can do this.",
    "passionate": " Connect concepts to clinical practice and real patient scenarios.",
    "lost": " Use the simplest possible analogy. Build from absolute basics.",
    "strategic_climber": " Highlight NEET-PG relevance and pattern recognition tips.",
    "sprinter": "",
}


# Abbreviations whose trailing period must NOT be treated as a sentence end.
_ABBREVIATIONS = {
    "dr", "mr", "mrs", "ms", "prof", "vs", "etc", "eg", "ie", "approx",
    "fig", "no", "inc", "ltd", "st", "i.e", "e.g", "a.k.a",
}

# A sentence ends at . ! ? : possibly wrapped in quotes/brackets, followed by
# whitespace (or end of string handled by the caller).
_SENTENCE_END = re.compile(r'([.!?]+)([")\]]*)(\s+)')


def _split_first_sentence(buffer: str) -> tuple[str | None, str]:
    """Pop the first complete sentence from ``buffer``.

    Returns ``(sentence, remainder)`` if a sentence boundary is found,
    otherwise ``(None, buffer)``. Guards against abbreviations and decimals
    (e.g. "3.5", "Dr. Almond") so TTS isn't cut mid-phrase.
    """
    for match in _SENTENCE_END.finditer(buffer):
        end = match.end()
        candidate = buffer[:end]

        # Reject if the period belongs to a decimal number ("3.5")
        before = buffer[: match.start(1)]
        after = buffer[match.end() :]
        if before[-1:].isdigit() and after[:1].isdigit():
            continue

        # Reject if the token before the period is a known abbreviation
        last_word = re.split(r"[\s(]", before.strip())[-1].lower().rstrip(".")
        if last_word in _ABBREVIATIONS:
            continue

        # Require a reasonable minimum so we don't synthesize "Yes." alone
        # unless it's genuinely the whole thing — small fragments get merged
        # by the caller's buffering anyway.
        if len(candidate.strip()) < 2:
            continue

        return candidate.strip(), buffer[end:]

    return None, buffer


def _clean_sentence(text: str) -> str:
    """Strip markdown/formatting from a single sentence for TTS."""
    cleaned = (text or "").replace("*", "").replace("#", "").replace("_", "").replace("`", "")
    cleaned = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", cleaned)   # keep link text, drop URL
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


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

    def _build_messages(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        subject: str | None,
        student_category: str,
    ) -> list[dict[str, str]]:
        system = VOICE_SYSTEM_PROMPT + CATEGORY_ADDONS.get(student_category, "")
        if subject:
            system += f"\n\nThe student is currently studying {subject}."

        # Keep last 8 turns (4 exchanges) for context without ballooning tokens
        safe_history: list[dict[str, str]] = []
        for item in (conversation_history or [])[-8:]:
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                safe_history.append({"role": role, "content": content})

        return [
            {"role": "system", "content": system},
            *safe_history,
            {"role": "user", "content": transcript.strip()},
        ]

    async def get_ai_response(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        subject: str | None = None,
        student_category: str = "sprinter",
    ) -> str:
        settings = get_settings()
        messages = self._build_messages(transcript, conversation_history, subject, student_category)
        raw = await self.llm.generate_with_messages(
            messages=messages,
            max_tokens=220,
            model=settings.groq_voice_model,
        )
        return _normalize_spoken_response(raw)

    async def stream_spoken_sentences(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        subject: str | None = None,
        student_category: str = "sprinter",
    ) -> AsyncGenerator[str, None]:
        """Stream the LLM response and yield complete, TTS-ready sentences.

        Tokens are accumulated from Groq's stream and flushed as soon as a
        sentence boundary is reached, so the first sentence can be synthesized
        and played while the rest of the answer is still being generated.
        """
        settings = get_settings()
        messages = self._build_messages(transcript, conversation_history, subject, student_category)

        buffer = ""
        async for delta in self.llm.stream_with_messages(
            messages=messages,
            max_tokens=220,
            model=settings.groq_voice_model,
        ):
            buffer += delta
            # Emit every complete sentence currently sitting in the buffer
            while True:
                sentence, buffer = _split_first_sentence(buffer)
                if sentence is None:
                    break
                cleaned = _clean_sentence(sentence)
                if cleaned:
                    yield cleaned

        # Flush whatever remains after the stream ends
        tail = _clean_sentence(buffer)
        if tail:
            yield tail

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
