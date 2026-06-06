from __future__ import annotations

from datetime import date, timedelta
import json
from typing import Any, Dict, List

from app.services.llm.openrouter_client import generate_with_fallback_sync


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
    try:
        parsed = json.loads(text[start : end + 1])
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
    filtered_progress = [row for row in subject_progress if row.get("subject_name") in selected]

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


def _score_topic(topic: Dict[str, Any]) -> int:
    """Deterministic exam-relevance score for pre-ranking before LLM bucketing."""
    score = 0
    if topic.get("is_high_yield"):
        score += 30
    if topic.get("neet_pg_relevant"):
        score += 20
    difficulty = topic.get("difficulty", "medium")
    if difficulty == "hard":
        score += 10
    elif difficulty == "medium":
        score += 5
    status = topic.get("status", "not_started")
    if status in ("not_started", "needs_revision"):
        score += 15
    elif status == "in_progress":
        score += 8
    weakness_priority = topic.get("weakness_priority")
    if weakness_priority == "critical":
        score += 25
    elif weakness_priority == "high":
        score += 15
    elif weakness_priority == "medium":
        score += 5
    return score


def _empty_strategy() -> Dict[str, Any]:
    return {
        "high_yield": {"must": [], "should": [], "optional": [], "skip": []},
        "sacrifice": {
            "sacrifice_list": [],
            "retain_list": [],
            "estimated_marks_coverage": 70,
            "total_sacrifice_hours": 0,
        },
        "survival_advice": "Focus on high-yield topics from your weakest subjects first.",
        "emergency_tips": [],
    }


async def generate_war_room_strategy(
    exam_name: str,
    exam_date: date,  # included in prompt for temporal context
    days_remaining: int,
    subjects: List[str],
    available_hours_per_day: float,
    student_category: str,
    topic_data: List[Dict[str, Any]],
    subject_progress: List[Dict[str, Any]],  # per-subject breakdown in prompt
    readiness_result: Dict[str, Any],
    panic_result: Dict[str, Any],
    preparation_level: str,
) -> Dict[str, Any]:
    """
    Generates the War Room strategic analysis via LLM (pre-ranked by deterministic scoring).

    Returns high-yield buckets (MUST/SHOULD/OPTIONAL/SKIP), sacrifice list,
    survival advice, and emergency tips.
    """
    # Pre-score + sort — send top 70 + bottom 15 to the LLM
    scored = sorted(topic_data, key=_score_topic, reverse=True)
    primary_pool = scored[:70]
    skip_pool = [t for t in scored[-15:] if t not in primary_pool]
    topics_for_llm = primary_pool + skip_pool

    # Build compact topic description lines
    topic_lines: List[str] = []
    for t in topics_for_llm:
        flags: List[str] = []
        if t.get("is_high_yield"):
            flags.append("HIGH_YIELD")
        if t.get("neet_pg_relevant"):
            flags.append("NEET_PG")
        if t.get("difficulty"):
            flags.append(t["difficulty"].upper())
        if t.get("weakness_priority") in ("critical", "high"):
            flags.append(f"WEAK({t['weakness_priority'].upper()})")
        status_label = (t.get("status") or "not_started").replace("_", " ")
        flag_str = "|".join(flags) if flags else "standard"
        topic_lines.append(f"- {t['subject']}: {t['name']} [{flag_str}] status={status_label}")

    topics_text = "\n".join(topic_lines) if topic_lines else "- No topic data available"

    # Per-subject completion summary for the LLM
    subject_summary_lines = [
        f"  {s.get('subject_name', '?')}: {s.get('completion_percentage', 0)}% done "
        f"({s.get('completed_topics', s.get('completed', 0))}/{s.get('total_topics', '?')} topics)"
        for s in subject_progress
        if s.get("subject_name") in subjects
    ]
    subject_summary = "\n".join(subject_summary_lines) if subject_summary_lines else "  No subject data"

    exam_date_str = exam_date.isoformat()
    readiness_score = readiness_result.get("readiness_score", 50)
    coverage = readiness_result.get("coverage_score", 0)
    hours_available = readiness_result.get("hours_available", 0)
    hours_needed = readiness_result.get("hours_needed_estimate", 0)
    deficit_hours = max(0.0, float(hours_needed) - float(hours_available))

    panic_note = ""
    if panic_result.get("detected"):
        panic_note = (
            f"\nIMPORTANT: Student is in panic mode (severity={panic_result['severity']}). "
            "Limit MUST topics to what is truly achievable. Tone should be supportive but honest."
        )

    system_prompt = (
        "You are an expert medical exam strategist and coach. "
        "Analyse the student's situation and generate a precise War Room strategy. "
        "Respond ONLY with valid JSON. Be specific with topic names — no vague categories."
    )

    user_prompt = f"""
WAR ROOM STRATEGIC ANALYSIS

Exam: {exam_name}
Exam date: {exam_date_str}
Days remaining: {days_remaining}
Hours available total: {hours_available}h ({available_hours_per_day}h/day)
Hours needed for full coverage: {hours_needed}h
Deficit: {deficit_hours}h
Current readiness score: {readiness_score}/100
Syllabus coverage so far: {coverage}%
Student type: {student_category}
Preparation level: {preparation_level}
Subjects: {subjects}

Subject completion breakdown:
{subject_summary}
{panic_note}

TOPICS (pre-ranked by exam-relevance signals — HIGH_YIELD and NEET_PG are top priority):
{topics_text}

Generate the War Room strategy. Return ONLY this exact JSON:
{{
  "high_yield": {{
    "must": [
      {{"topic": "exact topic name", "subject": "subject name", "why": "one-line exam rationale"}}
    ],
    "should": [
      {{"topic": "exact topic name", "subject": "subject name"}}
    ],
    "optional": [
      {{"topic": "exact topic name", "subject": "subject name"}}
    ],
    "skip": [
      {{"topic": "exact topic name", "subject": "subject name", "why_skip": "one-line low-ROI reason"}}
    ]
  }},
  "sacrifice": {{
    "sacrifice_list": [
      {{"topic": "topic", "subject": "subject", "reason": "why low ROI for this exam", "hours_saved": 2}}
    ],
    "retain_list": [
      {{"topic": "topic", "subject": "subject"}}
    ],
    "estimated_marks_coverage": 78,
    "total_sacrifice_hours": 12
  }},
  "survival_advice": "2-3 sentences of brutally honest tactical advice for this specific student situation",
  "emergency_tips": [
    "Concrete actionable tip 1",
    "Concrete actionable tip 2",
    "Concrete actionable tip 3",
    "Concrete actionable tip 4",
    "Concrete actionable tip 5"
  ]
}}

Constraints:
- MUST: 8-15 topics max (what you would study if you had only 24 hours)
- SHOULD: 15-25 topics (important, do after MUST)
- OPTIONAL: remaining topics if time allows
- SKIP: low-ROI topics given the time constraint — include clear justification
- sacrifice_list: topics to drop to resolve the {deficit_hours:.0f}h deficit
- estimated_marks_coverage: realistic % of total marks achievable with this plan
- All topic names must exactly match entries in the list above
"""

    last_error: Exception | None = None
    for _ in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=4000,
                tier="default",
            )
            parsed = _extract_json(raw)
            if not parsed or not isinstance(parsed.get("high_yield"), dict):
                raise ValueError("Invalid war room strategy JSON")

            # Normalise — ensure all required keys exist
            hy = parsed.get("high_yield", {})
            for bucket in ("must", "should", "optional", "skip"):
                if not isinstance(hy.get(bucket), list):
                    hy[bucket] = []
            parsed["high_yield"] = hy

            sacrifice = parsed.get("sacrifice", {})
            if not isinstance(sacrifice.get("sacrifice_list"), list):
                sacrifice["sacrifice_list"] = []
            if not isinstance(sacrifice.get("retain_list"), list):
                sacrifice["retain_list"] = []
            sacrifice.setdefault("estimated_marks_coverage", 70)
            sacrifice.setdefault("total_sacrifice_hours", 0)
            parsed["sacrifice"] = sacrifice

            if not isinstance(parsed.get("emergency_tips"), list):
                parsed["emergency_tips"] = []

            return parsed
        except Exception as exc:
            last_error = exc
            continue

    # Graceful fallback — plan generation must still succeed even if strategy fails
    result = _empty_strategy()
    result["_fallback"] = True
    result["_error"] = str(last_error)
    return result


