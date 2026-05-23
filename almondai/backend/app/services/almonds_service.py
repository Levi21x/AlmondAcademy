from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any, Dict

from app.core.database import get_supabase_admin_client


MAX_ALMONDS = 5
RESET_MINUTES = 30


class AlmondsService:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    @staticmethod
    def _to_utc(value: Any) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            dt = value
        else:
            text = str(value).replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(text)
            except Exception:
                return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def _get_profile_row(self, user_id: str) -> Dict[str, Any]:
        result = (
            self.client.table("student_profiles")
            .select("user_id,almonds_count,almonds_last_reset")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise ValueError("Student profile not found")
        return result.data[0]

    def _log_event(
        self,
        user_id: str,
        event_type: str,
        reason: str,
        almonds_before: int,
        almonds_after: int,
    ) -> None:
        self.client.table("almond_events").insert(
            {
                "user_id": user_id,
                "event_type": event_type,
                "reason": reason,
                "almonds_before": almonds_before,
                "almonds_after": almonds_after,
            }
        ).execute()

    def _minutes_until_reset(self, last_reset: datetime) -> int:
        now = datetime.now(timezone.utc)
        next_reset = last_reset + timedelta(minutes=RESET_MINUTES)
        remaining = (next_reset - now).total_seconds()
        if remaining <= 0:
            return 0
        return max(1, ceil(remaining / 60))

    def get_almonds(self, user_id: str) -> Dict[str, Any]:
        row = self._get_profile_row(user_id)
        almonds_count = int(row.get("almonds_count") or 0)
        almonds_count = max(0, min(MAX_ALMONDS, almonds_count))
        last_reset = self._to_utc(row.get("almonds_last_reset")) or datetime.now(timezone.utc)

        reset_due = almonds_count < MAX_ALMONDS and (datetime.now(timezone.utc) - last_reset) >= timedelta(minutes=RESET_MINUTES)
        if reset_due:
            before = almonds_count
            almonds_count = MAX_ALMONDS
            now_iso = datetime.now(timezone.utc).isoformat()
            self.client.table("student_profiles").update(
                {
                    "almonds_count": almonds_count,
                    "almonds_last_reset": now_iso,
                }
            ).eq("user_id", user_id).execute()
            self._log_event(user_id, "reset", "timer_elapsed", before, almonds_count)
            last_reset = datetime.now(timezone.utc)

        minutes_until_reset = None if almonds_count >= MAX_ALMONDS else self._minutes_until_reset(last_reset)

        return {
            "almonds_count": almonds_count,
            "max_almonds": MAX_ALMONDS,
            "minutes_until_reset": minutes_until_reset,
            "is_full": almonds_count >= MAX_ALMONDS,
        }

    def lose_almond(self, user_id: str, reason: str) -> Dict[str, Any]:
        state = self.get_almonds(user_id)
        before = int(state["almonds_count"])
        if before > 0:
            after = before - 1
            self.client.table("student_profiles").update(
                {
                    "almonds_count": after,
                }
            ).eq("user_id", user_id).execute()
            self._log_event(user_id, "lost", reason, before, after)
            state = self.get_almonds(user_id)

        if int(state["almonds_count"]) <= 0:
            state["redirect_to_tutor"] = True
        return state

    def gain_almond(self, user_id: str, reason: str) -> Dict[str, Any]:
        state = self.get_almonds(user_id)
        before = int(state["almonds_count"])
        if before < MAX_ALMONDS:
            after = before + 1
            self.client.table("student_profiles").update(
                {
                    "almonds_count": after,
                }
            ).eq("user_id", user_id).execute()
            self._log_event(user_id, "gained", reason, before, after)
            state = self.get_almonds(user_id)
        return state
