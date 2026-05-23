from __future__ import annotations

import re
import importlib
from typing import Any

import httpx

from app.core.config import get_settings
from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS

VOICE_SYSTEM_PROMPT = """You are AlmondAI, a medical study assistant for Indian MBBS students.
You are having a SPOKEN conversation.

STRICT RULES for spoken responses:
- Respond in plain conversational English only
- NO markdown - no asterisks, no headers, no bullet points, no special characters
- NO lists using dashes or numbers
- Write as if speaking directly to the student
- Use natural spoken transitions: First, Also, Now, Finally, So
- Keep responses SHORT - maximum 4 sentences per response unless student asks for more
- Be warm, encouraging, and clear
- If explaining a medical concept use simple analogies first then technical terms
- Address the student directly as you
- Never say certainly or of course
"""


class VoicePipeline:
    def __init__(self) -> None:
        settings = get_settings()
        self.deepgram = None
        if settings.deepgram_api_key:
            try:
                deepgram_module = importlib.import_module("deepgram")
                DeepgramClient = getattr(deepgram_module, "DeepgramClient")
                self.deepgram = DeepgramClient(settings.deepgram_api_key)
            except Exception:
                # TTS calls use HTTPX directly; keep startup resilient if SDK import fails.
                self.deepgram = None
        self.llm = OpenRouterLLMClient(OPENROUTER_MODELS["fast"])
        self.settings = settings

    def _normalize_spoken_response(self, text: str) -> str:
        # Strip markdown and noisy formatting so TTS sounds natural.
        cleaned = (text or "").replace("*", " ").replace("#", " ")
        cleaned = re.sub(r"\n+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        cleaned = re.sub(r"\s*[-]\s+", " ", cleaned)
        cleaned = re.sub(r"\b\d+\s*[\.)]\s*", " ", cleaned)
        cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)

        if not cleaned:
            return "Let us break this down together in a simple way."

        return cleaned[:1200]

    async def get_ai_response(
        self,
        transcript: str,
        conversation_history: list[dict[str, Any]],
        subject: str | None = None,
        student_category: str = "sprinter",
    ) -> str:
        category_addons = {
            "survivor": " Keep it exam-focused and brief.",
            "anxious_grinder": " Be reassuring and calm.",
            "passionate": " Include clinical relevance.",
            "lost": " Use simple analogies.",
            "strategic_climber": " Mention NEET-PG relevance.",
            "sprinter": "",
        }

        system = VOICE_SYSTEM_PROMPT + category_addons.get(student_category, "")
        if subject:
            system += f" The student is studying {subject}."

        safe_history = []
        for item in (conversation_history or [])[-6:]:
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if role in {"user", "assistant"} and content:
                safe_history.append({"role": role, "content": content})

        messages = [
            {"role": "system", "content": system},
            *safe_history,
            {"role": "user", "content": transcript.strip()},
        ]

        raw = await self.llm.generate_with_messages(messages=messages, max_tokens=300)
        return self._normalize_spoken_response(raw)

    async def text_to_speech(self, text: str) -> bytes:
        if not self.settings.deepgram_api_key:
            raise ValueError("Invalid DEEPGRAM_API_KEY. Please set a valid key in backend/.env")

        url = "https://api.deepgram.com/v1/speak"
        params = {"model": "aura-asteria-en", "encoding": "mp3"}
        headers = {
            "Authorization": f"Token {self.settings.deepgram_api_key}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, params=params, headers=headers, json=payload)
            if response.status_code != 200:
                raise RuntimeError(f"Deepgram TTS failed: {response.status_code} {response.text}")
            return response.content
