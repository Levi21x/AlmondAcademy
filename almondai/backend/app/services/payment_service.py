from __future__ import annotations

from datetime import datetime, timedelta, timezone
import importlib
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.core.config import get_settings
from app.core.database import get_supabase_admin_client


PLAN_CATALOG: Dict[str, Dict[str, Any]] = {
    "premium_monthly": {
        "code": "premium_monthly",
        "name": "Premium Monthly",
        "description": "Unlimited access to AlmondAI premium tools",
        "amount_paise": 79900,
        "currency": "INR",
        "kind": "subscription",
        "duration_days": 30,
        "plan_type": "premium",
        "popular": True,
    },
    "premium_yearly": {
        "code": "premium_yearly",
        "name": "Premium Yearly",
        "description": "Best value annual premium plan",
        "amount_paise": 699900,
        "currency": "INR",
        "kind": "subscription",
        "duration_days": 365,
        "plan_type": "premium",
        "popular": False,
    },
    "crisis_pack_3": {
        "code": "crisis_pack_3",
        "name": "Crisis Pack (3 sessions)",
        "description": "One-time pack for extra crisis activations",
        "amount_paise": 19900,
        "currency": "INR",
        "kind": "addon",
        "duration_days": 30,
        "sessions": 3,
        "plan_type": "addon",
        "popular": False,
    },
    "crisis_pack_7": {
        "code": "crisis_pack_7",
        "name": "Crisis Pack (7 sessions)",
        "description": "One-time pack for intensive prep windows",
        "amount_paise": 34900,
        "currency": "INR",
        "kind": "addon",
        "duration_days": 45,
        "sessions": 7,
        "plan_type": "addon",
        "popular": False,
    },
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PaymentService:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()
        self.settings = get_settings()
        self.razorpay_client: Optional[Any] = None
        if self.settings.razorpay_key_id and self.settings.razorpay_key_secret:
            razorpay_module = importlib.import_module("razorpay")
            self.razorpay_client = razorpay_module.Client(auth=(self.settings.razorpay_key_id, self.settings.razorpay_key_secret))

    def get_plans(self) -> List[Dict[str, Any]]:
        return [PLAN_CATALOG[key] for key in PLAN_CATALOG]

    def _require_razorpay(self) -> Any:
        if not self.razorpay_client:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": True,
                    "message": "Payments are not configured on server",
                    "code": "PAYMENTS_NOT_CONFIGURED",
                },
            )
        return self.razorpay_client

    def _normalize_subscription(self, row: Dict[str, Any] | None) -> Dict[str, Any]:
        if not row:
            return {
                "is_premium": False,
                "plan_type": "free",
                "status": "active",
                "expires_at": None,
                "started_at": None,
                "payment_id": None,
            }

        expires_at = row.get("expires_at")
        is_expired = False
        if expires_at:
            try:
                expires_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if expires_dt.tzinfo is None:
                    expires_dt = expires_dt.replace(tzinfo=timezone.utc)
                is_expired = expires_dt < _utcnow()
            except Exception:
                is_expired = False

        status = str(row.get("status") or "active")
        plan_type = str(row.get("plan_type") or "free")

        return {
            "is_premium": status == "active" and plan_type == "premium" and not is_expired,
            "plan_type": plan_type,
            "status": "expired" if is_expired else status,
            "expires_at": row.get("expires_at"),
            "started_at": row.get("started_at") or row.get("created_at"),
            "payment_id": row.get("payment_id"),
        }

    def _latest_active_subscription(self, user_id: str) -> Dict[str, Any] | None:
        rows = (
            self.client.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )
        return rows[0] if rows else None

    def _ensure_free_subscription(self, user_id: str) -> None:
        existing_free = (
            self.client.table("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "active")
            .eq("plan_type", "free")
            .limit(1)
            .execute()
            .data
            or []
        )
        if not existing_free:
            self.client.table("subscriptions").insert({"user_id": user_id, "plan_type": "free", "status": "active"}).execute()

    def get_subscription(self, user_id: str) -> Dict[str, Any]:
        active = self._latest_active_subscription(user_id)
        if not active:
            self._ensure_free_subscription(user_id)
            active = self._latest_active_subscription(user_id)
        if not active:
            return self._normalize_subscription(None)

        subscription = self._normalize_subscription(active)
        if subscription["status"] == "expired" and active.get("status") == "active":
            self.client.table("subscriptions").update({"status": "expired"}).eq("id", active["id"]).execute()
            self._ensure_free_subscription(user_id)
            active = self._latest_active_subscription(user_id)
            return self._normalize_subscription(active)

        return subscription

    def create_order(self, user_id: str, plan_code: str) -> Dict[str, Any]:
        plan = PLAN_CATALOG.get(plan_code)
        if not plan:
            raise HTTPException(status_code=400, detail={"error": True, "message": "Invalid plan", "code": "INVALID_PLAN"})

        razorpay_client = self._require_razorpay()

        receipt = f"almond-{user_id[:8]}-{int(_utcnow().timestamp())}"
        try:
            order = razorpay_client.order.create(
                {
                    "amount": int(plan["amount_paise"]),
                    "currency": plan["currency"],
                    "receipt": receipt,
                    "payment_capture": 1,
                    "notes": {"user_id": user_id, "plan_code": plan_code},
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail={"error": True, "message": "Failed to create payment order", "code": "PAYMENT_ORDER_FAILED", "details": {"reason": str(exc)}},
            ) from exc

        self.client.table("payment_transactions").insert(
            {
                "user_id": user_id,
                "plan_code": plan_code,
                "amount_paise": int(plan["amount_paise"]),
                "currency": plan["currency"],
                "razorpay_order_id": order.get("id"),
                "status": "created",
                "metadata": {"plan": plan},
            }
        ).execute()

        return {
            "order_id": order.get("id"),
            "amount_paise": int(plan["amount_paise"]),
            "currency": plan["currency"],
            "plan_code": plan_code,
            "key_id": self.settings.razorpay_key_id,
            "name": "AlmondAI",
            "description": plan["name"],
            "prefill": {},
        }

    def _activate_subscription(self, user_id: str, plan: Dict[str, Any], payment_id: str, order_id: str, amount_paise: int) -> Dict[str, Any]:
        now = _utcnow()
        expires_at = now + timedelta(days=int(plan["duration_days"]))

        self.client.table("subscriptions").update(
            {
                "status": "cancelled",
                "cancelled_at": now.isoformat(),
            }
        ).eq("user_id", user_id).eq("status", "active").neq("plan_type", "free").execute()

        inserted = (
            self.client.table("subscriptions")
            .insert(
                {
                    "user_id": user_id,
                    "plan_type": plan["plan_type"],
                    "status": "active",
                    "payment_id": payment_id,
                    "razorpay_order_id": order_id,
                    "amount_paise": amount_paise,
                    "started_at": now.isoformat(),
                    "expires_at": expires_at.isoformat(),
                }
            )
            .execute()
        )

        if not inserted.data:
            raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to activate subscription", "code": "SUBSCRIPTION_ACTIVATION_FAILED"})

        return self._normalize_subscription(inserted.data[0])

    def verify_payment(self, user_id: str, plan_code: str, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> Dict[str, Any]:
        plan = PLAN_CATALOG.get(plan_code)
        if not plan:
            raise HTTPException(status_code=400, detail={"error": True, "message": "Invalid plan", "code": "INVALID_PLAN"})

        razorpay_client = self._require_razorpay()

        rows = (
            self.client.table("payment_transactions")
            .select("*")
            .eq("user_id", user_id)
            .eq("razorpay_order_id", razorpay_order_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail={"error": True, "message": "Payment order not found", "code": "PAYMENT_ORDER_NOT_FOUND"})

        transaction = rows[0]
        if transaction.get("status") == "paid":
            return {
                "verified": True,
                "subscription": self.get_subscription(user_id),
                "plan": plan,
            }

        try:
            razorpay_client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            )
        except Exception as exc:
            self.client.table("payment_transactions").update(
                {
                    "status": "failed",
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                }
            ).eq("id", transaction["id"]).execute()
            raise HTTPException(status_code=400, detail={"error": True, "message": "Payment signature verification failed", "code": "PAYMENT_SIGNATURE_INVALID", "details": {"reason": str(exc)}}) from exc

        self.client.table("payment_transactions").update(
            {
                "status": "paid",
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        ).eq("id", transaction["id"]).execute()

        subscription = self.get_subscription(user_id)
        if plan["kind"] == "subscription":
            subscription = self._activate_subscription(
                user_id=user_id,
                plan=plan,
                payment_id=razorpay_payment_id,
                order_id=razorpay_order_id,
                amount_paise=int(plan["amount_paise"]),
            )

        return {
            "verified": True,
            "subscription": subscription,
            "plan": plan,
        }

    def cancel_subscription(self, user_id: str) -> Dict[str, Any]:
        rows = (
            self.client.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .eq("status", "active")
            .neq("plan_type", "free")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
            .data
            or []
        )

        if rows:
            self.client.table("subscriptions").update(
                {
                    "status": "cancelled",
                    "cancelled_at": _utcnow().isoformat(),
                }
            ).eq("id", rows[0]["id"]).execute()

        self._ensure_free_subscription(user_id)
        return self.get_subscription(user_id)
