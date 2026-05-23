from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List

from app.core.database import get_supabase_admin_client
from app.services.llm.groq_client import GroqLLMClient

SUBJECTS = [
    "Anatomy",
    "Physiology",
    "Biochemistry",
    "Pathology",
    "Pharmacology",
    "Microbiology",
    "Forensic Medicine",
    "Community Medicine",
    "ENT",
    "Ophthalmology",
    "Medicine",
    "Surgery",
    "Obstetrics and Gynecology",
    "Pediatrics",
]


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


def _sanitize_question(subject: str, item: Dict[str, Any]) -> Dict[str, Any] | None:
    required = [
        "question_text",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_option",
        "explanation",
    ]
    if any(not str(item.get(field, "")).strip() for field in required):
        return None

    correct_option = str(item.get("correct_option", "")).strip().lower()
    if correct_option not in {"a", "b", "c", "d"}:
        return None

    difficulty = str(item.get("difficulty", "medium")).strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "medium"

    return {
        "subject": subject,
        "topic": str(item.get("topic") or "").strip() or None,
        "year": None,
        "difficulty": difficulty,
        "question_text": str(item.get("question_text")).strip(),
        "option_a": str(item.get("option_a")).strip(),
        "option_b": str(item.get("option_b")).strip(),
        "option_c": str(item.get("option_c")).strip(),
        "option_d": str(item.get("option_d")).strip(),
        "correct_option": correct_option,
        "explanation": str(item.get("explanation")).strip(),
        "is_high_yield": bool(item.get("is_high_yield", True)),
        "neet_pg_relevant": bool(item.get("neet_pg_relevant", True)),
        "source": "almondai",
    }


async def seed_subject(subject: str, llm: GroqLLMClient, client) -> int:
    existing = (
        client.table("mcq_questions")
        .select("id", count="exact")
        .eq("subject", subject)
        .execute()
    )
    existing_count = existing.count or 0
    if existing_count >= 10:
        print(f"[{subject}] Skipping (already has {existing_count} questions)")
        return 0

    prompt = f"""
Generate 10 high-quality MBBS MCQ questions for the subject: {subject}

Requirements:
- Questions must be clinically relevant
- Each question must have 4 options (A, B, C, D)
- Only one correct answer
- Explanation must be detailed (3-4 sentences)
- Mix of difficulty: 3 easy, 4 medium, 3 hard
- Include high yield exam topics
- Based on standard Indian MBBS curriculum

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "question_text": "A 45-year-old presents with...",
      "option_a": "First option",
      "option_b": "Second option",
      "option_c": "Third option",
      "option_d": "Fourth option",
      "correct_option": "b",
      "explanation": "Detailed explanation of why B is correct and why others are wrong...",
      "topic": "specific topic within subject",
      "difficulty": "medium",
      "is_high_yield": true,
      "neet_pg_relevant": true
    }}
  ]
}}
"""

    raw = await llm.generate_sync(
        prompt=prompt,
        system_prompt="You generate MBBS MCQ datasets. Return only strict JSON.",
    )
    payload = _extract_json(raw)
    question_items = payload.get("questions", []) if isinstance(payload, dict) else []

    sanitized: List[Dict[str, Any]] = []
    for item in question_items:
        if not isinstance(item, dict):
            continue
        prepared = _sanitize_question(subject=subject, item=item)
        if prepared:
            sanitized.append(prepared)

    if not sanitized:
        raise RuntimeError("No valid MCQs parsed from LLM output")

    client.table("mcq_questions").insert(sanitized).execute()
    print(f"[{subject}] Inserted {len(sanitized)} questions")
    return len(sanitized)


async def main() -> None:
    client = get_supabase_admin_client()
    llm = GroqLLMClient()

    inserted_total = 0
    for subject in SUBJECTS:
        try:
            inserted_total += await seed_subject(subject=subject, llm=llm, client=client)
        except Exception as exc:
            print(f"[{subject}] Failed: {exc}")
            continue

    final_count_result = client.table("mcq_questions").select("id", count="exact").execute()
    final_count = final_count_result.count or 0
    print(f"Seeding completed. New rows inserted: {inserted_total}")
    print(f"Total questions in mcq_questions: {final_count}")


if __name__ == "__main__":
    asyncio.run(main())
