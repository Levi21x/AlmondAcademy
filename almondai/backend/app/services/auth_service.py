from datetime import date, datetime, timezone
from typing import Any, Dict

from fastapi import HTTPException, status
from supabase import Client

from app.core.database import get_supabase_admin_client
from app.schemas.auth import StudentProfileCreate, StudentProfileUpdate


def _api_error(status_code: int, message: str, code: str, details: Dict[str, Any] | None = None) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "error": True,
            "message": message,
            "code": code,
            "details": details or {},
        },
    )


class AuthService:
    def __init__(self) -> None:
        self.client: Client = get_supabase_admin_client()

    def get_profile(self, user_id: str) -> Dict[str, Any] | None:
        try:
            result = self.client.table("student_profiles").select("*").eq("user_id", user_id).limit(1).execute()
            return result.data[0] if result.data else None
        except Exception as exc:
            raise _api_error(
                status_code=500,
                message="Failed to fetch profile",
                code="PROFILE_FETCH_FAILED",
                details={"reason": str(exc)},
            ) from exc

    def create_profile(self, user_id: str, email: str, payload: StudentProfileCreate) -> Dict[str, Any]:
        existing_profile = self.get_profile(user_id)
        if existing_profile:
            raise _api_error(409, "Profile already exists", "PROFILE_EXISTS")

        try:
            self.client.table("users").upsert({"id": user_id, "email": email}).execute()
        except Exception as exc:
            raise _api_error(500, "Failed to prepare user record", "USER_PREPARE_FAILED", {"reason": str(exc)}) from exc

        try:
            profile_result = self.client.table("student_profiles").insert(
                {
                    "user_id": user_id,
                    "full_name": payload.full_name,
                    "college_name": payload.college_name,
                    "university_name": payload.university_name,
                    "current_year": payload.current_year,
                    "mode": payload.mode,
                    "student_category": payload.student_category,
                    "teaching_style": payload.teaching_style,
                    "onboarding_completed": payload.onboarding_completed,
                }
            ).execute()
        except Exception as exc:
            raise _api_error(500, "Failed to create profile", "PROFILE_CREATE_FAILED", {"reason": str(exc)}) from exc

        if not profile_result.data:
            raise _api_error(500, "Failed to create profile", "PROFILE_CREATE_FAILED")

        existing_subscription = (
            self.client.table("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if not existing_subscription.data:
            subscription_result = self.client.table("subscriptions").insert(
                {"user_id": user_id, "plan_type": "free", "status": "active"}
            ).execute()
            if not subscription_result.data:
                raise _api_error(500, "Failed to create subscription", "SUBSCRIPTION_CREATE_FAILED")

        self.ensure_daily_usage(user_id)
        return profile_result.data[0]

    def update_profile(self, user_id: str, payload: StudentProfileUpdate) -> Dict[str, Any]:
        updates = payload.model_dump(exclude_none=True)
        if not updates:
            raise _api_error(400, "No fields provided to update", "EMPTY_UPDATE_PAYLOAD")

        try:
            result = self.client.table("student_profiles").update(updates).eq("user_id", user_id).execute()
        except Exception as exc:
            raise _api_error(500, "Failed to update profile", "PROFILE_UPDATE_FAILED", {"reason": str(exc)}) from exc

        if not result.data:
            raise _api_error(404, "Profile not found", "PROFILE_NOT_FOUND")

        return result.data[0]

    def ensure_daily_usage(self, user_id: str) -> Dict[str, Any]:
        today = date.today().isoformat()
        try:
            result = self.client.table("daily_usage").select("*").eq("user_id", user_id).eq("date", today).limit(1).execute()
        except Exception as exc:
            raise _api_error(500, "Failed to fetch daily usage", "USAGE_FETCH_FAILED", {"reason": str(exc)}) from exc

        if result.data:
            return result.data[0]

        created = self.client.table("daily_usage").insert(
            {
                "user_id": user_id,
                "date": today,
                "questions_asked": 0,
                "voice_minutes_used": 0,
                "crisis_mode_used": False,
            }
        ).execute()
        if not created.data:
            raise _api_error(500, "Failed to create daily usage", "USAGE_CREATE_FAILED")
        return created.data[0]

    def get_active_subscription(self, user_id: str) -> Dict[str, Any] | None:
        result = (
            self.client.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None

        active = result.data[0]
        expires_at = active.get("expires_at")
        if expires_at:
            try:
                expires_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                if expires_dt < datetime.now(timezone.utc):
                    self.client.table("subscriptions").update({"status": "expired"}).eq("id", active["id"]).execute()
                    return None
            except Exception:
                return active

        return active

    def increment_usage_question(self, user_id: str) -> Dict[str, Any]:
        usage = self.ensure_daily_usage(user_id)
        active_subscription = self.get_active_subscription(user_id)
        plan_type = active_subscription["plan_type"] if active_subscription else "free"
        is_free = plan_type == "free"

        if is_free and usage["questions_asked"] >= 15:
            raise _api_error(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                message="Daily question limit reached for free plan",
                code="DAILY_LIMIT_REACHED",
                details={"daily_limit": 15, "plan_type": plan_type},
            )

        result = (
            self.client.table("daily_usage")
            .update({"questions_asked": usage["questions_asked"] + 1})
            .eq("id", usage["id"])
            .execute()
        )

        if not result.data:
            raise _api_error(500, "Failed to update daily usage", "USAGE_UPDATE_FAILED")

        return result.data[0]
