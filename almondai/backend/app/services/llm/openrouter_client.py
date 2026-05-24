from __future__ import annotations

import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

OPENROUTER_MODELS = {
    "premium": "openai/gpt-oss-120b:free",
    "default": "qwen/qwen3-next-80b-a3b-instruct:free",
    "fast": "nvidia/nemotron-nano-9b-v2:free",
}

_OPENROUTER_HEADERS = {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "AlmondAI Medical Tutor",
}

_RATE_LIMIT_CHUNK = "AlmondAI is processing many requests right now. Please try again in a moment."


class OpenRouterLLMClient:
    """Universal OpenRouter client — single entrypoint for all AlmondAI LLM calls."""

    def __init__(self, model_id: str) -> None:
        settings = get_settings()
        api_key = (settings.openrouter_api_key or "").strip()
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not set. Add it to backend/.env.")
        self.model = model_id
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
            default_headers=_OPENROUTER_HEADERS,
        )

    def _is_quota_error(self, exc: Exception) -> bool:
        msg = str(exc).lower()
        return any(tok in msg for tok in ("429", "rate limit", "quota", "insufficient_quota"))

    async def generate_sync(
        self,
        prompt: str,
        system_prompt: str,
        max_tokens: int = 1500,
    ) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            if self._is_quota_error(exc):
                raise ValueError(
                    f"OpenRouter quota/rate-limit on {self.model}. Falling back."
                ) from exc
            logger.exception("OpenRouter generate_sync failed (model=%s)", self.model)
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        stream: bool = True,
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        if not stream:
            result = await self.generate_sync(prompt, system_prompt, max_tokens)
            yield result
            return

        try:
            stream_resp = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream_resp:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except Exception as exc:
            if self._is_quota_error(exc):
                # Raise so pipeline.py can catch and run its fallback chain.
                raise ValueError(
                    f"OpenRouter quota/rate-limit on {self.model}. Falling back."
                ) from exc
            logger.exception("OpenRouter streaming failed (model=%s)", self.model)
            yield _RATE_LIMIT_CHUNK

    async def generate_with_messages(
        self,
        messages: list[dict],
        max_tokens: int = 300,
    ) -> str:
        """Voice pipeline variant — accepts a pre-built chat messages array (with history)."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as exc:
            if self._is_quota_error(exc):
                raise ValueError(
                    f"OpenRouter quota/rate-limit on {self.model}. Falling back."
                ) from exc
            logger.exception(
                "OpenRouter generate_with_messages failed (model=%s)", self.model
            )
            return "I could not process your request right now. Please try again."


# Fallback chain: premium → default → fast
_FALLBACK_CHAINS: dict[str, list[str]] = {
    "premium": ["premium", "default", "fast"],
    "default": ["default", "fast"],
    "fast": ["fast"],
}


async def generate_with_fallback_sync(
    prompt: str,
    system_prompt: str,
    max_tokens: int = 1500,
    tier: str = "default",
) -> str:
    """
    Tries the requested tier, automatically falling back on quota/rate-limit:
      premium → default → fast
      default → fast
      fast    → (raises if exhausted)

    Raises ValueError only when every tier in the chain is exhausted.
    """
    chain = _FALLBACK_CHAINS.get(tier, ["default", "fast"])
    last_exc: Exception | None = None
    for t in chain:
        try:
            client = OpenRouterLLMClient(OPENROUTER_MODELS[t])
            result = await client.generate_sync(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
            )
            if t != tier:
                logger.warning("OpenRouter runtime fallback: %s → %s", tier, t)
            return result
        except ValueError as exc:
            logger.warning("OpenRouter %s quota/rate-limit: %s", t, exc)
            last_exc = exc
    raise ValueError(
        f"All OpenRouter tiers exhausted starting from '{tier}'. Last error: {last_exc}"
    )
