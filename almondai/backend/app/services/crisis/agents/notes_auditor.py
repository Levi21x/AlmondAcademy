"""
Pod B — Notes Auditor Agent (LLM)

Reads the student's own notes from the Almond Jar and flags:
- Factual gaps or errors vs canonical syllabus expectations
- Topics covered in notes but not on the schedule (rescue candidates)
- Topics on the schedule but absent from notes (no safety net)
"""
from __future__ import annotations

from typing import Any

from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.crisis.crisis_generator import _extract_json

from .base import BaseAgent


def _extract_notes_text(jar_items: list[dict]) -> str:
    relevant = [
        item for item in jar_items
        if item.get("item_category") in ("own_notes", "lecture", "canon", "pasted_notes")
        and not item.get("is_graded_script")
    ]
    if not relevant:
        return ""
    chunks = []
    for item in relevant[:5]:
        text = (item.get("extracted_text") or item.get("raw_text") or "").strip()
        if text:
            chunks.append(text[:1500])
    return "\n\n---\n\n".join(chunks)


class NotesAuditorAgent(BaseAgent):
    name = "notes_auditor"
    _timeout_s = 20.0

    async def _execute(self, state: dict[str, Any]) -> dict[str, Any]:
        jar_items: list[dict] = state.get("jar_items", [])
        exam_name: str = state.get("exam_name", "the exam")
        subjects: list[str] = state.get("subjects", [])
        schedule_topic_names: list[str] = state.get("schedule_topic_names", [])

        notes_text = _extract_notes_text(jar_items)

        if not notes_text:
            return {
                "gaps": [],
                "rescue_topics": [],
                "unprotected_topics": schedule_topic_names[:5],
                "audit_summary": "No notes in Almond Jar — drop your lecture notes for deeper analysis",
                "jar_items_analysed": 0,
            }

        schedule_list = ", ".join(schedule_topic_names[:20]) if schedule_topic_names else "not yet generated"

        prompt = (
            f"You are auditing a medical student's notes for {exam_name} ({', '.join(subjects)}).\n\n"
            "Student's notes from Almond Jar:\n\n"
            f"{notes_text}\n\n"
            f"Scheduled study topics: {schedule_list}\n\n"
            "Audit the notes and return ONLY this JSON:\n"
            "{\n"
            '  "gaps": [\n'
            '    {"topic": "topic name", "issue": "what is missing or wrong in one sentence"}\n'
            "  ],\n"
            '  "rescue_topics": ["topic in notes that should be added to schedule"],\n'
            '  "unprotected_topics": ["scheduled topic with no notes safety net"],\n'
            '  "audit_summary": "2-sentence overall assessment of note quality"\n'
            "}"
        )
        system = (
            "You are a precise medical notes auditor. "
            "Identify concrete gaps against standard MBBS syllabus expectations. "
            "Be specific — no vague advice. Respond only with valid JSON."
        )

        try:
            raw = await generate_with_fallback_sync(
                prompt=prompt, system_prompt=system, max_tokens=800, tier="default"
            )
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed.get("gaps"), list):
                parsed["jar_items_analysed"] = len([i for i in jar_items if _extract_notes_text([i])])
                return parsed
        except Exception:
            pass

        return {
            "gaps": [],
            "rescue_topics": [],
            "unprotected_topics": schedule_topic_names[:5],
            "audit_summary": "Notes audit encountered an issue — please try again",
            "jar_items_analysed": 0,
        }
