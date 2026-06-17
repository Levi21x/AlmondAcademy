from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import struct
from typing import Any, AsyncGenerator

import httpx
import websockets

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


def _build_wav_chunk(pcm_bytes: bytes, sample_rate: int = 44100) -> bytes:
    """Wrap raw PCM16-LE mono bytes in a RIFF/WAV header.

    Produces a complete, independently-decodable WAV file so that
    AudioContext.decodeAudioData() works on every chunk without any
    special handling on the frontend.
    """
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_bytes)
    # RIFF chunk size = everything after the 8-byte RIFF header
    chunk_size = 36 + data_size
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", chunk_size,
        b"WAVE",
        b"fmt ", 16,          # PCM fmt sub-chunk is always 16 bytes
        1,                    # AudioFormat = PCM
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data", data_size,
    )
    return header + pcm_bytes


def _merge_transcripts(parts: list[str]) -> str:
    """Combine the transcript messages Sarvam streams back into one string.

    Sarvam may emit a single final transcript, several cumulative partials
    (each a superset of the previous), or distinct per-segment finals.  This
    handles all three: cumulative partials collapse to the longest, while
    genuinely new segments are appended.
    """
    merged = ""
    for raw in parts:
        piece = (raw or "").strip()
        if not piece:
            continue
        if not merged:
            merged = piece
        elif piece == merged or piece in merged:
            continue                                  # exact dup / already contained
        elif piece.startswith(merged) or merged.startswith(piece):
            merged = piece if len(piece) > len(merged) else merged  # cumulative → keep longest
        else:
            merged = f"{merged} {piece}".strip()       # distinct segment → append
    return merged


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


# ---------------------------------------------------------------------------
# Per-session Deepgram Aura TTS WebSocket client
# ---------------------------------------------------------------------------

_DONE = object()  # end-of-stream sentinel for the active request queue


