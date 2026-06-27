"""
Pod A — Examiner Intel Agent (LLM)

Reads PYQ / exam-pattern items from the Almond Jar and
extracts high-frequency topic patterns, likely questions,
and examiner traps. Falls back gracefully to a topic-data
frequency analysis if the jar is empty.
"""
from __future__ import annotations

from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json, _score_topic

from .base import BaseAgent


def _extract_pyq_text(jar_items: list[dict]) -> str:
    """Collect relevant jar items for examiner analysis."""
    relevant = [
        item for item in jar_items
        if item.get("item_category") in ("pyq_cram", "graded_feedback", "datesheet")
        or item.get("is_graded_script")
    ]
    if not relevant:
        return ""
    chunks = []
    for item in relevant[:6]:  # max 6 items to stay within token budget
        text = (item.get("extracted_text") or item.get("raw_text") or "").strip()
        if text:
            chunks.append(f"[{item.get('item_category', 'unknown')}]\n{text[:1200]}")
    return "\n\n---\n\n".join(chunks)


def _fallback_from_topics(topic_data: list[dict], exam_name: str) -> dict[str, Any]:
    """Deterministic fallback when jar has no PYQ material."""
    high_yield = sorted(
        [t for t in topic_data if t.get("is_high_yield")],
        key=_score_topic,
        reverse=True,
    )
    return {
        "high_freq_topics": [t.get("name", "") for t in high_yield[:8]],
        "likely_questions": [
            f"Classify / compare the types of {t.get('name', '')}"
            for t in high_yield[:3]
        ],
        "examiner_traps": [],
        "note": "No PYQ material in jar — frequency derived from high-yield topic flags",
        "jar_items_analysed": 0,
    }


class ExaminerIntelAgent(BaseAgent):
    name = "examiner_intel"
    _timeout_s = 20.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        jar_items: list[dict] = state.get("jar_items", [])
        topic_data: list[dict] = state.get("topic_data", [])
        exam_name: str = state.get("exam_name", "the exam")
        subjects: list[str] = state.get("subjects", [])

        pyq_text = _extract_pyq_text(jar_items)

        if not pyq_text:
            return _fallback_from_topics(topic_data, exam_name)

        prompt = (
            f"You are an expert medical examiner analyst for {exam_name}.\n"
            f"Subjects: {', '.join(subjects)}\n\n"
            "Analyse the following PYQ / exam material from the student's Almond Jar:\n\n"
            f"{pyq_text}\n\n"
            "Return ONLY this JSON (no explanation):\n"
            "{\n"
            '  "high_freq_topics": ["topic name 1", "topic name 2"],\n'
            '  "likely_questions": ["One concrete likely exam question", "Another"],\n'
            '  "examiner_traps": ["A common mistake examiner looks for", "Another trap"],\n'
            '  "note": "one-line observation about the PYQ pattern"\n'
            "}"
        )
        system = (
            "Extract factual patterns from the provided exam material only. "
            "Do not invent questions not supported by the material. "
            "Keep topic names precise. Respond only with valid JSON."
        )

        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=700, tier="default"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("high_freq_topics"), list):
                parsed["jar_items_analysed"] = len([i for i in jar_items if _extract_pyq_text([i])])
                return parsed
        except Exception:
            pass

        return _fallback_from_topics(topic_data, exam_name)
