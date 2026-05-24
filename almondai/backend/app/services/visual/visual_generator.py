from __future__ import annotations

import json
from typing import Any, Dict, List, Literal

from app.services.llm.openrouter_client import generate_with_fallback_sync

VisualType = Literal["flowchart", "timeline", "comparison", "decision_tree", "mind_map", "process"]


class VisualGenerator:

    def _strip_json(self, raw: str) -> Dict[str, Any]:
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

    def _prompt_for_type(self, visual_type: VisualType, topic: str, subject: str | None) -> str:
        subject_line = f"Subject: {subject}\n" if subject else ""

        base_rules = (
            "Return strict JSON only. No markdown fences. "
            "Keep labels concise and exam-focused. "
            "Use medically accurate terminology for MBBS/NEET-PG level."
        )

        if visual_type == "flowchart":
            return f"""
{base_rules}
Generate a flowchart for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "nodes": [{{"id": "n1", "label": "string"}}],
  "edges": [{{"from": "n1", "to": "n2", "label": "optional"}}],
  "summary": "2-3 sentence explanation"
}}
"""

        if visual_type == "timeline":
            return f"""
{base_rules}
Generate a timeline for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "events": [{{"step": 1, "label": "string", "detail": "string"}}],
  "summary": "2-3 sentence explanation"
}}
"""

        if visual_type == "comparison":
            return f"""
{base_rules}
Generate a comparison table for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "columns": ["Feature", "Option A", "Option B"],
  "rows": [{{"feature": "string", "a": "string", "b": "string"}}],
  "summary": "2-3 sentence explanation"
}}
"""

        if visual_type == "decision_tree":
            return f"""
{base_rules}
Generate a diagnostic or management decision tree for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "root": "string",
  "branches": [
    {{"condition": "string", "outcome": "string", "next": "optional node"}}
  ],
  "summary": "2-3 sentence explanation"
}}
"""

        if visual_type == "mind_map":
            return f"""
{base_rules}
Generate a mind map for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "central": "string",
  "branches": [
    {{"label": "string", "points": ["string", "string"]}}
  ],
  "summary": "2-3 sentence explanation"
}}
"""

        return f"""
{base_rules}
Generate a process visualization for: {topic}
{subject_line}
JSON schema:
{{
  "title": "string",
  "stages": [{{"name": "string", "input": "string", "output": "string"}}],
  "summary": "2-3 sentence explanation"
}}
"""

    def _fallback_visual(self, visual_type: VisualType, topic: str) -> Dict[str, Any]:
        if visual_type in ("flowchart", "decision_tree"):
            return {
                "title": topic,
                "nodes": [
                    {"id": "n1", "label": "Core concept"},
                    {"id": "n2", "label": "Key pathway"},
                    {"id": "n3", "label": "Clinical implication"},
                ],
                "edges": [
                    {"from": "n1", "to": "n2", "label": "leads to"},
                    {"from": "n2", "to": "n3", "label": "results in"},
                ],
                "summary": f"This visual captures an exam-oriented skeleton for {topic}.",
            }

        if visual_type == "timeline":
            return {
                "title": topic,
                "events": [
                    {"step": 1, "label": "Initiation", "detail": "Trigger or starting event"},
                    {"step": 2, "label": "Progression", "detail": "Intermediate mechanisms"},
                    {"step": 3, "label": "Outcome", "detail": "Final clinical consequence"},
                ],
                "summary": f"This timeline outlines the sequence for {topic}.",
            }

        if visual_type == "comparison":
            return {
                "title": topic,
                "columns": ["Feature", "Option A", "Option B"],
                "rows": [
                    {"feature": "Definition", "a": "Primary description", "b": "Contrast description"},
                    {"feature": "Mechanism", "a": "Mechanism A", "b": "Mechanism B"},
                    {"feature": "Clinical clue", "a": "Typical clue", "b": "Opposing clue"},
                ],
                "summary": f"This comparison highlights high-yield contrasts in {topic}.",
            }

        if visual_type == "mind_map":
            return {
                "title": topic,
                "central": topic,
                "branches": [
                    {"label": "Pathophysiology", "points": ["Core mechanism", "Key mediators"]},
                    {"label": "Clinical", "points": ["Typical presentation", "Red flags"]},
                    {"label": "Management", "points": ["First line", "Complication prevention"]},
                ],
                "summary": f"This mind map gives a rapid revision structure for {topic}.",
            }

        return {
            "title": topic,
            "stages": [
                {"name": "Input", "input": "Initial factor", "output": "Activated pathway"},
                {"name": "Transformation", "input": "Activated pathway", "output": "System effect"},
                {"name": "Result", "input": "System effect", "output": "Clinical state"},
            ],
            "summary": f"This process view summarizes {topic} in stepwise form.",
        }

    async def generate(self, topic: str, visual_type: VisualType, subject: str | None = None) -> Dict[str, Any]:
        prompt = self._prompt_for_type(visual_type=visual_type, topic=topic, subject=subject)
        system_prompt = "You are AlmondAI Visual Engine. Return only strict JSON exactly matching the requested schema."

        raw = await generate_with_fallback_sync(prompt=prompt, system_prompt=system_prompt, tier="default")
        parsed = self._strip_json(raw)

        if not parsed:
            repair_prompt = (
                "Convert the following response into valid JSON only. "
                "Do not add new sections. Keep it concise and exam-focused.\n\n"
                f"Original response:\n{raw}"
            )
            repaired = await generate_with_fallback_sync(prompt=repair_prompt, system_prompt=system_prompt, tier="default")
            parsed = self._strip_json(repaired)

        if not parsed:
            parsed = self._fallback_visual(visual_type=visual_type, topic=topic)

        parsed.setdefault("title", topic)
        parsed.setdefault("summary", f"Visual explanation for {topic}.")

        return {
            "type": visual_type,
            "topic": topic,
            "subject": subject,
            "content": parsed,
            "summary": str(parsed.get("summary") or ""),
            "prompt_used": prompt.strip(),
        }
