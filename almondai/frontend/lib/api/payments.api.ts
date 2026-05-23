const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type PlanKind = "subscription" | "addon";

export interface PaymentPlan {
  code: string;
  name: string;
  description: string;
  amount_paise: number;
  currency: string;
  kind: PlanKind;
  duration_days: number;
  plan_type: string;
  popular: boolean;
  sessions?: number;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  plan_type: string;
  status: string;
  expires_at: string | null;
  started_at: string | null;
  payment_id: string | null;
}

export interface CreateOrderResponse {
  order_id: string;
  amount_paise: number;
  currency: string;
  plan_code: string;
  key_id: string;
  name: string;
  description: string;
  prefill: Record<string, string>;
}

export interface VerifyResponse {
  verified: boolean;
  subscription: SubscriptionStatus;
  plan: PaymentPlan;
}

function authHeader(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getPaymentPlans(token: string): Promise<PaymentPlan[]> {
  const res = await fetch(`${apiBase}/api/v1/payments/plans`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch payment plans");
  }

  const payload = (await res.json()) as ApiEnvelope<{ plans: PaymentPlan[] }>;
  return payload.data.plans ?? [];
}

export async function createPaymentOrder(token: string, planCode: string): Promise<CreateOrderResponse> {
  const res = await fetch(`${apiBase}/api/v1/payments/create-order`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({ plan_code: planCode }),
  });

  if (!res.ok) {
    let message = "Failed to create payment order";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<CreateOrderResponse>;
  return payload.data;
}

export async function verifyPayment(
  token: string,
  payload: {
    planCode: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
): Promise<VerifyResponse> {
  const res = await fetch(`${apiBase}/api/v1/payments/verify`, {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify({
      plan_code: payload.planCode,
      razorpay_order_id: payload.razorpayOrderId,
      razorpay_payment_id: payload.razorpayPaymentId,
      razorpay_signature: payload.razorpaySignature,
    }),
  });

  if (!res.ok) {
    let message = "Failed to verify payment";
    try {
      const body = await res.json();
      message = body?.detail?.message ?? body?.message ?? message;
    } catch {
      // Keep default message.
    }
    throw new Error(message);
  }

  const data = (await res.json()) as ApiEnvelope<VerifyResponse>;
  return data.data;
}

export async function getSubscriptionStatus(token: string): Promise<SubscriptionStatus> {
  const res = await fetch(`${apiBase}/api/v1/payments/subscription`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch subscription status");
  }

  const payload = (await res.json()) as ApiEnvelope<SubscriptionStatus>;
  return payload.data;
}

export async function cancelSubscription(token: string, reason?: string): Promise<SubscriptionStatus> {
  const res = await fetch(`${apiBase}/api/v1/payments/cancel`, {
    method: "DELETE",
    headers: reason ? authHeader(token) : { Authorization: `Bearer ${token}` },
    body: reason ? JSON.stringify({ reason }) : undefined,
  });

  if (!res.ok) {
    throw new Error("Failed to cancel subscription");
  }

  const payload = (await res.json()) as ApiEnvelope<{ cancelled: boolean; subscription: SubscriptionStatus }>;
  return payload.data.subscription;
}
