from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RATE_LIMIT_MESSAGE = "AlmondAI is processing many requests right now. Please try again in a moment."


class GroqLLMClient:
    def __init__(self) -> None:
        settings = get_settings()
        api_key = settings.groq_api_key.strip()
        if not api_key or api_key == "your_groq_api_key_here":
            raise ValueError("Invalid GROQ_API_KEY. Please set a valid key in backend/.env")
        self.api_key = api_key
        self.model = settings.groq_model
        self.fallback_model = "llama-3.2-3b-preview"   # different model so deprecation of primary doesn't also kill fallback
        self.max_tokens = settings.max_tokens
        self.temperature = 0.3
        # Cache ChatGroq instances by (model, max_tokens) so the underlying
        # httpx.AsyncClient and its TCP+TLS connection are reused across calls.
        # Creating a fresh ChatGroq per call was causing ~4-5 s cold-start on
        # the first voice turn (module imports + TLS handshake).
        self._client_cache: dict[tuple[str, int], ChatGroq] = {}

    def _get_client(self, model: str, max_tokens: int) -> ChatGroq:
        key = (model, max_tokens)
        if key not in self._client_cache:
            self._client_cache[key] = ChatGroq(
                api_key=self.api_key,
                model=model,
                max_tokens=max_tokens,
                temperature=self.temperature,
                streaming=True,  # astream() and ainvoke() both work on a streaming client
            )
        return self._client_cache[key]

    def _is_rate_limit_error(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "rate limit" in message or "429" in message

    def _is_invalid_key_error(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "api key" in message or "authentication" in message or "unauthorized" in message

    def _is_network_error(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return "network" in message or "connection" in message or "timeout" in message

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        stream: bool = True,
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
        tried_fallback = False
        active_model = self.model
        for attempt in range(2):
            try:
                client = self._get_client(active_model, max_tokens)
                if stream:
                    async for chunk in client.astream(messages):
                        content = getattr(chunk, "content", "")
                        if content is not None:
                            yield str(content)
                    return

                response = await client.ainvoke(messages)
                yield str(response.content)
                return
            except Exception as exc:
                msg = str(exc).lower()
                if self._is_invalid_key_error(exc):
                    logger.exception("Groq authentication failed")
                    raise ValueError("Invalid GROQ_API_KEY. Please update backend/.env") from exc

                if ("decommission" in msg or "decommissioned" in msg or "not available" in msg or "model not found" in msg) and not tried_fallback:
                    active_model = self.fallback_model
                    tried_fallback = True
                    continue

                if self._is_rate_limit_error(exc):
                    yield RATE_LIMIT_MESSAGE
                    return

                if self._is_network_error(exc) and attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

                yield "AlmondAI could not process your request right now due to a temporary network issue."
                return

    async def generate_with_messages(
        self,
        messages: list[dict],
        max_tokens: int = 300,
        model: str | None = None,
    ) -> str:
        """Chat-completion variant that accepts a pre-built messages array (with history).

        Used by the voice pipeline so spoken turns keep conversational context. An
        optional ``model`` overrides the default (voice mode prefers a fast model).
        """
        lc_messages = []
        for item in messages:
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if not content:
                continue
            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        tried_fallback = False
        active_model = model or self.model
        for attempt in range(2):
            try:
                client = self._get_client(active_model, max_tokens)
                response = await client.ainvoke(lc_messages)
                return str(response.content)
            except Exception as exc:
                msg = str(exc).lower()
                if self._is_invalid_key_error(exc):
                    logger.exception("Groq authentication failed")
                    raise ValueError("Invalid GROQ_API_KEY. Please update backend/.env") from exc

                if ("decommission" in msg or "decommissioned" in msg or "not available" in msg or "model not found" in msg) and not tried_fallback:
                    active_model = self.fallback_model
                    tried_fallback = True
                    continue

                if self._is_rate_limit_error(exc):
                    return RATE_LIMIT_MESSAGE

                if self._is_network_error(exc) and attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

                return "AlmondAI could not process your request right now due to a temporary network issue."

        return "AlmondAI could not process your request right now due to a temporary network issue."

    async def stream_with_messages(
        self,
        messages: list[dict],
        max_tokens: int = 220,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Streaming variant of ``generate_with_messages`` — yields token deltas.

        Used by the voice WebSocket so the LLM response can be chunked into
        sentences and sent to TTS as it is produced (instead of waiting for the
        full completion).
        """
        lc_messages = []
        for item in messages:
            role = str(item.get("role", "")).strip().lower()
            content = str(item.get("content", "")).strip()
            if not content:
                continue
            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        tried_fallback = False
        active_model = model or self.model
        for attempt in range(2):
            try:
                client = self._get_client(active_model, max_tokens)
                async for chunk in client.astream(lc_messages):
                    content = getattr(chunk, "content", "")
                    if content:
                        yield str(content)
                return
            except Exception as exc:
                msg = str(exc).lower()
                if self._is_invalid_key_error(exc):
                    logger.exception("Groq authentication failed")
                    raise ValueError("Invalid GROQ_API_KEY. Please update backend/.env") from exc

                if ("decommission" in msg or "decommissioned" in msg or "not available" in msg or "model not found" in msg) and not tried_fallback:
                    active_model = self.fallback_model
                    tried_fallback = True
                    continue

                if self._is_rate_limit_error(exc):
                    yield RATE_LIMIT_MESSAGE
                    return

                if self._is_network_error(exc) and attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

                yield "AlmondAI could not process your request right now due to a temporary network issue."
                return

    async def generate_sync(self, prompt: str, system_prompt: str, max_tokens: int = 1500) -> str:
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
        tried_fallback = False
        active_model = self.model
        for attempt in range(2):
            try:
                client = self._get_client(active_model, max_tokens)
                response = await client.ainvoke(messages)
                return str(response.content)
            except Exception as exc:
                msg = str(exc).lower()
                if self._is_invalid_key_error(exc):
                    logger.exception("Groq authentication failed")
                    raise ValueError("Invalid GROQ_API_KEY. Please update backend/.env") from exc

                if ("decommission" in msg or "decommissioned" in msg or "not available" in msg or "model not found" in msg) and not tried_fallback:
                    active_model = self.fallback_model
                    tried_fallback = True
                    continue

                if self._is_rate_limit_error(exc):
                    return RATE_LIMIT_MESSAGE

                if self._is_network_error(exc) and attempt == 0:
                    await asyncio.sleep(0.5)
                    continue

                return "AlmondAI could not process your request right now due to a temporary network issue."

        return "AlmondAI could not process your request right now due to a temporary network issue."
