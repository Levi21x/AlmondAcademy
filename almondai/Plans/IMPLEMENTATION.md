# AlmondAI — Production Implementation Plan

**The single build document.** Derived from `AlmondAI_Master_Plan.md` (the strategy doc). That doc says *what and why*; this doc says *exactly what to build, in what order, with what acceptance gates*. It is written to be executed by Claude Code with the 19 task skills in `.claude/skills/`.

Status: v1.0 · Target: real-time production system · Region: India (ap-south-1) · Team assumption: 1–6 engineers + Claude Code

---

## 0. How to execute this document (read first)

1. **Build in phase order (0→8).** Phases encode hard dependencies. Never start a phase before the previous phase's **exit gate** passes. Within a phase, tasks can be parallelized.
2. **One skill per task.** Every task row names the skill that contains its contracts, schemas, code patterns, acceptance criteria, and anti-patterns. Load the skill before writing code for that task.
3. **The never-do list (§10) is law.** It encodes the master plan's hard-won architecture decisions. If a change would violate it, stop and flag instead.
4. **Everything medical passes the correctness stack.** No model-generated medical claim reaches a student without retrieval grounding + verification (Phase 2). This is the product's reason to exist.
5. **Local-first.** Everything runs on Docker Compose with zero cloud dependencies (LLM APIs excepted). Terraform (Phase 8) deploys the same containers to AWS unchanged.
6. **Definition of done for any task** = code + tests + eval gate green + observability wired + acceptance criteria in its skill met.

---

## 1. What we are building

An AI operating system for Indian MBBS students: a **trustworthy RAG tutor** (free, acquisition + data), a **deterministic study planner** (retention), and two premium modules — **Crisis Mode** (exam-survival triage; the conversion engine; NExT Paper-I aligned) and **Clinical Mode** (virtual patients, OSCE, viva; the moat; NExT Paper-II aligned). Underneath: one shared **exam-weighted curriculum graph**, a **7-type memory system** whose cross-student aggregate is the data moat, an **eval harness** that gates every release, and a **DPDP/wellbeing safety layer** that is non-negotiable for a product profiling stressed, sometimes-minor students.

**Real-time requirements (the "works real time" bar):**

| Surface | Mechanism | Budget |
|---|---|---|
| Tutor chat | SSE token streaming | first token ≤ 1.5s p95, full answer ≤ 8s p95 |
| Voice tutor | WebSocket cascade (STT→LLM→TTS), barge-in | first audio ≤ 1.2s perceived turn |
| Crisis triage | Deterministic SQL/scoring, no LLM in path | full triage ≤ 700ms p95 |
| Plan recompute | Deterministic scheduler | ≤ 2s p95, explanation diff streamed after |
| Clinical patient | SSE/WS dialogue over fixed case object | first token ≤ 1.5s p95 |
| MCQ scoring, spaced-rep queue | Pure code + Redis | ≤ 100ms |
| Quotas/paywall checks | Redis token bucket | ≤ 20ms |

```
Client (Next.js PWA: SSE chat · WS voice · offline last-night packs)
   │
   ▼
FastAPI modular monolith (stateless, async)
   ├─ auth/consent (DPDP)      ├─ quotas (Redis token-bucket)
   ├─ Orchestrator (LangGraph supervisors per module)
   │    ├─ Retriever tool ─► pgvector hybrid + BGE rerank + groundedness verify
   │    ├─ Memory tool    ─► Postgres structured + shared vector (student_id filter)
   │    ├─ ModelGateway   ─► Bedrock primary / OpenRouter fallback + semantic cache
   │    └─ Domain tools   ─► curriculum, MCQ, planner, crisis, clinical grader
   ├─ Voice gateway (WS) ─► Deepgram Nova-3 Medical → LLM → TTS stream
   └─ Billing (Razorpay webhooks → entitlements)
   │
   ▼ async (SQS local: ElasticMQ / or Redis streams in dev)
Workers: memory extractors · embeddings · eval runs · decay/consolidation · analytics ETL
   │
   ▼
Postgres 16 + pgvector (system of record + vectors) · Redis · S3/MinIO · ClickHouse (flywheel)
Observability: Langfuse (LLM traces) · OpenTelemetry → Grafana · Sentry
```

---

## 2. Locked technical decisions

