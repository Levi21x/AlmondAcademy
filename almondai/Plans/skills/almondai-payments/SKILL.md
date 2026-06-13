---
name: almondai-payments
description: Build AlmondAI's monetization plumbing — Razorpay subscriptions and one-time orders, signed webhook processing, the entitlements table as the single tier source, Redis token-bucket quotas per tier, and the Crisis-window paywall logic (free = generic, paid = personalized). Use for anything involving payments, subscriptions, pricing tiers, free-tier limits, quotas, rate limits per user, upgrade flows, refunds, or entitlement checks. Load before touching any code that asks "is this user premium?".
---

# AlmondAI Payments & Entitlements (Phase 4–5)

Freemium with a crisis-window conversion thesis (master plan §2.7, §9). Engineering job: entitlements that are always consistent with money received, quotas that protect COGS, and a paywall that converts without dark patterns.

## Entitlements (the single source of tier truth)

- `entitlements(student_id, tier, source check in('free','paid','trial','ambassador','college'), valid_until)` — **every** feature/quota check reads this table (cached in Redis 60s), never `students.tier`, never the subscription row directly.
- State machine: free → trial → paid → (grace 3d on payment failure) → free. Transitions ONLY via: verified webhook, admin tool (audited), or expiry job. Each transition emits `entitlement_changed`.

## Razorpay integration

- Checkout: `POST /v1/billing/checkout` creates subscription (₹399/mo) or one-time annual order (₹2,999) server-side; client gets order/subscription id for Razorpay JS.
- **Webhooks are the truth**: `POST /v1/billing/webhook` — verify signature (timing-safe), enqueue raw event (respond 200 fast), worker processes idempotently (`payments.razorpay_payment_id` unique; replays are no-ops). Handle: `subscription.activated/charged/halted/cancelled`, `payment.failed`, `refund.processed`. Client success callbacks are UX hints only — never grant entitlements from the client path.
- Reconciliation worker (daily): list Razorpay subscriptions ↔ entitlements diff → alert on mismatch (money and access must never drift silently).
- Store amounts in paise (int). GST/invoice fields captured now even if invoicing ships later.

## Quotas (Redis token buckets, middleware-enforced)

| Resource | Free | Paid |
|---|---|---|
| Tutor questions/day | 50 | high cap (abuse guard, not a sales lever) |
| `explain_deeply` (premium model) | 0 (offer upgrade) | metered generous |
| Voice minutes/day | **0–5 hard cap** (priciest COGS) | capped generous |
| Crisis triage | generic high-yield only | personalized + 1-tap regenerate (priority queue) |
| Clinical cases/month | 2 demo | full |

Lua-scripted check-and-decrement (atomic), keys `quota:{student}:{resource}:{day}`, TTL to midnight IST. Quota exceeded → typed 429 envelope `{code:"quota_exceeded", resource, resets_at, upgrade_hint}` — frontend renders the friendly path.

## Crisis paywall (the ethical conversion design — master plan §9 design note)

- Free in crisis: full generic high-yield list for the exam (genuinely useful, un-personalized).
- Paid: *your* triage (sacrifice math on your mastery), banded readiness, war-plan recompute priority, offline pack of your plan.
- Trigger: paywall shown at the moment personalization would add value (after generic list, before personal triage) with honest copy ("this plan is computed from your 412 answered questions").
- **Suppression invariant**: `support_mode` (safety skill) hides all upsell surfaces server-side (the API simply omits paywall blocks). No countdowns, no fake scarcity, no shame copy — banned phrasings list shared with frontend skill.
- A/B price/copy tests allowed for adults only (consent-gated experiments; minors get control).

## Acceptance criteria

- Sandbox e2e: checkout → webhook → entitlement flips → premium intent unlocks; replayed webhook = no-op; tampered signature = 401 + alert. Payment-failure → grace → downgrade path proven with clock fixture. Quota Lua atomic under concurrent hammer test (no over-spend). `support_mode` fixture: checkout endpoints refuse with neutral code, no upsell blocks in any API response. Reconciliation catches a seeded drift fixture.

## Anti-patterns

- Entitlements from client callbacks or unverified webhooks; reading tier anywhere but entitlements; non-idempotent webhook handling; float rupees; quotas in app memory (multi-instance = bypass); urgency dark patterns (also a DPDP risk for minors — master plan §2.13); making the free crisis tier useless — it must genuinely help, or the trust that powers conversion never forms.

References: IMPLEMENTATION.md Phases 4–5, §6; master plan §2.7, §9 (design note), §14.5.
