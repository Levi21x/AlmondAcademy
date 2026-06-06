from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.services.llm.openrouter_client import generate_with_fallback_sync


SPECIALTIES = [
    "General Medicine",
    "Surgery",
    "Pediatrics",
    "Obstetrics & Gynaecology",
    "Psychiatry",
    "Orthopaedics",
    "Dermatology",
    "ENT",
    "Ophthalmology",
    "Anaesthesiology",
]

DIFFICULTY_LABELS = {
    "basic": "straightforward, common presentation, clear diagnosis",
    "intermediate": "moderate complexity, classic clinical signs, one key differential",
    "advanced": "complex or atypical presentation, multiple differentials, management decisions required",
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


async def generate_clinical_case(
    specialty: str,
    difficulty: str,
    custom_instruction: str = "",
) -> Dict[str, Any]:
    """
    AI-generates a structured clinical case for the given specialty and difficulty.
    Returns a dict ready to insert into clinical_cases.
    """
    diff_desc = DIFFICULTY_LABELS.get(difficulty, DIFFICULTY_LABELS["basic"])

    system_prompt = (
        "You are an experienced medical educator creating MBBS/NEET-PG clinical case scenarios. "
        "Generate realistic, educational cases that test clinical reasoning. "
        "Respond ONLY with valid JSON."
    )

    user_prompt = f"""
Generate a realistic MBBS clinical case for {specialty} at {difficulty} level ({diff_desc}).
{('Extra instruction: ' + custom_instruction) if custom_instruction else ''}

Return ONLY this exact JSON:
{{
  "patient_profile": {{
    "age": 35,
    "sex": "Male",
    "occupation": "Teacher",
    "presenting_complaint": "Chief complaint in patient's own words",
    "vitals": {{
      "BP": "120/80 mmHg",
      "HR": "80 bpm",
      "RR": "16/min",
      "Temp": "37.2°C",
      "SpO2": "98% RA"
    }},
    "socioeconomic_context": "Brief background"
  }},
  "hidden_findings": {{
    "history": {{
      "onset": "Revealed on asking: ...",
      "duration": "...",
      "progression": "...",
      "associated_symptoms": ["symptom1", "symptom2"],
      "past_history": "...",
      "family_history": "...",
      "drug_history": "...",
      "social_history": "..."
    }},
    "examination": {{
      "general": "General appearance findings on examination",
      "cvs": "Cardiovascular findings",
      "respiratory": "Respiratory findings",
      "abdomen": "Abdominal findings",
      "cns": "Neurological findings",
      "local": "Local/specific examination findings"
    }},
    "investigations": {{
      "bloods": "Key blood test findings",
      "imaging": "Imaging findings",
      "special": "Special test findings if applicable"
    }}
  }},
  "diagnosis": "Primary diagnosis",
  "differentials": ["Differential 1", "Differential 2", "Differential 3"],
  "viva_questions": [
    {{
      "question": "What is the most likely diagnosis?",
      "model_answer": "Detailed model answer...",
      "key_points": ["Key point 1", "Key point 2"]
    }},
    {{
      "question": "What is the pathophysiology?",
      "model_answer": "...",
      "key_points": ["..."]
    }},
    {{
      "question": "How would you investigate this patient?",
      "model_answer": "...",
      "key_points": ["..."]
    }},
    {{
      "question": "What is your management plan?",
      "model_answer": "...",
      "key_points": ["..."]
    }},
    {{
      "question": "What are the complications of this condition?",
      "model_answer": "...",
      "key_points": ["..."]
    }}
  ],
  "tags": ["tag1", "tag2", "tag3"]
}}

Rules:
- Specialty: {specialty}
- Difficulty: {difficulty} — {diff_desc}
- Patient profile must be realistic and demographically appropriate for India
- hidden_findings reveals progressively (history → examination → investigations)
- diagnosis must be specific (not vague)
- 5 viva questions, each with a comprehensive model answer
- tags: 3-5 relevant clinical terms for filtering
"""

    last_error: Exception | None = None
    for _ in range(3):
        try:
            raw = await generate_with_fallback_sync(
                prompt=user_prompt,
                system_prompt=system_prompt,
                max_tokens=3500,
                tier="default",
            )
            parsed = _extract_json(raw)
            if not parsed or not parsed.get("diagnosis") or not parsed.get("patient_profile"):
                raise ValueError("Invalid clinical case JSON")

            # Ensure required fields
            parsed.setdefault("differentials", [])
            parsed.setdefault("viva_questions", [])
            parsed.setdefault("tags", [])

            return {
                "specialty": specialty,
                "difficulty": difficulty,
                "patient_profile": parsed.get("patient_profile", {}),
                "hidden_findings": parsed.get("hidden_findings", {}),
                "diagnosis": str(parsed.get("diagnosis", "Unknown")),
                "differentials": parsed.get("differentials", []),
                "viva_questions": parsed.get("viva_questions", []),
                "tags": parsed.get("tags", []),
                "is_seeded": False,
            }
        except Exception as exc:
            last_error = exc
            continue

    raise ValueError(f"Failed to generate clinical case: {last_error}")