These are settled by the master plan (§3, §15). Do not relitigate them mid-build.

| Concern | Decision | Why (short) |
|---|---|---|
| Backend | Python 3.12 + FastAPI, fully async, **modular monolith** | I/O-bound LLM workloads; microservices are premature |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, **PWA first** | Students live on phones; one design system; no native apps yet |
| System of record | PostgreSQL 16 (RDS Multi-AZ in prod), **RLS for tenant isolation** | One multi-tenant data plane; `student_id` rows, never per-user infra |
| Vectors | **pgvector** (one multi-tenant collection); Qdrant only past ~5–10M chunks | Kill ChromaDB; co-locate with system of record |
| Embeddings | **Qwen3-Embedding** (or Voyage voyage-3-large) | MiniLM is the stack's biggest quality bug |
| Reranker | **BGE-reranker-v2-m3** over top-50 → top-8 | Highest-ROI retrieval upgrade |
| Retrieval | Hybrid: BM25 (Postgres FTS) + dense + rerank | Medical terms (drugs, eponyms) need exact match |
| Generation safety | **Groundedness verifier** on every medical answer | The demo→product difference |
| Models | Router tiers: small-fast / Qwen3-class mid / gpt-oss-120B-class premium | Cheapest model that passes eval, per intent |
| Inference access | **Own `ModelGateway`**: Bedrock primary, OpenRouter fallback | Routing policy is IP; no vendor SPOF |
| Orchestration | **LangGraph, one supervisor per module**; tools via MCP-style typed interfaces | No agent swarm; agents propose, code disposes |
| Cache/queues | Redis: sessions, quotas, semantic cache, spaced-rep due-queue | 20–40% COGS cut from semantic cache |
| Async | SQS (prod) / compatible local broker; workers off request path | Nothing slow in the request path |
| Voice | Deepgram Nova-3 Medical STT + low-latency TTS, cascade, **hard free-tier caps** | Priciest COGS line; cap it |
| Payments | Razorpay subscriptions + webhook-driven entitlements | India-native |
| Auth | Managed identity (Cognito in prod / dev-JWT locally), short-lived JWT | Don't build auth |
| Analytics | Typed event spine → ClickHouse; flywheel marts | The closed loop is the moat |
| Observability | Langfuse + OTel/Grafana + Sentry; COGS-per-user dashboard | Fly blind on quality/spend = die |
| IaC | Terraform, ap-south-1 primary, ap-south-2 warm standby | DPDP residency + exam-season DR |
| Compliance | DPDP: age gate, consent ledger, visible memory, erasure; wellbeing routing | ₹200 Cr penalty exposure; ethics SLO |

---

## 3. Monorepo layout

```
almondai/
├── CLAUDE.md                      # Claude Code project memory (conventions + skill index)
├── IMPLEMENTATION.md              # this file
├── .claude/skills/                # 19 task skills (this kit)
├── docker-compose.yml             # postgres+pgvector · redis · minio · clickhouse · langfuse · api · web · workers
├── Makefile                       # bootstrap · dev · test · eval · seed · migrate · loadtest
├── .env.example                   # every secret/config key, documented
├── apps/
│   ├── api/                       # FastAPI modular monolith
│   │   ├── src/almondai/
│   │   │   ├── main.py            # app factory, middleware chain
│   │   │   ├── config.py          # pydantic-settings
│   │   │   ├── db/                # engine, RLS session, migrations (alembic)
│   │   │   ├── modules/
│   │   │   │   ├── identity/      # auth, consent, DPDP rights
│   │   │   │   ├── curriculum/    # graph + high-yield queries
│   │   │   │   ├── corpus/        # ingestion, chunks
│   │   │   │   ├── retrieval/     # hybrid search, rerank, verify
│   │   │   │   ├── gateway/       # ModelGateway, router, semantic cache
│   │   │   │   ├── memory/        # 7 types, extractors, assembler
│   │   │   │   ├── tutor/         # chat SSE, Socratic loop, MCQ, spaced-rep
│   │   │   │   ├── planner/       # scheduler core + LLM edges
│   │   │   │   ├── crisis/        # triage engines, readiness, packs
│   │   │   │   ├── clinical/      # case objects, patient agent, grader
│   │   │   │   ├── voice/         # WS gateway, STT/TTS adapters
│   │   │   │   ├── billing/       # razorpay, entitlements, quotas
│   │   │   │   ├── safety/        # guardrail middleware, distress, boundaries
│   │   │   │   └── events/        # typed event emitter
│   │   │   ├── agents/            # LangGraph supervisors + MCP tool registry
│   │   │   └── workers/           # extractors, embedder, decay, ETL, eval-runner
│   │   └── tests/                 # unit + integration + contract
│   └── web/                       # Next.js PWA
│       └── src/ (app/, components/, lib/sse.ts, lib/voice.ts, lib/offline.ts)
├── packages/
│   ├── schemas/                   # shared Pydantic/TS contracts (OpenAPI-generated client)
│   └── prompts/                   # versioned prompt files, one dir per module
├── evals/
│   ├── golden/                    # per-subject golden sets (JSONL)
│   ├── configs/eval_gate.yaml     # CI thresholds
│   └── runners/                   # ragas/deepeval harness
├── infra/terraform/               # envs/{staging,prod}, modules/{network,ecs,rds,redis,...}
├── ops/                           # runbooks, dashboards-as-code, load tests (k6)
└── data/                          # seed curriculum, sample corpus, PYQ datasets, case library
```

