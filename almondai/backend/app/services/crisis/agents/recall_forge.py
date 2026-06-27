"""
Pod B — Recall Forge Agent (LLM)

Generates lightweight rapid-recall cues (question + one-liner answer)
for the Day 1 topics to give the student an immediate test-yourself tool.
Capped at 15 cards to stay snappy and useful.
"""
from __future__ import annotations

import json
from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

from .base import BaseAgent


class RecallForgeAgent(BaseAgent):
    name = "recall_forge"
    _timeout_s = 20.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        topic_data: list[dict] = state.get("topic_data", [])
        schedule_topic_names: list[str] = state.get("schedule_topic_names", [])
        exam_name: str = state.get("exam_name", "the exam")

        # Priority: scheduled topics, then high-yield
        priority_names = set(schedule_topic_names[:8])
        priority_topics = [t for t in topic_data if t.get("name") in priority_names]
        if not priority_topics:
            priority_topics = sorted(
                [t for t in topic_data if t.get("is_high_yield")],
                key=lambda t: int(t.get("weakness_priority") == "critical"),
                reverse=True,
            )[:8]

        if not priority_topics:
            return {"cards": [], "note": "No topics available for recall cards"}

        topic_list = json.dumps(
            [{"topic": t.get("name", ""), "subject": t.get("subject", "")} for t in priority_topics],
            indent=2,
        )

        prompt = (
            f"Generate rapid-recall cues for a {exam_name} crisis student.\n\n"
            f"Topics:\n{topic_list}\n\n"
            "Rules:\n"
            "- 1–2 cards per topic (max 15 total)\n"
            "- Question must be concrete and exam-style\n"
            "- Answer: one crisp line (≤ 20 words)\n\n"
            "Return ONLY this JSON:\n"
            '{"cards": [{"q": "Question?", "a": "Answer.", "subject": "...", "topic": "..."}]}'
        )
        system = (
            "You are a medical exam rapid-recall specialist. "
            "Write high-yield MCQ-style question-answer pairs. "
            "Answers must be factually correct MBBS-level. "
            "Respond only with valid JSON."
        )

        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=1200, tier="default"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("cards"), list):
                cards = parsed["cards"][:15]
                return {"cards": cards, "note": f"Generated {len(cards)} recall cues for Day 1 topics"}
        except Exception:
            pass

        return {"cards": [], "note": "Recall cards will be ready shortly — try refreshing"}
