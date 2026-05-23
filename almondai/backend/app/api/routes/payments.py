from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.middleware.auth_middleware import require_auth
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


class CreateOrderPayload(BaseModel):
    plan_code: str = Field(min_length=1, max_length=80)


class VerifyPaymentPayload(BaseModel):
    plan_code: str = Field(min_length=1, max_length=80)
    razorpay_order_id: str = Field(min_length=1)
    razorpay_payment_id: str = Field(min_length=1)
    razorpay_signature: str = Field(min_length=1)


class CancelPayload(BaseModel):
    reason: str | None = None


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


@router.get("/plans")
def get_plans(service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    return _success({"plans": service.get_plans()})


@router.post("/create-order")
def create_order(payload: CreateOrderPayload, user=Depends(require_auth), service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    data = service.create_order(user_id=user["user_id"], plan_code=payload.plan_code)
    return _success(data)


@router.post("/verify")
def verify_payment(payload: VerifyPaymentPayload, user=Depends(require_auth), service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    data = service.verify_payment(
        user_id=user["user_id"],
        plan_code=payload.plan_code,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )
    return _success(data)


@router.get("/subscription")
def get_subscription(user=Depends(require_auth), service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    subscription = service.get_subscription(user_id=user["user_id"])
    return _success(subscription)


@router.post("/cancel")
def cancel_subscription(payload: CancelPayload, user=Depends(require_auth), service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    subscription = service.cancel_subscription(user_id=user["user_id"])
    return _success({"cancelled": True, "reason": payload.reason, "subscription": subscription})


@router.delete("/cancel")
def cancel_subscription_delete(user=Depends(require_auth), service: PaymentService = Depends(PaymentService)) -> Dict[str, Any]:
    subscription = service.cancel_subscription(user_id=user["user_id"])
    return _success({"cancelled": True, "subscription": subscription})
