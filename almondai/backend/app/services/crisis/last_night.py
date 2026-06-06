from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any, Dict, List

from app.services.llm.openrouter_client import generate_with_fallback_sync


def _extract_json(raw: str) -> Dict[str, Any]:
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass
    return {}


async def generate_last_night_plan(
    exam_name: str,
    subjects: List[str],
    hours_available: float,
) -> Dict[str, Any]:
    """
    Emergency last-night revision plan for students with ≤ 12 hours to exam.
    Focuses on ultra-high-yield facts, mnemonics, and viva hot topics only.
    No day-by-day plan — just an hour-by-hour survival sprint.
    """
    hour_blocks = min(max(int(hours_available), 1), 12)

    system_prompt = (
        "You are an emergency medical exam preparation specialist. "
        "The student has their exam in a matter of hours. "
        "Give them the most impactful possible last-minute revision plan. "
        "Respond ONLY with valid JSON. Be ruthlessly practical and specific."
    )

    user_prompt = f"""
LAST-NIGHT EMERGENCY REVISION

Exam: {exam_name}
Hours available: {hours_available}
Subjects: {subjects}

Generate an emergency revision plan. Focus ONLY on:
- Ultra-high-yield facts that frequently appear
- Critical mnemonics that stick
- Viva hot topics examiners always ask
- One-liners for maximum marks in minimum time

Return ONLY this JSON:
{{
  "strategy": "One brutal honest sentence about how to use the next {hours_available} hours",
  "hour_by_hour": [
    {{
      "hour": 1,
      "time_slot": "Hour 1",
      "focus": "Subject: Specific topic",
      "activity": "rapid_read",
      "key_facts": ["fact 1", "fact 2", "fact 3"],
      "mnemonic": "Mnemonic if applicable or empty string",
      "why_now": "Why prioritise this topic right before the exam"
    }}
  ],
  "ultra_high_yield_facts": [
    "One-liner fact that will definitely be tested"
  ],
  "critical_mnemonics": [
    "MNEMONIC: what it stands for — quick explanation"
  ],
  "viva_hot_topics": [
    "Topic examiners love to ask about"
  ],
  "do_not_study": [
    "Topic to completely skip — not worth it now"
  ],
  "exam_day_strategy": "Specific advice for the exam itself tomorrow"
}}

Rules:
- Exactly {hour_blocks} hour blocks (hour 1 through {hour_blocks})
- Each block covers one specific topic (not a whole subject)
- ultra_high_yield_facts: 10-15 one-liners
- critical_mnemonics: 5-8 mnemonics
- viva_hot_topics: 8-12 topics
- do_not_study: 5-8 topics to skip entirely
- Be honest — no empty encouragement
- Subjects: {subjects}
"""

    last_error: Exception | None = None
    for _attempt in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=3000,
                tier="default",
            )
            parsed = _extract_json(raw)
            if not parsed or not isinstance(parsed.get("hour_by_hour"), list):
                raise ValueError("Invalid last-night plan JSON")

            # Normalise hour blocks
            raw_hours = parsed.get("hour_by_hour", [])
            normalized: List[Dict[str, Any]] = []
            for i in range(hour_blocks):
                block = dict(raw_hours[i]) if i < len(raw_hours) and isinstance(raw_hours[i], dict) else {}
                block["hour"] = i + 1
                block["time_slot"] = f"Hour {i + 1}"
                block.setdefault("key_facts", [])
                block.setdefault("mnemonic", "")
                normalized.append(block)
            parsed["hour_by_hour"] = normalized

            for key in ("ultra_high_yield_facts", "critical_mnemonics", "viva_hot_topics", "do_not_study"):
                if not isinstance(parsed.get(key), list):
                    parsed[key] = []

            return parsed
        except Exception as exc:
            last_error = exc
            continue

    raise ValueError(f"Failed to generate last-night plan: {last_error}")