---

## 4. Local environment & bootstrap

`docker-compose.yml` services: `postgres` (pgvector/pgvector:16), `redis`, `minio`, `clickhouse`, `langfuse`, `api`, `web`, `worker`. GPU-free: embeddings/reranker run via API providers or small local ONNX models; everything heavier goes through `ModelGateway`.

Key `.env` groups (full list in `.env.example`): `DATABASE_URL`, `REDIS_URL`, `S3_*` (MinIO locally), `BEDROCK_*`, `OPENROUTER_API_KEY`, `EMBEDDINGS_*`, `RERANKER_*`, `DEEPGRAM_API_KEY`, `TTS_*`, `RAZORPAY_*`, `LANGFUSE_*`, `SENTRY_DSN`, `JWT_*`, `FEATURE_FLAGS_*`.

Make targets (the contract for humans and CI alike):

```
make bootstrap   # compose up, migrate, seed curriculum + sample corpus, create dev user
make dev         # api + web + worker with hot reload
make test        # unit + integration
make eval        # run eval harness against golden sets, enforce eval_gate.yaml
make seed        # idempotent seed/reseed
make loadtest    # k6 exam-spike profile against local stack
```

**Bootstrap order on a fresh machine:** clone → `cp .env.example .env` (fill LLM keys) → `make bootstrap` → `make dev` → open `http://localhost:3000`, ask the tutor a seeded-corpus question, receive a streamed, cited, verified answer. That round trip is Phase 2's exit gate.

---

## 5. The phase plan

Each phase: objective → tasks (with owning skill) → **exit gate** (all must pass; gates are cumulative — earlier gates keep passing).

### Phase 0 — Foundations (week 1)

Objective: a running skeleton with CI, so every later task lands on rails.

| Task | Skill |
|---|---|
| Monorepo scaffold, FastAPI app factory, settings, error model, middleware chain | `almondai-foundations` |
| Docker Compose stack + Makefile + .env.example | `almondai-foundations` |
| CI: lint (ruff), typecheck (mypy/tsc), tests, SAST; trunk-based; preview env per PR | `almondai-foundations` |
| Typed event emitter stub + request-ID/trace propagation | `almondai-foundations`, `almondai-observability` |

**Exit gate:** `make bootstrap && make test` green on a clean machine; `GET /healthz` returns build SHA; CI runs on PR.

### Phase 1 — Data spine (weeks 1–3)

Objective: the system of record — every table the product will ever write, plus the deterministic brain (curriculum graph).

| Task | Skill |
|---|---|
| Full Postgres schema + Alembic migrations + RLS policies + partitioning | `almondai-data-model` |
| Curriculum graph (subject→topic→concept, prereq/confusable edges, exam weights, PYQ frequency) + seed loader | `almondai-curriculum-graph` |
| High-yield/coverage SQL functions (the queries Crisis & Planner will call) | `almondai-curriculum-graph` |
| Seed data: 2 subjects deep (e.g., Anatomy upper limb, Pharmacology ANS) with real exam weights | `almondai-curriculum-graph` |

