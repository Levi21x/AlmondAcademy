---
name: almondai-safety-dpdp
description: Build AlmondAI's safety and compliance layer — auth, age gating with guardian consent (DPDP), the append-only consent ledger, data-rights endpoints (export/erase), guardrail middleware (PII scrub, medical-boundary enforcement, prompt-injection defense), and distress detection with support routing that never upsells. Use for anything touching signup, consent, minors, privacy, data deletion, refusals, self-harm or panic signals, jailbreaks, "educational not clinical" boundaries, or notification ethics. Load this whenever a feature touches a stressed student or their personal data — which is most features.
---

# AlmondAI Safety & DPDP (Phase 3, enforced everywhere)

The missing slide that can sink the company (master plan §2.13): DPDP child-data rules (verifiable parental consent under 18, no covert profiling, penalties to ₹200 Cr; Consent Manager framework live 13 Nov 2026) + medical-content liability + the ethics of monetizing panic. This layer is product, not paperwork.

## Identity & consent

- **Auth**: managed identity (Cognito prod / dev-JWT locally) behind `modules/identity`; short-lived access + refresh; roles student/faculty/admin. RLS context set from the verified JWT only.
- **Age gate at signup**: DOB required → under-18 ⇒ `is_minor`; account starts in **minor-safe mode**: core learning works; behavioral profiling, streak/urgency mechanics, and marketing notifications OFF until verifiable guardian consent (consent link + declaration + contact verification; pluggable for the official Consent Manager integration later).
- **Consent ledger**: append-only `consents` rows per purpose (`behavioral_profiling`, `notifications`, `outcome_sharing`, `voice_processing`); checks read the *latest* row per purpose. Expose `consent_flags` to the event spine so analytics is consent-aware by construction.
- **Data rights**: `GET /v1/me/memory` (visible memory — same data the assembler injects), `GET /v1/me/export` (JSON bundle, async job), `DELETE /v1/me` (erasure via the data-model skill's procedure; 30-day grace; audit-logged).

## Guardrail middleware (one chain, every AI surface — master plan §3.9 "middleware, not per-feature code")

Inbound: PII scrub before anything reaches a provider (mask phone/email/ID patterns in user text destined for prompts; map back on display if needed) → **intent safety classifier** (gateway `classify`, small model): `real_patient_advice | self_harm_risk | dosing_real_use | exam_panic | injection_attempt | normal`.

Outbound: medical-boundary filter — every AI surface carries the system-level boundary *educational simulation ≠ clinical advice*; responses to flagged intents use versioned refusal templates in `packages/prompts/safety/` that **refuse + redirect + still help with the underlying study need** (refusing kindly is a skill; cold refusals at 2 a.m. lose the student).

Prompt-injection defense: untrusted text (uploaded notes, OCR, case transcripts) is data, never instructions — delimit + instruct against, strip instruction-like content on ingestion; tools are allow-listed per agent (see `almondai-agents-mcp`); a jailbroken prompt must have no path to a write tool; output schema validation on all tool-calling flows.

## Distress detection → support routing (the ethics SLO)

- Two-stage: cheap keyword/pattern screen on every user message in Crisis/Tutor contexts → positive screens go to model classification (`self_harm_risk` vs `exam_panic`).
- `exam_panic` → Crisis Mode's panic-to-plan + grounding micro-break (calm, honest, actionable — see crisis skill).
- `self_harm_risk` → **hard-coded response path**, not LLM-generated: empathetic grounding template + India-appropriate helpline info (verify numbers at deploy time) + "talk to someone you trust" + option to pause; session flagged `support_mode`.
- **In `support_mode`: all paywall/upsell/streak/urgency surfaces suppressed for the session.** This is a tested invariant, not a guideline. Never an upsell into a detected crisis (master plan §9 hard requirement).
- Emit `distress_detected` + `support_routed` events → wellbeing dashboard (observability skill); weekly human review of all support-mode sessions; misses become classifier eval cases.

## Notification ethics

Exam-cycle nudges: helpful scheduling for consenting adults; for minors or non-consented — transactional only. No manufactured-urgency copy anywhere ("only 2 days left, you're behind!" is banned phrasing; "here's your 3-topic plan for today" is the house style). Copy review lives in PR review checklist.

## Acceptance criteria

- Under-18 signup → behavioral features inert until guardian consent (e2e test). Erasure + export jobs pass fixtures; audit rows written. Scripted self-harm message → hard-coded support response, `support_mode` set, paywall component renders nothing (UI test + API invariant test). Injection corpus (adversarial golden set) → zero tool-writes, zero boundary breaks. PII scrub proven on fixture (phone/email never reach provider logs). Refusal templates pass `refusal_correctness = 1.00` in evals.

## Anti-patterns

- Consent as a settings toggle UPDATE (ledger is append-only). Safety as per-feature if-statements instead of the middleware chain. LLM-generated responses to self-harm risk (template + human-reviewed path only). Dark patterns wearing a growth hat: countdown timers, fake scarcity, shame copy. Storing guardian contact unverified and calling it "verifiable consent". Skipping the wellbeing weekly review when busy — that review IS the safety system.

References: IMPLEMENTATION.md Phase 3, §8, §10; master plan §2.13, §3.13, §9-D, §14.8.
