"""
Chief Resident — Fast-rail SSE narrator

Reads the assembled WarRoomState from orchestrator.activate_war_room()
and streams one calm, decisive opening to the frontend.
Narrates PRE-COMPUTED numbers only — never invents data.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncGenerator

logger = logging.getLogger(__name__)


async def stream_chief_resident_opening(
    war_room_result: dict[str, Any],
) -> AsyncGenerator[str, None]:
    """
    Yields SSE-ready text chunks that the frontend streams to the student.
    Falls back to a static message if anything goes wrong.
    """
    try:
        strategy = war_room_result.get("strategy", {})
        mentor = strategy.get("mentor", {})
        wellbeing = strategy.get("wellbeing", {})
        sacrifice = strategy.get("sacrifice", {})
        examiner = strategy.get("examiner_intel", {})
        recall = strategy.get("recall_deck", [])
        crisis_plan = war_room_result.get("crisis_plan", {})
        agent_results = war_room_result.get("agent_results", [])
        readiness = strategy.get("readiness", {})
        panic = strategy.get("panic", {})

        # Build the complete opening message in segments
        opening = mentor.get("opening", "Your team is ready. Let's begin.")
        first_action = mentor.get("first_action", "Open Block 1 of your schedule")
        marks_coverage = sacrifice.get("estimated_marks_coverage", 0)
        sacrifice_count = len(sacrifice.get("sacrifice_list", []))
        high_freq = examiner.get("high_freq_topics", [])[:3]
        cards_count = len(recall)
        days_plan = crisis_plan.get("days", [])
        day1 = days_plan[0] if days_plan else {}
        day1_topics = [b.get("topic", "") for b in day1.get("hours", []) if b.get("topic")]

        agents_succeeded = sum(1 for r in agent_results if r.get("success"))
        total_agents = len(agent_results)

        sleep_status = wellbeing.get("sleep_status", "ok")
        stress = wellbeing.get("stress", {})
        stress_action = stress.get("action", "")

        # Simulate streaming by yielding in small chunks
        segments = _build_segments(
            opening=opening,
            first_action=first_action,
            marks_coverage=marks_coverage,
            sacrifice_count=sacrifice_count,
            high_freq=high_freq,
            cards_count=cards_count,
            day1_topics=day1_topics,
            sleep_status=sleep_status,
            stress_action=stress_action,
            agents_succeeded=agents_succeeded,
            total_agents=total_agents,
            is_panic=bool(panic.get("detected")),
        )

        for segment in segments:
            yield segment
            await asyncio.sleep(0.04)  # pace the stream

    except Exception as exc:
        logger.exception("Chief Resident stream error: %s", exc)
        yield "Your War Room is assembled. Check your schedule and start with Block 1."


def _build_segments(
    opening: str,
    first_action: str,
    marks_coverage: float,
    sacrifice_count: int,
    high_freq: list[str],
    cards_count: int,
    day1_topics: list[str],
    sleep_status: str,
    stress_action: str,
    agents_succeeded: int,
    total_agents: int,
    is_panic: bool,
) -> list[str]:
    """Builds the narrative text in logical chunks for streaming."""
    parts: list[str] = []

    # Opening from Mentor agent
    parts.append(opening)

    # Sacrifice / coverage insight
    if marks_coverage > 0:
        parts.append(
            f"\n\nWith the optimised plan, you're targeting {marks_coverage:.0f}% of available marks"
            + (f" — we've set aside {sacrifice_count} low-ROI topic(s) to recover the time deficit." if sacrifice_count else ".")
        )

    # Day 1 preview
    if day1_topics:
        topics_preview = ", ".join(day1_topics[:3])
        parts.append(f"\n\nDay 1 starts with: **{topics_preview}**.")

    # Examiner intel snippet
    if high_freq:
        hf_str = ", ".join(high_freq[:2])
        parts.append(f" Examiner data flags **{hf_str}** as the highest-frequency areas.")

    # Recall cards
    if cards_count:
        parts.append(f"\n\n{cards_count} rapid-recall cue(s) are ready in your Artifacts — test yourself after each block.")

    # Wellbeing note (only if concerning)
    if sleep_status != "ok":
        parts.append(f"\n\n⚠ Wellbeing check: {stress_action}")
    elif stress_action:
        parts.append(f"\n\n{stress_action}")

    # First instruction
    parts.append(f"\n\n**{first_action}**")

    return parts


async def build_chief_resident_briefing(
    war_room_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Non-streaming version — returns a complete briefing object
    used by the non-SSE activate endpoint.
    """
    strategy = war_room_result.get("strategy", {})
    mentor = strategy.get("mentor", {})
    sacrifice = strategy.get("sacrifice", {})
    examiner = strategy.get("examiner_intel", {})
    recall = strategy.get("recall_deck", [])
    wellbeing = strategy.get("wellbeing", {})

    return {
        "opening": mentor.get("opening", "Your team is ready."),
        "first_instruction": mentor.get("first_action", "Start Block 1 now"),
        "tone": mentor.get("tone", "focused"),
        "marks_coverage": sacrifice.get("estimated_marks_coverage", 0),
        "sacrifice_count": len(sacrifice.get("sacrifice_list", [])),
        "high_freq_topics": examiner.get("high_freq_topics", []),
        "recall_cards": recall,
        "wellbeing_tip": wellbeing.get("wellbeing_tip", ""),
        "nudge_schedule": wellbeing.get("nudge_schedule", []),
    }