**Exit gate:** RLS proven by test (student A cannot read student B under any query path); `select * from high_yield_topics(exam_id, limit:=40)` returns weighted, explainable rows; migrations up/down clean.

### Phase 2 — Correctness stack (weeks 2–6) ← the load-bearing phase

Objective: a tutor answer pipeline you can *trust*, an eval harness that *proves* it, and a gateway that makes it *affordable*. Nothing medical ships without this.

| Task | Skill |
|---|---|
| Ingestion: layout-aware parse → semantic chunking → metadata enrichment → embed+index (dense + FTS) | `almondai-rag-pipeline` |
| Hybrid retrieval (BM25+dense, RRF) → BGE rerank top-50→8 | `almondai-rag-pipeline` |
| Groundedness verifier (claim-level check against retrieved chunks; block/repair unsupported claims) | `almondai-rag-pipeline` |
| `ModelGateway`: intent router, Bedrock/OpenRouter providers, failover, hedging, cost meter | `almondai-model-gateway` |
| Semantic cache (Redis, embedding-similarity keyed, verified-answers only) | `almondai-model-gateway` |
| Eval harness: golden sets, recall@k, citation correctness, groundedness, judge correctness, latency, cost; **CI eval gate** | `almondai-eval-harness` |
| Langfuse tracing on every model call | `almondai-observability` |

**Exit gate:** groundedness ≥ 95% and retrieval recall@10 ≥ 0.85 on golden sets; eval gate blocks a deliberately-broken prompt PR; semantic cache serves a near-duplicate; provider kill-test fails over without request errors.

### Phase 3 — Identity, safety, memory, agents (weeks 4–8)

Objective: who the student is, what we're allowed to do, what we remember, and the agent rails everything runs on.

| Task | Skill |
|---|---|
| Auth (JWT), profile, age gate, **consent ledger**, DPDP rights endpoints (export/erase), visible-memory API | `almondai-safety-dpdp` |
| Guardrail middleware: PII scrub, medical-boundary classifier, prompt-injection defenses, **distress detection → support routing** | `almondai-safety-dpdp` |
| Memory system: 7 types, session-close extractors (async), bounded task-scoped assembler, FSRS decay, consolidation jobs | `almondai-memory-system` |
| LangGraph supervisor pattern + MCP tool registry (retrieve, memory.read/write, curriculum.query, mcq.score, plan.mutate, case.grade) | `almondai-agents-mcp` |

**Exit gate:** under-18 signup requires guardian consent before any behavioral feature activates; erasure request wipes derived memory + vectors and is audit-logged; memory injection is token-capped and task-scoped (test asserts cap); a scripted distress message gets the support response with **zero upsell** and an `ethics_slo` event; no agent can write a system-of-record table except through a validating tool (negative test).

### Phase 4 — Tutor + frontend + payments: the free product (weeks 6–10)

Objective: the acquisition surface — a streaming, cited, Socratic tutor in a PWA, with quotas and a working paywall skeleton.

| Task | Skill |
|---|---|
| Tutor workflow (LangGraph): retrieve→rerank→generate→verify→cite; Socratic follow-up probe; misconception capture to memory | `almondai-tutor` |
| MCQ engine + FSRS spaced repetition (pure code + Redis due-queue) | `almondai-tutor` |
| Next.js PWA: SSE chat with citation UI, mastery dashboard, installable, push-ready | `almondai-frontend-pwa` |
| Quotas (Redis token bucket per tier) + Razorpay subscriptions + webhook entitlements | `almondai-payments` |
| Event instrumentation: activation funnel events end-to-end | `almondai-analytics-flywheel` |

**Exit gate:** fresh user → first cited verified answer in < 5 min (time-to-value); free tier hits 50-query/day cap and sees upgrade path; payment sandbox flow flips entitlements via webhook (incl. failure/retry); Lighthouse PWA installable; p95 first-token ≤ 1.5s local.

### Phase 5 — Crisis Mode: the spearhead (weeks 8–14)

Objective: the monetizing module — deterministic triage that is calm, explainable, and correct, with the flywheel's outcome loop wired from day one.

