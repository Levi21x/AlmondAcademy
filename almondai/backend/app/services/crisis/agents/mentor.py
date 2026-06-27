"""
Pod C — Mentor Agent (LLM)

Generates the warm, personalised opening message from
the Chief Resident — calibrated to stress level, days remaining,
and panic detection. One LLM call; short output.
"""
from __future__ import annotations

from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

from .base import BaseAgent

_TONE_MAP = {
    (True, True): "ultra_supportive",    # panic + very few days
    (True, False): "supportive",          # panic, more days
    (False, True): "calm_urgency",        # no panic, tight deadline
    (False, False): "focused",            # no panic, time available
}

_FALLBACKS = {
    "ultra_supportive": (
        "I see you. Take one breath — in through the nose, out through the mouth. "
        "Good. Now listen: you have more time than it feels right now. "
        "We're going to work through this together, one topic at a time. "
        "Your team is assembled. Trust the plan."
    ),
    "supportive": (
        "You came here, which means you're already ahead of the students who haven't started. "
        "The plan is set. The team has your back. Let's begin."
    ),
    "calm_urgency": (
        "The clock is real, but so is your capability. "
        "Your schedule is optimised for maximum marks per hour remaining. "
        "Start with block one — everything else follows from that first move."
    ),
    "focused": (
        "You have everything you need. Your schedule is locked, your priorities are clear. "
        "First block starts now — your team will check in as you progress."
    ),
}


class MentorAgent(BaseAgent):
    name = "mentor"
    _timeout_s = 15.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        exam_name: str = state.get("exam_name", "your exam")
        days_remaining: int = int(state.get("days_remaining", 3))
        stress_level: int = int(state.get("stress_level", 5))
        panic_result: dict = state.get("panic_result", {})
        readiness_result: dict = state.get("readiness_result", {})
        preparation_level: str = state.get("preparation_level", "moderate")

        is_panic = bool(panic_result.get("detected"))
        is_tight = days_remaining <= 2
        tone = _TONE_MAP.get((is_panic, is_tight), "focused")
        readiness_score = float(readiness_result.get("readiness_score", 50))

        prompt = (
            f"Write a 3-sentence opening message from a Chief Resident to a medical student in crisis.\n\n"
            f"Context:\n"
            f"- Exam: {exam_name}\n"
            f"- Days remaining: {days_remaining}\n"
            f"- Stress level: {stress_level}/10\n"
            f"- Panic mode: {'YES' if is_panic else 'no'}\n"
            f"- Readiness: {readiness_score:.0f}/100\n"
            f"- Preparation level: {preparation_level}\n"
            f"- Required tone: {tone}\n\n"
            "Rules:\n"
            "- Address the student directly (use 'you')\n"
            "- No medical jargon\n"
            "- No false promises\n"
            "- End with a concrete first action\n"
            "- 3 sentences maximum\n\n"
            'Return ONLY: {"opening": "...message...", "tone": "tone_value", "first_action": "do X right now"}'
        )
        system = (
            "You are a warm, direct Chief Resident mentor. "
            "Be honest but never harsh. Be specific, not motivational-poster vague. "
            "Respond only with valid JSON."
        )

        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=300, tier="default"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("opening"), str):
                return parsed
        except Exception:
            pass

        return {
            "opening": _FALLBACKS.get(tone, _FALLBACKS["focused"]),
            "tone": tone,
            "first_action": "Open your schedule and start Block 1 right now",
        }
