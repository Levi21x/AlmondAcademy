"use client";

import { useMemo, useState } from "react";
import { Check, Crown, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { createPaymentOrder, verifyPayment, type PaymentPlan } from "@/lib/api/payments.api";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuthStore } from "@/lib/store/authStore";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function priceLabel(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

function useRazorpayLoader() {
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (window.Razorpay) {
      setLoaded(true);
      return true;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    const ok = await new Promise<boolean>((resolve) => {
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

    setLoaded(ok);
    return ok;
  };

  return { loaded, load };
}

export default function UpgradePage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const { subscription, plans, isPremium, refresh } = useSubscription();
  const { data: profile } = useProfile();
  const { load } = useRazorpayLoader();

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planMap = useMemo(() => {
    const map = new Map<string, PaymentPlan>();
    for (const plan of plans) {
      map.set(plan.code, plan);
    }
    return map;
  }, [plans]);

  const primaryPlan = billing === "monthly" ? planMap.get("premium_monthly") : planMap.get("premium_yearly");
  const comparePlan = billing === "monthly" ? planMap.get("premium_yearly") : planMap.get("premium_monthly");
  const crisisPacks = plans.filter((plan) => plan.kind === "addon");

  const openCheckout = async (planCode: string) => {
    if (!token) {
      setError("Please sign in again.");
      return;
    }

    setLoadingPlan(planCode);
    setError(null);

    try {
      const scriptOk = await load();
      if (!scriptOk || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const order = await createPaymentOrder(token, planCode);
      const currentPlan = planMap.get(planCode);

      const razorpay = new window.Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: "AlmondAI",
        description: currentPlan?.description ?? order.description,
        order_id: order.order_id,
        prefill: {
          name: profile?.full_name || "",
          email: "",
        },
        theme: {
          color: "#d5c5a8",
        },
        handler: async (response: Record<string, string>) => {
          await verifyPayment(token, {
            planCode,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          await refresh();
          router.push(`/payment-success?plan=${encodeURIComponent(planCode)}`);
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
      });

      razorpay.open();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to start checkout";
      setError(message);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="aa-anim-fade-up space-y-6">
      <section className="rounded-2xl border border-[#353534] bg-[linear-gradient(120deg,#242018_0%,#131313_55%,#1e1a14_100%)] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d5c5a8]">Segment 12</p>
            <h1 className="aa-h1 mt-2 flex items-center gap-2 text-[var(--aa-text-1)]">
              <Crown className="h-8 w-8 text-[#d5c5a8]" /> Upgrade to AlmondAI Premium
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#cec5b9]">
              Unlock unlimited MCQs, visual explanations, insights, planner plans, and unlimited Crisis Mode activations.
            </p>
          </div>
          {isPremium ? (
            <div className="rounded-xl border border-[#2f5a38] bg-[#17311f] px-4 py-2 text-sm text-[#c8f7d2]">
              Active Premium {subscription?.expires_at ? `until ${new Date(subscription.expires_at).toLocaleDateString()}` : "plan"}
            </div>
          ) : (
            <div className="rounded-xl border border-[#5a2f2a] bg-[#2a1715] px-4 py-2 text-sm text-[#ffcf9d]">You are on Free Plan</div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-4">
        <div className="inline-flex rounded-full border border-[#4c463d] bg-[#131313] p-1 text-xs">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-1.5 ${billing === "monthly" ? "bg-[#2a2520] text-[#fff2de]" : "text-[#cec5b9]"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`rounded-full px-4 py-1.5 ${billing === "yearly" ? "bg-[#2a2520] text-[#fff2de]" : "text-[#cec5b9]"}`}
          >
            Yearly
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {[primaryPlan, comparePlan].filter(Boolean).map((plan) => {
            if (!plan) return null;
            return (
              <article
                key={plan.code}
                className={`rounded-xl border p-5 ${plan.popular ? "border-[#d5c5a8] bg-[#231f19]" : "border-[#353534] bg-[#151515]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#fff2de]">{plan.name}</h2>
                    <p className="mt-1 text-sm text-[#cec5b9]">{plan.description}</p>
                  </div>
                  {plan.popular ? <span className="rounded-full bg-[#d5c5a8] px-2 py-1 text-[10px] font-bold text-[#2e2618]">POPULAR</span> : null}
                </div>

                <p className="mt-5 text-3xl font-bold text-[#fff2de]">{priceLabel(plan.amount_paise)}</p>
                <p className="mt-1 text-xs text-[#b7ada0]">{plan.duration_days >= 365 ? "per year" : "per month"}</p>

                <ul className="mt-4 space-y-2 text-sm text-[#e5e2e1]">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#9ce7ad]" /> Unlimited MCQ practice</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#9ce7ad]" /> Unlimited visual explanations</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#9ce7ad]" /> Unlimited weakness insights</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#9ce7ad]" /> Unlimited planner plans and crisis activations</li>
                </ul>

                <button
                  type="button"
                  onClick={() => void openCheckout(plan.code)}
                  disabled={loadingPlan === plan.code || isPremium}
                  className="mt-5 w-full rounded-xl bg-[#fff2de] px-4 py-2 text-sm font-semibold text-[#392f1b] disabled:opacity-60"
                >
                  {isPremium ? "Already Premium" : loadingPlan === plan.code ? "Opening checkout..." : `Pay ${priceLabel(plan.amount_paise)}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-5">
        <h3 className="font-headline text-2xl font-bold text-[#fff2de]">Crisis Packs</h3>
        <p className="mt-1 text-sm text-[#cec5b9]">One-time packs for focused emergency exam windows.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {crisisPacks.map((pack) => (
            <article key={pack.code} className="rounded-xl border border-[#353534] bg-[#151515] p-4">
              <p className="text-lg font-semibold text-[#fff2de]">{pack.name}</p>
              <p className="mt-1 text-sm text-[#cec5b9]">{pack.description}</p>
              <p className="mt-4 text-2xl font-bold text-[#fff2de]">{priceLabel(pack.amount_paise)}</p>
              <button
                type="button"
                onClick={() => void openCheckout(pack.code)}
                disabled={loadingPlan === pack.code}
                className="mt-4 w-full rounded-xl border border-[#4c463d] px-3 py-2 text-sm text-[#e5e2e1]"
              >
                {loadingPlan === pack.code ? "Opening checkout..." : "Buy Pack"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-5">
        <h3 className="font-headline text-2xl font-bold text-[#fff2de]">FAQ</h3>
        <div className="mt-3 space-y-3 text-sm text-[#cec5b9]">
          <div className="rounded-lg border border-[#353534] bg-[#151515] p-3">
            <p className="font-semibold text-[#fff2de]">Is this Razorpay test mode?</p>
            <p className="mt-1">Yes. Checkout currently runs in Razorpay test mode until production keys are configured.</p>
          </div>
          <div className="rounded-lg border border-[#353534] bg-[#151515] p-3">
            <p className="font-semibold text-[#fff2de]">When does premium activate?</p>
            <p className="mt-1">Immediately after signature verification from Razorpay succeeds on the backend.</p>
          </div>
          <div className="rounded-lg border border-[#353534] bg-[#151515] p-3">
            <p className="font-semibold text-[#fff2de]">Can I cancel anytime?</p>
            <p className="mt-1">Yes, you can cancel from subscription controls once enabled in your account settings.</p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-3 text-sm text-[#ffcf9d]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
