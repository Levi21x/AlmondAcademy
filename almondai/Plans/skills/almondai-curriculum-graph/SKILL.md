---
name: almondai-curriculum-graph
description: Build and query the exam-weighted MBBS curriculum graph — subjects→topics→concepts with prerequisite/confusable edges, exam weights, PYQ frequency, and the deterministic high-yield/coverage/sacrifice SQL that Crisis Mode and the Planner run on. Use whenever seeding curriculum data, computing high-yield lists, exam weighting, PYQ analysis, topic dependencies, or any "what should this student study" logic. This is the deterministic brain — load it before writing any prioritization code.
---

# AlmondAI Curriculum Graph (Phase 1)

The single most load-bearing deterministic asset (master plan §18.1). High-yield extraction, the sacrifice engine, planning, and readiness all reduce to queries over this graph — **never LLM guesses**.

## Structure (tables from `almondai-data-model`)

- `concepts` carry `est_minutes_p50` (time-to-learn baseline, later personalized by pace) and `marks_potential` per exam type via `exam_weights`.
- `concept_edges`: `prereq` (directed; planner orders by it; crisis warns when cramming a concept whose prereqs are weak) and `confusable` (powers confusion-pair drills and examiner-trap lists).
- `exam_weights.weight` = expected marks contribution (normalized 0–100 per subject per exam type); `pyq_frequency` = fraction of past papers featuring it; `is_high_yield` = derived flag (weight above subject p80), maintained by job, not by hand.
- College-specific rows (`college_id` set) override national rows when present: resolution order college → exam_type → default. Write one resolver function used everywhere: `resolve_weight(concept_id, exam_id)`.

## The deterministic queries (implement as SQL functions; these are the product)

1. `high_yield_topics(exam_id, n)` — top-n concepts by resolved weight × pyq_frequency, with `reason` text per row ("weight 8.5, asked in 7/10 past papers"). Free tier gets this generic version.
2. `coverage(student_id, exam_id)` — % of weighted syllabus where mastery ≥ threshold; the number behind "60% unfinished".
3. `expected_marks_gain(student_id, exam_id)` — per concept: `resolve_weight × (target_mastery − current_mastery) / est_minutes_personalized` → the **marks-per-hour ranking** that drives triage (crisis skill consumes this).
4. `prereq_chain(concept_id)` / `weak_prereqs(student_id, concept_id)` — recursive CTEs; cap depth at 5.
5. `confusion_pairs(student_id)` — joins `misconceptions` with `confusable` edges, ranked by count × weight.
6. `examiner_traps(exam_id)` — confusable pairs weighted by PYQ distractor data where available.

Property: every function returns explainable rows (inputs visible in output) — explainability is a product feature (trust) and a debugging feature.

## Seeding

- Loader at `data/curriculum/` reading versioned YAML/CSV: subject files with nested topics/concepts, weights, edges. `make seed` is idempotent (upsert by stable slug keys, never by serial id).
- Seed scope for Phase 1: two subjects deep and real (e.g., Anatomy/upper-limb, Pharmacology/ANS) — enough for Phase 2 golden sets and Phase 5 triage demos. Breadth comes later; depth and correct weights now.
- PYQ ingestion: `data/pyq/<college|national>/<exam>/<year>.csv` (question → mapped concept ids → marks). A worker recomputes `pyq_frequency` and `is_high_yield` from these. Mapping quality matters more than volume.

## Acceptance criteria

- `high_yield_topics` returns in <50ms on seeded data with stable ordering and reasons; weight resolver proven by test (college override beats national); `expected_marks_gain` matches a hand-computed fixture; recursive CTEs terminate on cyclic-edge fixtures (cycle guard); reseeding is a no-op diff.

## Anti-patterns

- Asking an LLM "what's high-yield" — that's a query. LLMs may *draft* curriculum data offline for human review; they never sit in the serving path here.
- Hand-edited `is_high_yield` flags; weights without provenance (every weight row should trace to PYQ data or an explicit editorial decision in the seed files).
- Graph databases — Postgres recursive CTEs are sufficient until proven otherwise (master plan §3.3).

References: IMPLEMENTATION.md Phase 1; master plan §3.3, §5.2–5.3, §18.1.
