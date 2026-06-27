"""
Pod A — Planner Agent

Builds the hour-by-hour schedule DETERMINISTICALLY.
LLM is only used for 3 narrative fields (crisis_summary, survival_strategy, emergency_tips).
Numbers are NEVER produced by the LLM.
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json, _score_topic

from .base import BaseAgent


def _advance(h: int, m: int, minutes: int) -> tuple[int, int]:
    total = h * 60 + m + minutes
    return total // 60, total % 60


def _fmt_time(h: int, m: int) -> str:
    period = "AM" if h < 12 else "PM"
    display_h = h if h <= 12 else h - 12
    display_h = 12 if display_h == 0 else display_h
    return f"{display_h}:{m:02d} {period}"


def _build_blocks(topics: list[dict], is_revision: bool) -> list[dict]:
    blocks = []
    h, m = 9, 0
    duration = 60 if is_revision else 90

    for i, topic in enumerate(topics):
        if i > 0 and i % 2 == 0:
            h, m = _advance(h, m, 15)  # 15-min break

        end_h, end_m = _advance(h, m, duration)
        blocks.append({
            "time_block": f"{_fmt_time(h, m)} - {_fmt_time(end_h, end_m)}",
            "subject": topic.get("subject", ""),
            "topic": topic.get("name", ""),
            "activity": "revision" if is_revision else "study",
            "key_points": [],
            "exam_tip": "",
            "duration_minutes": duration,
        })
        h, m = end_h, end_m

    return blocks


def _build_schedule_deterministic(
    topics_sorted: list[dict],
    days_remaining: int,
    hours_per_day: float,
) -> tuple[list[dict], list[dict]]:
    """Returns (days_list, studied_topics_list)."""
    topics_per_day = max(1, int(hours_per_day / 1.5))
    study_days = max(1, round(days_remaining * 0.7))
    study_capacity = study_days * topics_per_day
    study_topics = topics_sorted[:study_capacity]

    days: list[dict] = []
    topic_idx = 0
    studied: list[dict] = []
    today = date.today()

    for day_num in range(1, days_remaining + 1):
        day_date = (today + timedelta(days=day_num - 1)).isoformat()
        is_revision = day_num > study_days

        if is_revision:
            if studied:
                cycle_size = min(topics_per_day, len(studied))
                offset = ((day_num - study_days - 1) * cycle_size) % len(studied)
                day_topics = [studied[(offset + i) % len(studied)] for i in range(cycle_size)]
            else:
                day_topics = []

            blocks = _build_blocks(day_topics, is_revision=True)
            subjects_today = list(dict.fromkeys(t.get("subject", "") for t in day_topics))
            theme = f"Spaced Recall — {' + '.join(subjects_today[:2])}" if subjects_today else "Spaced Revision"
            goal = f"Reinforce {len(day_topics)} topic(s) through active recall"
            revision_topics = [t.get("name", "") for t in day_topics]
        else:
            day_topics = study_topics[topic_idx:topic_idx + topics_per_day]
            topic_idx += len(day_topics)
            studied.extend(day_topics)

            blocks = _build_blocks(day_topics, is_revision=False)
            subjects_today = list(dict.fromkeys(t.get("subject", "") for t in day_topics))
            theme = f"High-Yield {' + '.join(subjects_today[:2])}" if subjects_today else "High-Yield Focus"
            names = [t.get("name", "") for t in day_topics[:3]]
            goal = f"Master: {', '.join(names)}" if names else "Complete today's priority blocks"
            revision_topics = []

        days.append({
            "day": day_num,
            "date": day_date,
            "theme": theme,
            "hours": blocks,
            "daily_goal": goal,
            "revision_topics": revision_topics,
        })

    return days, studied


async def _get_narrative(
    exam_name: str,
    days_remaining: int,
    hours_per_day: float,
    preparation_level: str,
    readiness_score: float,
    study_topics: list[dict],
    panic_detected: bool,
) -> dict[str, Any]:
    topic_summary = ", ".join(
        f"{t.get('subject', '')}/{t.get('name', '')}"
        for t in study_topics[:15]
    )
    panic_line = " Student is in panic mode — be supportive but honest." if panic_detected else ""
    prompt = (
        f"Medical exam crisis plan for {exam_name}. "
        f"{days_remaining} days left, {hours_per_day}h/day, readiness {readiness_score:.0f}/100, "
        f"preparation level: {preparation_level}.{panic_line}\n"
        f"Top study topics (already scheduled): {topic_summary}\n\n"
        "Return ONLY this JSON:\n"
        '{"crisis_summary": "2-3 sentence honest assessment", '
        '"survival_strategy": "core approach for these specific days", '
        '"emergency_tips": ["tip1", "tip2", "tip3", "tip4", "tip5"]}'
    )
    system = (
        "You are an expert medical exam coach. Write honest, warm, direct guidance. "
        "Never invent timings, scores, or topic counts. Respond only with valid JSON."
    )
    try:
        raw = await generate_with_fallback_sync(prompt=prompt, system_prompt=system, max_tokens=600, tier="fast")
        parsed = _extract_json(raw)
        if parsed and isinstance(parsed.get("crisis_summary"), str):
            return parsed
    except Exception:
        pass
    return {
        "crisis_summary": f"You have {days_remaining} days. Focus on high-yield topics first, revise in the final 30% of time.",
        "survival_strategy": "Cover must-know topics in the first 70% of days, then switch to spaced recall.",
        "emergency_tips": [
            "Start with the highest-yield topic every single day",
            "No new topics in the final revision phase",
            "Active recall beats passive reading by 3x",
            "Sleep is not optional — it consolidates memory",
            "Check off each block as you finish it",
        ],
    }


class PlannerAgent(BaseAgent):
    name = "planner"
    _timeout_s = 25.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        topic_data: list[dict] = state.get("topic_data", [])
        days_remaining: int = state.get("days_remaining", 3)
        hours_per_day: float = float(state.get("hours_per_day", 6.0))
        preparation_level: str = state.get("preparation_level", "moderate")
        exam_name: str = state.get("exam_name", "Exam")
        readiness_result: dict = state.get("readiness_result", {})
        panic_result: dict = state.get("panic_result", {})

        # Apply softening if panic detected
        if panic_result.get("detected"):
            hours_per_day = round(hours_per_day * 0.85, 1)

        # Sort topics by exam-relevance score descending (DETERMINISTIC)
        topics_sorted = sorted(topic_data, key=_score_topic, reverse=True)

        days, studied_topics = _build_schedule_deterministic(
            topics_sorted=topics_sorted,
            days_remaining=days_remaining,
            hours_per_day=hours_per_day,
        )

        # LLM only writes narrative — no numbers
        narrative = await _get_narrative(
            exam_name=exam_name,
            days_remaining=days_remaining,
            hours_per_day=hours_per_day,
            preparation_level=preparation_level,
            readiness_score=float(readiness_result.get("readiness_score", 50)),
            study_topics=topics_sorted[:20],
            panic_detected=bool(panic_result.get("detected")),
        )

        return {
            "crisis_summary": narrative.get("crisis_summary", ""),
            "survival_strategy": narrative.get("survival_strategy", ""),
            "emergency_tips": narrative.get("emergency_tips", []),
            "days": days,
            "studied_topic_names": [t.get("name", "") for t in studied_topics],
            "topics_per_day": max(1, int(hours_per_day / 1.5)),
            "effective_hours_per_day": hours_per_day,
        }
