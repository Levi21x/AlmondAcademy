from __future__ import annotations

from collections import defaultdict
import json
from typing import Any, Dict, List

from app.core.database import get_supabase_admin_client
from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS


class WeaknessAnalyzer:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def calculate_topic_weakness_score(self, topic: str, subject: str, signals: Dict[str, Any]) -> int:
        _ = topic, subject
        score = 0.0

        mcq_accuracy = float(signals.get("mcq_accuracy", 0) or 0)
        mcq_accuracy = max(0.0, min(100.0, mcq_accuracy))
        score += ((100.0 - mcq_accuracy) / 100.0) * 30.0

        mention_count = int(signals.get("mention_count", 0) or 0)
        if mention_count >= 5:
            score += 25.0
        elif mention_count >= 3:
            score += 15.0
        elif mention_count >= 1:
            score += 10.0

        status = str(signals.get("completion_status", "not_started") or "not_started")
        if status == "not_started":
            score += 25.0
        elif status == "in_progress":
            score += 15.0
        elif status == "needs_revision":
            score += 20.0

        question_frequency = int(signals.get("question_frequency", 0) or 0)
        if question_frequency >= 5:
            score += 20.0
        elif question_frequency >= 3:
            score += 12.0
        elif question_frequency >= 1:
            score += 6.0

        return int(max(0, min(100, round(score))))

    def _extract_json(self, raw: str) -> Dict[str, Any]:
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

    async def analyze_student(self, user_id: str, subject_filter: str | None = None) -> Dict[str, Any]:
        subjects = self.client.table("syllabus_subjects").select("id,name").execute().data or []
        topics = self.client.table("syllabus_topics").select("id,name,subject_id").execute().data or []

        subject_name_by_id = {row["id"]: row.get("name") for row in subjects if row.get("id")}

        progress_rows = (
            self.client.table("student_topic_progress")
            .select("topic_id,status")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        status_by_topic = {row.get("topic_id"): row.get("status") for row in progress_rows if row.get("topic_id")}

        mcq_rows = (
            self.client.table("student_mcq_attempts")
            .select("subject,is_correct")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        mcq_bucket: Dict[str, Dict[str, int]] = defaultdict(lambda: {"attempted": 0, "correct": 0})
        for row in mcq_rows:
            subject = row.get("subject") or "General"
            mcq_bucket[subject]["attempted"] += 1
            if bool(row.get("is_correct")):
                mcq_bucket[subject]["correct"] += 1

        struggle_rows = (
            self.client.table("student_struggle_patterns")
            .select("topic,subject,mention_count")
            .eq("user_id", user_id)
            .eq("is_resolved", False)
            .execute()
            .data
            or []
        )
        struggle_by_topic = {str(row.get("topic", "")).strip().lower(): int(row.get("mention_count", 0) or 0) for row in struggle_rows}

        chat_rows = (
            self.client.table("chat_messages")
            .select("content,created_at")
            .eq("user_id", user_id)
            .eq("role", "user")
            .limit(500)
            .execute()
            .data
            or []
        )

        weakness_scores: List[Dict[str, Any]] = []

        for topic in topics:
            topic_name = str(topic.get("name") or "").strip()
            if not topic_name:
                continue
            subject = subject_name_by_id.get(topic.get("subject_id")) or "General"
            if subject_filter and subject != subject_filter:
                continue

            mcq_stats = mcq_bucket.get(subject, {"attempted": 0, "correct": 0})
            attempted = int(mcq_stats.get("attempted", 0) or 0)
            correct = int(mcq_stats.get("correct", 0) or 0)
            mcq_accuracy = (correct / attempted) * 100.0 if attempted else 0.0

            mention_count = struggle_by_topic.get(topic_name.lower(), 0)

            question_frequency = 0
            lowered_topic = topic_name.lower()
            for msg in chat_rows:
                content = str(msg.get("content") or "").lower()
                if lowered_topic and lowered_topic in content:
                    question_frequency += 1

            completion_status = str(status_by_topic.get(topic.get("id"), "not_started") or "not_started")
            signals = {
                "mcq_accuracy": round(mcq_accuracy, 2),
                "mention_count": mention_count,
                "completion_status": completion_status,
                "question_frequency": question_frequency,
            }

            weakness_score = self.calculate_topic_weakness_score(topic=topic_name, subject=subject, signals=signals)
            weakness_scores.append(
                {
                    "topic": topic_name,
                    "subject": subject,
                    "weakness_score": weakness_score,
                    "signals": signals,
                }
            )

        weakness_scores.sort(key=lambda row: row["weakness_score"], reverse=True)

        critical_gaps = [row for row in weakness_scores if row["weakness_score"] > 75]
        high_risk = [row for row in weakness_scores if 51 <= row["weakness_score"] <= 75]
        moderate_risk = [row for row in weakness_scores if 26 <= row["weakness_score"] <= 50]
        strong_areas = [row for row in weakness_scores if row["weakness_score"] <= 25]

        avg_weakness = (sum(row["weakness_score"] for row in weakness_scores) / len(weakness_scores)) if weakness_scores else 0.0
        readiness_score = int(max(0, min(100, round(100 - avg_weakness))))
        estimated_marks_at_risk = (len(critical_gaps) + len(high_risk)) * 2

        return {
            "weakness_scores": weakness_scores,
            "critical_gaps": critical_gaps,
            "high_risk": high_risk,
            "moderate_risk": moderate_risk,
            "strong_areas": strong_areas,
            "overall_readiness_score": readiness_score,
            "estimated_marks_at_risk": estimated_marks_at_risk,
        }

    async def generate_interventions(self, user_id: str, weak_topics: List[Dict[str, Any]], student_category: str) -> List[Dict[str, Any]]:
        _ = user_id
        llm = OpenRouterLLMClient(OPENROUTER_MODELS["default"])
        interventions: List[Dict[str, Any]] = []

        for row in weak_topics[:10]:
            topic = row.get("topic")
            subject = row.get("subject")
            weakness_score = int(row.get("weakness_score", 0) or 0)
            signals = row.get("signals") or {}
            signals_description = (
                f"MCQ accuracy: {signals.get('mcq_accuracy', 0)}%, "
                f"struggle mentions: {signals.get('mention_count', 0)}, "
                f"syllabus status: {signals.get('completion_status', 'not_started')}, "
                f"AI tutor asks: {signals.get('question_frequency', 0)}"
            )

            prompt = f"""
Generate a specific intervention plan for a medical student who is weak in this topic.

Topic: {topic}
Subject: {subject}
Weakness signals: {signals_description}
Student type: {student_category}

Return a JSON object:
{{
  "intervention_plan": "specific 3-4 sentence action plan to fix this weakness",
  "time_required": "e.g. 2 focused hours",
  "approach": "how to study this specific topic",
  "key_resources": ["specific subtopics to focus on"],
  "quick_win": "one thing to do right now"
}}
"""

            try:
                raw = await llm.generate_sync(
                    prompt=prompt,
                    system_prompt="Return only strict JSON for intervention planning.",
                )
                parsed = self._extract_json(raw)
            except Exception:
                parsed = {}

            priority = "critical" if weakness_score > 75 else "high" if weakness_score > 50 else "medium"
            interventions.append(
                {
                    "topic": topic,
                    "subject": subject,
                    "weakness_score": weakness_score,
                    "priority": priority,
                    "intervention_plan": parsed.get("intervention_plan")
                    or f"Focus on {topic} with one intense concept revision, one active recall round, and one timed MCQ block.",
                    "time_required": parsed.get("time_required") or "2 focused hours",
                    "approach": parsed.get("approach") or "Concept map + active recall + rapid MCQs",
                    "key_resources": parsed.get("key_resources") if isinstance(parsed.get("key_resources"), list) else [],
                    "quick_win": parsed.get("quick_win") or f"Write 5 core exam points for {topic} from memory now.",
                }
            )

        return interventions
