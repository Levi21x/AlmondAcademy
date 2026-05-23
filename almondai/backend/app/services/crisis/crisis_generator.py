from __future__ import annotations

from datetime import date, timedelta
import json
from typing import Any, Dict, List

from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS


PREP_HINTS = {
    "zero": "cover absolute basics first",
    "little": "skip basics, focus on medium and high-yield topics",
    "moderate": "focus on gaps, weak areas, and high-yield revision",
    "good": "focus on revision, past patterns, and MCQ readiness",
}


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
    if start == -1 or end == -1 or end <= start:
        return {}

    candidate = text[start : end + 1]
    try:
        parsed = json.loads(candidate)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _calculate_days_remaining(exam_date: date) -> int:
    return (exam_date - date.today()).days


def _build_priority_context(
    subjects: List[str],
    preparation_level: str,
    subject_progress: List[Dict[str, Any]],
) -> Dict[str, Any]:
    selected = set(subjects)
    filtered_progress = [row for row in subject_progress if (row.get("subject_name") in selected)]

    prioritized = sorted(
        filtered_progress,
        key=lambda row: (
            int(row.get("completion_percentage", 0)),
            int(row.get("needs_revision", 0)) * -1,
            int(row.get("in_progress", 0)) * -1,
        ),
    )

    priority_subjects = [row.get("subject_name") for row in prioritized if row.get("subject_name")][:6]

    return {
        "priority_subjects": priority_subjects,
        "strategy_hint": PREP_HINTS.get(preparation_level, PREP_HINTS["moderate"]),
        "filtered_progress": filtered_progress,
    }


async def generate_crisis_plan(
    user_id: str,
    exam_name: str,
    exam_date: date,
    subjects: List[str],
    preparation_level: str,
    available_hours_per_day: float,
    student_category: str,
    subject_progress: List[Dict[str, Any]],
) -> Dict[str, Any]:
    _ = user_id
    days_remaining = _calculate_days_remaining(exam_date=exam_date)
    if days_remaining < 1:
        raise ValueError("Exam date must be at least 1 day in the future")

    context = _build_priority_context(
        subjects=subjects,
        preparation_level=preparation_level,
        subject_progress=subject_progress,
    )

    long_horizon_note = ""
    if days_remaining > 30:
        long_horizon_note = "Crisis mode is optimized for 1-30 day timelines; use the same urgency framework for the first 30 days."

    system_prompt = (
        "You are an emergency medical exam preparation specialist. "
        "You create aggressive, realistic, hour-by-hour study plans for students in crisis. "
        "You ONLY respond with valid JSON. Every response must be complete valid JSON."
    )

    user_prompt = f"""
CRISIS EXAM PREPARATION PLAN

Exam: {exam_name}
Days remaining: {days_remaining}
Preparation level: {preparation_level}
Available hours per day: {available_hours_per_day}
Student type: {student_category}
Subjects to cover: {subjects}
Long horizon note: {long_horizon_note or 'n/a'}

Priority interpretation:
- Priority subjects right now: {context['priority_subjects']}
- Preparation strategy hint: {context['strategy_hint']}

Current syllabus completion:
{json.dumps(context['filtered_progress'], indent=2)}

Generate a CRISIS study plan. This is an emergency — be aggressive, skip non-essential content, focus on what will actually appear in the exam.

Return ONLY this exact JSON structure:
{{
  "crisis_summary": "2-3 sentence brutal honest assessment and strategy",
  "survival_strategy": "the core approach for these specific days",
  "what_to_skip": ["topic1", "topic2"],
  "must_know": ["topic1", "topic2"],
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "overall focus for the day",
      "hours": [
        {{
          "time_block": "9:00 AM - 11:00 AM",
          "subject": "Anatomy",
          "topic": "Brachial Plexus",
          "activity": "study",
          "key_points": [
            "Point 1 to memorize",
            "Point 2 to memorize",
            "Point 3 to memorize"
          ],
          "exam_tip": "How this is tested in exams",
          "duration_minutes": 120
        }}
      ],
      "daily_goal": "what success looks like today",
      "revision_topics": ["topic to revise from previous days"]
    }}
  ],
  "emergency_tips": [
    "5 survival tips specific to this student"
  ]
}}

Rules:
- Generate ALL {days_remaining} days
- Be ruthlessly practical — skip anything unlikely to appear in exam
- Earlier days: new high yield topics
- Last 30% of days: revision only
- Include breaks and realistic timing
- For {preparation_level} preparation: {context['strategy_hint']}
- Keep key_points to 3-5 bullet points per topic
- exam_tip must be specific and actionable
"""

    llm = OpenRouterLLMClient(OPENROUTER_MODELS["default"])
    last_error: Exception | None = None

    for _attempt in range(3):
        try:
            raw = await llm.generate_sync(prompt=user_prompt, system_prompt=system_prompt)
            parsed = _extract_json(raw)
            if not parsed or not isinstance(parsed.get("days"), list):
                raise ValueError("Failed to parse crisis plan JSON")

            days = parsed.get("days") or []
            if len(days) != days_remaining:
                normalized_days = []
                for idx in range(days_remaining):
                    if idx < len(days) and isinstance(days[idx], dict):
                        current = dict(days[idx])
                    else:
                        current = {
                            "theme": "High-yield rescue focus",
                            "hours": [],
                            "daily_goal": "Complete all priority blocks",
                            "revision_topics": [],
                        }
                    current["day"] = idx + 1
                    current["date"] = (date.today() + timedelta(days=idx)).isoformat()
                    normalized_days.append(current)
                parsed["days"] = normalized_days

            return parsed
        except Exception as exc:
            last_error = exc
            continue

    raise ValueError(f"Failed to generate crisis plan: {last_error}")
