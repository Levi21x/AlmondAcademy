from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.database import get_supabase_admin_client


BADGE_CATALOG: List[Dict[str, str]] = [
    {
        "key": "first_question",
        "name": "Curious Mind",
        "description": "Asked your first question to AlmondAI.",
        "tier": "bronze",
        "icon": "brain",
    },
    {
        "key": "voice_explorer",
        "name": "Voice Explorer",
        "description": "Used Voice Agent for the first time.",
        "tier": "bronze",
        "icon": "mic",
    },
    {
        "key": "night_owl",
        "name": "Night Owl",
        "description": "Completed a study action between 12 AM and 5 AM UTC.",
        "tier": "bronze",
        "icon": "moon",
    },
    {
        "key": "speed_learner",
        "name": "Speed Learner",
        "description": "Solved 10 correct MCQs in 20 seconds or less.",
        "tier": "silver",
        "icon": "zap",
    },
    {
        "key": "perfect_score",
        "name": "Perfect Score",
        "description": "Completed a 10+ question MCQ session with 100% accuracy.",
        "tier": "silver",
        "icon": "target",
    },
    {
        "key": "seven_day_streak",
        "name": "7-Day Streak",
        "description": "Maintained a 7-day learning streak.",
        "tier": "silver",
        "icon": "flame",
    },
    {
        "key": "streak_14",
        "name": "Fortnight Focus",
        "description": "Maintained a 14-day learning streak.",
        "tier": "gold",
        "icon": "calendar",
    },
    {
        "key": "topic_master",
        "name": "Topic Master",
        "description": "Completed 15 syllabus topics.",
        "tier": "gold",
        "icon": "book-open",
    },
    {
        "key": "high_achiever",
        "name": "High Achiever",
        "description": "Finished 5 MCQ sessions with at least 80% accuracy.",
        "tier": "gold",
        "icon": "trophy",
    },
    {
        "key": "consistent",
        "name": "Consistent",
        "description": "Maintained a 30-day learning streak.",
        "tier": "gold",
        "icon": "medal",
    },
    {
        "key": "streak_60",
        "name": "Iron Discipline",
        "description": "Maintained a 60-day learning streak.",
        "tier": "platinum",
        "icon": "shield",
    },
    {
        "key": "comeback_king",
        "name": "Comeback King",
        "description": "Returned to study after a 3+ day break.",
        "tier": "gold",
        "icon": "refresh-cw",
    },
    {
        "key": "pro_member",
        "name": "AlmondAI Pro",
        "description": "Activated a premium subscription.",
        "tier": "platinum",
        "icon": "crown",
    },
]

BADGE_BY_KEY: Dict[str, Dict[str, str]] = {badge["key"]: badge for badge in BADGE_CATALOG}

TRIGGER_BADGE_MAP = {
    "question_asked": {"first_question", "night_owl", "pro_member"},
    "topic_started": {"night_owl"},
    "topic_completed": {"topic_master", "night_owl"},
    "topic_revision": {"night_owl"},
    "mcq_attempted": {"speed_learner", "night_owl"},
    "mcq_correct": {"speed_learner", "night_owl"},
    "mcq_session_completed": {"perfect_score", "high_achiever"},
    "voice_used": {"voice_explorer", "night_owl"},
    "streak_updated": {"seven_day_streak", "streak_14", "consistent", "streak_60", "comeback_king"},
}

STREAK_MILESTONES = [
    {"target": 7, "badge_key": "seven_day_streak"},
    {"target": 14, "badge_key": "streak_14"},
    {"target": 30, "badge_key": "consistent"},
    {"target": 60, "badge_key": "streak_60"},
]


