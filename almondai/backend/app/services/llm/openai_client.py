from __future__ import annotations

import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class OpenAILLMClient:
    """GPT-4o Mini client - primary model for AlmondAI standard queries."""

    def __init__(self) -> None:
        settings = get_settings()
        key = settings.openai_api_key
        if not key or key.strip() == "":
            raise ValueError(
                f"OPENAI_API_KEY not set. "
                f"Config reads: '{key}'. "
                f"Check backend/.env file."
            )
        api_key = key.strip()

        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"

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
            if "insufficient_quota" in str(exc) or "Error code: 429" in str(exc):
                raise ValueError("OpenAI quota exhausted. Falling back to next model.") from exc
            logger.exception("OpenAI generate_sync failed")
            raise

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        stream: bool = True,
        max_tokens: int = 1500,
    ) -> AsyncGenerator[str, None]:
        """Async generator - yields text chunks."""
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
            if "insufficient_quota" in str(exc) or "Error code: 429" in str(exc):
                raise ValueError("OpenAI quota exhausted. Falling back to next model.") from exc
            logger.exception("OpenAI streaming failed")
            raise
