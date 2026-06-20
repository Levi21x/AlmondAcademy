from __future__ import annotations

import json
import random
import string
from typing import Any, Dict, List, Optional

from app.core.database import get_supabase_admin_client
from app.services.llm.openrouter_client import generate_with_fallback_sync


def _extract_json_array(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            return "\n".join(lines[1:-1]).strip()
    first = text.find("[")
    last = text.rfind("]")
    if first != -1 and last != -1 and last > first:
        return text[first : last + 1]
    return text


def _parse_questions(text: str) -> List[Dict[str, Any]]:
    try:
        payload = json.loads(text)
        if isinstance(payload, list):
            return payload
    except json.JSONDecodeError:
        pass
    cleaned = _extract_json_array(text)
    payload = json.loads(cleaned)
    if not isinstance(payload, list):
        raise ValueError("LLM response is not a JSON array")
    return payload


def _generate_room_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def generate_mcq_questions(
    subject: str,
    topic: str,
    count: int = 10,
    difficulty: Optional[str] = None,
    student_category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    difficulty_instruction = f"Difficulty: {difficulty}." if difficulty else "Mix of easy, medium, and hard questions."
    category_instruction = ""
    if student_category == "survivor":
        category_instruction = "Focus on highest-yield, exam-essential facts only."
    elif student_category == "strategic_climber":
        category_instruction = "Prioritize NEET-PG frequently tested patterns."
    elif student_category == "passionate":
        category_instruction = "Include clinical correlation and mechanism-based questions."
    elif student_category == "lost":
        category_instruction = "Start with foundational conceptual questions, avoid complex calculations."
    elif student_category == "anxious_grinder":
        category_instruction = "Include clear, step-by-step reasoning in explanations."

    system_prompt = (
        "You are an expert medical MCQ writer for MBBS and PG medical entrance exams. "
        "Generate clinically accurate, high-quality multiple choice questions. "
        "You must respond with ONLY a valid JSON array — no other text, no markdown."
    )

    user_prompt = f"""
Generate {count} MCQ questions for:
- Subject: {subject}
- Topic: {topic}
- {difficulty_instruction}
- {category_instruction}

Return a JSON array with exactly this structure for each question:
[
  {{
    "question_text": "The full question text here",
    "option_a": "First option text",
    "option_b": "Second option text",
    "option_c": "Third option text",
    "option_d": "Fourth option text",
    "correct_option": "a",
    "explanation": "Detailed explanation of why the correct answer is right, and why the others are wrong. Include clinical relevance.",
    "difficulty": "easy|medium|hard",
    "is_high_yield": true
  }}
]

Rules:
- All {count} questions must be about "{topic}" in "{subject}"
- correct_option must be exactly "a", "b", "c", or "d"
- Explanations must be 2-4 sentences, clinically relevant
- Questions must be distinct and test different aspects of the topic
- Plausible distractors — not obviously wrong options
- Do NOT include question numbers in question_text
- Return ONLY the JSON array, no other text
""".strip()

    response_text = (await generate_with_fallback_sync(
        prompt=user_prompt, system_prompt=system_prompt, tier="default"
    )).strip()

    try:
        questions = _parse_questions(response_text)
    except Exception:
        retry_prompt = f"""
Return ONLY a valid JSON array of {count} MCQ questions about "{topic}" in "{subject}".
Each object must have: question_text, option_a, option_b, option_c, option_d, correct_option (a/b/c/d), explanation, difficulty (easy/medium/hard), is_high_yield (true/false).
No markdown, no explanation outside the array. Just the raw JSON array.
""".strip()
        second = (await generate_with_fallback_sync(
            prompt=retry_prompt, system_prompt=system_prompt, tier="default"
        )).strip()
        questions = _parse_questions(second)

    return questions


async def generate_and_store_questions(
    subject: str,
    topic: str,
    count: int = 10,
    difficulty: Optional[str] = None,
    student_category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    questions = await generate_mcq_questions(
        subject=subject,
        topic=topic,
        count=count,
        difficulty=difficulty,
        student_category=student_category,
    )

    client = get_supabase_admin_client()

    rows_to_insert = []
    for q in questions:
        correct = str(q.get("correct_option", "a")).lower().strip()
        if correct not in ("a", "b", "c", "d"):
            correct = "a"
        diff = str(q.get("difficulty", "medium")).lower().strip()
        if diff not in ("easy", "medium", "hard"):
            diff = "medium"

        rows_to_insert.append({
            "subject": subject,
            "topic": topic,
            "question_text": str(q.get("question_text", "")).strip(),
            "option_a": str(q.get("option_a", "")).strip(),
            "option_b": str(q.get("option_b", "")).strip(),
            "option_c": str(q.get("option_c", "")).strip(),
            "option_d": str(q.get("option_d", "")).strip(),
            "correct_option": correct,
            "explanation": str(q.get("explanation", "")).strip(),
            "difficulty": diff,
            "is_high_yield": bool(q.get("is_high_yield", True)),
            "source": "ai_generated",
            "student_category": student_category,
        })

    if not rows_to_insert:
        raise ValueError("No valid questions generated")

    try:
        inserted = client.table("mcq_questions").insert(rows_to_insert).execute()
        stored = inserted.data or []
    except Exception:
        # Retry without optional columns that may not exist if migration 016 hasn't run yet
        fallback_rows = [
            {k: v for k, v in row.items() if k not in ("source", "student_category")}
            for row in rows_to_insert
        ]
        inserted = client.table("mcq_questions").insert(fallback_rows).execute()
        stored = inserted.data or []

    # Return without correct_option for security — frontend never sees it
    return [
        {
            "id": row["id"],
            "subject": row["subject"],
            "topic": row.get("topic"),
            "difficulty": row["difficulty"],
            "question_text": row["question_text"],
            "option_a": row["option_a"],
            "option_b": row["option_b"],
            "option_c": row["option_c"],
            "option_d": row["option_d"],
            "is_high_yield": row.get("is_high_yield", True),
        }
        for row in stored
    ]


