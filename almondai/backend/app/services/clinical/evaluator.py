from __future__ import annotations

import json
from typing import Any, Dict, List

from app.services.llm.openrouter_client import generate_with_fallback_sync


RUBRIC = {
    "hpi_accuracy": {
        "weight": 15,
        "description": "Chronological accuracy and completeness of history of presenting illness",
    },
    "completeness": {
        "weight": 20,
        "description": "Completeness of all case sheet sections present and filled",
    },
    "clinical_reasoning": {
        "weight": 20,
        "description": "Quality of clinical reasoning and provisional diagnosis logic",
    },
    "differentials": {
        "weight": 15,
        "description": "Quality and appropriateness of differential diagnosis list",
    },
    "investigations": {
        "weight": 15,
        "description": "Appropriateness of investigation plan",
    },
    "management": {
        "weight": 15,
        "description": "Correctness and completeness of management plan",
    },
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
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass
    return {}


async def evaluate_case_sheet(
    case_sheet: Dict[str, Any],
    patient_profile: Dict[str, Any],
    hidden_findings: Dict[str, Any],
    correct_diagnosis: str,
    differentials: List[str],
    conversation: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    AI evaluates the student's completed case sheet against the actual case.
    Returns structured evaluation with rubric scores, consultant summary, and missed findings.
    """
    system_prompt = (
        "You are a senior consultant physician evaluating a medical student's clinical case sheet. "
        "Be fair but thorough. Produce a complete structured evaluation. "
        "Respond ONLY with valid JSON."
    )

    user_prompt = f"""
CASE EVALUATION

Actual diagnosis: {correct_diagnosis}
Correct differentials: {differentials}

Patient profile:
{json.dumps(patient_profile, indent=2)}

Hidden findings (what the case contained — ground truth):
{json.dumps(hidden_findings, indent=2)}

History taking conversation (what the student actually elicited):
{json.dumps([{{'role': t.get('role'), 'content': t.get('content')}} for t in (conversation or [])], indent=2)}

Student's case sheet submission:
{json.dumps(case_sheet, indent=2)}

Rubric:
{json.dumps(RUBRIC, indent=2)}

Return ONLY this exact JSON (no markdown, no explanation):
{{
  "scores": {{
    "hpi_accuracy": 12,
    "completeness": 15,
    "clinical_reasoning": 16,
    "differentials": 12,
    "investigations": 12,
    "management": 13
  }},
  "total_score": 80,
  "grade": "B+",
  "consultant_summary": "Formal ward-round presentation paragraph. Format: '[Age]y [Sex] [occupation] presented with [chief complaint] × [duration]. [Key HOPI details in 1-2 sentences]. On examination: [key positive and significant negative findings]. Investigations: [key results]. Assessment: [diagnosis with brief reasoning]. Plan: [management in 1-2 sentences].'",
  "diagnostic_reasoning": {{
    "primary_diagnosis": "{correct_diagnosis}",
    "supporting_features": [
      "Specific clinical feature from this case that supports the diagnosis",
      "Another supporting feature"
    ],
    "against_features": [
      "Feature in this case that may seem to argue against (if any) — or 'None significant'"
    ],
    "favored_over": [
      {{
        "differential": "Name of differential diagnosis",
        "key_differentiator": "One-sentence clinical argument for why {correct_diagnosis} is preferred",
        "distinguishing_feature": "The specific finding from this case that rules this differential out or down"
      }}
    ]
  }},
  "clinical_red_flags": {{
    "present": [
      {{
        "flag": "Name of red flag sign or symptom present in this case",
        "significance": "What it indicates clinically and why it matters"
      }}
    ],
    "absent_and_important": [
      {{
        "flag": "Name of serious sign or complication that is absent",
        "significance": "What its absence rules out or reassures about"
      }}
    ]
  }},
  "missing_findings": [
    {{
      "category": "history",
      "finding": "Specific thing the student did not ask or elicit",
      "clinical_significance": "Why eliciting this would have mattered for diagnosis or management",
      "suggested_question": "The exact question the student should have asked the patient"
    }}
  ],
  "strengths": [
    "Specific thing the student did well"
  ],
  "diagnosis_correct": true,
  "provisional_diagnosis_given": "What the student wrote as their diagnosis",
  "feedback_per_section": {{
    "hpi_accuracy": "Specific, constructive feedback on HPI",
    "completeness": "Specific feedback on completeness",
    "clinical_reasoning": "Specific feedback on reasoning quality",
    "differentials": "Specific feedback on differentials chosen",
    "investigations": "Specific feedback on investigation plan",
    "management": "Specific feedback on management plan"
  }},
  "overall_feedback": "2-3 sentence constructive overall feedback paragraph"
}}

Rules:
- Score each dimension out of its rubric weight
- total_score = sum of all dimension scores (max 100)
- grade: A+ (90+), A (80-89), B+ (70-79), B (60-69), C (50-59), D (<50)
- consultant_summary: write as a real ward round hand-over — formal, concise, third-person, directly usable
- diagnostic_reasoning.favored_over: one entry per differential in the correct differentials list
- clinical_red_flags.absent_and_important: include the MOST CLINICALLY SIGNIFICANT absent signs (e.g. DKA absent in DM, peritonism absent in appendicitis, papilloedema absent in hypertension)
- missing_findings: list ONLY things that were actually absent from the conversation but are clinically important — be specific, name the exact missing item
- suggested_question: write the exact words a student should say to a patient
- Tone: educational, honest, constructive — like a senior consultant teaching a junior doctor
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
            if not parsed or "total_score" not in parsed:
                raise ValueError("Invalid evaluation JSON")

            # Normalise
            total = min(max(int(parsed.get("total_score", 0)), 0), 100)
            parsed["total_score"] = total
            parsed.setdefault("missing_findings", [])
            parsed.setdefault("strengths", [])
            parsed.setdefault("feedback_per_section", {})
            parsed.setdefault("diagnostic_reasoning", {})
            parsed.setdefault("clinical_red_flags", {"present": [], "absent_and_important": []})
            return parsed
        except Exception as exc:
            last_error = exc
            continue

    raise ValueError(f"Failed to evaluate case sheet: {last_error}")


async def conduct_viva_question(
    viva_questions: List[Dict[str, Any]],
    viva_log: List[Dict[str, Any]],
    student_answer: str,
    question_index: int,
) -> Dict[str, Any]:
    """
    Evaluates the student's viva answer and returns the next question (if any).
    """
    if question_index >= len(viva_questions):
        return {"completed": True, "next_question": None, "feedback": "Viva complete."}

    current_q = viva_questions[question_index]
    model_answer = current_q.get("model_answer", "")
    key_points = current_q.get("key_points", [])

    system_prompt = (
        "You are an examiner conducting a clinical viva. "
        "Evaluate the student's answer fairly. "
        "Respond ONLY with valid JSON."
    )

    user_prompt = f"""
VIVA EVALUATION

Question: {current_q.get('question', '')}
Model answer: {model_answer}
Key points expected: {key_points}

Student answered: {student_answer}

Return ONLY this JSON:
{{
  "score": 7,
  "max_score": 10,
  "correct_points_covered": ["point1", "point2"],
  "missed_points": ["missed1"],
  "feedback": "Brief examiner feedback on this answer",
  "model_answer_reveal": "{model_answer[:200]}..."
}}
"""

    next_index = question_index + 1
    next_question = viva_questions[next_index] if next_index < len(viva_questions) else None

    last_error: Exception | None = None
    for _ in range(2):
        try:
            raw = await generate_with_fallback_sync(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=600,
                tier="fast",
            )
            parsed = _extract_json(raw)
            if not parsed:
                raise ValueError("Invalid viva feedback JSON")
            parsed["question_index"] = question_index
            parsed["next_question"] = next_question.get("question") if next_question else None
            parsed["next_question_index"] = next_index if next_question else None
            parsed["completed"] = next_question is None
            parsed["model_answer_reveal"] = model_answer
            return parsed
        except Exception as exc:
            last_error = exc
            continue

    return {
        "score": 5,
        "max_score": 10,
        "feedback": "Could not evaluate answer at this time.",
        "question_index": question_index,
        "next_question": next_question.get("question") if next_question else None,
        "next_question_index": next_index if next_question else None,
        "completed": next_question is None,
        "model_answer_reveal": model_answer,
        "_error": str(last_error),
    }
