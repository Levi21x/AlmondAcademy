---
name: almondai-agents-mcp
description: Build AlmondAI's agent architecture — LangGraph supervisor graphs (one per module), the MCP-style typed tool registry (retrieve, memory read/write, curriculum queries, MCQ scoring, plan mutation, case grading), and the deterministic-vs-agentic decision rule. Use whenever creating or modifying any agent, LangGraph graph, tool definition, multi-step LLM flow, or whenever someone proposes making a feature "agentic" — load this first to classify whether it should be code, a tool, a workflow, or an agent.
---

# AlmondAI Agents & MCP Tools (Phase 3)

The most expensive 2026 mistake is agent-washing (master plan §7): wrapping deterministic logic in LLM loops. Agents are slow, costly, non-deterministic, hard to test — used ONLY where the path is irreducibly open-ended.

## The decision rule (apply to every feature, in this order)

1. **Deterministic code** — logic enumerable, correctness matters: MCQ scoring, FSRS, high-yield, sacrifice math, scheduling, quotas, payments. *Most of AlmondAI.*
2. **Tool** — LLM decides *when/with-what-args*; behavior is reliable code: retrieve, grade-against-rubric, mutate-plan, memory read/write.
3. **Workflow** — known step sequence including LLM steps: RAG answer → verify → cite; case-sheet → rubric-grade → feedback. Explicit LangGraph, no loops.
4. **Agent (bounded)** — turn-by-turn genuinely open: Socratic tutoring dialogue, clinical patient role-play, viva examiner. Bounded by tools + max-turns + guardrails.

When reviewing a feature request, classify it aloud in the PR description. "Agentic" without a justification from this table is a rejected design.

## Topology

- **One LangGraph supervisor per module** (tutor, crisis-explainer, clinical, planner-edges) in `apps/api/src/almondai/agents/<module>_graph.py`. No global swarm; no agent-to-agent chatter. Graphs are explicit: nodes typed, edges enumerated, state schema versioned (Pydantic).
- Checkpointing: Postgres-backed LangGraph checkpointer keyed by session (resumable clinical cases across days).
- Every graph run = one Langfuse trace; node spans included; token/cost rollups per graph run feed agent KPIs (steps/tokens per task, determinism ratio — master plan §14.6).

## Tool registry (`agents/tools/`)

Typed contract per tool: Pydantic In/Out, docstring the LLM sees, allow-list tags, and an owner module whose `service.py` implements it.

| Tool | In → Out | Writes? |
|---|---|---|
| `retrieve` | query, filters → chunks[] | no |
| `memory.read` | task, scope → MemorySummary (≤400 tok) | no |
| `memory.write` | structured update → ack | **validated** |
| `curriculum.query` | named query + params → rows | no |
| `mcq.next` / `mcq.score` | … | score writes attempt |
| `plan.propose_change` | constraint delta → diff preview | no |
| `plan.apply_change` | approved diff → ack | **validated, idempotent** |
| `case.reveal` | question, case_state → finding or null | no (state machine) |
| `case.grade` | case_sheet, rubric → scores | **validated** |

Rules: **agents propose; code disposes** — any consequence-bearing action (grade recorded, plan changed, anything billed) goes through a validating tool that is independently unit-tested. No tool writes raw SQL from agent args; tools call module services. Per-agent allow-lists (the patient agent gets `case.reveal` only — it cannot retrieve, so it *cannot* import outside facts; this is the safety design, not just tidiness).

## Bounding agents

- Max turns + token budget per graph run (config); on breach → graceful close ("let's pause here") + event.
- Roleplay/viva agents run against **fixed state objects** (case object, rubric); system prompts versioned in `packages/prompts/`.
- Deep-agent-style open planning: allowed only behind a flag for "novel study strategy" experiments; ~20× token cost means it must earn its keep via eval, and it never serves the request path.

## Acceptance criteria

- Tool contracts round-trip typed (schema tests); negative test proves an agent cannot write any system-of-record table except via validating tools (attempt → rejected + logged). Patient-agent allow-list test: prompt-injected "search the textbook" attempt → no retrieve call possible. Graph runs visible in Langfuse with cost; max-turn breach closes gracefully. Determinism ratio metric emitted (% requests served with zero agent involvement — expect >80%).

## Anti-patterns

- Free-roaming multi-agent "teams"; agents calling agents; unbounded loops. LLM-in-the-loop for anything in the deterministic row of the table (if you can write the if-statement, write the if-statement). Tools with `dict` in/out (typed or it doesn't exist). Prompt logic buried in Python strings instead of `packages/prompts/`. Letting a roleplay agent touch retrieval or memory-write — that's how patients invent findings.

References: IMPLEMENTATION.md Phase 3; master plan §7 (all), §3.6, §14.6.
