"""
Deep Agent — Mock Paper Generator

Runs overnight in the job queue.
Produces a full mock exam paper with MCQs and SAQs
derived from the strategy's must-know topics.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

logger = logging.getLogger(__name__)


async def generate_mock_paper(payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload keys:
      - must_know: list[str]
      - exam_name: str
      - subjects: list[str]
      - high_freq_topics: list[str]
    Returns the artifact content dict.
    """
    must_know: list[str] = payload.get("must_know", [])
    exam_name: str = payload.get("exam_name", "Medical Exam")
    subjects: list[str] = payload.get("subjects", [])
    high_freq: list[str] = payload.get("high_freq_topics", [])

    combined_topics = list(dict.fromkeys(must_know + high_freq))[:20]

    if not combined_topics:
        return {"error": "No topics available for mock paper"}

    topic_list = "\n".join(f"- {t}" for t in combined_topics)
    prompt = (
        f"Generate a comprehensive mock exam paper for {exam_name}.\n"
        f"Subjects: {', '.join(subjects)}\n\n"
        f"Priority topics (from the student's War Room plan):\n{topic_list}\n\n"
        "Return ONLY this JSON:\n"
        "{\n"
        '  "title": "Mock Paper — [Exam Name]",\n'
        '  "instructions": "General exam instructions",\n'
        '  "sections": [\n'
        '    {\n'
        '      "name": "Section A — MCQs",\n'
        '      "marks": 40,\n'
        '      "questions": [\n'
        '        {\n'
        '          "number": 1,\n'
        '          "stem": "Question text",\n'
        '          "options": {"A": "...", "B": "...", "C": "...", "D": "..."},\n'
        '          "answer": "A",\n'
        '          "explanation": "Why A is correct",\n'
        '          "topic": "topic name",\n'
        '          "marks": 1\n'
        "        }\n"
        "      ]\n"
        "    },\n"
        '    {\n'
        '      "name": "Section B — Short Answer",\n'
        '      "marks": 30,\n'
        '      "questions": [\n'
        '        {\n'
        '          "number": 1,\n'
        '          "question": "Write short notes on...",\n'
        '          "key_points": ["point 1", "point 2"],\n'
        '          "topic": "topic name",\n'
        '          "marks": 5\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "total_marks": 70,\n'
        '  "time_allowed_minutes": 180\n'
        "}"
    )
    system = (
        "You are an expert medical exam paper setter. "
        "Generate clinically accurate MBBS-level questions. "
        "Section A: 20 MCQs (1 mark each = 20 marks). "
        "Section B: 6 short-answer questions (5 marks each = 30 marks). "
        "All answers must be factually correct. Respond only with valid JSON."
    )

    for attempt in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=5000, tier="premium"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("sections"), list):
                return parsed
        except Exception as exc:
            logger.warning("MockPaper attempt %d failed: %s", attempt + 1, exc)

    return {
        "error": "Mock paper generation failed after 3 attempts",
        "topics_attempted": combined_topics,
    }
