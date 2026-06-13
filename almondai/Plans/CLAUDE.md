# AlmondAI — Claude Code project memory

AI operating system for Indian MBBS students: trustworthy RAG tutor, deterministic planner, Crisis Mode (premium triage), Clinical Mode (premium simulation, NExT Paper-II). Python/FastAPI modular monolith + Next.js PWA + Postgres/pgvector + Redis + LangGraph.

## Ground rules

- **`IMPLEMENTATION.md` is the build order.** Work phase by phase (0→8); never start a phase before the previous exit gate passes. Each task names its skill in `.claude/skills/` — load it before coding that task.
- **The never-do list (IMPLEMENTATION.md §10) is law.** Highlights: no ChromaDB / per-student vector DBs; no MiniLM; no unverified medical claims; no LLM in deterministic paths (scoring, scheduling, triage math, quotas); no agent writes except through validating tools; no upsell in detected-distress sessions; no precise readiness scores (banded only); no microservices/EKS/native apps; Terraform-only infra.
- **Correctness is a subsystem.** Every model-generated medical claim goes retrieve → rerank → generate → verify → cite. Changes to prompts/models/retrieval must pass `make eval` (thresholds in `evals/configs/eval_gate.yaml`).
- **One multi-tenant data plane.** All student data = rows with `student_id` + Postgres RLS. Tenant comes from JWT, never request body.
- **Deterministic by default; agentic only where open-ended** (Socratic dialogue, patient role-play, viva examiner). Agents call MCP tools; tools validate and write.
- **DPDP & wellbeing are product features**: age gate, consent ledger, visible memory, erasure, distress→support routing. Treat the ethics SLO like uptime.

## Commands

```
make bootstrap   # compose up + migrate + seed (fresh machine → working stack)
make dev         # hot-reload api + web + worker
make test        # unit + integration (pytest, vitest)
make eval        # eval harness vs golden sets; gates CI
make seed        # idempotent reseed
make loadtest    # k6 exam-spike profile
```

## Conventions

- Python 3.12, async-first FastAPI; Pydantic v2 models in `packages/schemas` (source of truth → generated TS client). Ruff + mypy strict.
- TypeScript strict; App Router; Tailwind + shadcn/ui only — no second design system. React Query for server state, Zustand for UI state. No Redux.
- Migrations: Alembic, one revision per PR, reversible. Hot append tables are time-partitioned.
- Prompts live in `packages/prompts/<module>/`, versioned files — never inline strings. Any prompt edit triggers eval.
- Events: typed, schema-versioned, consent-aware (`apps/api/src/almondai/modules/events`).
- Errors: single envelope `{code, message, details, request_id}`. Every log line carries `request_id`/trace ID.
- Tests colocated in `apps/*/tests`; security/RLS/ethics invariants get explicit regression tests.

## Skill index (load the one matching your task)

| Task touches… | Skill |
|---|---|
| Repo/CI/compose/app skeleton | `almondai-foundations` |
| Schemas, migrations, RLS, partitions | `almondai-data-model` |
| Curriculum graph, exam weights, high-yield queries | `almondai-curriculum-graph` |
| Ingestion, chunking, retrieval, rerank, groundedness | `almondai-rag-pipeline` |
| Model routing, providers, semantic cache, cost | `almondai-model-gateway` |
| Golden sets, eval metrics, CI gate | `almondai-eval-harness` |
| Memory types, extractors, decay, injection | `almondai-memory-system` |
| Auth, consent, DPDP rights, guardrails, distress | `almondai-safety-dpdp` |
| LangGraph supervisors, MCP tools, agent rules | `almondai-agents-mcp` |
| Tutor chat, Socratic loop, MCQ, spaced-rep | `almondai-tutor` |
| Next.js PWA, SSE client, offline packs | `almondai-frontend-pwa` |
| Razorpay, entitlements, quotas, paywalls | `almondai-payments` |
| Triage, sacrifice math, packs, readiness | `almondai-crisis-mode` |
| Study scheduler, replanning | `almondai-planner` |
| Case objects, patient agent, grading, faculty studio | `almondai-clinical-mode` |
| Voice WS, STT/TTS, barge-in | `almondai-voice` |
| Events, outcome capture, flywheel marts, KPIs | `almondai-analytics-flywheel` |
| Tracing, dashboards, SLOs, COGS | `almondai-observability` |
| Terraform, AWS, DR, load tests, launch | `almondai-infra-aws` |

## Definition of done (any task)

Code + tests green + `make eval` green (if AI-touching) + events/tracing wired + acceptance criteria in the task's skill met + no never-do violations.