| Task | Skill |
|---|---|
| High-yield extractor + sacrifice engine (expected-marks optimizer over curriculum graph + mastery) — pure SQL/code | `almondai-crisis-mode` |
| Hour-by-hour war plan + "N hours left" instant recompute | `almondai-crisis-mode` |
| Last-night mode: offline recall packs (IndexedDB), micro-cards, rapid MCQ gauntlet | `almondai-crisis-mode`, `almondai-frontend-pwa` |
| Banded readiness estimate (calibrated on MCQ history; Brier-tracked; never a precise score) | `almondai-crisis-mode` |
| Wellbeing guardrails in crisis context (distress → support, no-upsell invariant) | `almondai-safety-dpdp` |
| Outcome capture (post-exam "what happened" + prediction logging) | `almondai-analytics-flywheel` |
| Crisis paywall: free = generic high-yield; paid = personalized triage/prediction/priority | `almondai-payments` |

**Exit gate:** triage ≤ 700ms p95 and every sacrifice decision carries a human-readable marks-math reason; packs work in airplane mode; readiness output is banded with calibration logged; distress-in-crisis test shows support routing and suppressed upsell; predictions persisted in a form scoreable against outcomes.

### Phase 6 — Planner: retention between spikes (weeks 12–16)

| Task | Skill |
|---|---|
| Deterministic scheduler: constraints (hours/day, prereqs, exam weights, FSRS due dates) → plan blocks; replan = recompute + diff explanation | `almondai-planner` |
| LLM edges only: parse messy student input → constraints; explain/motivate plan | `almondai-planner` |
| Plan UI: graph view as a *projection* of Postgres state (never source of truth) | `almondai-frontend-pwa` |

**Exit gate:** same inputs → identical plan (determinism test); missed-3-days replan produces stable diff with explanation; plan respects all constraints under property-based tests; plan-adherence events flowing.

### Phase 7 — Clinical Mode + voice: the moat (weeks 14–22)

| Task | Skill |
|---|---|
| Case-object schema + authoring/validation pipeline (clinician sign-off workflow) + 10+ validated seed cases (2 specialties) | `almondai-clinical-mode` |
| Patient agent: LangGraph over fixed case object; progressive disclosure; persona/affect; cannot invent facts (constrained tool access) | `almondai-clinical-mode` |
| Rubric grader as deterministic tool + LLM-scored structured criteria; **faculty-agreement calibration harness** | `almondai-clinical-mode` |
| Viva examiner + OSCE station timer (bounded agents) | `almondai-clinical-mode` |
| Voice gateway: WS, Deepgram streaming, barge-in, TTS streaming, per-tier minute caps, text fallback | `almondai-voice` |
| Faculty studio v0: author, review, cohort dashboard | `almondai-clinical-mode` |

**Exit gate:** character-break rate < 2% over scripted adversarial probes (patient never reveals un-asked findings or invents facts); grader-vs-faculty agreement measured and reported (target κ ≥ 0.7 before grades shown as authoritative); voice turn ≤ 1.2s perceived on local network; STT outage degrades to text seamlessly.

### Phase 8 — Production: AWS, observability, DR, launch (weeks 18–24)

| Task | Skill |
|---|---|
| Terraform: VPC, ECS Fargate (api/workers/voice), RDS Multi-AZ + pgvector, ElastiCache, S3, SQS/EventBridge, CloudFront+WAF, Cognito, Bedrock endpoints, Secrets Manager, OIDC CI | `almondai-infra-aws` |
| Warm-standby DR in ap-south-2; restore + failover game-day scripts | `almondai-infra-aws` |
| Dashboards-as-code: exec, AI-quality, **wellbeing/safety**; SLO alerts incl. hallucination-escape + COGS anomalies | `almondai-observability` |
| ClickHouse flywheel marts: topic_confusion, prediction_accuracy, cohort retention | `almondai-analytics-flywheel` |
| k6 exam-spike load test (10× baseline burst), pre-scaling runbook, blue/green + feature flags | `almondai-infra-aws` |
| Launch runbook + on-call rotation + degradation ladder drills | `almondai-infra-aws`, `almondai-observability` |

**Exit gate:** staging on AWS passes the *entire* Phase 2–7 gate suite; load test holds p95 budgets at 10× burst with graceful degradation (never dark); DR drill: RDS promoted + Route 53 failover within RTO; the three dashboards live with alerts firing on synthetic breaches.

---

## 6. Core API surface (contract overview; full schemas in skills)

