---
name: almondai-crisis-mode
description: Build Crisis Mode — the deterministic exam-survival triage room: high-yield extraction, the sacrifice engine (master/skim/abandon with marks-math), hour-by-hour war plans, instant "N hours left" recompute, offline last-night packs, banded calibrated readiness estimates, and panic-to-plan flows with wellbeing guardrails. Use for anything about exam crisis, cramming, triage, prioritization under time pressure, readiness prediction, last-night/exam-eve features, or sacrifice decisions. The monetizing module — load this before touching any crisis feature.
---

# AlmondAI Crisis Mode (Phase 5)

Reframed from "war room" to **triage room** (master plan §5.3): calm, ruthless, explainable prioritization. Everything in the serving path is deterministic — SQL + scoring math over the curriculum graph and mastery. LLM appears only to phrase explanations and convert panic-text into parameters. It must be the *most* reliable module: a wrong answer here lands at the worst possible moment.

## The triage engine (`modules/crisis/engine.py` — pure functions, heavily tested)

Inputs: `exam_id`, `hours_left`, mastery vector, personalized pace (`est_minutes` × student pace factor from MCQ/plan history), resolved exam weights.

1. **Candidate scoring**: per concept, `marks_per_hour = resolve_weight × P(reach target_mastery | current, time) / time_needed`. Mastery-gain probability from a simple calibrated curve (logistic on current mastery), not an LLM.
2. **Allocation (greedy + constraints)**: sort by marks_per_hour; allocate into `master` (full time), `skim` (40% time, capped gain) until budget exhausted; rest → `abandon`. Constraints: weak-prereq penalty (cramming on missing basics collapses — graph skill's `weak_prereqs`), per-subject minimums when the exam structure demands all-subjects answers, diminishing-returns cutoff (stop allocating past target mastery).
3. **Explanations are part of the output**: every `triage_decisions` row carries `reason` — template-rendered from the math ("Abandoned: 2.1 expected marks for 3.5h; Pharmacology ANS gives 9.4 marks in the same time"). LLM may *polish* phrasing (gateway `extract`, optional, cached); numbers come from the engine.
4. **War plan**: allocations → hour-by-hour timetable blocks honoring sleep guard (see below), micro-breaks, interleaving; "I actually have N hours" → full recompute ≤700ms, diff-rendered.
5. Persist `crisis_sessions` + decisions; emit `triage_generated`; following/checking-off blocks emits `triage_followed` (flywheel needs adherence).

## Banded readiness (humble by design — master plan §9.39)

- Model: per-subject logistic on student's MCQ accuracy/coverage/recency over high-yield concepts → band `likely_pass | borderline | at_risk` + the one-line driver ("Pharmac is the risk: 41% on high-yield ANS"). No numeric scores, no decimal precision theater.
- Every shown band writes a `predictions` row (kind=`readiness_band`, model_version) — scoreable against `outcomes` (Brier/calibration tracked per cycle by analytics skill). Until calibration data exists, copy says "early estimate".

## Last-night & exam-eve (with frontend skill)

- Pack builder (worker): per triaged topic → one-screen recall card (≤120 words, authored-or-verified content: pull from corpus high-yield summaries through the verifier, cache as static), 3–5 micro-MCQs, mnemonic. Bundle → `/v1/crisis/pack/:topic` with manifest. Exam-morning mode = top-anxiety + highest-yield subset, 90-minute pack.
- **Sleep-vs-study guard**: when plan extends past a sleep threshold before exam time, the engine inserts a hard "stop and sleep" block with the learning-science rationale — protecting marks, not feelings; this is house policy, not optional copy.

## Wellbeing wiring (with safety skill — the ethics SLO)

Panic-text entry ("I'm going to fail, 60% left, 48h") → safety classifier: `exam_panic` → **panic-to-plan**: acknowledge once, calmly; convert constraints ("48h, 60% unfinished, 4h sleep") into engine params (LLM `extract`); render the first 60 minutes concretely. `self_harm_risk` → hard-coded support path, `support_mode` on, **zero paywall surfaces** (payments skill enforces; test it here too). Realistic reassurance only — bands and math, never "you've got this!" hype, never doom.

## Acceptance criteria

- Engine: golden-fixture exactness (hand-computed allocations match); property tests (more hours ⇒ never fewer `master` topics; monotone in weights); recompute p95 ≤700ms on seeded data; every decision row has a reason rendering without LLM available (template fallback). Readiness: bands only, prediction rows written, calibration job runs on fixture outcomes. Packs: airplane-mode e2e passes; content through verifier. Panic e2e: panic-text → plan in ≤2 round trips; self-harm fixture → support path, no upsell anywhere in payload (assert on full response JSON).

## Anti-patterns

- LLM choosing what to sacrifice (it's an optimizer's job; the plan §7.2 table is explicit); precise readiness scores or pass-probabilities with false precision; manufactured urgency anywhere (banned copy list); free tier so crippled it can't help (generic high-yield must be genuinely useful — trust is the conversion engine); packs requiring connectivity; recompute that silently reshuffles without a diff (trust dies when the plan changes mysteriously — same principle as the planner).

References: IMPLEMENTATION.md Phase 5, §6–8; master plan §5.3, §9 (all 55), §14.8, §18.1.
