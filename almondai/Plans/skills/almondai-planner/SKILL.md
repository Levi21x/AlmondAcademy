---
name: almondai-planner
description: Build the AlmondAI study planner — a deterministic scheduler (constraints: hours/day, prerequisite order, exam weights, FSRS review due-dates) that generates and recomputes study plans with explainable diffs, plus thin LLM edges that parse messy student input into constraints and narrate the plan. Use for anything about study plans, schedules, timetables, replanning after missed days, plan adherence, multi-exam optimization, or the planner graph — and whenever someone suggests letting an LLM generate a schedule, load this first.
---

# AlmondAI Planner (Phase 6)

The module most over-described as "agentic" (master plan §5.2). Scheduling is constrained optimization + spaced repetition — a solver's job. Students need *trust and consistency*: a plan that silently changes every open is a plan they stop following. **Deterministic core, LLM on the edges.**

## Scheduler core (`modules/planner/scheduler.py` — pure, seeded, reproducible)

Inputs: curriculum graph (concepts, `est_minutes` personalized by pace, prereq edges, resolved exam weights), exam date(s), availability (hours/day pattern, blackout dates), current mastery, FSRS due-dates.

Algorithm (greedy with constraints — reach for CP-SAT only if greedy provably fails quality):
1. Reserve **review lane** capacity (~20–30%) for FSRS due items — reviews are scheduled obligations, not leftovers.
2. Rank learnable concepts by `weight × (target − mastery) / time`, respecting prereq order (topological within subject).
3. Pack day blocks (25–50 min units, interleave subjects, ≤3 same-subject consecutive), nearest-deadline-exam first when multiple exams compete; final 15% of runway reserved for consolidation/mocks, not new content.
4. Output: `plan_blocks` rows + `coverage_projection` ("at this pace: 82% of high-yield by exam day") — the honest number, from the same math as crisis `coverage`.
5. Determinism: same inputs (incl. RNG seed for tie-breaks) ⇒ byte-identical plan. Inputs hashed into `study_plans.params` for reproducibility.

**Replan = recompute + diff, never mutation.** Triggers: missed blocks (nightly job), availability change, new mastery evidence, "I'm behind" button. Engine recomputes from current state → structural diff vs old plan → human-readable change list rendered from the diff ("Missed 3 days → moved low-yield Forensic blocks out; Pharm ANS now daily — it's high-yield and due"). Old plan retained (history); student confirms before apply (auto-apply only for minor shifts ≤2 blocks).

## LLM edges (the only two LLM jobs here)

1. **Intake parsing**: "6 weeks, weak at pharmac, 4 hrs/day but Sundays off" → `PlannerConstraints` (gateway `extract`, schema-validated, echoed back for confirmation — parse errors become questions, not guesses).
2. **Narration/motivation**: plan or diff → short encouraging explanation (gateway `synthesis`, template-grounded, no numbers invented — all figures interpolated from engine output).

Both are optional decorations: the planner is fully functional with forms + raw diffs if the gateway is down (degradation ladder).

## Integration

- Crisis handoff: when `coverage_projection` for an exam drops below threshold, surface "switch to triage?" (crisis skill takes over for that exam; planner marks the period).
- Adherence events: block check-offs → `plan_block_done`; adherence × outcome correlation is a flywheel mart (the planner's moat is *proof it works* — master plan §5.2).
- UI: ReactFlow projection only (frontend skill); drag = `plan.propose_change` preview → apply via validating tool.

## Acceptance criteria

- Determinism test (same inputs ⇒ identical plan, 100 runs). Property tests: never schedules a concept before its weak prereqs; never exceeds daily budget; review lane always ≥ reserved share; nearer exam never starved by farther one. Replan fixture: 3 missed days ⇒ expected diff, explanation renders without LLM. Intake parsing: messy-input fixtures → correct constraints or clarifying question (never silent guess). Coverage projection matches hand-computed fixture.

## Anti-patterns

- LLM free-handing schedules (plausible-but-wrong, ignores constraints, non-deterministic — the exact failure §5.2 describes); silent replans; treating reviews as optional filler; over-packing every hour (rest/buffer blocks are scheduled — burnout is a churn risk and a wellbeing issue); optimizing one exam while another starves; CP-SAT complexity before greedy is measured insufficient.

References: IMPLEMENTATION.md Phase 6; master plan §5.2, §7.2, §8.5.