| Endpoint | Method/Proto | Purpose |
|---|---|---|
| `/v1/auth/*` | REST | signup (age gate), login, refresh, guardian consent |
| `/v1/me/memory` | GET/DELETE | visible memory + DPDP rights (export/erase) |
| `/v1/tutor/chat` | POST → SSE | streamed tutor answer: `token`, `citation`, `verification`, `probe`, `done` events |
| `/v1/tutor/mcq/next` · `/answer` | REST | due-queue serve + score (deterministic) |
| `/v1/plan` · `/v1/plan/replan` | REST | generate/recompute plan; returns blocks + explanation diff |
| `/v1/crisis/triage` | POST | hours_left + exam → master/skim/abandon with marks-math |
| `/v1/crisis/pack/:topic` | GET | offline recall pack (cache-manifest headers) |
| `/v1/crisis/readiness` | GET | banded estimate + confidence + rationale |
| `/v1/clinical/cases` · `/attempt` | REST + SSE | list/start case; dialogue stream; submit case sheet |
| `/v1/clinical/attempts/:id/grade` | POST | rubric grade + feedback |
| `/v1/voice/session` | WS | bidirectional audio frames + control msgs (barge-in) |
| `/v1/billing/checkout` · `/webhook` | REST | Razorpay order + signed webhook → entitlements |
| `/v1/events` | POST (batch) | client-side typed events (consent-aware) |
| `/healthz` · `/readyz` | GET | liveness/readiness + build SHA |

Conventions: Pydantic models in `packages/schemas` generate the TS client; every response carries `request_id`; errors use one envelope `{code, message, details, request_id}`; all student-scoped routes resolve tenant from JWT and set Postgres RLS context — never from request body.

## 7. SSE / WS event protocol (real-time spec)

Tutor SSE events, in order: `meta` (model, cache_hit) → `token`* → `citation` (chunk_id, source, page) → `verification` (groundedness score, repaired_claims[]) → `probe` (Socratic follow-up) → `done` (usage, cost, latency). Clinical dialogue reuses `token`/`done` plus `finding_revealed` and `persona_state`. Voice WS messages: client `audio_frame`/`barge_in`/`end_utterance`; server `stt_partial`, `stt_final`, `token`, `tts_chunk`, `turn_done`. Degradation ladder (must be implemented, not aspirational): premium model down → mid model; reranker down → dense-only + `quality_degraded` flag; STT down → text mode; Bedrock throttled → OpenRouter; cache poisoned/stale → bypass. The product gets simpler under failure; it never goes dark.

## 8. Quality gates (the numbers that gate releases)

| Gate | Threshold | Enforced |
|---|---|---|
| Groundedness | ≥ 95% ship / ≥ 97% target | CI eval gate + prod SLO alert |
| Citation correctness | ≥ 95% | CI eval gate |
| Retrieval recall@10 | ≥ 0.85 golden sets | CI eval gate |
| Hallucination escape | < 5 / 1k answers | prod alert (page) |
| Tutor p95 first token | ≤ 1.5s | prod SLO |
| Voice perceived turn | ≤ 1.2s | prod SLO |
| Crisis triage p95 | ≤ 700ms | prod SLO |
| Semantic cache hit | > 20% exam season | COGS dashboard |
| COGS per active user | dashboarded + anomaly alert; target < 25–30% of ARPU for paid | finance gate |
| Distress→support routing | 100% of detected, 0 upsell | **ethics SLO, weekly review** |
| Grader-vs-faculty | κ ≥ 0.7 before authoritative grades | clinical trust gate |
| Readiness calibration | Brier tracked, banded output only | crisis trust gate |

CI pipeline: lint → typecheck → unit → integration → **eval gate** → build → deploy(staging) → smoke → canary prod. A prompt or model change that drops any eval-gate metric below threshold cannot merge.

## 9. Event spine (instrumentation map)

Typed events (full registry in `almondai-analytics-flywheel`): `signup`, `consent_granted`, `question_asked`, `answer_served{groundedness, cache_hit, cost}`, `citation_clicked`, `mcq_attempted`, `mastery_updated`, `plan_created/replanned/block_done`, `crisis_session_started`, `triage_generated/followed`, `pack_downloaded`, `readiness_shown`, `distress_detected/support_routed`, `clinical_case_started/finding_elicited/case_submitted/graded`, `paywall_viewed`, `subscribed/churned`, `outcome_reported`, `prediction_scored`. Every event: `student_id?`, `session_id`, `ts`, `consent_flags`, schema-versioned. Minors: no restricted behavioral profiling; aggregation thresholds in marts.

