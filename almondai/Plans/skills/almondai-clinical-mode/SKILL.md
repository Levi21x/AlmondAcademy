---
name: almondai-clinical-mode
description: Build Clinical Mode — the NExT Paper-II moat: clinician-validated case objects, the patient role-play agent with progressive disclosure and persona/affect (which can never invent facts), rubric-based case-sheet grading calibrated against faculty, viva examiner and OSCE stations, ward rounds, and the faculty authoring studio. Use for anything about virtual patients, clinical cases, history-taking, OSCE, viva, case sheets, clinical grading, examiner simulation, or faculty tooling. The highest-stakes module — load this before touching anything clinical.
---

# AlmondAI Clinical Mode (Phase 7)

Hardest to get right, easiest to get dangerously wrong (master plan §5.4). The architecture that makes it safe: **structured clinical state (the case object) as immutable ground truth; the LLM is only the role-playing surface.** An AI patient that invents findings teaches bad medicine; an uncalibrated grader is worse than no grader.

## The case object (`clinical_cases.case_object` JSONB; JSON Schema versioned in `packages/schemas`)

```
{ demographics, presenting_complaint, true_diagnosis, differentials[],
  history: {hpi, pmh, drugs, family, social, ros},          // each item: {fact, reveal_on[], volunteered: bool}
  exam_findings[]: {system, finding, reveal_on[]},          // reveal_on = question/action intents
  vitals_timeline[], labs[]: {test, result, available_if_ordered},
  imaging[], red_flags[]: {flag, expected_elicitation},
  complications[]: {trigger, progression},
  persona: {affect, verbosity, reliability, language, evasions[]},
  rubrics: {history_taking[], examination[], differentials[], investigations[],
            management[], communication[]},                  // weighted criteria
  authoring: {author_id, reviewed_by[], status, version, references[]} }
```

Lifecycle: `draft → in_review → validated → retired`; **only `validated` serves students**; edits create versions (attempts pin the version they ran against). Authored by clinicians in the faculty studio; LLM may draft cases offline for clinician review — never straight to validated. Indian epidemiology realism (TB, RHD, enteric fever priors) is an authoring guideline in the studio.

## The patient agent (bounded roleplay — agents skill patterns)

- LangGraph: `interpret_student_input → case.reveal(state machine) → persona_render`. The reveal step is **deterministic code**: classify the student's question to an intent (gateway `classify`) → look up `reveal_on` matches → return the fact(s) or nothing. The LLM then *voices* the revealed fact in persona (affect, evasiveness, vernacular) — it renders, it does not decide content.
- **Allow-list: `case.reveal` only.** No retrieval, no memory-write, no curriculum tools — a prompt-injected or drifting patient has no path to outside facts. Unknown asks → in-persona deflection ("I don't understand, doctor").
- Persona/affect: system prompt per persona from `packages/prompts/clinical/personas/`; `persona_state` SSE events drive UI cues. Vernacular patients = same pipeline, language field (a uniquely Indian moat — plan §10.5).
- Anti-drift: every N turns, a cheap consistency check (revealed facts ⊆ case object); violations logged as `character_break` (KPI: <2%) and the offending turn regenerated constrained.

## Grading (rubric tool + calibration — the trust gate)

- `case.grade` tool: deterministic frame — for each rubric criterion, the LLM (gateway `grade`, temp 0, JSON mode) scores ONLY that criterion against the transcript/case-sheet with quoted evidence; code aggregates weighted totals, red-flag catch rate, premature-closure flag (differential committed before discriminating questions — computable from the transcript timeline).
- Output: per-section scores + evidence quotes + reasoning replay (where the path diverged from expert path) + 2–3 concrete next-actions. Tone: examiner-after-the-exam, specific, kind.
- **Calibration before authority**: faculty re-score sampled attempts (eval harness's calibration set) → weighted kappa per rubric section. Until κ ≥ 0.7: grades presented as "AI feedback (beta)" with visible disclaimer; after: authoritative with continued sampling. Per-section gating (history-taking may calibrate before management).

## Viva examiner & OSCE (bounded agents + deterministic shells)

- Viva: examiner archetypes (kind/strict/rapid-fire); follow-up laddering on weak answers until limit → then teach; honest-"I don't know" scored above bluffing (rubric criterion). Bounded: max turns, rubric-anchored.
- OSCE: station = deterministic shell (timer, checklist, station type) wrapping the appropriate interaction (history/exam/data-interpretation/spotter with figure chunks); checklist scoring is mostly deterministic, LLM only for free-text responses.
- Ward rounds (v2): multi-case session over case objects with `vitals_timeline` progression; prioritization scored deterministically.

## Faculty studio (v0 — the B2B2C + network-effect seed)

Case CRUD with schema validation + preview-as-patient; review/sign-off workflow (second-clinician approval → `validated`); cohort dashboard (anonymized rubric aggregates, red-flag misses — respects aggregation thresholds); every authored case logs authorship (supply-side moat KPI).

## Acceptance criteria

- Adversarial probe suite: across scripted attempts (beg for diagnosis, inject instructions, ask un-revealed findings) → zero out-of-case facts; character-break <2%. Reveal determinism: same question intent ⇒ same finding. Grading: fixture attempt → expected rubric JSON with evidence quotes; kappa harness runs on the calibration set and reports per-section. Version pinning proven (editing a case doesn't alter past attempt grades). Educational-boundary test: "my actual patient has these symptoms" → refuse+redirect (safety skill template). Faculty flow e2e: draft → review → validated → servable; draft never servable.

## Anti-patterns

- Pure-LLM patients (drift = miseducation); the patient agent with retrieval/memory access; free-form "grade this case" prompts (rubric-criterion loops only); shipping authoritative grades pre-calibration; case content editable in place without versioning; skipping the second-clinician sign-off to go faster — the validated library IS the moat (plan §11 row 1), and its credibility is unrecoverable if a bad case ships.

References: IMPLEMENTATION.md Phase 7, §6–8; master plan §5.4, §10 (all 56), §11, §14.7.
