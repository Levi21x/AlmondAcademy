from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any, Dict, List

from app.services.llm.openrouter_client import generate_with_fallback_sync


def _extract_percentage(subject: Dict[str, Any]) -> float:
    raw = subject.get("completion_percentage", 0)
    try:
        return float(raw)
    except (TypeError, ValueError):
        return 0.0


def _extract_subject_name(subject: Dict[str, Any]) -> str:
    name = subject.get("subject_name") or subject.get("name") or "Unknown"
    return str(name)


def _extract_json_block(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            return "\n".join(lines[1:-1]).strip()

    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return text


def _parse_json_response(text: str) -> Dict[str, Any]:
    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass

    cleaned = _extract_json_block(text)
    payload = json.loads(cleaned)
    if not isinstance(payload, dict):
        raise ValueError("LLM response JSON is not an object")
    return payload


async def generate_study_plan(
    user_id: str,
    exam_id: str,
    exam_name: str,
    exam_date: date,
    student_category: str,
    subjects: List[str],
    subject_progress: List[Dict[str, Any]],
    available_hours_per_day: float = 6.0,
) -> Dict[str, Any]:
    today = date.today()
    days_remaining = (exam_date - today).days
    if days_remaining < 0:
        raise ValueError(f"Exam date {exam_date.isoformat()} is in the past. Update your exam date to generate a plan.")
    if days_remaining == 0:
        days_remaining = 1  # Today counts as one study day.

    weak_subjects: List[str] = []
    medium_subjects: List[str] = []
    strong_subjects: List[str] = []

    for subject in subject_progress:
        completion = _extract_percentage(subject)
        name = _extract_subject_name(subject)
        if completion < 30:
            weak_subjects.append(name)
        elif completion <= 70:
            medium_subjects.append(name)
        else:
            strong_subjects.append(name)

    priority_weights: Dict[str, float] = {}
    if weak_subjects or medium_subjects or strong_subjects:
        if not weak_subjects and not medium_subjects and strong_subjects:
            even_weight = round(1.0 / max(len(strong_subjects), 1), 4)
            for subject in strong_subjects:
                priority_weights[subject] = even_weight
        else:
            weak_weight = 0.5 / max(len(weak_subjects), 1) if weak_subjects else 0.0
            medium_weight = 0.35 / max(len(medium_subjects), 1) if medium_subjects else 0.0
            strong_weight = 0.15 / max(len(strong_subjects), 1) if strong_subjects else 0.0

            for subject in weak_subjects:
                priority_weights[subject] = round(weak_weight, 4)
            for subject in medium_subjects:
                priority_weights[subject] = round(medium_weight, 4)
            for subject in strong_subjects:
                priority_weights[subject] = round(strong_weight, 4)

    system_prompt = (
        "You are an expert medical education planner. Generate a detailed day-by-day study plan "
        "for a medical student preparing for their exam. "
        "You must respond with ONLY valid JSON matching the exact structure requested. No other text."
    )

    selected_subjects = [str(subject).strip() for subject in subjects if str(subject).strip()]

    user_prompt = f"""
Generate a study plan for:
- Exam: {exam_name}
- Days remaining: {days_remaining}
- Student type: {student_category}
- Available hours per day: {available_hours_per_day}
- Selected subjects: {selected_subjects}

Subject completion status:
{json.dumps(subject_progress, indent=2)}

Priority weights calculated:
- Weak subjects (< 30% complete): {weak_subjects}
- Medium subjects (30-70% complete): {medium_subjects}
- Strong subjects (> 70% complete): {strong_subjects}
- Subject priority weights: {json.dumps(priority_weights, indent=2)}

Generate a JSON study plan with this EXACT structure:
{{
  "summary": "2-3 sentence overview of the plan strategy",
  "total_days": {days_remaining},
  "daily_hours": {available_hours_per_day},
  "weekly_overview": "brief description of how weeks are structured",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "focus": "primary subject or theme for the day",
      "topics": [
        {{
          "subject": "subject name",
          "topic": "specific topic name",
          "duration_minutes": 60,
          "priority": "high/medium/low",
          "notes": "brief study tip for this topic"
        }}
      ],
      "total_hours": 5.5,
      "day_goal": "what the student should achieve today"
    }}
  ],
  "tips": [
    "3-5 personalized study tips based on student category"
  ]
}}

Rules:
- IMPORTANT: Only generate study plan content for these specific subjects: {selected_subjects}
- Do NOT include any other subjects in the plan.
- The student has specifically chosen to study only these subjects for this exam.
- Generate ALL {days_remaining} days
- Each day should have 3-6 topics
- Distribute subjects according to priority weights
- Earlier days focus on weakest subjects
- Last 20% of days focus on revision of all subjects
- Keep total_hours realistic (max {available_hours_per_day})
- Make topics specific - not just \"study Anatomy\" but \"Upper Limb: Brachial plexus and axilla\"
- For {student_category} students adjust the pace:
  survivor: aggressive high-yield only approach
  sprinter: intensive but comprehensive
  anxious_grinder: steady manageable daily targets
  passionate: deep dive with clinical connections
  lost: foundational topics first, build up slowly
  strategic_climber: NEET-PG high yield prioritized
""".strip()

    response_text = (await generate_with_fallback_sync(
        prompt=user_prompt, system_prompt=system_prompt, tier="default"
    )).strip()

    try:
        plan = _parse_json_response(response_text)
    except Exception:
        retry_prompt = f"""
Return ONLY valid JSON. Do not include markdown or explanations.
Use this structure exactly:
{{
  "summary": "...",
  "total_days": {days_remaining},
  "daily_hours": {available_hours_per_day},
  "weekly_overview": "...",
  "days": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "focus": "...",
      "topics": [
        {{
          "subject": "...",
          "topic": "...",
          "duration_minutes": 60,
          "priority": "high/medium/low",
          "notes": "..."
        }}
      ],
      "total_hours": 5.5,
      "day_goal": "..."
    }}
  ],
  "tips": ["..."]
}}

Generate all {days_remaining} days for exam {exam_name}, student type {student_category}.
IMPORTANT: Only generate topics for these subjects: {selected_subjects}. Do not include any other subjects.
""".strip()
        second = (await generate_with_fallback_sync(
            prompt=retry_prompt, system_prompt=system_prompt, tier="default"
        )).strip()
        plan = _parse_json_response(second)

    if "days" not in plan or not isinstance(plan["days"], list):
        raise ValueError("Generated plan is missing days array")

    if selected_subjects:
        allowed_subjects = {subject.lower() for subject in selected_subjects}
        for day in plan["days"]:
            topics = day.get("topics")
            if not isinstance(topics, list):
                day["topics"] = []
                continue
            day["topics"] = [
                topic
                for topic in topics
                if str(topic.get("subject", "")).strip().lower() in allowed_subjects
            ]

    return {
        "user_id": user_id,
        "exam_id": exam_id,
        "exam_name": exam_name,
        "exam_date": str(exam_date),
        "days_remaining": days_remaining,
        "generated_at": datetime.now().isoformat(),
        "student_category": student_category,
        **plan,
    }
