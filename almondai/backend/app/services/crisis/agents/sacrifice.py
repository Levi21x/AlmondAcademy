"""
Pod A — Sacrifice Agent (DETERMINISTIC — no LLM)

Calculates which topics to drop to close the time deficit,
and how many estimated marks can still be achieved.
"""
from __future__ import annotations

from typing import Any

from app.services.crisis.crisis_generator import _score_topic

from .base import BaseAgent


def _topic_mark_weight(topic: dict) -> int:
    w = 0
    if topic.get("is_high_yield"):
        w += 3
    if topic.get("neet_pg_relevant"):
        w += 2
    return max(1, w)


def _compute_sacrifice(
    topic_data: list[dict],
    hours_needed: float,
    hours_available: float,
) -> dict[str, Any]:
    deficit = max(0.0, hours_needed - hours_available)
    hours_per_topic = 1.5

    # Sort ascending by score — lowest score = best sacrifice candidate
    scored = sorted(topic_data, key=_score_topic)

    total_marks = sum(_topic_mark_weight(t) for t in topic_data)
    sacrificed_marks = 0
    sacrifice_list: list[dict] = []
    hours_recovered = 0.0

    for topic in scored:
        if hours_recovered >= deficit:
            break
        if topic.get("is_high_yield") and topic.get("weakness_priority") == "critical":
            # Never sacrifice a critical-weak high-yield topic
            continue

        tw = _topic_mark_weight(topic)
        sacrifice_list.append({
            "topic": topic.get("name", ""),
            "subject": topic.get("subject", ""),
            "reason": _sacrifice_reason(topic),
            "hours_saved": hours_per_topic,
        })
        sacrificed_marks += tw
        hours_recovered += hours_per_topic

    sacrificed_names = {s["topic"] for s in sacrifice_list}
    retain_list = [
        {"topic": t.get("name", ""), "subject": t.get("subject", "")}
        for t in sorted(topic_data, key=_score_topic, reverse=True)
        if t.get("name") not in sacrificed_names
    ]

    retained_marks = total_marks - sacrificed_marks
    marks_coverage = round(min(100, (retained_marks / total_marks * 100)) if total_marks > 0 else 70, 1)

    return {
        "sacrifice_list": sacrifice_list,
        "retain_list": retain_list[:40],
        "estimated_marks_coverage": marks_coverage,
        "total_sacrifice_hours": round(hours_recovered, 1),
        "hours_deficit_closed": hours_recovered >= deficit,
        "original_deficit_hours": round(deficit, 1),
    }


def _sacrifice_reason(topic: dict) -> str:
    if not topic.get("is_high_yield") and not topic.get("neet_pg_relevant"):
        return "Low exam frequency — not high-yield or NEET-PG relevant"
    d = topic.get("difficulty", "medium")
    if d == "hard" and not topic.get("weakness_priority"):
        return "Hard topic with no tracked weakness — high time cost, low ROI"
    status = topic.get("status", "")
    if status == "completed":
        return "Already completed — only needs quick skim, not deep study"
    return "Lower priority given time constraint — revisit only if time allows"


class SacrificeAgent(BaseAgent):
    name = "sacrifice"
    _timeout_s = 5.0  # fully deterministic — should be near-instant

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        topic_data: list[dict] = state.get("topic_data", [])
        readiness_result: dict = state.get("readiness_result", {})

        hours_needed = float(readiness_result.get("hours_needed_estimate", len(topic_data) * 1.5))
        hours_available = float(readiness_result.get("hours_available", 0))

        return _compute_sacrifice(
            topic_data=topic_data,
            hours_needed=hours_needed,
            hours_available=hours_available,
        )
