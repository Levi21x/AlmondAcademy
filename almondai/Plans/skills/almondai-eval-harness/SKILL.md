---
name: almondai-eval-harness
description: Build and run AlmondAI's evaluation system — golden sets, retrieval/groundedness/correctness metrics, the CI eval gate that blocks regressing prompt/model/retriever changes, clinical grader calibration, and Langfuse dataset integration. Use whenever creating or editing prompts, swapping models/embeddings/rerankers, measuring answer quality, adding eval cases, investigating a quality regression, or whenever a PR touches anything that changes what students see from an LLM. If a change could alter AI output, this skill gates it.
---

# AlmondAI Eval Harness (Phase 2, then forever)

What turns "college project" into "product" (master plan §3.10). The eval gate in CI is the company's quality immune system: no prompt, model, embedding, reranker, or retrieval-param change merges if it regresses below thresholds.

## Golden sets (`evals/golden/`)

- `tutor/<subject>.jsonl` — per line: `{id, question, expected_answer_points[], gold_chunk_ids[], expected_citations[], category, difficulty}`. Start 50/subject for the two seeded subjects (≈150 total incl. edge cases); grow weekly from production traces (mine Langfuse for: thumbs-down, low-groundedness, high-traffic novel questions).
- `tutor/adversarial.jsonl` — out-of-corpus traps (must produce honest fallback), real-patient-advice asks (must refuse+redirect), prompt-injection attempts (must ignore), dosing-for-real-use (must refuse).
- `crisis/triage.jsonl` — fixture students (mastery vectors + hours_left) → expected bucket allocations (deterministic = exact match).
- `clinical/grading/` — case attempts with faculty-scored rubrics (the calibration set; starts tiny, grows via faculty review queue).
- Each line carries `source: curated|mined|faculty` and `added_at`. Never edit a case in place — supersede (eval history must stay comparable).

## Metrics (runners in `evals/runners/`, Ragas/DeepEval where they fit, custom where not)

| Metric | How | Gate |
|---|---|---|
| retrieval_recall@10 | gold_chunk_ids ∩ retrieved | ≥ 0.85 |
| citation_correctness | cited chunk entails the claim (NLI via gateway `verify`) | ≥ 0.95 |
| groundedness | claim-level supported fraction (same verifier as prod — one implementation, two callers) | ≥ 0.95 |
| answer_correctness | LLM-judge vs expected_answer_points (judge prompt versioned + spot-human-audited 10%/month) | ≥ 0.90 |
| refusal_correctness | adversarial set: refused when should, didn't when shouldn't | = 1.00 |
| triage_exactness | deterministic compare | = 1.00 |
| latency_p95 / cost_per_answer | from harness run | budget per IMPLEMENTATION.md §8 |
| grader_faculty_agreement | weighted kappa on calibration set | ≥ 0.7 (clinical trust gate) |

## CI gate

- `make eval` → runs affected suites (path-based: prompt change → that module's suites + adversarial; embedding/reranker change → everything), writes `eval_report.json` + markdown summary on the PR.
- Thresholds in `evals/configs/eval_gate.yaml` (single source). Hard-fail below gate; warn within 2% of it. Ratchet rule: when a metric stays above gate+5% for a month, raise the gate (quality only moves up).
- Every run logs to Langfuse datasets with git SHA + policy version → quality-over-time chart is free.
- Nightly full-suite run on main (catches drift from provider-side model updates — they change models under you).

## Online eval loop

- Thumbs up/down + optional "what's wrong" on every answer → `interactions` + Langfuse score.
- Weekly triage job: cluster low-groundedness/thumbs-down traces → propose new golden cases (human approves before they enter the set).
- Faculty review queue (Phase 7): clinical grades sampled for faculty re-score → calibration set growth + agreement tracking.

## Acceptance criteria

- A PR that deliberately breaks the tutor prompt (e.g., removes citation instruction) is blocked with a readable report naming the failed metric. Affected-suite mapping proven (prompt edit doesn't run clinical suite). Nightly run posts to the team channel/dashboard. Judge spot-audit workflow documented and runnable.

## Anti-patterns

- "Just this once" merges past a red gate — the death spiral the master plan warns about (§3.10). Separate verifier implementations for prod vs eval (they drift; share code). Golden sets that only contain easy questions (mine real failures). Judging with the same model that generated (judge from a different family where practical). Treating provider model updates as no-ops — pin versions where the provider allows, watch the nightly run where they don't.

References: IMPLEMENTATION.md Phase 2, §8; master plan §3.10, §14.3.