async def generate_crisis_plan(
    user_id: str,
    exam_name: str,
    exam_date: date,
    subjects: List[str],
    preparation_level: str,
    available_hours_per_day: float,
    student_category: str,
    subject_progress: List[Dict[str, Any]],
    panic_softening_factor: float = 1.0,
) -> Dict[str, Any]:
    """
    Generates the hour-by-hour day-by-day crisis study schedule.
    panic_softening_factor reduces effective daily hours when panic is detected.
    """
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
        long_horizon_note = (
            "Crisis mode is optimised for 1-30 day timelines; "
            "apply the same urgency framework for the first 30 days."
        )

    effective_hours = round(available_hours_per_day * panic_softening_factor, 1)

    system_prompt = (
        "You are an emergency medical exam preparation specialist. "
        "Create aggressive, realistic, hour-by-hour study plans for students in crisis. "
        "Respond ONLY with valid JSON."
    )

    user_prompt = f"""
CRISIS STUDY PLAN

Exam: {exam_name}
Days remaining: {days_remaining}
Preparation level: {preparation_level}
Available hours per day: {effective_hours}
Student type: {student_category}
Subjects: {subjects}
Long horizon note: {long_horizon_note or 'n/a'}

Priority subjects right now: {context['priority_subjects']}
Preparation strategy: {context['strategy_hint']}

Syllabus completion:
{json.dumps(context['filtered_progress'], indent=2)}

Return ONLY this exact JSON:
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
          "key_points": ["Point 1", "Point 2", "Point 3"],
          "exam_tip": "How this is tested in exams",
          "duration_minutes": 120
        }}
      ],
      "daily_goal": "what success looks like today",
      "revision_topics": ["topic to revise from previous days"]
    }}
  ],
  "emergency_tips": ["5 survival tips specific to this student"]
}}

Rules:
- Generate ALL {days_remaining} days
- Earlier days: new high-yield topics; last 30%: revision only
- Include breaks and realistic timing
- For {preparation_level} preparation: {context['strategy_hint']}
- key_points: 3-5 bullet points per topic
- exam_tip must be specific and actionable
"""

    last_error: Exception | None = None
    for _ in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=user_prompt, system_prompt=system_prompt, tier="default"
            )
            parsed = _extract_json(raw)
            if not parsed or not isinstance(parsed.get("days"), list):
                raise ValueError("Failed to parse crisis plan JSON")

            days = parsed.get("days") or []
            if len(days) != days_remaining:
                normalized: List[Dict[str, Any]] = []
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
                    normalized.append(current)
                parsed["days"] = normalized

            return parsed
        except Exception as exc:
            last_error = exc
            continue

    raise ValueError(f"Failed to generate crisis plan: {last_error}")
