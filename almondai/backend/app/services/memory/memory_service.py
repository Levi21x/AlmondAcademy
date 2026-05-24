from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import logging
import re
from typing import Any, Dict, List

from app.core.database import get_supabase_admin_client
from app.services.llm.openrouter_client import generate_with_fallback_sync
from app.services.rag.vector_store import ChromaVectorStore


logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self, vector_store: ChromaVectorStore | None = None) -> None:
        self.client = get_supabase_admin_client()
        self.vector_store = vector_store or ChromaVectorStore()
        self._medical_keywords = {
            "anatomy": ["brachial plexus", "femoral triangle", "cranial nerve", "circle of willis", "histology"],
            "physiology": ["cardiac cycle", "action potential", "gfr", "acid base", "respiration"],
            "pathology": ["inflammation", "necrosis", "neoplasia", "thrombosis", "granuloma"],
            "pharmacology": ["antibiotic", "beta blocker", "ace inhibitor", "insulin", "analgesic"],
            "medicine": ["diabetes", "hypertension", "heart failure", "asthma", "tuberculosis"],
            "surgery": ["appendicitis", "hernia", "shock", "trauma", "postoperative"],
            "obgyn": ["preeclampsia", "postpartum", "labor", "placenta", "ectopic"],
            "pediatrics": ["neonate", "vaccination", "dehydration", "seizure", "jaundice"],
            "microbiology": ["staphylococcus", "streptococcus", "virus", "fungus", "parasite"],
            "biochemistry": ["glycolysis", "krebs", "urea cycle", "enzyme", "lipid metabolism"],
        }

    def extract_topics_from_text(self, text: str) -> list[str]:
        content = (text or "").lower()
        if not content:
            return []

        found_topics: list[str] = []
        for keywords in self._medical_keywords.values():
            for keyword in keywords:
                pattern = r"\\b" + re.escape(keyword.lower()) + r"\\b"
                if re.search(pattern, content) and keyword not in found_topics:
                    found_topics.append(keyword)

        # Keep list short and deterministic for pattern table updates.
        return found_topics[:8]

    def update_struggle_patterns(self, user_id: str, question: str, subject: str = None) -> None:
        topics = self.extract_topics_from_text(question)
        if not topics:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        for topic in topics:
            try:
                existing = (
                    self.client.table("student_struggle_patterns")
                    .select("id,mention_count")
                    .eq("user_id", user_id)
                    .eq("topic", topic)
                    .limit(1)
                    .execute()
                    .data
                    or []
                )

                if existing:
                    row = existing[0]
                    self.client.table("student_struggle_patterns").update(
                        {
                            "mention_count": int(row.get("mention_count", 1)) + 1,
                            "last_mentioned_at": now_iso,
                            "subject": subject,
                            "is_resolved": False,
                        }
                    ).eq("id", row["id"]).execute()
                else:
                    self.client.table("student_struggle_patterns").insert(
                        {
                            "user_id": user_id,
                            "topic": topic,
                            "subject": subject,
                            "mention_count": 1,
                            "first_mentioned_at": now_iso,
                            "last_mentioned_at": now_iso,
                            "is_resolved": False,
                        }
                    ).execute()
            except Exception:
                logger.exception("Failed to update struggle pattern user=%s topic=%s", user_id, topic)

    def get_struggle_patterns(self, user_id: str, limit: int = 10) -> list[dict]:
        try:
            rows = (
                self.client.table("student_struggle_patterns")
                .select("topic,subject,mention_count,last_mentioned_at,is_resolved")
                .eq("user_id", user_id)
                .eq("is_resolved", False)
                .order("mention_count", desc=True)
                .limit(limit)
                .execute()
                .data
                or []
            )
            return rows
        except Exception:
            logger.exception("Failed to fetch struggle patterns for user=%s", user_id)
            return []

    def get_memory_context(self, user_id: str, current_question: str, subject: str = None) -> str:
        memory_parts: list[str] = []

        try:
            search_query = current_question if not subject else f"{subject} {current_question}"
            past_interactions = self.vector_store.search_student_memory(
                user_id=user_id,
                query=search_query,
                n_results=3,
            )
        except Exception:
            logger.exception("Student memory search failed for user=%s", user_id)
            past_interactions = []

        struggle_patterns = self.get_struggle_patterns(user_id=user_id, limit=5)

        if past_interactions:
            memory_parts.append("RELEVANT PAST INTERACTIONS WITH THIS STUDENT:")
            for interaction in past_interactions:
                question = (interaction or {}).get("question")
                if question:
                    memory_parts.append(f"Previously asked: {question}")

        if struggle_patterns:
            memory_parts.append("\nTOPICS THIS STUDENT CONSISTENTLY STRUGGLES WITH:")
            for pattern in struggle_patterns[:5]:
                memory_parts.append(
                    f"- {pattern.get('topic', 'Unknown topic')} (asked {int(pattern.get('mention_count', 0) or 0)} times)"
                )

        return "\n".join(memory_parts) if memory_parts else ""

    async def store_interaction(
        self,
        user_id: str,
        interaction_id: str,
        question: str,
        answer: str,
        subject: str = None,
    ) -> None:
        try:
            topics = self.extract_topics_from_text(f"{question} {answer}")
            self.vector_store.add_interaction_memory(
                user_id=user_id,
                interaction_id=interaction_id,
                question=question,
                answer=answer,
                subject=subject,
                topics_mentioned=topics,
            )
        except Exception:
            logger.exception("Failed to store interaction vector memory user=%s", user_id)

        try:
            self.update_struggle_patterns(user_id=user_id, question=question, subject=subject)
        except Exception:
            logger.exception("Failed to update struggle patterns user=%s", user_id)

    def _extract_json_object(self, content: str) -> dict:
        cleaned = (content or "").strip()
        if not cleaned:
            return {}

        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass

        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {}

        candidate = cleaned[start : end + 1]
        try:
            parsed = json.loads(candidate)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            logger.exception("Failed to parse weekly summary JSON")
            return {}

    async def generate_weekly_summary(self, user_id: str) -> dict:
        week_start = date.today() - timedelta(days=7)
        week_start_iso = datetime.combine(week_start, datetime.min.time(), tzinfo=timezone.utc).isoformat()

        chat_rows = (
            self.client.table("chat_messages")
            .select("role,content,created_at")
            .eq("user_id", user_id)
            .eq("role", "user")
            .gte("created_at", week_start_iso)
            .order("created_at", desc=False)
            .limit(200)
            .execute()
            .data
            or []
        )

        activity_rows = (
            self.client.table("study_activity")
            .select("activity_type,subject,topic_name,created_at")
            .eq("user_id", user_id)
            .gte("created_at", week_start_iso)
            .order("created_at", desc=False)
            .limit(300)
            .execute()
            .data
            or []
        )

        struggle_rows = self.get_struggle_patterns(user_id=user_id, limit=10)

        recent_questions = "\n".join([f"- {(row.get('content') or '')[:200]}" for row in chat_rows]) or "- None"

        completed_topics = "\n".join(
            [
                f"- {(row.get('subject') or 'General')}: {(row.get('topic_name') or row.get('activity_type') or '')}"
                for row in activity_rows
                if row.get("activity_type") in {"topic_completed", "topic_revision", "question_asked"}
            ]
        ) or "- None"

        struggle_patterns = "\n".join(
            [f"- {row.get('topic')} ({int(row.get('mention_count', 0) or 0)} mentions)" for row in struggle_rows]
        ) or "- None"

        prompt = f"""
Analyze this medical student's study activity from the past week and generate a memory summary.

Questions asked this week:
{recent_questions}

Topics completed this week:
{completed_topics}

Ongoing struggle areas:
{struggle_patterns}

Generate a JSON summary with this structure:
{{
  "summary": "2-3 sentence overview of the week",
  "strong_areas": ["topic1", "topic2"],
  "weak_areas": ["topic1", "topic2"],
  "recommended_focus": ["topic1", "topic2"],
  "study_pattern": "description of how student studies",
  "encouragement": "personalized encouraging message"
}}
"""

        raw = await generate_with_fallback_sync(
            prompt=prompt,
            system_prompt="You are AlmondAI memory analyst. Return only valid JSON.",
            tier="default",
        )
        parsed = self._extract_json_object(raw)

        summary_payload = {
            "summary": parsed.get("summary") or "You had a productive week with consistent study activity.",
            "strong_areas": parsed.get("strong_areas") or [],
            "weak_areas": parsed.get("weak_areas") or [],
            "recommended_focus": parsed.get("recommended_focus") or [],
            "study_pattern": parsed.get("study_pattern") or "You tend to revise repeatedly before moving to new topics.",
            "encouragement": parsed.get("encouragement") or "Keep going. Your consistency is building strong clinical confidence.",
        }

        self.client.table("student_memory_summaries").insert(
            {
                "user_id": user_id,
                "summary_type": "weekly",
                "subject": None,
                "content": summary_payload["summary"],
                "weak_topics": summary_payload["weak_areas"],
                "strong_topics": summary_payload["strong_areas"],
                "study_patterns": {
                    "recommended_focus": summary_payload["recommended_focus"],
                    "study_pattern": summary_payload["study_pattern"],
                    "encouragement": summary_payload["encouragement"],
                },
                "week_start": week_start.isoformat(),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()

        return summary_payload
