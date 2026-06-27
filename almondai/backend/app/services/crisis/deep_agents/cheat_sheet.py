"""
Deep Agent — Cheat Sheet Generator

Runs overnight. Produces a one-page visual cheat sheet
(structured JSON, rendered by the frontend as a bento grid)
covering must-know mnemonics, key formulas, and exam traps.
"""
from __future__ import annotations

import logging
from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

logger = logging.getLogger(__name__)


async def generate_cheat_sheet(payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload keys:
      - must_know: list[str]
      - exam_name: str
      - subjects: list[str]
      - sacrifice_list: list[dict]   (to warn about gaps)
    """
    must_know: list[str] = payload.get("must_know", [])
    exam_name: str = payload.get("exam_name", "Medical Exam")
    subjects: list[str] = payload.get("subjects", [])

    if not must_know:
        return {"error": "No must-know topics provided for cheat sheet"}

    topic_list = "\n".join(f"- {t}" for t in must_know[:18])
    prompt = (
        f"Create a rapid-revision cheat sheet for {exam_name} covering: {', '.join(subjects)}.\n\n"
        f"Must-know topics:\n{topic_list}\n\n"
        "Return ONLY this JSON:\n"
        "{\n"
        '  "title": "Cheat Sheet — [Exam Name]",\n'
        '  "sections": [\n'
        '    {\n'
        '      "heading": "Mnemonics & Memory Tricks",\n'
        '      "items": [\n'
        '        {"topic": "topic name", "mnemonic": "...", "what_it_stands_for": "..."}\n'
        "      ]\n"
        "    },\n"
        '    {\n'
        '      "heading": "Key Classifications",\n'
        '      "items": [\n'
        '        {"topic": "topic name", "classification": "..."}\n'
        "      ]\n"
        "    },\n"
        '    {\n'
        '      "heading": "Examiner Traps",\n'
        '      "items": [\n'
        '        {"topic": "topic name", "trap": "common mistake", "correct_answer": "..."}\n'
        "      ]\n"
        "    },\n"
        '    {\n'
        '      "heading": "Last-Minute High-Yield Points",\n'
        '      "items": [\n'
        '        {"point": "one crucial fact"}\n'
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
    )
    system = (
        "You are a medical exam cheat sheet specialist. "
        "Every fact must be clinically accurate and exam-relevant. "
        "Mnemonics should be memorable. Traps should be real. "
        "Respond only with valid JSON."
    )

    for attempt in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=3000, tier="premium"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("sections"), list):
                return parsed
        except Exception as exc:
            logger.warning("CheatSheet attempt %d failed: %s", attempt + 1, exc)

    return {"error": "Cheat sheet generation failed", "topics_attempted": must_know}