## 10. Never-do list (violations are build failures)

1. **No ChromaDB; no per-student vector stores.** One shared pgvector collection, mandatory `student_id` filter for memory vectors.
2. **No MiniLM embeddings; no retrieval without the reranker** in the standard path.
3. **No unverified medical claims** to students — verifier may block/repair; never skip it for latency.
4. **No OpenRouter as the router.** Routing policy lives in `ModelGateway`; OpenRouter is one provider behind it.
5. **No LLM in deterministic paths**: MCQ scoring, spaced-rep, high-yield extraction, sacrifice math, scheduling, quotas, payments are code.
6. **No agent writes to system-of-record tables** — only validating tools write.
7. **No unbounded memory injection** — token-capped, task-scoped summaries only.
8. **No covert profiling.** Memory is user-visible; minors get the DPDP-gated path; no manufactured urgency, ever.
9. **No upsell in a detected-distress session.** Hard invariant with a test.
10. **No precise readiness scores** — banded + calibrated only, until outcome data earns more.
11. **No clinical facts outside the validated case object**; no authoritative grades before faculty calibration.
12. **No microservices, EKS, native apps, GPU fleets, or per-college forks** at this stage.
13. **No secrets in code/env files in repo; no infra by console-clicking** — Terraform only.
14. **No skipping the eval gate**, even for "tiny prompt tweaks." Especially for those.

## 11. Skill index

| Skill | Owns | Phase |
|---|---|---|
| `almondai-foundations` | Repo, compose, CI, app skeleton, conventions | 0 |
| `almondai-data-model` | Full schema, RLS, partitions, migrations | 1 |
| `almondai-curriculum-graph` | Curriculum tables, weights, high-yield SQL | 1 |
| `almondai-rag-pipeline` | Ingestion→retrieval→rerank→groundedness | 2 |
| `almondai-model-gateway` | Router, providers, failover, semantic cache, cost meter | 2 |
| `almondai-eval-harness` | Golden sets, metrics, CI gate, regression policy | 2 |
| `almondai-memory-system` | 7 memory types, extractors, assembler, decay | 3 |
| `almondai-safety-dpdp` | Age gate, consent, rights, guardrails, distress, injection defense | 3 |
| `almondai-agents-mcp` | LangGraph supervisors, MCP tool bus, agent rules | 3 |
| `almondai-tutor` | Tutor workflow, Socratic loop, MCQ, FSRS | 4 |
| `almondai-frontend-pwa` | Next.js PWA, SSE client, offline packs, design system | 4 |
| `almondai-payments` | Razorpay, entitlements, quotas, crisis paywall | 4–5 |
| `almondai-crisis-mode` | Triage engines, war plan, packs, readiness, wellbeing wiring | 5 |
| `almondai-planner` | Deterministic scheduler, LLM edges, replan diffs | 6 |
| `almondai-clinical-mode` | Case objects, patient agent, grader, viva/OSCE, faculty studio | 7 |
| `almondai-voice` | WS gateway, STT/TTS cascade, barge-in, caps | 7 |
| `almondai-analytics-flywheel` | Event spine, outcome capture, ClickHouse marts, KPIs | 4–8 |
| `almondai-observability` | Langfuse, OTel, Sentry, SLOs, COGS + 3 dashboards | 0–8 |
| `almondai-infra-aws` | Terraform, Fargate, DR, load/pre-scale, launch runbook | 8 |

## 12. Sequencing rationale (one paragraph)

The master plan's discipline: correctness before features, Crisis before Clinical, deterministic before agentic, one data plane forever. Phases 0–2 build the part that makes every answer trustworthy and affordable; Phase 3 makes it legal and safe; Phase 4 ships the free product that acquires users and data; Phase 5 ships the module that earns revenue during the first real exam cycle; Phases 6–7 convert seasonal spikes into retention and moat; Phase 8 makes it survive exam-night load in production. Cut scope within a phase if needed — never reorder across phases.
