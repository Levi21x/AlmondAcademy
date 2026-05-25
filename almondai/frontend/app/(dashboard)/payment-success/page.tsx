"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  premium_monthly: "Premium Monthly",
  premium_yearly: "Premium Yearly",
  crisis_pack_3: "Crisis Pack (3 sessions)",
  crisis_pack_7: "Crisis Pack (7 sessions)",
};

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const planCode = params.get("plan") || "";
  const planLabel = PLAN_LABELS[planCode] || "your plan";

  return (
    <div className="aa-anim-bounce-in mx-auto max-w-3xl rounded-2xl border border-[#2f5a38] bg-[#15201a] p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-[#7fd69a]" />
      <h1 className="mt-4 font-headline text-4xl font-bold text-[#e8ffe9]">Payment Successful</h1>
      <p className="mt-3 text-sm text-[#c8f7d2]">
        Your payment for {planLabel} has been verified. Premium features are now available on your account.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard" className="rounded-xl bg-[#fff2de] px-4 py-2 text-sm font-semibold text-[#392f1b]">
          Go to Dashboard
        </Link>
        <Link href="/upgrade" className="rounded-xl border border-[#4c463d] px-4 py-2 text-sm text-[#e5e2e1]">
          View Plans
        </Link>
      </div>
    </div>
  );
}