class DeepgramStreamClient:
    """WebSocket to Deepgram Aura TTS, owned by a single voice session.

    Deepgram's speak socket synthesises one stream at a time (no per-request
    multiplexing), so each voice session holds its own connection rather than
    sharing a process-wide singleton — a shared socket would interleave audio
    across concurrent users.  The connection is opened once at session start
    (preheat) and reused for every turn, so the TLS + WS-upgrade cost is paid
    once instead of on every sentence.

    Text is streamed in word-by-word via ``Speak`` messages; a trailing
    ``Flush`` forces Deepgram to synthesise whatever is buffered immediately
    rather than waiting for more input — that is what keeps first-audio latency
    low.  A background listener routes inbound PCM frames to the active
    request's queue; a ``Flushed`` control message marks end-of-turn.
    """

    _URL = (
        "wss://api.deepgram.com/v1/speak"
        "?encoding=linear16&sample_rate={sample_rate}&model={model}"
    )

    def __init__(self, api_key: str, model: str, sample_rate: int = 44100) -> None:
        self._api_key = api_key
        self._model = model
        self._sample_rate = sample_rate
        self._ws: Any = None
        self._listener: asyncio.Task[None] | None = None
        # Only one synthesis runs on a connection at a time, so a single queue
        # for the in-flight request is enough (None while idle).
        self._queue: asyncio.Queue[Any] | None = None
        self._lock: asyncio.Lock | None = None

    @property
    def connected(self) -> bool:
        return self._ws is not None

    def _get_lock(self) -> asyncio.Lock:
        # Created lazily so it binds to the running event loop.
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def connect(self) -> None:
        url = self._URL.format(sample_rate=self._sample_rate, model=self._model)
        self._ws = await websockets.connect(
            url,
            additional_headers={"Authorization": f"Token {self._api_key}"},
            open_timeout=10,
            ping_interval=20,
            ping_timeout=10,
        )
        self._listener = asyncio.create_task(self._listen(), name="deepgram-listener")
        logger.debug("Deepgram WS connected")

    async def preheat(self) -> None:
        """Open the connection ahead of the first turn; swallow failures."""
        try:
            if not self.connected:
                await self.connect()
            logger.debug("Deepgram WS pre-warmed")
        except Exception:
            logger.warning("Deepgram WS preheat failed — will retry on first TTS call")

    async def _listen(self) -> None:
        """Route inbound frames to the active request queue until the socket closes.

        Binary frames are raw PCM16-LE audio; text frames are JSON control
        messages (``Metadata``, ``Flushed``, ``Warning``, ``Cleared``).
        """
        try:
            async for raw_msg in self._ws:
                q = self._queue
                if isinstance(raw_msg, (bytes, bytearray)):
                    if q is not None and raw_msg:
                        q.put_nowait(bytes(raw_msg))
                    continue
                try:
                    msg = json.loads(raw_msg)
                except Exception:
                    continue
                mtype = msg.get("type")
                if mtype == "Flushed":
                    if q is not None:
                        q.put_nowait(_DONE)
                elif mtype == "Warning":
                    logger.warning("Deepgram TTS warning: %s", msg.get("description") or msg)
                # Metadata / Cleared carry no audio — ignore.
        except Exception:
            logger.debug("Deepgram WS closed")
        finally:
            self._ws = None
            # Unblock a caller still waiting so it fails fast and reconnects.
            if self._queue is not None:
                try:
                    self._queue.put_nowait(ConnectionError("Deepgram WS closed"))
                except Exception:
                    pass

    async def stream_incremental(
        self,
        text_source: AsyncGenerator[str, None],
    ) -> AsyncGenerator[bytes, None]:
        """Stream TTS from a word-by-word text source.

        Each text chunk is forwarded as a ``Speak`` message the moment it
        arrives so Deepgram begins synthesising before the sentence is
        complete.  A final ``Flush`` releases the last buffered audio.  Yields
        raw PCM16-LE bytes as they arrive.
        """
        async with self._get_lock():
            if not self.connected:
                await self.connect()

            q: asyncio.Queue[Any] = asyncio.Queue()
            self._queue = q
            produce_task: asyncio.Task[None] | None = None

            async def _produce() -> None:
                sent_any = False
                try:
                    async for chunk in text_source:
                        if not chunk:
                            continue
                        await self._ws.send(json.dumps({"type": "Speak", "text": chunk}))
                        sent_any = True
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("Deepgram incremental produce error")
                finally:
                    if not sent_any:
                        # Nothing to synthesise — end the consumer directly.
                        q.put_nowait(_DONE)
                    elif self._ws is not None:
                        try:
                            await self._ws.send(json.dumps({"type": "Flush"}))
                        except Exception:
                            logger.debug("Deepgram: failed to send Flush")

            got_done = False
            try:
                produce_task = asyncio.create_task(_produce(), name="deepgram-incremental-produce")
                while True:
                    item = await q.get()
                    if item is _DONE:
                        got_done = True
                        break
                    if isinstance(item, Exception):
                        raise item
                    yield item
            finally:
                if produce_task and not produce_task.done():
                    produce_task.cancel()
                    try:
                        await produce_task
                    except asyncio.CancelledError:
                        pass
                # Torn down before the natural end (barge-in / cancel): tell
                # Deepgram to discard any audio still being synthesised so it
                # can't bleed into the next turn's queue (one socket, one queue).
                if not got_done and self._ws is not None:
                    try:
                        await self._ws.send(json.dumps({"type": "Clear"}))
                    except Exception:
                        pass
                self._queue = None

    async def close(self) -> None:
        """Tear down the session's connection (call at WebSocket close)."""
        ws = self._ws
        self._ws = None
        if self._listener is not None:
            self._listener.cancel()
            self._listener = None
        if ws is not None:
            try:
                await ws.send(json.dumps({"type": "Close"}))
            except Exception:
                pass
            try:
                await ws.close()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Voice pipeline
# ---------------------------------------------------------------------------


