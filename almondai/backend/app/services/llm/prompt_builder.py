from __future__ import annotations

from typing import Dict, List, Optional

from app.services.llm.category_prompts import CATEGORY_PROMPTS, TEACHING_STYLE_ADDITIONS


def build_system_prompt(student_category: str, teaching_style: str) -> str:
    base_prompt = CATEGORY_PROMPTS.get(student_category, CATEGORY_PROMPTS["sprinter"])
    style_prompt = TEACHING_STYLE_ADDITIONS.get(teaching_style, TEACHING_STYLE_ADDITIONS["conversational"])
    return f"{base_prompt}\n\nTeaching style preference: {style_prompt}"


def _format_history(conversation_history: List[Dict]) -> str:
    if not conversation_history:
        return "No prior conversation."

    tail = conversation_history[-3:]
    rows = []
    for turn in tail:
        role = turn.get("role", "student")
        content = turn.get("content") or turn.get("question") or turn.get("answer") or ""
        rows.append(f"{role.title()}: {content}")
    return "\n".join(rows)


def build_user_prompt(
    question: str,
    context: str,
    conversation_history: List[Dict],
    subject: Optional[str] = None,
    memory_context: str = "",
) -> str:
    history = _format_history(conversation_history)
    subject_line = subject or "Not specified"
    memory_section = ""
    if memory_context:
        memory_section = f"STUDENT MEMORY CONTEXT:\n{memory_context}\n\n"

    return (
        f"{memory_section}"
        "MEDICAL KNOWLEDGE CONTEXT:\n"
        f"{context}\n\n"
        "RECENT CONVERSATION:\n"
        f"{history}\n\n"
        "SUBJECT:\n"
        f"{subject_line}\n\n"
        "STUDENT QUESTION:\n"
        f"{question}\n\n"
        "Use the student memory context to personalize your response.\n"
        "If you know this student struggles with a specific concept, address that proactively.\n"
        "Answer based on the medical context provided.\n"
        "If the context doesn't contain enough information,\n"
        "use your medical knowledge but clearly indicate this with: [From general knowledge]"
    )
