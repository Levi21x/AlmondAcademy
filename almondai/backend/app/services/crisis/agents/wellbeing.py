"""
Pod C — Wellbeing Agent (DETERMINISTIC — no LLM)

Checks sleep, stress, breaks, and time-of-day signals.
Produces a structured wellbeing assessment with concrete recommendations.
Never calls an LLM — all logic is rule-based.
"""
from __future__ import annotations

from typing import Any

from .base import BaseAgent


def _sleep_status(hours_per_day: float) -> tuple[str, str]:
    study = min(hours_per_day, 16)
    sleep_estimate = 24 - study - 3  # 3h for meals/misc
    if sleep_estimate < 5:
        return "critical", "You're scheduling less than 5h sleep — memory consolidation will fail"
    if sleep_estimate < 6.5:
        return "warning", "Sleep under 6.5h hurts recall — protect at least 6h"
    return "ok", "Sleep allocation looks sustainable"


def _stress_assessment(stress_level: int) -> dict[str, Any]:
    if stress_level >= 8:
        return {
            "level": "high",
            "message": "Stress is very high — your cortisol is working against your memory right now",
            "action": "Box breathing (4-4-4-4) for 2 minutes before each study block",
            "allow_override": False,
        }
    if stress_level >= 5:
        return {
            "level": "moderate",
            "message": "Moderate stress detected — channel it into focus, not paralysis",
            "action": "5-minute walk between major subjects; no social media during breaks",
            "allow_override": True,
        }
    return {
        "level": "low",
        "message": "Stress looks manageable",
        "action": "Maintain your current rhythm",
        "allow_override": True,
    }


def _compute_breaks(hours_per_day: float) -> list[str]:
    blocks = []
    if hours_per_day >= 8:
        blocks.append("Mandatory 20-min break after every 90-min block")
        blocks.append("1 full hour off in the afternoon (12:00-13:00)")
    elif hours_per_day >= 5:
        blocks.append("15-min break every 2 study blocks")
    else:
        blocks.append("Short stretch between each topic")

    blocks.append("No screens 30 minutes before sleep")
    return blocks


class WellbeingAgent(BaseAgent):
    name = "wellbeing"
    _timeout_s = 3.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        stress_level: int = int(state.get("stress_level", 5))
        hours_per_day: float = float(state.get("hours_per_day", 6.0))
        days_remaining: int = int(state.get("days_remaining", 3))
        panic_result: dict = state.get("panic_result", {})

        sleep_status, sleep_message = _sleep_status(hours_per_day)
        stress = _stress_assessment(stress_level)
        breaks = _compute_breaks(hours_per_day)

        # Override all-nighter scenarios
        all_nighter_risk = hours_per_day > 14 or (days_remaining == 1 and stress_level >= 7)

        nudge_schedule: list[dict] = []
        if days_remaining >= 2:
            nudge_schedule.append({"type": "time_warning", "offset_hours": 12})
            nudge_schedule.append({"type": "sleep_call", "offset_hours": 20})
        if days_remaining >= 3:
            nudge_schedule.append({"type": "motivation", "offset_hours": 36})
        if panic_result.get("detected"):
            nudge_schedule.insert(0, {"type": "motivation", "offset_hours": 1})

        return {
            "sleep_status": sleep_status,
            "sleep_message": sleep_message,
            "stress": stress,
            "recommended_breaks": breaks,
            "all_nighter_risk": all_nighter_risk,
            "allow_override": stress["allow_override"] and not all_nighter_risk,
            "nudge_schedule": nudge_schedule,
            "wellbeing_tip": (
                "If it's past midnight, close your books. A rested 6-hour sprint beats "
                "an exhausted 12-hour drift every time."
                if all_nighter_risk else
                "Stay hydrated. Dehydration at 2% hurts cognitive performance more than a missed topic."
            ),
        }
