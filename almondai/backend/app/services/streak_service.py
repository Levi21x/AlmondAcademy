from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.database import get_supabase_admin_client
from app.services.achievements_service import achievements_service


VALID_ACTIVITY_TYPES = {
    "question_asked",
    "topic_completed",
    "topic_started",
    "topic_revision",
    "session_started",
    "mcq_attempted",
    "mcq_correct",
}


class StreakService:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def get_or_create_streak(self, user_id: str) -> Dict[str, Any]:
        result = self.client.table("study_streaks").select("*").eq("user_id", user_id).limit(1).execute()
        if result.data:
            return result.data[0]

        created = (
            self.client.table("study_streaks")
            .insert(
                {
                    "user_id": user_id,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "last_active_date": None,
                    "streak_started_date": None,
                    "total_active_days": 0,
                }
            )
            .execute()
        )
        return created.data[0]

    def update_streak(self, user_id: str) -> Dict[str, Any]:
        streak = self.get_or_create_streak(user_id)
        today = date.today()
        yesterday = today - timedelta(days=1)

        last_active_value: Optional[str] = streak.get("last_active_date")
        if last_active_value:
            last_active_date = date.fromisoformat(last_active_value)
        else:
            last_active_date = None

        gap_days = 0
        if last_active_date is not None:
            gap_days = max((today - last_active_date).days, 0)

        current_streak = int(streak.get("current_streak") or 0)
        longest_streak = int(streak.get("longest_streak") or 0)
        total_active_days = int(streak.get("total_active_days") or 0)
        streak_started_date = streak.get("streak_started_date")

        if last_active_date == today:
            streak_snapshot = dict(streak)
            try:
                streak_achievements = achievements_service.evaluate_and_unlock(
                    user_id=user_id,
                    trigger="streak_updated",
                    context={
                        "current_streak": int(streak.get("current_streak") or 0),
                        "longest_streak": int(streak.get("longest_streak") or 0),
                        "gap_days": gap_days,
                    },
                )
                if streak_achievements:
                    streak_snapshot["new_achievements"] = streak_achievements
            except Exception:
                pass
            return streak_snapshot

        if last_active_date is None:
            current_streak = 1
            longest_streak = max(longest_streak, 1)
            total_active_days = 1
            streak_started_date = today.isoformat()
        elif last_active_date == yesterday:
            current_streak += 1
            total_active_days += 1
            if not streak_started_date:
                streak_started_date = today.isoformat()
            longest_streak = max(longest_streak, current_streak)
        else:
            current_streak = 1
            total_active_days += 1
            streak_started_date = today.isoformat()
            longest_streak = max(longest_streak, 1)

        updated = (
            self.client.table("study_streaks")
            .update(
                {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "last_active_date": today.isoformat(),
                    "streak_started_date": streak_started_date,
                    "total_active_days": total_active_days,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("id", streak["id"])
            .execute()
        )

        updated_streak = updated.data[0] if updated.data else self.get_or_create_streak(user_id)
        updated_snapshot = dict(updated_streak)

        try:
            streak_achievements = achievements_service.evaluate_and_unlock(
                user_id=user_id,
                trigger="streak_updated",
                context={
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "gap_days": gap_days,
                },
            )
            if streak_achievements:
                updated_snapshot["new_achievements"] = streak_achievements
        except Exception:
            pass

        return updated_snapshot

    def log_activity(
        self,
        user_id: str,
        activity_type: str,
        subject: str | None = None,
        topic_name: str | None = None,
        session_id: str | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        if activity_type not in VALID_ACTIVITY_TYPES:
            raise ValueError(f"Invalid activity_type: {activity_type}")

        created = (
            self.client.table("study_activity")
            .insert(
                {
                    "user_id": user_id,
                    "activity_type": activity_type,
                    "subject": subject,
                    "topic_name": topic_name,
                    "session_id": session_id,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )

        streak_data = self.update_streak(user_id)

        context: Dict[str, Any] = {
            "subject": subject,
            "topic_name": topic_name,
            "session_id": session_id,
            "event_hour_utc": datetime.now(timezone.utc).hour,
        }
        if metadata:
            context.update(metadata)

        activity_achievements: List[Dict[str, Any]] = []
        try:
            activity_achievements = achievements_service.evaluate_and_unlock(
                user_id=user_id,
                trigger=activity_type,
                context=context,
            )
        except Exception:
            activity_achievements = []

        streak_achievements = []
        if isinstance(streak_data, dict):
            streak_achievements = list(streak_data.get("new_achievements") or [])

        merged_achievements: List[Dict[str, Any]] = []
        seen_badges = set()
        for badge in [*streak_achievements, *activity_achievements]:
            badge_key = badge.get("badge_key")
            if not badge_key or badge_key in seen_badges:
                continue
            merged_achievements.append(badge)
            seen_badges.add(badge_key)

        activity_row = created.data[0] if created.data else {}
        if merged_achievements:
            activity_row = {**activity_row, "new_achievements": merged_achievements}

        return activity_row

    def get_streak(self, user_id: str) -> Dict[str, Any]:
        result = self.client.table("study_streaks").select("*").eq("user_id", user_id).limit(1).execute()
        if result.data:
            return result.data[0]

        return {
            "current_streak": 0,
            "longest_streak": 0,
            "last_active_date": None,
            "streak_started_date": None,
            "total_active_days": 0,
        }