class AchievementsService:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def list_badges(self, user_id: str) -> Dict[str, Any]:
        unlocked_rows = self.get_unlocked(user_id=user_id, limit=500)
        unlocked_by_key = {row["badge_key"]: row for row in unlocked_rows}

        items: List[Dict[str, Any]] = []
        for badge in BADGE_CATALOG:
            row = unlocked_by_key.get(badge["key"])
            items.append(
                {
                    "badge_key": badge["key"],
                    "badge_name": badge["name"],
                    "badge_tier": badge["tier"],
                    "description": badge["description"],
                    "icon": badge["icon"],
                    "unlocked": row is not None,
                    "unlocked_at": row.get("unlocked_at") if row else None,
                    "metadata": row.get("metadata") if row else {},
                }
            )

        return {
            "items": items,
            "unlocked_count": len(unlocked_rows),
            "total_badges": len(BADGE_CATALOG),
            "next_streak_milestone": self.get_next_streak_milestone(user_id=user_id),
        }

    def get_unlocked(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            rows = (
                self.client.table("user_achievements")
                .select("badge_key,badge_name,badge_tier,description,icon,metadata,unlocked_at")
                .eq("user_id", user_id)
                .order("unlocked_at", desc=True)
                .limit(max(1, min(limit, 500)))
                .execute()
                .data
                or []
            )
            return [self._normalize_unlocked_row(row) for row in rows]
        except Exception:
            return []

    def get_recent_unlocks(self, user_id: str, since: str | None = None, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            query = (
                self.client.table("user_achievements")
                .select("badge_key,badge_name,badge_tier,description,icon,metadata,unlocked_at")
                .eq("user_id", user_id)
            )
            if since:
                query = query.gt("unlocked_at", since)

            rows = query.order("unlocked_at", desc=False).limit(max(1, min(limit, 100))).execute().data or []
            return [self._normalize_unlocked_row(row) for row in rows]
        except Exception:
            return []

    def get_summary(self, user_id: str) -> Dict[str, Any]:
        unlocked_rows = self.get_unlocked(user_id=user_id, limit=500)
        latest_unlock = unlocked_rows[0] if unlocked_rows else None

        return {
            "unlocked_count": len(unlocked_rows),
            "total_badges": len(BADGE_CATALOG),
            "next_streak_milestone": self.get_next_streak_milestone(user_id=user_id),
            "latest_unlock": latest_unlock,
        }

    def get_next_streak_milestone(self, user_id: str) -> Dict[str, Any] | None:
        current_streak = self._get_current_streak(user_id=user_id)

        for milestone in STREAK_MILESTONES:
            target = int(milestone["target"])
            if current_streak < target:
                badge = BADGE_BY_KEY.get(milestone["badge_key"], {})
                return {
                    "current_streak": current_streak,
                    "target_streak": target,
                    "remaining_days": max(target - current_streak, 0),
                    "badge_key": milestone["badge_key"],
                    "badge_name": badge.get("name"),
                    "badge_tier": badge.get("tier"),
                }

        highest = STREAK_MILESTONES[-1]
        highest_badge = BADGE_BY_KEY.get(highest["badge_key"], {})
        return {
            "current_streak": current_streak,
            "target_streak": int(highest["target"]),
            "remaining_days": 0,
            "badge_key": highest["badge_key"],
            "badge_name": highest_badge.get("name"),
            "badge_tier": highest_badge.get("tier"),
        }

    def evaluate_and_unlock(self, user_id: str, trigger: str, context: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        context = context or {}
        candidate_keys = sorted(TRIGGER_BADGE_MAP.get(trigger, set()))
        if not candidate_keys:
            return []

        unlocked_existing = self.get_unlocked(user_id=user_id, limit=500)
        unlocked_keys = {row["badge_key"] for row in unlocked_existing}

        new_unlocks: List[Dict[str, Any]] = []
        for badge_key in candidate_keys:
            if badge_key in unlocked_keys:
                continue
            if not self._should_unlock_badge(user_id=user_id, badge_key=badge_key, trigger=trigger, context=context):
                continue

            badge = BADGE_BY_KEY.get(badge_key)
            if not badge:
                continue

            payload = {
                "user_id": user_id,
                "badge_key": badge_key,
                "badge_name": badge["name"],
                "badge_tier": badge["tier"],
                "description": badge["description"],
                "icon": badge["icon"],
                "metadata": {
                    "trigger": trigger,
                    "context": context,
                },
                "unlocked_at": datetime.now(timezone.utc).isoformat(),
            }

            try:
                inserted = self.client.table("user_achievements").insert(payload).execute()
            except Exception:
                continue

            if inserted.data:
                unlocked_row = self._normalize_unlocked_row(inserted.data[0])
                new_unlocks.append(unlocked_row)
                unlocked_keys.add(badge_key)

        return new_unlocks

    def _should_unlock_badge(self, user_id: str, badge_key: str, trigger: str, context: Dict[str, Any]) -> bool:
        if badge_key == "first_question":
            return self._has_study_activity(user_id=user_id, activity_type="question_asked")

        if badge_key == "voice_explorer":
            return trigger == "voice_used" or str(context.get("source") or "").lower() == "voice"

        if badge_key == "night_owl":
            hour_value = context.get("event_hour_utc")
            if hour_value is None:
                hour_value = datetime.now(timezone.utc).hour
            try:
                hour = int(hour_value)
            except (TypeError, ValueError):
                return False
            return 0 <= hour < 5

        if badge_key == "speed_learner":
            return self._count_fast_correct_answers(user_id=user_id, max_seconds=20, target=10) >= 10

        if badge_key == "perfect_score":
            total_questions = int(context.get("total_questions") or 0)
            correct_answers = int(context.get("correct_answers") or 0)
            if total_questions >= 10 and total_questions == correct_answers:
                return True
            return self._has_perfect_session(user_id=user_id, min_questions=10)

        if badge_key == "topic_master":
            return self._count_completed_topics(user_id=user_id, target=15) >= 15

        if badge_key == "high_achiever":
            return self._count_high_accuracy_sessions(user_id=user_id, min_questions=5, min_accuracy_pct=80, target=5) >= 5

        if badge_key == "seven_day_streak":
            return self._get_current_streak(user_id=user_id) >= 7

        if badge_key == "streak_14":
            return self._get_current_streak(user_id=user_id) >= 14

        if badge_key == "consistent":
            return self._get_current_streak(user_id=user_id) >= 30

        if badge_key == "streak_60":
            return self._get_current_streak(user_id=user_id) >= 60

        if badge_key == "comeback_king":
            gap_days = int(context.get("gap_days") or 0)
            current_streak = int(context.get("current_streak") or 0)
            return current_streak == 1 and gap_days >= 3

        if badge_key == "pro_member":
            return self._is_pro_member(user_id=user_id)

        return False

    def _normalize_unlocked_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        badge_key = str(row.get("badge_key") or "")
        catalog = BADGE_BY_KEY.get(badge_key, {})
        return {
            "badge_key": badge_key,
            "badge_name": row.get("badge_name") or catalog.get("name") or badge_key,
            "badge_tier": row.get("badge_tier") or catalog.get("tier") or "bronze",
            "description": row.get("description") or catalog.get("description") or "",
            "icon": row.get("icon") or catalog.get("icon") or "medal",
            "metadata": row.get("metadata") or {},
            "unlocked": True,
            "unlocked_at": row.get("unlocked_at"),
        }

    def _has_study_activity(self, user_id: str, activity_type: str) -> bool:
        try:
            rows = (
                self.client.table("study_activity")
                .select("id")
                .eq("user_id", user_id)
                .eq("activity_type", activity_type)
                .limit(1)
                .execute()
                .data
                or []
            )
            return bool(rows)
        except Exception:
            return False

    def _count_fast_correct_answers(self, user_id: str, max_seconds: int, target: int) -> int:
        try:
            rows = (
                self.client.table("student_mcq_attempts")
                .select("id")
                .eq("user_id", user_id)
                .eq("is_correct", True)
                .lte("time_taken_seconds", max_seconds)
                .limit(max(target, 1))
                .execute()
                .data
                or []
            )
            return len(rows)
        except Exception:
            return 0

    def _count_completed_topics(self, user_id: str, target: int) -> int:
        try:
            rows = (
                self.client.table("student_topic_progress")
                .select("id")
                .eq("user_id", user_id)
                .eq("status", "completed")
                .limit(max(target, 1))
                .execute()
                .data
                or []
            )
            return len(rows)
        except Exception:
            return 0

    def _has_perfect_session(self, user_id: str, min_questions: int) -> bool:
        try:
            rows = (
                self.client.table("mcq_sessions")
                .select("total_questions,correct_answers")
                .eq("user_id", user_id)
                .eq("completed", True)
                .gte("total_questions", min_questions)
                .order("completed_at", desc=True)
                .limit(50)
                .execute()
                .data
                or []
            )
        except Exception:
            return False

        for row in rows:
            total_questions = int(row.get("total_questions") or 0)
            correct_answers = int(row.get("correct_answers") or 0)
            if total_questions >= min_questions and correct_answers == total_questions:
                return True
        return False

    def _count_high_accuracy_sessions(self, user_id: str, min_questions: int, min_accuracy_pct: int, target: int) -> int:
        try:
            rows = (
                self.client.table("mcq_sessions")
                .select("total_questions,correct_answers")
                .eq("user_id", user_id)
                .eq("completed", True)
                .gte("total_questions", min_questions)
                .order("completed_at", desc=True)
                .limit(200)
                .execute()
                .data
                or []
            )
        except Exception:
            return 0

        qualified = 0
        for row in rows:
            total_questions = int(row.get("total_questions") or 0)
            correct_answers = int(row.get("correct_answers") or 0)
            if total_questions <= 0:
                continue
            accuracy = (correct_answers / total_questions) * 100
            if total_questions >= min_questions and accuracy >= min_accuracy_pct:
                qualified += 1
            if qualified >= target:
                return qualified

        return qualified

    def _get_current_streak(self, user_id: str) -> int:
        try:
            rows = (
                self.client.table("study_streaks")
                .select("current_streak")
                .eq("user_id", user_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            if not rows:
                return 0
            return int(rows[0].get("current_streak") or 0)
        except Exception:
            return 0

    def _is_pro_member(self, user_id: str) -> bool:
        try:
            rows = (
                self.client.table("subscriptions")
                .select("plan_type")
                .eq("user_id", user_id)
                .eq("status", "active")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception:
            return False

        if not rows:
            return False

        return str(rows[0].get("plan_type") or "free") != "free"


achievements_service = AchievementsService()
