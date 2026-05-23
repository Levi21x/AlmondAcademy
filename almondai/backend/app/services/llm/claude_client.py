from __future__ import annotations

import logging
from typing import AsyncGenerator

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ClaudeLLMClient:
    def __init__(self) -> None:
        from anthropic import AsyncAnthropic

        settings = get_settings()
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not set")
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6"

    async def generate_sync(self, prompt: str, system_prompt: str) -> str:
        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception:
            logger.exception("Claude generate_sync failed")
            return "AlmondAI could not process your request via Claude right now."

    async def generate(
        self, prompt: str, system_prompt: str, stream: bool = True
    ) -> AsyncGenerator[str, None]:
        if stream:
            try:
                async with self.client.messages.stream(
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                ) as stream_response:
                    async for text in stream_response.text_stream:
                        yield text
            except Exception:
                logger.exception("Claude streaming failed")
                yield "AlmondAI could not process your request via Claude right now."
        else:
            result = await self.generate_sync(prompt, system_prompt)
            yield result
