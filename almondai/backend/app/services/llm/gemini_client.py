from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GeminiLLMClient:
    def __init__(self) -> None:
        from google import genai

        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not set")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = "gemini-2.0-flash"

    async def generate_sync(self, prompt: str, system_prompt: str, max_tokens: int = 1500) -> str:
        full_prompt = f"{system_prompt}\n\n{prompt}"
        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.models.generate_content(
                    model=self._model,
                    contents=full_prompt,
                    config={
                        "max_output_tokens": max_tokens,
                        "temperature": 0.7,
                    },
                ),
            )
            return response.text or ""
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                raise ValueError("Gemini quota exhausted. Falling back to next model.") from exc
            logger.exception("Gemini generate_sync failed")
            raise

    async def generate(
        self, prompt: str, system_prompt: str, stream: bool = True, max_tokens: int = 1500
    ) -> AsyncGenerator[str, None]:
        full_prompt = f"{system_prompt}\n\n{prompt}"
        loop = asyncio.get_running_loop()
        try:
            if stream:
                queue: asyncio.Queue[str | None] = asyncio.Queue()
                stream_error: list[Exception] = []

                def _stream_sync() -> None:
                    try:
                        for chunk in self._client.models.generate_content_stream(
                            model=self._model,
                            contents=full_prompt,
                            config={
                                "max_output_tokens": max_tokens,
                                "temperature": 0.7,
                            },
                        ):
                            text = getattr(chunk, "text", None)
                            if text:
                                asyncio.run_coroutine_threadsafe(queue.put(text), loop)
                    except Exception as exc:
                        stream_error.append(exc)
                    finally:
                        asyncio.run_coroutine_threadsafe(queue.put(None), loop)

                loop.run_in_executor(None, _stream_sync)
                while True:
                    item = await queue.get()
                    if item is None:
                        break
                    yield item
                if stream_error:
                    raise stream_error[0]
            else:
                response = await loop.run_in_executor(
                    None,
                    lambda: self._client.models.generate_content(
                        model=self._model,
                        contents=full_prompt,
                        config={
                            "max_output_tokens": max_tokens,
                            "temperature": 0.7,
                        },
                    ),
                )
                yield response.text or ""
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                raise ValueError("Gemini quota exhausted. Falling back to next model.") from exc
            logger.exception("Gemini generate failed")
            raise
