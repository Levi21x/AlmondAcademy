from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Dict, List

from app.services.llm.openrouter_client import OPENROUTER_MODELS, OpenRouterLLMClient


def _build_history_context(conversation: List[Dict[str, Any]], revealed_systems: List[str]) -> str:
    """Compact view of what has been revealed so far."""
    if not conversation:
        return "No history taken yet."
    lines: List[str] = []
    for turn in conversation[-8:]:
        role = turn.get("role", "")
        content = str(turn.get("content", ""))
        if role == "student":
            lines.append(f"Student asked: {content}")
        elif role == "patient":
            lines.append(f"Patient said: {content}")
    return "\n".join(lines) if lines else "No history taken yet."


def _patient_persona(patient_profile: Dict[str, Any]) -> str:
    age = patient_profile.get("age", "35")
    sex = patient_profile.get("sex", "Male")
    occupation = patient_profile.get("occupation", "")
    complaint = patient_profile.get("presenting_complaint", "")
    return (
        f"You are a {age}-year-old {sex} patient"
        + (f" who works as a {occupation}" if occupation else "")
        + f". Your chief complaint is: {complaint}."
    )


async def simulate_patient_response(
    student_question: str,
    patient_profile: Dict[str, Any],
    hidden_findings: Dict[str, Any],
    conversation: List[Dict[str, Any]],
    revealed_findings: List[str],
) -> AsyncGenerator[str, None]:
    """
    Streams the patient's response to a student's history-taking question.
    Gradually reveals history findings that are relevant to the question.
    """
    hidden_history = hidden_findings.get("history", {})

    system_prompt = (
        f"{_patient_persona(patient_profile)} "
        "Stay in character as a worried patient. "
        "Answer naturally — not too medically precise (you are a layperson). "
        "Reveal information only when directly asked. "
        "If the student asks something unrelated, politely deflect. "
        "Never volunteer the diagnosis or clinical findings — only respond to specific questions. "
        "Keep responses to 2-4 sentences."
    )

    history_text = _build_history_context(conversation, revealed_findings)
    findings_dump = json.dumps(hidden_history, indent=2)

    user_prompt = f"""
Conversation so far:
{history_text}

Student just asked: {student_question}

Your hidden history (answer only what the student is specifically asking about):
{findings_dump}

Respond as the patient. Do not reveal examination findings or investigation results — only history.
"""

    llm = OpenRouterLLMClient(OPENROUTER_MODELS["default"])
    async for chunk in llm.generate(
        prompt=user_prompt,
        system_prompt=system_prompt,
        stream=True,
        max_tokens=300,
    ):
        yield chunk


def reveal_examination_findings(
    system_requested: str,
    hidden_findings: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Returns the examination findings for a requested system.
    system_requested: 'general' | 'cvs' | 'respiratory' | 'abdomen' | 'cns' | 'local'
    """
    examination = hidden_findings.get("examination", {})
    normalized = system_requested.lower().replace(" ", "_")
    aliases = {
        "cardiovascular": "cvs",
        "cardiac": "cvs",
        "heart": "cvs",
        "chest": "respiratory",
        "lungs": "respiratory",
        "neuro": "cns",
        "neurological": "cns",
        "git": "abdomen",
        "gi": "abdomen",
        "gastrointestinal": "abdomen",
        "specific": "local",
        "local_examination": "local",
    }
    key = aliases.get(normalized, normalized)
    findings = examination.get(key)
    if not findings:
        # Try partial match
        for k, v in examination.items():
            if normalized in k or k in normalized:
                findings = v
                key = k
                break

    return {
        "system": system_requested,
        "findings": findings or "No specific findings on examination.",
        "key_used": key,
    }