class VoicePipeline:
    """Voice mode pipeline: Sarvam (STT) → Groq (LLM) → Deepgram (TTS).

    Initialized lazily so a missing or invalid API key doesn't crash the
    FastAPI app at import time — it only fails at the first voice request.

    The TTS connection is *not* a pipeline-level singleton: Deepgram's speak
    socket handles one stream at a time, so each voice WebSocket session owns
    its own ``DeepgramStreamClient`` (created via :meth:`new_tts_client`).
    """

    _llm: Any = None

    @property
    def llm(self) -> Any:
        if self._llm is None:
            from app.services.llm.groq_client import GroqLLMClient
            self._llm = GroqLLMClient()
        return self._llm

    # ------------------------------------------------------------------
    # Deepgram per-session TTS connection
    # ------------------------------------------------------------------

    def new_tts_client(self) -> DeepgramStreamClient:
        """Build a fresh Deepgram TTS client for one voice session.

        The caller (the voice WebSocket handler) owns its lifecycle: preheat it
        at session start and ``close()`` it when the socket goes away.
        """
        settings = get_settings()
        if not settings.deepgram_api_key:
            raise ValueError("DEEPGRAM_API_KEY not set. Add it to backend/.env")
        return DeepgramStreamClient(
            api_key=settings.deepgram_api_key,
            model=settings.deepgram_tts_model,
            sample_rate=settings.deepgram_sample_rate,
        )

    async def preheat_groq(self) -> None:
        """Import LangChain/Groq modules, build the cached ChatGroq client, and
        open the TCP+TLS connection to api.groq.com with a 1-token request.

        Fire alongside the Deepgram preheat so both are warm before the first
        voice turn.  The 1-token call costs essentially nothing but eliminates
        the ~4-5 s module-import + connection cold-start seen on the first turn.
        """
        try:
            settings = get_settings()
            await self.llm.generate_with_messages(
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                model=settings.groq_voice_model,
            )
            logger.debug("Groq pre-warmed")
        except Exception:
            logger.warning("Groq preheat failed — will retry on first voice turn")

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

    async def speech_to_text_streaming(
        self,
        audio_gen: AsyncGenerator[bytes, None],
    ) -> str:
        """Stream PCM audio frames to Sarvam saaras:v3 and return the transcript.

        Sends WAV chunks to the streaming WebSocket while the user speaks so
        Sarvam can process audio incrementally.  Calls flush() at utterance end
        to force the final transcript immediately without waiting for Sarvam's
        server-side silence detection.
        """
        from sarvamai import AsyncSarvamAI

        settings = get_settings()
        if not settings.sarvam_api_key:
            raise ValueError("SARVAM_API_KEY not set. Add it to backend/.env")

        client = AsyncSarvamAI(api_subscription_key=settings.sarvam_api_key)

        # NOTE: flush_signal / sample_rate are query params typed as string
        # literals.  Passing Python bools/ints serializes to "True"/"16000";
        # the bool casing ("True" vs "true") silently disables flush, so pass
        # the exact string literals the API expects.
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",
            language_code=settings.sarvam_language_code,
            sample_rate="16000",
            flush_signal="true",
        ) as ws:
            # Sarvam silently drops WAV messages smaller than ~2 KB, so the raw
            # 1 KB (32 ms) Silero frames must be re-batched.  100 ms chunks sit
            # well above that floor while still streaming ~10×/sec during speech.
            # Silero (frontend) is the only VAD; we never enable Sarvam's.
            MIN_CHUNK = 3200   # 100 ms @ 16 kHz / 16-bit mono
            PAD_FLOOR = 2048   # smallest WAV payload Sarvam reliably accepts

            chunks_sent = 0

            async def _send(pcm: bytes) -> None:
                nonlocal chunks_sent
                wav = _build_wav_chunk(pcm, sample_rate=16000)
                await ws.transcribe(
                    audio=base64.b64encode(wav).decode("ascii"),
                    encoding="audio/wav",
                    sample_rate=16000,
                )
                chunks_sent += 1

            buf = bytearray()
            any_audio = False
            async for chunk in audio_gen:
                if not chunk:
                    continue
                any_audio = True
                buf.extend(chunk)
                while len(buf) >= MIN_CHUNK:
                    await _send(bytes(buf[:MIN_CHUNK]))
                    del buf[:MIN_CHUNK]

            # No audio at all (VAD misfire) — nothing to transcribe.
            if not any_audio:
                return ""

            # Flush the trailing remainder; pad sub-floor tails with silence so
            # the final word is never dropped for being too small a chunk.
            if buf:
                if len(buf) < PAD_FLOOR:
                    buf.extend(b"\x00" * (PAD_FLOOR - len(buf)))
                await _send(bytes(buf))

            frames_sent = chunks_sent  # for the log line below

            # Flush forces Sarvam to finalize and emit the transcript now,
            # instead of waiting on its own silence detection.
            await ws.flush()

            # Collect data messages: wait generously for the first result, then
            # only briefly for any trailing segments before returning.
            parts: list[str] = []
            FIRST_TIMEOUT = 3.0   # first transcript after flush (typ. ~1.2 s)
            IDLE_TIMEOUT = 0.4    # subsequent: stop once Sarvam goes quiet
            while True:
                timeout = IDLE_TIMEOUT if parts else FIRST_TIMEOUT
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                except asyncio.TimeoutError:
                    break
                mtype = getattr(msg, "type", None)
                if mtype == "error":
                    logger.error("Sarvam streaming error message: %r", msg)
                    break
                if mtype != "data":
                    continue                       # ignore events / other types
                text = (getattr(getattr(msg, "data", None), "transcript", "") or "").strip()
                logger.debug("Sarvam data msg: %r", text)
                if text:
                    parts.append(text)

            transcript = _merge_transcripts(parts)

        logger.info("Sarvam streaming transcript (%d frames): %r", frames_sent, transcript[:120])
        return transcript.strip()

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
    # TTS — Deepgram
    # ------------------------------------------------------------------

    async def stream_response(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        tts_client: DeepgramStreamClient,
        subject: str | None = None,
        student_category: str = "sprinter",
    ) -> AsyncGenerator[tuple[str, Any], None]:
        """Yield ``("sentence", str)`` and ``("audio", bytes)`` events for one turn.

        ``tts_client`` is the calling session's Deepgram connection.  LLM tokens
        are forwarded word-by-word to Deepgram so audio begins arriving after
        just a handful of words instead of waiting for a full sentence boundary.
        Sentence events are still emitted for UI display as boundaries are
        detected in parallel.
        """
        settings = get_settings()
        messages = self._build_messages(transcript, conversation_history, subject, student_category)

        # Single queue that merges sentence (LLM side) and audio (Deepgram side)
        # events.  None is the end-of-pipeline sentinel.
        event_q: asyncio.Queue[tuple[str, Any] | None] = asyncio.Queue()

        async def _pipeline() -> None:
            # Inter-coroutine queue: LLM loop → _word_gen → Deepgram
            word_q: asyncio.Queue[str | None] = asyncio.Queue()

            async def _word_gen() -> AsyncGenerator[str, None]:
                while True:
                    item = await word_q.get()
                    if item is None:
                        return
                    yield item

            client = tts_client
            audio_task: asyncio.Task[None] | None = None

            async def _collect_audio() -> None:
                pcm_buf = bytearray()
                _MIN = 2048
                try:
                    async for pcm in client.stream_incremental(_word_gen()):
                        pcm_buf.extend(pcm)
                        while len(pcm_buf) >= _MIN:
                            event_q.put_nowait(("audio", _build_wav_chunk(bytes(pcm_buf[:_MIN]))))
                            del pcm_buf[:_MIN]
                    if pcm_buf:
                        event_q.put_nowait(("audio", _build_wav_chunk(bytes(pcm_buf))))
                except Exception:
                    logger.exception("stream_response audio collection error")

            try:
                audio_task = asyncio.create_task(_collect_audio(), name="stream-response-audio")

                sentence_buf = ""
                word_buf = ""

                async for delta in self.llm.stream_with_messages(
                    messages=messages,
                    max_tokens=220,
                    model=settings.groq_voice_model,
                ):
                    sentence_buf += delta
                    word_buf += delta

                    # Emit sentence events as boundaries are detected (for UI)
                    while True:
                        sentence, sentence_buf = _split_first_sentence(sentence_buf)
                        if sentence is None:
                            break
                        cleaned = _clean_sentence(sentence)
                        if cleaned:
                            event_q.put_nowait(("sentence", cleaned))

                    # Flush complete words to Deepgram on every space boundary
                    last_space = word_buf.rfind(" ")
                    if last_space != -1:
                        chunk = word_buf[:last_space + 1]
                        word_buf = word_buf[last_space + 1:]
                        clean_chunk = _clean_sentence(chunk)
                        if clean_chunk:
                            await word_q.put(clean_chunk + " ")

                # Flush any remaining word fragment
                if word_buf.strip():
                    clean_rem = _clean_sentence(word_buf)
                    if clean_rem:
                        await word_q.put(clean_rem)

                # Emit tail as sentence if it didn't hit a boundary
                tail = _clean_sentence(sentence_buf)
                if tail:
                    event_q.put_nowait(("sentence", tail))

                # Close the Deepgram incremental stream
                await word_q.put(None)
                await audio_task

            except Exception:
                logger.exception("stream_response pipeline error")
            finally:
                # Always unblock Deepgram and cancel its audio task
                try:
                    word_q.put_nowait(None)
                except Exception:
                    pass
                if audio_task and not audio_task.done():
                    audio_task.cancel()
                    try:
                        await audio_task
                    except (asyncio.CancelledError, Exception):
                        pass
                event_q.put_nowait(None)

        bg_task = asyncio.create_task(_pipeline(), name="stream-response-pipeline")
        try:
            while True:
                item = await event_q.get()
                if item is None:
                    break
                yield item
        finally:
            if not bg_task.done():
                bg_task.cancel()
                try:
                    await bg_task
                except (asyncio.CancelledError, Exception):
                    pass

    async def text_to_speech(self, text: str) -> bytes:
        """One-shot synthesis for the non-streaming ``/speak`` endpoint.

        Uses Deepgram's REST speak API and returns complete MP3 bytes.  The
        low-latency streaming path uses :meth:`stream_response` instead.
        """
        settings = get_settings()
        if not settings.deepgram_api_key:
            raise ValueError("DEEPGRAM_API_KEY not set. Add it to backend/.env")

        url = "https://api.deepgram.com/v1/speak"
        params = {"model": settings.deepgram_tts_model, "encoding": "mp3"}
        headers = {
            "Authorization": f"Token {settings.deepgram_api_key}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}

        logger.debug("Deepgram TTS: model=%s chars=%d", settings.deepgram_tts_model, len(text))

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, params=params, json=payload)

        if resp.status_code != 200:
            logger.error("Deepgram TTS failed %s: %s", resp.status_code, resp.text[:300])
            raise RuntimeError(f"Deepgram TTS error {resp.status_code}: {resp.text[:200]}")

        return resp.content
