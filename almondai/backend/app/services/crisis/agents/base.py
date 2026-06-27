"""
Shared base for every War Room agent.

Design contract:
- Each agent exposes one async `run(state) -> AgentResult`.
- Agents are PURE: they return a result dict; they do NOT write to DB.
- Deterministic agents must not call any LLM.
- LLM agents must not invent numerical scores — they narrate pre-computed data.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    agent: str
    success: bool
    output: dict[str, Any]
    duration_ms: int = 0
    error: str | None = None

    @classmethod
    def ok(cls, agent: str, output: dict[str, Any], duration_ms: int = 0) -> "AgentResult":
        return cls(agent=agent, success=True, output=output, duration_ms=duration_ms)

    @classmethod
    def fail(cls, agent: str, error: str, duration_ms: int = 0) -> "AgentResult":
        return cls(agent=agent, success=False, output={}, duration_ms=duration_ms, error=error)


class BaseAgent:
    name: str = "base"
    _timeout_s: float = 30.0

    async def run(self, state: dict[str, Any]) -> AgentResult:
        t0 = time.monotonic()
        try:
            result = await asyncio.wait_for(self._execute(state), timeout=self._timeout_s)
            return AgentResult.ok(
                agent=self.name,
                output=result,
                duration_ms=int((time.monotonic() - t0) * 1000),
            )
        except asyncio.TimeoutError:
            elapsed = int((time.monotonic() - t0) * 1000)
            logger.warning("Agent %s timed out after %dms", self.name, elapsed)
            return AgentResult.fail(self.name, "timeout", elapsed)
        except Exception as exc:
            elapsed = int((time.monotonic() - t0) * 1000)
            logger.exception("Agent %s failed: %s", self.name, exc)
            return AgentResult.fail(self.name, str(exc), elapsed)

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
