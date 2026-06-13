---
name: almondai-memory-system
description: Build AlmondAI's 7-type student memory system — structured-first storage (Postgres mastery/misconceptions/behavioral aggregates), the shared student_id-filtered vector store for fuzzy recall, deterministic session-close extractors, the bounded task-scoped memory assembler that injects context into prompts, FSRS decay, and consolidation jobs. Use for anything about remembering students, personalization, mastery tracking, weakness graphs, misconceptions, memory injection into prompts, forgetting curves, or "the app should know the student" — and load it before adding ANY new per-student state.
---

# AlmondAI Memory System (Phase 3)

Memory is the moat (master plan §8), and the design rule is: **~80% structured rows you JOIN, a little semantic, none of it an unbounded context dump.** Written by deterministic extractors after sessions; read as bounded, task-scoped summaries; decayed on schedule; **visible to the student** (pedagogy + DPDP).

## The seven types → storage (tables in `almondai-data-model`)

| Type | Store | Notes |
|---|---|---|
| User | `students`, `consents` | canonical profile |
| Academic | derived views over `plan_blocks`, `mastery` vs curriculum | coverage %, position |
| Behavioral | nightly aggregates table `behavior_aggregates(student_id, cadence, session_time_hist, pace)` | **DPDP-gated: skip for minors without consent flag** |
| Learning | `mastery` (FSRS state) + Redis due-queue `zset due:{student}` | the numeric core |
| Weak-topic | `misconceptions` + semantic notes in shared vector collection `memory_notes(student_id, kind, text, embedding)` | crown jewel |
| Exam | `predictions`, `outcomes`, crisis history | time-series |
| Clinical | `clinical_attempts` rubric aggregates + reasoning-note vectors | Phase 7 fills |

## Write path (async, deterministic — never the LLM live in the request path)

1. Session close (or 30-min idle) → `session_summarize` job per session.
2. Extractor parses transcript + MCQ results **with code**: updates `mastery` via FSRS update rule (correct/incorrect/hesitation as grades); increments `misconceptions` on detected confusion events (tutor emits structured `misconception_detected` markers — see tutor skill); appends behavioral aggregates (consent-gated).
3. LLM is allowed for ONE thing: distilling free-text semantic notes ("confuses pre/after-load when asked about Frank-Starling") via gateway `extract` intent → validated against schema → embedded into `memory_notes`. Numeric state is math, never model opinion.
4. All writes via the `memory.write` MCP tool (schema + `student_id` enforced; agents cannot write raw — master plan §8.4).
5. Event-sourced: each update also emits `mastery_updated`/`misconception_recorded` events → rebuildable + auditable + erasable.

## Read path: the bounded assembler

`memory.read(student_id, task, topic_scope) -> MemorySummary` — deterministic, **token-capped (≤400 tokens)**, task-scoped:

| Task | Slice |
|---|---|
| tutor(topic) | mastery for topic+neighbors, top-3 misconceptions in scope, explanation-style pref |
| crisis(exam) | coverage, weakest high-yield concepts, exam history, pace |
| planner | mastery distribution, adherence, hours pattern |
| clinical(case) | relevant rubric history, reasoning-error patterns |

Two-stage: SQL first (free); vector recall over `memory_notes` only when the task needs fuzzy "what confuses them here" (cap top-3 notes). Most requests never touch vectors. The summary is rendered as a compact structured block (not prose) for prompt injection, and the same data backs the user-visible "What AlmondAI knows about you" screen (`GET /v1/me/memory`) — one source, two views, no covert profile.

## Decay & consolidation (workers)

- FSRS scheduling IS the decay model: `due_at` passing ⇒ mastery effectively stale ⇒ drives the due-queue and "you've probably forgotten X" hooks (a retention feature, not just hygiene).
- Misconception recency-weighting: `effective_count = count × exp(−days_since/90)`; below threshold → dormant (not deleted; reactivate on recurrence).
- Weekly consolidation: merge near-duplicate `memory_notes` (embedding similarity ≥0.9 → LLM-merge to one note), TTL stale notes (180d dormant), keep per-student vector footprint <200 notes.

## Acceptance criteria

- Assembler cap proven by test (pathological student with 10k interactions → ≤400 tokens, <50ms from SQL path). FSRS update matches reference vectors. Minor-without-consent: behavioral extractor skips, flag respected end-to-end. `DELETE /v1/me/memory` (erasure) clears derived rows + vectors, ledger intact. Rebuild job reproduces mastery from raw `interactions` on a fixture (derived-vs-canonical proven). Memory visible screen shows exactly what injection uses.

## Anti-patterns

- Per-student vector DBs/collections (the ChromaDB failure the plan kills); LLM-written numeric mastery ("I think they're weak" is not a number); unbounded chat-history injection; memory writes from request handlers (async only); a hidden profile that differs from the visible one — that's the DPDP "covert profiling" trap (master plan §2.13).

References: IMPLEMENTATION.md Phase 3; master plan §8 (all), §3.5, §2.13.
