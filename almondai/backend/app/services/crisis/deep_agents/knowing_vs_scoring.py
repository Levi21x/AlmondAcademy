"""
Deep Agent — Knowing vs Scoring Analyser

Runs overnight. Compares what the student knows (from jar notes + progress)
against what actually scores marks (from strategy.examiner_intel).
Surfaces the gap between knowledge and marks-ability.
"""
from __future__ import annotations

import logging
from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

logger = logging.getLogger(__name__)


async def generate_knowing_vs_scoring(payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload keys:
      - high_freq_topics: list[str]   from examiner_intel
      - must_know: list[str]          from crisis_plan
      - notes_audit: dict             from notes_auditor agent
      - exam_name: str
      - readiness_score: float
    """
    high_freq: list[str] = payload.get("high_freq_topics", [])
    must_know: list[str] = payload.get("must_know", [])
    notes_audit: dict = payload.get("notes_audit", {})
    exam_name: str = payload.get("exam_name", "your exam")
    readiness_score: float = float(payload.get("readiness_score", 50))

    gaps = notes_audit.get("gaps", [])
    audit_summary = notes_audit.get("audit_summary", "")

    hf_list = "\n".join(f"- {t}" for t in high_freq[:12])
    mk_list = "\n".join(f"- {t}" for t in must_know[:12])
    gaps_text = "\n".join(f"- {g.get('topic', '')}: {g.get('issue', '')}" for g in gaps[:8])

    prompt = (
        f"Analyse the gap between what this student knows and what scores marks in {exam_name}.\n\n"
        f"Readiness score: {readiness_score:.0f}/100\n\n"
        f"High-frequency exam topics (what scores marks):\n{hf_list or 'Not available'}\n\n"
        f"Must-know from plan (what student is studying):\n{mk_list or 'Not available'}\n\n"
        f"Note gaps identified in student's notes:\n{gaps_text or 'No gaps identified'}\n\n"
        f"Notes audit summary: {audit_summary or 'No audit available'}\n\n"
        "Return ONLY this JSON:\n"
        "{\n"
        '  "knowing_but_not_scoring": [\n'
        '    {"topic": "...", "issue": "knows it but won\'t present it in exam-style"}\n'
        "  ],\n"
        '  "scoring_but_not_knowing": [\n'
        '    {"topic": "...", "risk": "likely to appear but has knowledge gap"}\n'
        "  ],\n"
        '  "aligned": [\n'
        '    {"topic": "...", "confidence": "high"}\n'
        "  ],\n"
        '  "overall_gap_severity": "low|moderate|high",\n'
        '  "top_priority_fix": "The single most impactful thing to do right now",\n'
        '  "insight": "2-sentence insight on the knowing-vs-scoring gap for this student"\n'
        "}"
    )
    system = (
        "You are a medical exam strategy analyst. "
        "Identify where knowledge and exam performance diverge. "
        "Be specific and actionable. Respond only with valid JSON."
    )

    for attempt in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=1500, tier="premium"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("overall_gap_severity"), str):
                return parsed
        except Exception as exc:
            logger.warning("KnowingVsScoring attempt %d failed: %s", attempt + 1, exc)

    return {
        "error": "Analysis failed",
        "overall_gap_severity": "moderate",
        "top_priority_fix": "Focus on presenting what you know in exam-answer format",
        "insight": "Unable to complete deep analysis at this time. Retry later.",
    }
