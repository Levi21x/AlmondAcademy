# AlmondAI — The Definitive Master Plan

**The consolidated source of truth. Supersedes both prior draft plans.**

Posture: written as one voice combining CTO · Principal Software Architect · AI Systems Architect · Product Strategist · Startup Operator · VC Partner · Engineering Leader.
Consolidation date: 13 June 2026 · Stage: Seed ($1.2M ask) · Reader's seat: you are the founder.

---

## How to read this document — and how it was built

This document is the merge of two prior master plans ("Plan 1," the 1,367-line edition, and "Plan 2," the 919-line `linux` edition) into a single operating manual. The job here was not to summarize either draft. It was to extract **every** idea from both, merge the literal duplicates, preserve everything unique, **rank all of it**, **resolve every conflict with a single decision**, and lay out a build order an engineering team can execute on Monday.

Where the two drafts agreed (and they agree on ~80% of the substance — kill ChromaDB, add a reranker + groundedness gate, build evals first, deterministic-over-agentic, Crisis + Clinical + data are the real company), that consensus is hardened into doctrine below. Where they disagreed, **Section "Conflict Resolutions"** records the decision, the reason, the rejected alternative, and the upgrade trigger. Nothing was dropped on the floor; every product idea from both drafts survives in the **Master Priority Matrix** and the **Top-100 ranking**, scored rather than deleted.

Two disciplines were held throughout. First, **production-first**: prefer deterministic systems over agents, maintainable architecture over cleverness, measured outcomes over hype, and anything a 4-to-10-person team can actually ship. Second, **brutal honesty**: both drafts are treated as fallible. Where a recommendation is overengineered, premature, or founder-hostile, it is downgraded and the reasoning is stated.

The 24 sections (A–X) map to the company's operating surface. After them come the four cross-cutting deliverables: the **Conflict Resolutions**, the **Master Priority Matrix** (every idea, scored and ranked), **THE RECOMMENDED ALMONDAI BUILD ORDER** (month 1–12), and the **Executive Rankings** (Top 25 / 50 / 100 and eight Top-20 lists).

The single most important strategic correction carried from Plan 1 and threaded through everything below: **AlmondAI is the platform built for NExT** — and specifically the only serious answer to **NExT Paper II** (the clinical/practical exam) where no incumbent has a defensible product. That reframing is the company's wedge, moat, and fundraising story at once.

---

# SECTION A — Executive Summary

AlmondAI is being pitched as an "AI operating system" for India's ~1.2M MBBS students: four agentic modules (Tutor, Planner, Crisis Mode, Clinical Mode) that replace the 5–7 tools students stitch together today. The honest current state is narrower and more fragile than the pitch: **one module exists (the AI Tutor, a RAG chatbot), it is the least defensible of the four, and it has no correctness evaluation — which is disqualifying for a medical product until fixed.** The two modules that actually make money and build a moat — Crisis Mode and Clinical Mode — are slideware. The data flywheel that is supposed to be the long-term moat is claimed but not engineered.

That is not a reason to walk away. It is the opportunity. The market is proven (Marrow does ₹773 Cr, profitable; PrepLadder ₹115 Cr), the pain is acute and recurring (exam panic, four spikes a year, peak willingness-to-pay), and there is a **category-creation opening that both incumbents are structurally unready for: NExT Paper II**, the practical/clinical licensing exam that simulation — virtual patients, OSCE, viva — is the only thing that scales to. Incumbents' MCQ banks and video libraries do not transfer to it. AlmondAI's Clinical Mode is the only product designed for it.

The strategy in one line: **build the moat, not the demo.** Concretely, the next 12 months must (1) make the Tutor's every answer *trustworthy* by building the evaluation/correctness layer first — golden sets, reranker, groundedness gate, observability — because nothing medical ships without it and it is also the foundation of the data moat; (2) ship a **real Crisis Mode** as deterministic exam-survival triage that demonstrably converts during a live exam cycle, instrumented from day one to capture *predicted-vs-actual exam outcome* (the flywheel's closing step); (3) **begin the clinician-authored, validated Clinical case library now**, because it is the slowest moat to build and the NExT Paper-II wedge; and (4) replace the prototype-stack landmines (per-student ChromaDB, MiniLM-without-reranker, OpenRouter-as-sole-router) with a pragmatic production stack (Postgres + pgvector, BGE reranker, Bedrock-primary inference behind your own gateway, Langfuse evals, ECS Fargate on `ap-south-1`).

The moat is explicitly **not** the chatbot, the corpus, or the model router — those are table stakes a funded competitor copies in a quarter. The moat is three compounding, slow-to-copy assets: a **validated clinical case library aligned to NExT Paper II**, the **cross-cohort weakness-and-outcome graph** (how Indian medical students actually fail, and what fixes it, deepening every exam cycle), and **faculty/institutional embedding (B2B2C)** that creates two-sided switching costs. Start the slowest of these in month one.

Financially, the deck's numbers are internally inconsistent (₹1,800 vs ₹3,300 ARPU on different slides), the 78% gross margin is asserted not measured, and ₹150 CAC is fantasy outside the ambassador channel. None of these sink the company; all must be re-modeled bottom-up, per-module, with measured COGS, before any of them go in front of a Series-A investor. The realistic path to ₹100 Cr ARR is a *share-of-existing-wallet* problem in a proven category (≈330K paying users at ~₹3,000 blended), reached by sequencing Crisis conversion → annual/NRR → B2B2C college distribution → career-lifecycle adjacencies (FMGE, NEET-PG, CME).

The verdict an investor would reach — and the one to internalize — is: *strong concept, exceptional wedge, immature execution, over-claiming.* This plan converts that into a fundable, safe, measured product on one exam cycle. Win one exam in one region, prove retention and referral, then replicate. Everything in Sections B–X serves that sequence.

---

# SECTION B — What AlmondAI Actually Is

**Stated plainly, stripped of the deck's marketing:** AlmondAI is a curriculum-grounded medical-learning system for Indian MBBS students that (a) answers exam questions from a curated, exam-weighted medical corpus instead of the open web, (b) remembers each student's weaknesses, and (c) turns that memory into two high-emotion, high-willingness-to-pay experiences — exam-survival triage (Crisis Mode) and clinical simulation (Clinical Mode) — that generate proprietary data on how Indian medical students fail.

The word "operating system" is aspirational. Today it is a chat app plus a roadmap. That framing is fine for a deck and **dangerous if believed internally**, because an "OS" implies a platform, extensibility, and third-party developers — none of which exist, and none of which are a Stage-1 problem. Internally, the honest noun is "a trustworthy answer engine with two premium modules on top." The "OS" becomes literally true only at Stage 5, when faculty author on the platform, colleges assess on it, and a student's lifelong learning graph lives inside it.

**The four modules, restated precisely:**

- **AI Tutor** — textbook-grounded RAG chat over a curated corpus (today: ~15,615 chunks from BD Chaurasia, Netter, Guyton, Robbins, Lippincott), with streaming, voice, chat memory, an MCQ engine, and spaced repetition. *Status: live; quality unverified; the commodity layer.*
- **Agentic Planner** — a study graph generated from syllabus + exam date + weak areas, with drag-to-replan and adaptation when the student falls behind. *Status: roadmap; over-described as "agentic"; mostly a scheduling problem.*
- **Crisis Mode (premium)** — the "exam war room": high-yield extraction, a "sacrifice engine," last-night mode, readiness prediction. *Status: roadmap; the primary monetization lever; must be reframed from "war room" to "triage room."*
- **Clinical Mode (premium)** — the virtual ward: AI plays patient/examiner/consultant, the student takes a history, writes a case sheet, faces a viva, and is graded. *Status: roadmap; the highest moat; the NExT Paper-II wedge.*

**What it is *for*** matters more than what it *is*. The deck is feature-led ("four modules"); nobody buys four modules. Students buy two outcomes: *"I will not fail my prof exam"* and *"I will pass the licensing exam that decides whether I can practice."* The entire company should be framed around **measurable academic outcomes**, because outcomes are what create referrals, retention, and the data moat. The correct one-sentence definition to put on the website and in the deck:

> **AlmondAI helps every Indian MBBS student pass the exams they are most afraid of — starting with the 48-hour panic that no one else solves, and ending with the clinical practical exam (NExT Paper II) that every Indian doctor will soon be required to pass.**

**Who the user is:** an MBBS student (often 17–22), phone-first, frequently on poor hostel/3G connectivity, studying at 2 a.m., already spending ₹40K–₹2L/year on test-prep, and emotionally maxed out around exams. Two consequences fall straight out of this and are treated as product law throughout: the product must be **mobile-first and offline-capable**, and a meaningful share of users are **minors under India's DPDP Act**, which makes covert behavioral profiling a legal landmine, not a growth tactic.

---

# SECTION C — Core Thesis

**The defensible version of AlmondAI is a closed-loop learning system, not a chatbot.** The loop: a curated exam-weighted corpus grounds every answer → every interaction writes to a per-student weakness graph → that graph drives a planner and two premium, high-emotion experiences (Crisis triage, Clinical simulation) → those experiences generate proprietary data on how Indian medical students fail → that data makes predictions and high-yield lists *visibly more right* than any generic tool's → better outcomes drive word-of-mouth in tight med-student communities → more students deepen the data → competitors fall further behind every exam cycle. **The moat is the weakness-and-outcome graph and the validated clinical case library — not the model, not the corpus, not the router.**

Five load-bearing beliefs hold the thesis up:

1. **Trust is the product, in a category where the alternative (ChatGPT) is free.** A wrong fact in anatomy costs a mark; a wrong fact in pharmacology dosing is dangerous. AlmondAI wins the free-tier fight against "good enough, already installed" generic AI **only** by being demonstrably, measurably more correct on the medical curriculum — which requires an evaluation layer the deck never mentions. Correctness is not a feature; it is the entire reason to exist.

2. **The wedge is the 48 hours before the exam.** Peak panic is peak willingness-to-pay, it recurs four times a year, and no incumbent owns it. This is the sharpest, most original insight in the entire pitch. It is also an ethical tightrope (Section N): the product must *relieve* panic, never manufacture it.

3. **NExT reframes the company.** The National Exit Test replaces NEET-PG, the final-MBBS exam, and the FMGE in one stroke, as **Paper I (a 540-question MCQ exam)** and **Paper II (a wholly practical/clinical exam)**. Paper I *is* Crisis Mode + Tutor; **Paper II *is* Clinical Mode** — and Paper II is a green-field where incumbents' content libraries do not transfer. Build for NExT's *structure* (MCQ + clinical practical), which is good pedagogy regardless of the rollout date. **You win big if NExT ships on schedule; you do not lose if it slips.**

4. **Most of the system should be deterministic.** Scheduling, high-yield extraction, the sacrifice engine, readiness prediction, MCQ scoring, spaced repetition — these are math and queries, not open-ended agent tasks. "Agentic everything" is the most expensive mistake AI startups make in 2026. Agents are reserved for the few irreducibly open-ended surfaces (clinical patient role-play, viva, replanning). This is what keeps margins and latency defensible.

5. **The data only compounds if the loop is closed.** A flywheel that captures interactions but never captures the *real exam outcome* and scores its own predictions against it is an open loop that accumulates rather than accelerates. The single highest-leverage cheap thing to build is **outcome capture** (post-exam "what happened?" + opt-in result sharing) from day one, even at N=50.

**What the thesis explicitly rejects:** "ChatGPT for MBBS" (undifferentiated), "we curated a corpus" as a moat (replicable in a quarter), "we route across three LLMs" as a moat (a vendor dependency), and "four agentic modules in parallel" as a Stage-1 plan (four half-products from a four-person team). The thesis is narrow on purpose. You do not reach the billion-dollar "medical-education OS" outcome by building four modules at once; you reach it by making **one** module undeniable, then letting trust and data compound into the next.

---

# SECTION D — What Must Be Built First

If AlmondAI has one engineering team and one quarter, it builds the **foundation of trust and the brain of the product** — not a new module. In strict order:

**1. The evaluation & correctness layer (the missing pillar).** Golden eval sets per subject (start ~500 expert-verified Q→grounded-answer pairs), automated metrics (retrieval recall@k, citation correctness, groundedness/faithfulness, answer correctness via LLM-judge + SME spot-check, refusal calibration, latency, cost), a **CI eval gate** that blocks any prompt/model/retriever change that regresses correctness, and **LLM observability (Langfuse)** tracing every call. *Why first:* in medicine you cannot ship what you cannot measure, and this harness is simultaneously the safety system and the substrate of the data moat. Both prior plans independently rank this #1. It is non-negotiable.

**2. The RAG correctness overhaul.** Kill per-student ChromaDB; move to **one multi-tenant pgvector collection** with metadata filtering. Replace MiniLM with a strong retrieval embedding (Qwen3-Embedding or Voyage `voyage-3-large`) and add a **BGE-reranker-v2-m3** stage over the top-50 — the single highest-ROI quality lever in the stack. Add **hybrid search** (BM25 + dense) because medical retrieval lives and dies on exact terms (drug names, eponyms, classifications). Add a **groundedness verifier** that blocks unsupported claims before display, and a calibrated **"I don't know"** path (confidently wrong is the worst failure mode in med ed).

**3. The exam-weighted curriculum graph (the deterministic brain).** Model the syllabus as a graph in Postgres (subject → topic → subtopic → concept, each tagged with `exam_weight`, `pyq_frequency`, `is_high_yield`, topic dependencies). This one asset powers high-yield extraction, the sacrifice engine, the planner, readiness prediction, and the analytics mart. Without it, Crisis Mode is an LLM guessing; with it, Crisis Mode is explainable math.

**4. The data spine + closed outcome loop.** A typed event stream, the per-student structured weakness graph (Postgres + a single filtered pgvector collection, *not* per-student stores), and **outcome capture wired from day one**. Tiny N is fine — the point is that the loop is closed and instrumented before the data arrives, so the flywheel starts turning the moment volume does.

**5. The Crisis Mode spearhead, on top of that foundation.** Deterministic triage — high-yield extraction, the sacrifice engine, last-night offline packs, and a *banded, humble* readiness estimate — with a hard **wellbeing guardrail** (distress detection routes to support, never to a paywall), wired to payments. This is the monetization wedge and it must prove conversion on a real exam cycle.

**Built in parallel, low cost, because they gate everything:** a **DPDP/consent baseline** (age-gating, consent ledger, visible/user-controllable memory) and the **medical-safety boundary** (educational simulation ≠ clinical advice, enforced in product). And **begun in month one even though it ships much later: the clinician relationship for the Clinical case library**, because a moat that takes two years to build must be started today.

**What is explicitly *not* in "build first":** Clinical Mode at full scope, the fancy LLM planner, native mobile apps, voice-everywhere, microservices/EKS/multi-region, self-hosted GPUs, the platform/API surface, and a 706-college sales army. All are premature; all are catalogued in "What To Delay" (Section V) with triggers for when they become appropriate.

The discipline in one sentence: **one spearhead (Crisis), proven on one exam cycle, on a trustworthy Tutor, with the data loop pre-wired and the slowest moat (Clinical library) already begun.**

---

# SECTION E — Product Strategy

**The strategic spine is sequencing, not breadth.** The product strategy is a deliberate progression from a commodity acquisition surface to two defensible monetization surfaces to an institutional platform — each stage funding and de-risking the next.

**The role each module plays (and why the order is fixed):**

The **Tutor is the top of the funnel and the data intake**, not the business. Every question is a free read on what confuses Indian medical students; its job is to be trustworthy enough to acquire users and feed the weakness graph. Moat: low alone, but *instrumental* — it is the sensor. Build it well enough to earn trust and generate data; do not mistake it for the company.

**Crisis Mode is the conversion engine.** It monetizes the single highest-WTP moment in a medical student's year and produces the richest behavioral data (what students cram, what they sacrifice, whether it worked). It is the spearhead because it has the shortest path from "free user" to "paying user" and because its data is the flywheel's fuel. Reframed from "war room" (manufacturing urgency) to **"triage room"** (relieving panic with ruthless, explainable prioritization).

**Clinical Mode is the moat and the NExT Paper-II category-creator.** It is the most expensive and most dangerous to build (an AI patient that breaks character or an unvalidated grader teaches bad medicine), so it is sequenced *after* Crisis proves the company can convert — but its slowest input (the clinician-authored case library) is begun immediately. It is the highest-defensibility asset AlmondAI can own.

**The Planner is the retention glue between exam spikes.** Its honest job is to convert four seasonal spikes into year-round engagement. It is deliberately *deterministic* (a real scheduler with a spaced-repetition core), with the LLM only on the edges — because a plan that silently changes every time the student opens the app destroys the trust that is the whole point.

**Positioning and wedge discipline.** The deck's strategic ambiguity — "MBBS coursework" vs "NEET-PG entrance," two different products — is resolved by **NExT**, which unifies them: build for NExT's structure and you serve the prof-exam student (Paper I + practicals) and the licensing aspirant (Paper I + Paper II) with one architecture. The go-to-market wedge is even narrower than the market: **one exam moment** (e.g., the 2nd-year Pharmacology/Pathology prof exam) in **one region**, made unmissable, then replicated. Saturate 3–10 design-partner colleges right before an exam cycle; measure whether they passed better and told their friends. That is PMF.

**Product principles that constrain every roadmap decision:**

- **Trust over reach.** Depth on 2–3 high-yield subjects beats shallow coverage of all 19. Coverage gaps produce wrong/empty answers, which produce churn. Breadth is earned by data, not assumed.
- **Mobile-first and offline-capable, always.** The defining product detail is a student on bad hostel wifi at 2 a.m. still having their cram sheet. Offline "last-night mode" is a moat, not a nice-to-have.
- **Relieve, never exploit.** Crisis Mode sells certainty and calm, not manufactured urgency. Genuine distress routes to a human, never to a paywall. This is both an ethical line and a DPDP/dark-pattern line.
- **Deterministic where you can, agentic where you must, evaluated everywhere.** Stated once, enforced module by module.
- **Free tier useful but un-personalized; pay for *your data and math applied to them*.** The free tier gives generic high-yield lists and a trustworthy tutor; personalized triage, prediction, priority, voice, and clinical simulation are paid. The most expensive things to serve (voice, clinical sim) are never free.

**The product surface, three years out**, is not four modules — it is a **lifecycle**: MBBS coursework → prof exams → NExT Paper I & II → internship → NEET-PG/residency → FMGE/USMLE/PLAB for those going abroad → CME for practicing doctors. Capturing the doctor for ten years instead of one exam, on a compounding outcome dataset, is what turns "an app students use" into "the operating system medical education runs on." The 100 product extensions (ranked later) are the menu for that lifecycle — to be built almost none-of-now and earned one at a time as data and distribution justify each.

# SECTION F — Technical Architecture

**Five design principles decide every trade-off below**, and they are the consensus of both prior plans:

1. **Deterministic by default, agentic only where ambiguity is irreducible.** LLM calls are the most expensive, slowest, least testable part of the stack. Use them where you must, not where you can.
2. **Correctness is a first-class subsystem, not a vibe.** Every generated medical claim is graded, traced, and improvable. Medical correctness *is* the product; everything else is plumbing.
3. **One multi-tenant data plane, never per-user infrastructure.** The unit of scale is a row with a `student_id`, never a container or vector store per student.
4. **Stateless compute, stateful stores.** Anything in the request path scales horizontally; all state lives in managed stores.
5. **Buy the undifferentiated, build the moat.** Don't build auth, payments, STT, or a vector engine. Build the weakness graph, the eval harness, and the clinical simulator.

**Reference request topology:**

```
Client (Web/Next.js · Mobile/RN-Expo · PWA offline)
   │  HTTPS / WSS (single multiplexed socket for stream+voice+plan)
   ▼
CloudFront ── WAF/Shield ── ALB (+ API GW for partner APIs later)
   │
   ▼
API layer (FastAPI, stateless, autoscaled on ECS Fargate)
   ├── Auth (Cognito)                 ├── Rate-limit & quota (Redis token-bucket per tier)
   ├── Inference Gateway (YOUR router + RAG + guardrails + evals)
   │      ├── Retriever  ──► pgvector (→ Qdrant at scale) + BGE reranker
   │      ├── Memory svc ──► Postgres (structured) + Redis (hot) + pgvector (semantic)
   │      ├── ModelGateway ──► Bedrock (primary) + OpenRouter (fallback)
   │      └── Groundedness/guardrail hooks ──► async eval bus
   ├── Agent Orchestrator (LangGraph: one supervisor per module)
   ├── Voice svc (WS/WebRTC ──► STT → LLM → TTS, premium-bounded)
   └── Domain services: Planner · Crisis · Clinical · MCQ · Spaced-rep · Billing
   │
   ▼
Async plane: SQS/EventBridge ──► workers (eval, embeddings, analytics ETL, memory decay/consolidation)
   │
   ▼
Data plane: Postgres (RDS Multi-AZ) · Redis (ElastiCache) · pgvector/Qdrant · S3 (corpus/audio/exports) · ClickHouse/Redshift (OLAP)
   │
Observability: OpenTelemetry → Langfuse (LLM traces) + Datadog/Grafana (infra) + Sentry (errors)
```

**Frontend.** Next.js (App Router) + TypeScript, React Server Components for content-heavy reads, client components for chat/voice; Tailwind + one design system (shadcn/ui) so four modules share one visual language and you don't accumulate UI debt. **Mobile is primary, not optional** — ship a high-quality **PWA first** (installable, offline last-night packs in IndexedDB/SQLite, push for exam-cycle nudges), then **React Native (Expo)** sharing a TS core once retention justifies it. Do not start with native iOS+Android — three frontends at seed is unaffordable. Token streaming over **SSE** (cheaper, proxy-friendly); **a single multiplexed WebSocket** for voice + live plan updates (don't open three sockets). The ReactFlow planner graph is a **view, a projection of Postgres state — never the system of record**; render server-side snapshots so mobile/offline can view plans without the heavy canvas. State: TanStack/React Query for server state, Zustand for local UI. No Redux.

**Backend.** **Python + FastAPI** for the AI/orchestration plane (where the ecosystem lives), async everywhere (ASGI, `asyncio`, `httpx`) because latency is dominated by I/O wait on model calls. **Modular monolith first, not microservices** — one deployable with clean internal module boundaries (`auth · core-api · inference-gateway · agent-orchestrator · voice · memory · ingestion · eval · analytics`). Microservices at seed are premature distribution that triples ops load; extract a service only when a module has a *different scaling profile* — **voice and eval-workers are the only two legitimate early extractions.** REST + SSE for app traffic; an internal **MCP-style tool layer** for everything the orchestrator calls (retrieval, memory read/write, MCQ scoring, plan mutation), strongly typed with Pydantic, OpenAPI generated, contract-first. Idempotency + an outbox for payments and plan mutations. Background work (embeddings, eval, ETL, memory decay, exam-cycle notifications) on SQS + a worker pool — nothing slow runs in the request path.

**Database (system of record).** **PostgreSQL (RDS, Multi-AZ)** is the spine: identity, entitlements/billing, the curriculum graph, study plans, MCQ items + attempts, clinical case definitions + attempts, eval results, payments, consent records. Model the **curriculum as a graph in relational tables** (adjacency + closure table or `ltree`); recursive CTEs are enough at first — reach for a graph DB only if traversal becomes the proven bottleneck. **Partition** hot append-heavy tables (`interactions`, `mcq_attempts`, `clinical_attempts`) by month; **read replicas** for analytics and exam-season read spikes; **PITR** backups; **row-level security** keyed by `student_id`/`org_id` for tenant isolation and future B2B college tenancy. **Redis (ElastiCache):** sessions, rate-limits/quotas, the spaced-rep due-queue, hot caches (active plan, today's high-yield pack), transient voice/chat state, and the **semantic answer cache** (a 20–40% COGS saver). **S3:** corpus, generated audio, case-sheet exports, eval datasets, analytics cold tier.

**The technology verdicts (keep / augment / replace / kill), consolidated:**

| Choice | Verdict | The move |
|---|---|---|
| ChromaDB (incl. per-student collections) | 🔴 **Kill** | → one multi-tenant **pgvector** collection now; **Qdrant** past ~5–10M vectors. Per-student stores are the #1 tech-debt landmine. |
| MiniLM embeddings + no reranker | 🔴 **Replace** | → **Qwen3-Embedding / Voyage `voyage-3-large`** + **BGE-reranker-v2-m3**. Highest-ROI quality fix in the stack. |
| OpenRouter as sole inference path | 🟡 **Augment** | Keep as *secondary*; **Amazon Bedrock primary** (in-region, DPDP); own the router as your `ModelGateway`. |
| Deepgram voice | 🟢 **Keep, scope down** | **Nova-3 Medical**; wire Transcribe Medical failover; **premium + use-case-bounded** (viva + last-night), hard free-tier caps. |
| LangGraph "for everything" | 🟢 **Keep, restrain** | One **supervisor per module**, not an agent swarm; Tutor stays a workflow. |
| Deep Agents | 🟡 **Sparingly** | Only truly open-ended planning; ~20× token cost — must earn it. |
| Redis | 🟢 **Keep, lean harder** | Add **semantic cache** + due-queue + hot packs. |
| PostgreSQL | 🟢 **Keep, make it the spine** | Host pgvector + structured memory + curriculum graph; RLS, partitioning, replicas. |
| Qwen3-80B / Nemotron-9B / gpt-oss-120B | 🟢 **Keep behind an interface** | Validate the *exact* checkpoints on **your** medical golden set; gate gpt-oss-120B to paid. |
| Razorpay | 🟢 **Keep** | Handle UPI-mandate failures + dunning explicitly (30–50% involuntary churn is common in India). |
| Eval harness · reranker · groundedness gate · semantic cache · feature flags · Terraform · DPDP layer | 🔴 **Missing — add** | Each is load-bearing; adding these matters more than swapping any single model. |

---

# SECTION G — Infrastructure Architecture

**Region strategy: primary `ap-south-1` (Mumbai)** for data residency, student latency, and DPDP comfort; **`ap-south-2` (Hyderabad) as DR**. Everything stays in-region — this is a compliance feature, not just a latency one.

| Layer | AWS service | Why this one |
|---|---|---|
| CDN / edge | **CloudFront + WAF + Shield** | Cache static + figures, stream SSE near students; WAF blocks the scrape/credential-stuffing that spikes in exam season. |
| Ingress | **ALB** (+ API Gateway for partner APIs later) | WebSocket + SSE for chat/voice; API GW only where per-partner throttling/keys are needed. |
| Compute (API + workers) | **ECS Fargate** | Serverless containers, Multi-AZ, no node ops. **EKS is overkill until GPU scheduling matters.** |
| GPU inference (Year-2) | **EC2 G5/G6 + vLLM** | Self-host hot open models only past the cost crossover (~>$8–12k/mo OpenRouter spend). Until then, skip. |
| Auth | **Cognito** | Managed identity, MFA, OTP/social login common in India; offloads a security-critical surface. |
| Relational DB + 1st-stage vectors | **RDS PostgreSQL (Multi-AZ) + pgvector** | System of record *and* vector store in one engine; Multi-AZ HA; read replicas for spikes. |
| Cache / light queue | **ElastiCache (Redis)** | Sessions, quotas, due-queue, semantic cache, hot packs. |
| Vector (scale-out) | **Qdrant (ECS/EC2 or Cloud)** | When pgvector is outgrown: filtered HNSW + hybrid + horizontal scale. |
| Object store | **S3** (+ Glacier/Intelligent-Tiering) | Corpus, audio, exports, eval datasets, Parquet event lake. |
| Async messaging | **SQS + EventBridge** | Decouple eval, embeddings, ETL, decay jobs, exam-cycle batch notifications. |
| Keyword search | **OpenSearch** (or PG FTS early) | BM25 half of hybrid retrieval + log search. |
| Streaming/ETL → warehouse | **Kinesis Firehose → S3 → ClickHouse/Redshift** | Event spine for analytics + the flywheel mart (Athena-on-S3 is the serverless start). |
| Inference (governed) | **Amazon Bedrock** (+ AgentCore later) | In-region model access, enterprise data posture; AgentCore bills agent runtime/memory on *active* per-second use — good for bursty exam-season traffic, adopt once agent shapes stabilize. |
| Inference (gap-fill) | **OpenRouter** behind your gateway | Models Bedrock lacks; never the sole path. |
| Speech | **Transcribe Medical / Deepgram Nova-3 Medical + Polly Neural** | In-region medical STT + low-latency Indian-English TTS. |
| Secrets / keys | **Secrets Manager + KMS** | Rotation, encryption, audit. |
| Observability | **CloudWatch + OTel → Datadog/Grafana; Langfuse (self-hosted) for LLM** | Infra + LLM traces; Langfuse self-hosted keeps traces in-region. |
| Product analytics | **PostHog (self-hosted)** | Funnels + retention + experiments + feature flags in one, India-residency-friendly. |
| CI/CD · IaC | **GitHub Actions (OIDC) + ECR · Terraform** | Keyless CI, reproducible infra, eval-gate in the pipeline. |
| DNS / certs | **Route 53 + ACM** | Health-check failover routing for DR; managed TLS. |

**Where each tier breaks, and the next move:** your scaling limits are almost never your own servers — they are **(1) the Postgres single writer, (2) the vector store, and (3) inference rate-limits/cost.** Fargate handles tens of thousands of concurrent connections (bump task count, then EKS for bin-packing). RDS single-writer is the first real wall (~100s of GB, thousands of TPS) → read replicas → **Aurora** → shard by `student_id`. pgvector is comfortable to ~5–50M vectors → **Qdrant** (Rust, filtered HNSW, horizontal). Redis → cluster mode when one shard isn't enough. Inference is provider-bound → multi-provider routing + semantic caching + self-host hot models at the crossover. **This architecture comfortably serves 0 → ~200K MAU; don't pre-build any of the beyond-200K machinery.**

**Cost optimization (COGS is inference + voice + vector, in that order):** semantic caching of tutor answers (20–40% inference cut on the heavily-repeated exam-season question distribution); aggressive routing (cheapest model that passes eval; premium models gated to paid + "explain deeply"); hard voice caps + cached TTS for static content + small model for voice by default; Fargate-Spot for batch workers; Savings Plans/Reserved for the steady RDS/Redis/Fargate baseline; S3 lifecycle to Glacier; **pre-scale around the 4 exam spikes, then scale down** rather than paying for peak year-round; and a **COGS-per-active-user dashboard with anomaly alerts** so a runaway voice user or a bad routing change is caught in hours, not on the monthly bill. **Target: COGS-per-paying-user measured under ~25–30% of ARPU before "78% gross margin" is ever written on a slide again.**

**High availability & graceful degradation (designed on purpose):** Multi-AZ for every stateful tier; stateless autoscaled compute across ≥2 AZs. The product must get **simpler under failure, never go dark** — if the premium model is down, route to the fallback; if STT is down, fall back to text; if the reranker is down, serve dense-only with a quality flag; if Bedrock throttles, fail over to OpenRouter. This matters most at 2 a.m. before an exam, precisely when users have no backup plan and your brand is made or broken. Load-shedding + queue-based backpressure so an exam-night surge degrades latency gracefully instead of cascading into an outage.

**Disaster recovery:** tier by criticality (Postgres + payments/consent ledger = RPO-minutes/RTO ≤ 1 hr; corpus/analytics = RPO-hours). Automated RDS snapshots + PITR + cross-region snapshot copy to `ap-south-2`; S3 cross-region replication for corpus; Redis treated as rebuildable cache. **Warm standby** (not pilot-light — too slow for exam season) with Route 53 health-check failover. **Quarterly DR game-days** — a backup you've never restored is a hope, not a plan.

**Security:** private subnets for compute + data, databases never public, VPC endpoints for S3/Bedrock/Secrets; least-privilege IAM, OIDC for CI (no long-lived keys), SCPs via Organizations, GuardDuty + Security Hub + Config + CloudTrail; KMS at rest, TLS 1.3 in transit, Secrets Manager rotation, Macie for stray PII; **Postgres RLS so an app bug can't cross students**; WAF tuned for exam-season scraping; SAST/DAST + dependency scanning in CI; prompt-injection defenses and strict tool-permission scoping so a jailbroken prompt can't reach a write tool.

---

# SECTION H — Memory Architecture

**Memory is the moat, so it gets a real design — not "we put it in ChromaDB."** The governing idea, agreed by both plans and hardened here: **~80% of memory is structured rows you JOIN** (cheap, queryable, auditable, decayable); a little is semantic vectors; **none of it is an unbounded context dump**, and **none of it is a per-student vector database.** Memory is written by deterministic extractors off the request path, retrieved as bounded token-capped summaries, decayed on schedules, and **visible to the student** ("here's what AlmondAI thinks you're weak on") — which is both better pedagogy and DPDP transparency.

**The nine memory types (the granular model from Plan 2, with Plan 1's principles), and where each lives:**

| Memory type | What it holds | Store | Retrieval | Update | Decay |
|---|---|---|---|---|---|
| **Session (short-term)** | Current conversation turns | Redis (TTL hours) | Full, in-context | Per turn | TTL expiry |
| **User profile** | College, year, exam date(s), language, consent, tier, goals | Postgres | Always injected (small) | Onboarding + events | Explicit edits only |
| **Academic** | Curriculum position, coverage %, topics completed, plan adherence | Postgres + curriculum graph | By active topic/plan | After each session/MCQ | Versioned, not decayed |
| **Learning / mastery** | Per-concept mastery, attempts, time-to-mastery, response to explanation style | Postgres (mastery model) + Redis (due-queue) | By topic for planning/Crisis | After every quiz/answer | **FSRS forgetting curve** |
| **Weak-topic** | Error patterns, recurring confusions, misconception graph ("mixes X and Y") | Postgres (counts/links) + pgvector (fuzzy recall) | Top-k injected into Tutor/Planner | On wrong answers/abandons | Decays as mastery improves |
| **Behavioral** | Study cadence, session timing, pace, drop-off triggers, panic signals | Postgres (aggregates) | Aggregates for Planner/Crisis | Streaming events | Rolling windows · **DPDP-gated for under-18s; no covert profiling** |
| **Episodic / semantic** | Notable interactions, prefs, "explain like X," free-text reflections | **One shared pgvector collection, `student_id`-filtered** | ANN top-k, budget-limited | On salient events (LLM-summarized) | Importance-weighted decay |
| **Exam** | Past attempts, mock scores, readiness history, what was crammed/sacrificed + outcome | Postgres + flywheel mart | For recalibration + Crisis | After each exam cycle | **Retained — it's the moat** |
| **Clinical-training** | Cases done, reasoning errors, OSCE/viva scores, skill gaps | Postgres (per-rubric) + pgvector (reasoning notes) | By clinical skill for next case | After each case | Skill-gap decays as improved |

**Storage strategy — three tiers by access pattern:** *working* (Redis, ephemeral, summarized on session close) → *structured long-term* (Postgres: profile, mastery, errors, exam history — the bulk) → *semantic long-term* (the single shared, filtered vector collection: free-text reflections only). Raw interactions are append-only logs (S3/Postgres partitions); **memory is *derived* aggregates recomputed by jobs**, so you can rebuild memory from logs if the model changes. The crown jewel is the **misconception graph** — edges between concepts ("confuses pre-load with after-load") — because it aggregates across students into the flywheel.

**Retrieval = budgeted relevance.** A deterministic assembler injects only the relevant slice within a token cap: tutoring a cardio question pulls cardio mastery + cardio confusions + style preference, nothing else. Task-scoped — Crisis pulls exam memory + weak topics; Clinical pulls clinical-training memory; the Planner pulls academic + learning memory. Two-stage: free SQL lookup first; semantic recall only when the task needs fuzzy "what is this student confused about." **Most requests never touch the vector store.**

**Update = write-behind, deterministic.** A session-close worker parses the transcript + MCQ results and updates mastery with a **proper update rule (Bayesian/Elo-style per concept, not an LLM "I think they're weak")**, increments error counts, and appends reasoning notes (LLM allowed for the *semantic* notes only). All writes go through the memory tool, which enforces schema + `student_id`. Event-sourced, so memory is reconstructable, auditable, and erasable on a DPDP request.

**Decay = a feature, not cleanup.** FSRS forgetting curves drive the mastery decay *and* the due-queue ("you've probably forgotten Krebs cycle — want a 5-min refresh?" is a retention hook powered by the decay model). Recency-weighted error patterns let old confusions fade; nightly consolidation jobs merge duplicate confusions and summarize, keeping the per-student footprint small (cheap Spot workers, off-peak).

**The single critical fix vs. the current design:** "a vector store per student in ChromaDB" → **one pgvector/Qdrant collection filtered by `student_id` + structured memory in Postgres.** This one change removes the biggest scaling and cost landmine in the entire stack. Per student, this memory makes the product feel like it *knows them*; across students, the aggregated misconception-and-outcome graph is a dataset no competitor has and every new student deepens — which is the flywheel (Section M), living in structured memory you now design correctly instead of in disposable per-user vector blobs.

---

# SECTION I — Agent Architecture

**The most expensive mistake AI startups make in 2026 is agent-washing** — wrapping deterministic logic in an LLM loop because "agentic" sounds fundable. Agents are slow, costly, non-deterministic, and hard to test. The decision rule, applied to every feature:

- **Deterministic code** if the logic is enumerable and correctness matters (scoring, scheduling math, high-yield extraction, spaced repetition, quotas, payments). *Most of AlmondAI lives here.*
- **Tool (LLM decides when/with-what-args; behavior is code)** if you need an LLM to invoke a reliable action (retrieve, grade a case sheet against a rubric, mutate a plan, read/write memory). Expose via **MCP** so tools are reusable across modules and the future faculty/partner platform.
- **Workflow (fixed sequence of LLM + tool steps)** if the steps are known but include LLM reasoning (RAG answer → verify → personalize). Orchestrate as an explicit **LangGraph** graph.
- **Agent (LLM chooses its own steps in a loop)** only if the path is irreducibly open-ended (a Socratic tutoring turn, a viva examiner probing based on answers, a clinical patient role-play).
- **Deep Agents** only for the rare deeply-open-ended planning task, sparingly — the autonomous harness burns ~20× the tokens of a tight LangGraph flow, so it must earn its cost.

**The capability classification (the merged decision matrix — this is doctrine):**

| Capability | Right pattern | Why |
|---|---|---|
| MCQ scoring, spaced-rep scheduling | **Deterministic code** | Pure logic; exact, instant, free. Never an LLM. |
| High-yield extraction, sacrifice engine | **Deterministic** over the curriculum graph | A query + optimization, not a guess. Explainable + testable. |
| Readiness prediction | **Deterministic/ML model** (calibrated) | A statistical model on MCQ history; LLM only narrates. |
| Study-plan generation / re-plan (core) | **Solver core + thin LLM edges** | Constraint optimization; LLM parses input + explains output. |
| Query routing / model selection | **Deterministic workflow** (rules + light classifier) | Must be reproducible + auditable. Not a moat, not an agent. |
| Retrieval / rerank, MCQ-gen, mnemonic-gen | **Tools** (clear I/O, single calls) | Stateless transforms. |
| RAG tutor answer | **Workflow (LangGraph)**: retrieve → rerank → generate → **verify** | Fixed steps incl. LLM reasoning; needs the groundedness gate. |
| Tutoring dialogue (Socratic) | **Agent (bounded)** | Turn-by-turn path genuinely open; bound with tools + guardrails. |
| Replanning | **LangGraph agent** | Genuinely stateful, conditional, loops over constraints + student state. |
| Clinical patient role-play | **Agent over a fixed case object** | Open dialogue, but state is fixed code — LLM is the surface, not the truth. |
| Viva examiner | **Agent (bounded)** | Probes adaptively; rubric-bounded. |
| Case-sheet grading | **Tool (rubric-scored), in a workflow** | Maps to a rubric; calibrate vs. faculty. Never free-form. |
| Multi-source synthesis ("build me a note across subjects") | **Deep Agents (sparingly, Year-2)** | The one place autonomy earns its keep. |
| Corpus ingestion | **Deterministic workflow (DAG)** | Reliability > cleverness. |

**Topology:** **one LangGraph supervisor per module** (Tutor, Planner-explainer, Crisis, Clinical) — not a global multi-agent free-for-all, which is more expensive and prone to the "agents arguing with each other" failure mode. **MCP is the tool bus**: every deterministic capability is an MCP tool with a typed contract (reuse across modules, clean mocked testing, and a ready integration surface for the Stage-5 faculty/partner ecosystem). **Memory is a tool, not ambient magic** — agents *call* it for a bounded summary and *call* it to write structured updates; never an unbounded dump (cost) or a place agents write freely (corruption). **Determinism guardrail:** any agent action with real consequences (charge a card, change a plan, record a grade) goes through a deterministic tool that validates and is independently testable. **Agents propose; code disposes.**

**What this buys you, and the sentence for diligence:** lower cost (most calls are code, not tokens), testability (deterministic cores have unit tests; workflows have eval gates; only the truly-open agents are fuzzy), reliability (failures localize and degrade gracefully), and the line worth more than "everything is agentic": *"we use agents exactly where the problem is open-ended, and deterministic systems everywhere else — which is why our margins and latency hold."*

---

# SECTION J — Knowledge Base Architecture

The knowledge base is two distinct assets that the current design dangerously conflates: a **shared curriculum corpus** (textbook chunks, identical for all users, read-heavy) and the **per-student weakness graph** (tiny, write-heavy, isolated — covered in Section H). This section is the corpus: the exam-weighted medical content that grounds every answer and powers high-yield extraction.

**The corpus is not the moat — but it is the floor.** A motivated competitor reproduces a curated MBBS corpus in a quarter; bragging about "15,615 chunks" advertises the replaceable part. What makes *this* corpus valuable is the **metadata and exam-weighting layered on it**, and the **coverage telemetry** that turns it into a living asset. Today's ~15,615 chunks (≈6–10 textbooks) under-cover a 19-subject curriculum; coverage gaps produce wrong/empty answers, which produce churn. The discipline is **depth on 2–3 high-yield subjects first** (Anatomy, Physiology, Pharmacology), expanded by data, not breadth-by-default.

**Ingestion pipeline (a deterministic DAG, reliability over cleverness):**

1. **Layout-aware parse** — PDF/textbook → structure-aware extraction; tables, figures, captions, and plates *matter* in anatomy/physio/path and must survive parsing.
2. **Semantic + structural chunking** — chunk on concept and chapter/figure boundaries (256–512 tokens with overlap), **not** fixed 512-token windows that split a mechanism in half.
3. **Metadata enrichment (the value layer)** — every chunk tagged with `source`, `edition`, `subject`, `topic_id`, `page`, `figure_ref`, **`exam_weight`**, **`pyq_frequency`**, `is_high_yield`. This is what lets retrieval and generation bias toward "what's high-yield for *your* prof exam."
4. **Dual index** — dense (Qwen3-Embedding) + sparse (BM25/OpenSearch or PG FTS) into the shared store.
5. **Provenance + versioning** — content versioned so a corrected edition or a faculty overlay is auditable; faculty-verified answer overlays sit above the raw text for enterprise/per-college packs.

**The exam-weighted curriculum graph is the connective tissue.** The corpus chunks are *linked to* the curriculum graph (Section D/F): each concept node knows its exam weight, PYQ frequency, prerequisite dependencies, and which chunks explain it. This is what makes high-yield extraction a **deterministic query** ("the 40 topics that historically cover 80% of marks for your prof exam") rather than an LLM guess — and it is the single asset that powers planning, Crisis triage, the weakness map, and analytics simultaneously.

**Coverage telemetry closes the loop on the corpus itself:** track every query that retrieves nothing relevant → that ranked list *is* the corpus-expansion backlog and a free product-gap signal. Combined with the flywheel's "high confusion + low resolution" signal (Section M), the corpus auto-prioritizes toward where students actually struggle and where the corpus is actually weak — so content investment follows evidence, not guesswork.

**Per-college and per-university intelligence is the corpus's defensible extension.** Realized PYQ frequency and examiner-trap patterns by institution are hyper-local knowledge generic AI cannot have; they ride on top of the curriculum graph as institution-scoped weights. This is moat #6 in the ranking and a direct B2B2C asset.

---

# SECTION K — RAG Architecture

This is the pipeline that has to be **correct**, not just clever — the difference between a "RAG demo" and a "medical product." The merged pipeline, with the verification step both prototypes lack:

```
Query
 ├─► Query understanding: classify intent (definition / mechanism / compare / clinical / MCQ-explain),
 │     expand abbreviations (MI → myocardial infarction), detect subject/topic
 ├─► Retrieve: HYBRID (BM25 + dense) top-k≈40, filtered by subject / exam_weight
 ├─► Rerank: BGE-reranker-v2-m3 cross-encoder → top-5–8
 ├─► Compose: dedupe, citation-tag, inject BOUNDED student memory + plan state + category-aware prompt
 ├─► Generate: routed model, grounded prompt, MANDATORY inline citations to page/figure
 ├─► GROUND-CHECK (the missing layer): NLI/faithfulness — does every claim trace to a retrieved chunk?
 │     flag/repair unsupported claims BEFORE display; if retrieval confidence < threshold → "I don't know" + escalate
 └─► Stream + log: query, retrieved set, answer, citations, faithfulness score, (later) student reaction
```

**The non-negotiables the current stack lacks, in priority order:**

1. **Hybrid search + reranker.** Medical retrieval dies on exact terms (drug names, eponyms, classifications, MI=myocardial infarction) that dense vectors blur, and on "right passage in the top-50 but not the top-5." BM25 + dense + a cross-encoder reranker over the top-50 is the single biggest accuracy lever the product is missing. Without it, MiniLM silently produces wrong-but-confident citations.
2. **Groundedness / faithfulness gate before display.** A lightweight NLI model or a cheap LLM-judge verifies every claim maps to retrieved context; unsupported claims are flagged or repaired before the student ever sees them. For medical content an ungrounded sentence is a liability, not a quality nit.
3. **The calibrated "I don't know" path.** If retrieval confidence is below threshold, say so and offer escalation. **Confidently wrong is the worst failure mode in med ed** — and it is most damaging at 2 a.m. before an exam, exactly when the product is most present.
4. **Citations that are real.** Every claim links to the exact page/figure, click-through verifiable. This is a genuine trust moat vs. ChatGPT — and "every answer cites a page" is *citation theater* (worse than no citation, because it manufactures false trust) unless the groundedness gate guarantees the citation actually supports the claim.
5. **Exam-weighting as a first-class ranking signal.** Retrieval and generation are biased by `exam_weight`/`pyq_frequency`, so "what's high-yield for the prof exam" is built into ranking, not bolted on. This is the differentiator a generic RAG pipeline cannot replicate without the curriculum graph.
6. **Coverage capture.** Log every zero-relevant-retrieval query as a corpus-gap signal (Section J).
7. **Semantic answer cache in front of generation.** Thousands of students ask "explain the brachial plexus"; cache by embedding-similarity of query + retrieved set and serve near-duplicates from cache — a 20–40% COGS cut and a latency win.

**Multimodal retrieval is not optional for medicine.** Anatomy/radiology/histology need images: retrieve and show the Netter plate, the histology slide, the X-ray, the ECG — not just text. This rides on the layout-aware ingestion (Section J) and is a Tutor differentiator (and a Clinical Mode requirement).

**Why this is the make-or-break subsystem:** every downstream claim about correctness, every KPI about groundedness, and the entire trust proposition against free generic AI bottoms out here. The RAG pipeline and the evaluation harness (Section L) are the two systems that must be excellent before anything else ships. They are listed first in the build order for that reason.

---

# SECTION L — Evaluation Architecture

**This is the most important section in the entire plan, and the subsystem the current product has none of. No evals = no medical product.** It is listed first in the build order not because it is glamorous but because it is simultaneously the safety system, the velocity system (you can ship fast *because* a gate catches regressions), and the foundation of the data moat (the SME labels become eval data, fine-tuning data, and a defensibility asset). Both prior plans independently rank this #1; this plan makes it doctrine.

**Golden sets.** Curated Q→(correct answer, must-cite sources) per subject, expert-verified. Start with ~500 questions across high-yield topics; grow to thousands via the flywheel. Recruit a few MBBS toppers / junior doctors as part-time graders (stipend) in week one — **their labels become your eval set, your fine-tuning data, and your moat simultaneously.**

**Automated metrics, run in CI on every prompt / model / retriever change:** retrieval recall@k, rerank precision@k, **groundedness/faithfulness** (the medical-safety metric), answer correctness (LLM-as-judge + SME spot-check), citation validity, refusal calibration (false "I don't know" vs. hallucination rate), latency p50/p95, and cost-per-answer.

**The CI eval gate is what makes this an AI *company* rather than a startup that ships vibes.** No prompt or model swap ships if groundedness or correctness drops below threshold. This prevents the classic "we changed the prompt and quietly got worse" death spiral — the single most common way medical-adjacent AI products silently become dangerous.

**Clinical-mode eval is its own track, with a higher bar.** Does the AI patient stay in character (persona-fidelity / character-break rate)? Does the AI grader agree with a *real* examiner — measured as inter-rater agreement vs. faculty? **Unvalidated grading is worse than no grading**, because it teaches wrong medicine with false authority. The grader must be calibrated against faculty and the agreement number must clear an agreed threshold *before* the grade is shown to a student. This is the trust gate for the entire Clinical moat.

**Crisis-mode eval has a wellbeing track.** Readiness-prediction calibration is measured as a **Brier/ECE score** (predicted vs. actual pass) — you ship banded, humble estimates until the outcome data earns precision, and you *never* ship a false-precision score. And **distress-detection → support-routing accuracy** is a first-class safety SLO: the percentage of genuine-distress sessions correctly routed to support (never upsold) is monitored like an outage metric.

**Online eval and the feedback loop.** Thumbs, "was this right?", and implicit signals (re-ask, abandon, edit) pipe to the same store; **faculty review queues** feed corrections back into the golden sets. Tooling: **Langfuse** (open-source, self-hostable, India-residency-friendly) for traces + datasets + scoring; **Ragas/DeepEval** for metrics. Pick Langfuse in week one.

**The three dashboards that must exist** (and the third is not optional for a product serving stressed minors): an **exec scorecard** (North Star + ARR + conversion + retention + groundedness), an **AI-quality board** (groundedness, latency, COGS-per-answer, eval-gate pass rate, hallucination-escape rate per 1k answers as an *alert metric*), and a **wellbeing/safety board** (distress-routing accuracy, grader-vs-faculty agreement, character-break rate). The third board is how the company stays on the right side of both ethics and DPDP.

**North Star:** *exam outcomes improved per paying student.* Every other metric is a leading indicator of that. The evaluation architecture is what makes that North Star measurable instead of aspirational — and it is revisited every planning cycle as the heartbeat of the company.

---

# SECTION M — Data Flywheel

The deck *claims* a flywheel ("every session creates anonymized signal"). **Claiming a flywheel and *engineering* one are different things.** A flywheel only spins if the loop is **closed** — if real outcomes feed back and measurably improve the product. The current design captures interactions but never captures the exam result, which makes it an open loop that *accumulates* rather than *accelerates*.

**The closed loop (the closing step is the one everyone skips):**

```
   Students study, ask, attempt MCQs, do clinical cases, hit crisis
                              │
   (1) CAPTURE   ── every interaction → structured events + weakness signals
                              │
   (2) AGGREGATE ── cross-cohort misconception graph + per-college exam patterns
                              │
   (3) PREDICT   ── readiness, weak topics, "what's coming on the exam"
                              │
   (4) ACT       ── sharper triage, better plans, better cases, truer high-yield
                              │
   (5) OUTCOME   ── did they pass? which predictions were right?  ◄── THE CLOSING STEP
                              │
                              └────────► feeds back into (2)/(3); the wheel accelerates
```

**Step (5) is the entire game.** Capturing the real exam outcome and scoring your own predictions against it is the only thing that makes the wheel accelerate instead of merely fill up. **Build outcome capture (post-exam "what happened?" + opt-in result sharing) from day one, even at N=50.** It is cheap, and it is the difference between a flywheel and a slide.

**What data is collected, and why it is proprietary (none of it scrapeable or buyable):** question-level confusion (a live map of how Indian MBBS students misunderstand each concept); misconception pairs (the specific X-vs-Y confusions, aggregated into a cross-cohort graph); MCQ/attempt telemetry (which distractors fool which students on which topics); **clinical-reasoning traces** (where reasoning breaks — anchoring, missed red flags — across thousands of cases; *no one else has this*); crisis behavior (what students cram and sacrifice under time pressure, and the result); per-college exam patterns (realized PYQ frequency and examiner traps by institution); and **outcome data** (pass/fail, scores, rank — the ground truth that validates everything). It is generated only by *being the place students learn and panic and train.*

**What insights it generates:** predictive (per-student readiness and weak-topic forecasts; per-cohort "topics most likely examined this cycle"); pedagogical (which explanation styles actually fix which misconceptions, A/B'd against later mastery); content (where the corpus is weak — high confusion + low resolution → author better content/cases there); curricular (an institution-level view of where a college's students systematically struggle — a B2B product in itself); and clinical (the most common reasoning errors by specialty — gold for designing cases *and* a publishable research asset that builds brand).

**How the product improves itself — mostly deterministic/ML self-improvement on proprietary data, not "the LLM gets smarter":** retrieval and high-yield ranking re-weight toward what *actually* confuses students and *actually* gets examined; the case library grows toward the reasoning errors students most commonly make; predictions recalibrate against real outcomes every exam cycle (measurably better every season); personalization deepens as the weakness graph deepens. **The gains come from *your* data, not the model vendor's** — which is the whole point.

**Why competitors fall progressively behind:** a new entrant starts at zero misconception/outcome data and is seasons behind, pulling further back each cycle; your predictions and high-yield lists become *visibly more right* than a generic tool's — the one thing students notice and tell their friends; two-sided lock-in compounds (students' weakness graph + history + plan live here; faculty's authored cases + cohort analytics live here); and the clinical-reasoning lead is the hardest data to acquire and most valuable for NExT Paper II.

**The honest caveat (so this is never over-sold to a seed investor):** flywheels need *volume* to spin. At 500 users this is a slide, not a moat. The strategy is therefore: **instrument the closed loop now (cheap), treat the flywheel as a Stage-3 asset you've pre-wired in Stage 1**, and protect + measure it from day one — it is the only durable long-term defensibility the company has.

# SECTION N — Crisis Mode

**The crown jewel of monetization, reframed from "war room" to "triage room."** When a student is 48 hours out with 60% unfinished, the job is calm, ruthless, *explainable* prioritization — not manufactured urgency. The architecture (from the module redesign): high-yield extraction and the sacrifice engine are **deterministic queries over the exam-weighted curriculum graph, not LLM guesses**; readiness prediction is a **calibrated statistical model on the student's own MCQ data**, shipped banded and humble; and a **hard wellbeing guardrail** detects genuine distress and routes to a human, never to a paywall. Crisis Mode must be the *most reliable* part of the product and is currently the least built.

**Why it is the spearhead:** highest willingness-to-pay moment in the student's year, recurring four times annually, owned by no incumbent, and the richest source of proprietary behavioral + outcome data. Done ethically, it is simultaneously the conversion engine and the most defensible behavioral dataset the company has.

**The complete feature repository (merged superset of both plans — every distinct idea preserved, organized by job-to-be-done):**

**A. Ruthless triage & prioritization (the core)**
1. Expected-marks optimizer — given hours-left + per-topic mastery + this college's mark distribution, compute the marks-maximizing study allocation, shown as a ranked plan.
2. Sacrifice engine — explicit "master / skim / abandon" buckets with the marks-math for *why* each is sacrificed ("0.8% expected marks, safe to drop").
3. 80/20 high-yield extractor — the deterministic "these 40 topics historically cover 80% of marks," per subject, per university.
4. Time-to-marks optimizer — ranks topics by marks-per-hour-remaining.
5. PYQ-frequency heatmap — every topic colored by how often it's actually examined at *your* college.
6. "What's definitely coming" predictor — high-PYQ-recurrence topics flagged as near-certain.
7. Examiner-trap radar — the specific confusions/distractors your university's examiners love.
8. Cross-subject leverage finder — topics that pay off in multiple subjects (CVS physiology + pharma).
9. Dependency-aware ordering — prerequisites first so cramming doesn't collapse on missing basics.
10. Diminishing-returns cutoff — when to stop on a "good enough" topic and move on.
11. Subject-triage dashboard — one screen: which subjects are safe, at-risk, lost causes.
12. Risk dashboard — probability of each subject being the one you fail.
13. "Bare minimum to pass" vs "max achievable score" path toggle.
14. Realistic syllabus truth — "you cannot finish this; here's the honest plan" (anti-toxic-positivity).

**B. High-yield content compression**
15. One-pager per subject — auto-generated, exam-weighted.
16. High-yield extraction — top 20 facts per topic, examiner-phrased.
17. Last-night flashcard deck — auto-built from your weak topics.
18. Mnemonic generator — instant, personalized mnemonics for lists you keep forgetting.
19. Diagram cheat-sheet — the 10 diagrams worth drawing for marks.
20. Value-added points — what to add to push an answer from pass to distinction.
21. Spotters/identification rapid-fire (anatomy/path specimens).
22. Formula & normal-values rapid-recall sheet (biochem/physio).
23. Differential one-liners — quick DDx per presentation.

**C. Time-boxed last-night, exam-eve & exam-day tactical**
24. Last-night mode — offline-cached, one-screen-per-topic ultra-condensed recall packs.
25. 48/24/12/6/2-hour modes — completely different plan layouts per time-left, recomputed as you check off topics.
26. "You have N hours" instant re-triage.
27. Micro-revision cards — 30-second recall hits for max topics-per-minute.
28. Exam-morning mode — the 90-minute pre-exam pack: highest-yield, highest-anxiety items only.
29. Offline pack export — PDF/printable cram sheet for zero-connectivity exam centers.
30. Answer-structuring templates — how to lay out a 10-mark answer for max marks.
31. Exam-hall time-management plan (minutes per question).
32. "If you blank out" recovery scripts per question type.
33. Viva quick-prep — the 20 questions most likely in your viva.
34. Handwriting/presentation tips that win marks (India-specific).
35. Logistics checklist — hall ticket, ID, reporting time, center route (removes day-of cognitive load).

**D. Learning-science recall engine**
36. Active-recall blitz — rapid self-test instead of re-reading (the single most effective cram technique).
37. Spaced cram scheduler — spaces re-exposure even within 48 hours.
38. Confusion-pair drills — targeted on the exact X-vs-Y pairs you mix up.
39. Rapid MCQ gauntlet — high-yield MCQs with instant "why," weighted to weak topics.
40. Error-replay / last-pass error log — every final-drill mistake resurfaced 30 min later automatically.
41. "Teach it back" / blurting mode — explain by voice; AI catches the gap (generation effect).
42. Predict-the-question — AI shows a likely Q, you attempt, it grades.
43. Interleaving mode — mixes topics to build exam-like retrieval.
44. Diagram-to-recall — label-stripped diagrams for active recall.
45. Confidence-calibrated testing — flags topics you *think* you know but don't.

**E. Psychology & emotional regulation (with wellbeing guardrails)**
46. Panic-to-plan converter — one tap turns "I'm going to fail" into a concrete achievable next 60 minutes.
47. Realistic reassurance — calibrated, honest "here's what you can still pass," backed by the readiness math (never empty hype or doom).
48. Catastrophe reframing — CBT-style reframes of all-or-nothing exam thoughts.
49. 2-minute reset — guided breathing/grounding when stress is detected, *then* back to the plan.
50. **Distress detection + human routing (hard requirement)** — genuine panic/self-harm signals trigger grounding + a prompt to reach a person/helpline; **never an upsell.**
51. Self-talk monitor — gently interrupts spiraling negative self-talk; never reinforces it.
52. "Win streak" momentum — surfaces what you *have* mastered to rebuild self-efficacy.
53. Sleep-vs-study advisor — learning-science "stop and sleep" call when more cramming *costs* marks.
54. Permission-to-sacrifice — explicit psychological permission to abandon lost topics (kills guilt-paralysis).
55. Tomorrow-you note — a short, kind message framing this exam in the arc of a long career.
56. Anti-doomscroll / focus lock — distraction-free single-task mode for the final hours.

**F. Prediction, feedback & calibration**
57. Calibrated readiness estimate — humble, banded ("likely pass; Pharmac is the risk"), backed by the student's own MCQ data; never false precision.
58. Confidence-vs-competence map — flags the dangerous quadrant (thinks they know, fails on it).
59. Pass-probability tracker — updates live as you study, so effort feels like progress.
60. Weakest-link spotlight — the one topic whose improvement most raises expected marks right now.
61. Mark-gap closer — "you're ~8 marks short of safe; here's the fastest 8 marks."
62. "What an examiner would ask you next" — predicts viva/follow-up questions on weak areas.

**G. Accountability, social & logistics**
63. Crisis study-buddy match — pair students in the same crunch (opt-in).
64. Silent co-study rooms — virtual presence/timer rooms for the "everyone's grinding" effect.
65. Commitment timer — public-to-yourself pledges ("3 topics before midnight") with gentle follow-up.
66. Senior's playbook — anonymized "how students who passed this exam triaged it last cycle."
67. Group crisis mode — sync a panic-study session with hostel friends, shared high-yield deck.
68. Smart notifications — exam-cycle-aware nudges that respect DPDP (no manipulative urgency for minors).
69. "What top scorers did at this hour" — social proof + tactic.

**H. Premium-tier differentiators (the paywall justifiers)**
70. Personal crisis dossier — a single shareable "state of my prep" report actionable in 5 minutes.
71. 1-tap regenerate — re-run the whole triage instantly as circumstances change (priority routing for paid).
72. Premium model depth — paid users get the strongest reasoning model for "explain this fast and right."
73. Multi-exam crisis — optimizes across back-to-back exams at once (common in MBBS).
74. Predicted question paper — a full mock generated from PYQ patterns + this year's likely focus.
75. Human-doctor SOS — a 10-min call with a topper/junior doctor (marketplace, high-margin).
76. "Guarantee"/outcome tracking — show students Crisis actually moved their result.
77. **Outcome loop** — after results, asks what happened and feeds it back to improve next cycle's predictions (the flywheel, and a reason to come back).

**Monetization design (the ethical, DPDP-safe model):** the free tier is **genuinely useful but un-personalized** (generic high-yield lists); **personalized triage, prediction, priority, voice, and the premium model are paid.** You charge for *your data and your math applied to them* — not for access to their own panic. Crisis converts because it sells the most valuable goods a panicking student can buy: **certainty and calm under time pressure.** The hard line: relieve panic, never manufacture it.

---

# SECTION O — Clinical Mode

**The highest-moat module and the NExT Paper-II wedge — the one product in the category with no serious competitor if Paper II ships, and defensible on pedagogy alone even if it slips.** It is also the hardest to get right and easiest to get *dangerously* wrong, which is why it is sequenced after Crisis proves conversion — while its slowest input, the clinician-authored case library, is begun in month one.

**The architecture that makes it safe to scale (non-negotiable):** each virtual patient is a **clinician-authored, validated case object** — demographics, true diagnosis, history, exam findings, labs, vitals, hidden complications, expected red flags — that is **immutable ground truth.** The LLM *role-plays* that fixed state: it reveals findings only when the student asks the right question, maintains affect and persona, and **cannot invent facts outside the case object.** Grading is **rubric-based** against the case object (did they ask about red flags? reach the right differential? order appropriate investigations?), with the grader **calibrated against real faculty (inter-rater agreement measured) before it is trusted.** The validated-case-object design is precisely what lets you scale clinical realism *without* scaling clinical risk — the AI can only role-play medicine a clinician already approved. Every surface is explicitly **educational simulation, not clinical advice**, enforced in product (refuse/redirect on real-patient or self-treatment queries).

**The complete feature repository (merged superset of both plans — every distinct idea preserved):**

**A. Virtual patients & history-taking**
1. Validated case library — clinician-authored cases as immutable ground truth.
2. Progressive disclosure — findings revealed only on the right question (real history-taking, not a data dump).
3. Stateful AI patient — hidden findings, consistent state across the multi-turn interview.
4. Patient affect & persona — anxious, evasive, talkative, in-pain, non-compliant personalities that change interview difficulty.
5. Voice-based history-taking — interview by voice; pauses, hesitation, empathy scored.
6. Vernacular patients — Hindi/regional-language patients (real Indian wards aren't textbook English) — a uniquely Indian moat.
7. Unreliable narrator — patients who minimize symptoms, hide alcohol use, misattribute timelines, forcing corroboration.
8. Collateral history — interview a relative/bystander when the patient can't speak (pediatric, unconscious, psych).
9. Difficulty tiers — textbook → atypical → comorbid/confounded, unlocking as competence grows.
10. Demographic & epidemiological realism — age/sex/region-appropriate disease priors (TB, dengue, rheumatic heart disease, enteric fever).
11. Multi-modal patients — show an X-ray/ECG/clinical photo as part of the case.
12. Time-pressured triage patients (ER scenarios).
13. Pediatric / obstetric / geriatric modes with mode-specific cues.
14. Deteriorating patient — condition worsens if you delay correct action.
15. Case-of-the-day — a daily fresh case for streak-based engagement between exams.

**B. Clinical reasoning**
16. Differential-diagnosis builder — propose and rank differentials; AI probes the reasoning behind the ranking.
17. Bayesian reasoning coach — shows how each finding *should* shift each differential's probability; pre/post-test probability, likelihood ratios.
18. Reasoning-trace grading — graded on *how* you reasoned, not just the answer.
19. Hypothesis-driven inquiry scoring — rewards targeted questions, penalizes scattershot history.
20. Investigation justification — justify each test; "shotgun" ordering flagged and costed (cost/yield awareness).
21. Illness-script feedback — compares your mental disease model to the expert illness script.
22. Premature-closure detector — flags anchoring/confirmation bias (the #1 reasoning error).
23. Red-flag radar — explicitly scores whether you elicited and acted on can't-miss findings.
24. Reasoning replay — step-by-step replay of where your reasoning diverged from the expert path.
25. "What would change your mind?" — forces articulation of disconfirming evidence (anti-anchoring).
26. Cognitive-bias report — names the biases you exhibited across cases.
27. Diagnostic timeout — forces structured reflection before committing.
28. Complication anticipation — predict and pre-empt likely complications.

**C. Case sheet & documentation**
29. 19-section case-sheet builder — section-by-section rubric grading.
30. SOAP-note training + instant feedback.
31. Real-time documentation coaching — flags missing history elements as you type.
32. Handover (SBAR) practice with grading.
33. Prescription-writing practice with dosing/interaction checks.

**D. OSCE & skills**
34. Station-based OSCE circuit — timed, scored, multi-station, mirroring the real format.
35. Examiner checklist scoring — graded against the actual OSCE checklist + a holistic global rating.
36. Spotters/image stations — radiographs, ECGs, slides, instruments, specimens, timed.
37. Procedure-step simulation — narrate/sequence catheterization, suturing, ABG; scored on steps + sterility.
38. Data-interpretation stations — ECG, ABG, CBC, LFT, imaging, structured grading.
39. Examination-technique stations — sequence/steps of clinical exams.
40. Communication stations — breaking bad news, consent, counseling.
41. OSCE mock-circuit mode — full exam simulation with cumulative scoring + a per-station report card mapped to your weakness graph.

**E. Viva**
42. AI viva examiner — adaptive oral exam that probes deeper exactly where you're weak.
43. Examiner archetypes — kind / strict / rapid-fire / "grill" personalities students actually face.
44. Follow-up laddering — "and then? why? what if the patient also had X?" until your limit, then teaches.
45. Grace-under-pressure scoring — measures composure and honest "I don't know" vs. bluffing.
46. Spot-correction — instant correction of a wrong viva answer with the right reasoning.
47. Cross-subject viva — integrates anatomy↔pathology↔medicine the way real vivas do.
48. Voice viva — fully spoken, like the real thing.

**F. Ward rounds & emergency**
49. Virtual ward rounds — manage several patients, prioritize the sick ones first.
50. Consultant-on-rounds persona — asks "what's your plan?" at each bed.
51. Prioritization under load — triage which of 6 ward patients to see first and justify it.
52. Daily-progress notes — SOAP notes on ward patients, graded for clinical accuracy.
53. Code/ACLS simulation — time-critical resuscitation with branching outcomes.
54. Triage simulator — mass-casualty/ER under time + resource limits.
55. Golden-hour timer — interventions scored on *timeliness* (sepsis, stroke, MI, trauma).
56. Deterioration recognition — catch the subtle pre-arrest patient early (ABCDE drills).
57. Resource-constrained emergencies — Indian-reality scenarios (no ICU bed, limited drugs) testing judgment.
58. Branching consequences — wrong early decisions change the patient's trajectory (cause→effect teaching).
59. Drug-emergency scenarios — anaphylaxis, status epilepticus dosing under pressure.

**G. Diagnostic reasoning (deep) & management**
60. Full work-up loop — history → exam → investigations → diagnosis → management → reassessment, scored end-to-end.
61. Management-plan grading vs. standard guidelines.
62. Cost-aware diagnosis — choose investigations wisely for a patient who can't afford everything (Indian reality + good medicine).

**H. Communication & professionalism**
63. Breaking-bad-news simulator — SPIKES protocol with an emotionally reacting patient/family, empathy scored.
64. Informed-consent practice — explain a procedure, risks, alternatives; scored on clarity + completeness.
65. Difficult-conversation gym — angry relatives, non-adherent patients, cultural/language barriers.
66. Empathy & rapport scoring — empathic statements, jargon avoidance, patient-centeredness.
67. Inter-professional comms — talking to nursing/seniors.
68. Ethics scenario simulator — confidentiality, capacity, end-of-life.

**I. Platform features that make it a moat**
69. Skill-gap memory — tracks clinical weaknesses, serves targeted cases.
70. Faculty case-authoring studio + review dashboards — clinicians author/validate cases and review cohorts; colleges adopt AlmondAI as **assessment infrastructure** (network effect + B2B2C wedge + the data moat).
71. Performance analytics — clinical-reasoning growth curve over the year.
72. Outcome correlation — clinical-mode performance vs. actual practical/viva marks (the validation moat).
73. Faculty-authored case marketplace + college-specific case banks (rev-share).

**The moat math:** a validated, clinician-authored case + rubric bank is enormous to build, faculty-validated, and impossible to fake; it has strong two-sided network effects (faculty author, students generate reasoning data), and it is aligned to the future licensing exam. Start it now — moats that take two years to build must be begun in month one.

---

# SECTION P — Monetization Strategy

**The deck's economics are directionally sane (freemium + crisis conversion) but internally inconsistent and must be re-modeled before any investor sees them.** Three problems to fix first: (1) the **ARPU contradiction** (₹1,800/yr on slide 8 vs ₹3,300/yr in the SOM math — a 1.8× discrepancy in your own deck destroys credibility; **pick one, model per-module**); (2) the **78% gross margin is asserted, not measured**, and it *inverts* as you scale the premium product (Crisis and Clinical are your most token-heavy features — the 78% is a Tutor-only number masquerading as blended; **model COGS per active user per module**); and (3) **₹150 CAC is fantasy** outside the ambassador channel and rises as you exhaust the cheap channel.

**Pricing architecture (resolved):**
- **Free tier — useful but un-personalized, and deliberately cheap to serve.** Trustworthy Tutor (capped queries), generic high-yield lists, a view-only plan. **The expensive things (voice, clinical sim, personalized prediction) are never free** — they are the conversion surface. The deck's "50 queries/day + voice + 2 clinical cases" free tier is too generous and directly attacks your own margin; tighten it.
- **Premium (retail) — ₹399/mo is aggressive; lead with term/exam-bundle pricing, not monthly SaaS.** ₹399/mo anchors low for a high-stakes purchase (Marrow is ₹10k–40k/yr); low price can signal low trust. Offer **exam-cycle bundles** and an **annual plan (~₹2,999/yr)** — but recognize that a 37% annual discount is a *retention* admission; fix retention, don't just discount.
- **Per-module value capture.** Crisis Mode is the WTP peak — price the personalized triage/prediction/priority there. Clinical Mode is a premium, higher-ARPU surface (it replaces ₹50k/mo clinical coaching) — price it as a distinct premium tier or add-on, not bundled cheap.
- **NEET-PG / NExT-aspirant track is where the real money is** — students already pay ₹40k–₹2L. Even modest share at that ARPU dwarfs MBBS-coursework retail. This is a deliberate ARPU lever, not a separate company.

**The revenue engines, in order of leverage (this is the path to ₹100 Cr ARR ≈ ~330K paying users at ~₹3,000 blended — a share-of-existing-wallet problem in a proven category, not new-market creation):**

1. **Crisis-mode conversion at exam-time** — four high-intent spikes a year; your highest-yield revenue engine. Target crisis-window free→paid **>20%**.
2. **Annual plans + net revenue retention** — beat seasonality; Clinical + Planner give year-round reasons to stay. **Fix involuntary churn first** — UPI-mandate / auto-debit failures cause 30–50% involuntary churn in India; explicit dunning + retry logic is real revenue, not plumbing.
3. **B2B2C college contracts** — large, sticky, low-CAC deals where colleges distribute AlmondAI to their students; raises ARPU, crushes CAC, *and* feeds the data moat. This is the channel that bends the unit economics without burning the raise on field sales.
4. **Career-lifecycle adjacencies** — FMGE / foreign-licensing (USMLE/PLAB), NEET-PG/residency, and **CME for practicing doctors** (recurring revenue, huge TAM) extend ARPU across a 10-year relationship instead of one exam.
5. **High-margin marketplaces** — human-doctor SOS calls (Crisis) and the clinician-authored case marketplace (Clinical) — rev-share, premium, and moat-reinforcing.

**Margin discipline as a first-class metric:** COGS-per-paying-user on a dashboard with anomaly alerts, **measured under ~25–30% of ARPU** before "78% margin" is ever claimed. The unlock to ₹100 Cr is **margin discipline + the institutional channel**, not retail freemium alone.

**The ethical guardrail on monetization (also a DPDP/dark-pattern line):** never manufacture urgency to convert, never upsell into detected distress, and keep personalization transparent and user-controllable. Monetizing the panic moment is powerful and *can* tip into exploiting student anxiety; the product relieves panic and detects genuine distress to route to support — it does not sell relief from a crisis it amplified.

---

# SECTION Q — Growth Strategy

**The go-to-market wedge is narrower than the market: one exam, one region, made unmissable, then replicated.** The deck's three channels (campus ambassadors across 706 colleges, exam-cycle campaigns 4×/yr, edu-influencer partnerships) are native to how MBBS students actually discover tools — but two of them are operationally heavy and the math hides real costs. The resolved strategy sequences them by CAC-efficiency and operational load.

**Phase 1 — Design partners, not a sales army (months 0–9).** **3–10 lighthouse colleges**, deeply, before an exam cycle — not a 706-node field-sales org disguised as a growth hack. The goal is PMF evidence: saturate a handful of colleges right before the prof-exam spike, ship a trustworthy Tutor for those subjects + a Crisis Mode that demonstrably helps, and measure **did they pass better, and did they tell their friends.** PMF is declared when the crisis window converts **>20%** *and* retention survives the inter-exam trough — not when a demo impresses.

**Phase 2 — Exam-cycle launch engine + influencer trust-borrowing (months 6–18).** Demand is seasonal and spiky (four spikes a year), which means **revenue is lumpy and the hard problem is trough retention** — the Planner and Clinical Mode exist partly to answer it. Build a repeatable **exam-cycle launch playbook** (dark-launch via feature flags to ambassadors, pre-scale infra, campaign, measure). **Edu-influencer partnerships are the best of the three channels and are under-invested** relative to the ambassador program — "trust borrowing" in tight med-student communities is the cheapest credible CAC. Word-of-mouth in these communities is the real growth engine; the product being *measurably right* is what powers it.

**Phase 3 — Campus ambassador density + B2B2C institutional motion (months 12+).** Scale the ambassador program *only after* the unit economics are proven on design partners — and put the true cost (₹100/referral + free Premium across thousands of ambassadors is a real, growing cash cost) into the CAC math, not outside it. In parallel, begin the **B2B2C college motion**: colleges license AlmondAI for their students and faculty author/assess on it. B2B2C is the **cheapest CAC and the most durable revenue**, and it is the channel the deck under-weights. It also compounds the moat (faculty switching costs + institutional embedding).

**The competitive reality the growth plan must respect:** the real competitor for the free tier is **"the students themselves + ChatGPT/Gemini" ("free, good enough, already installed")** — beaten only by demonstrably superior medical correctness. The real competitor for paid is **Marrow** (₹773 Cr, profitable, 600K users, content rights, brand) — and "they'll stay static" is not a defense; Marrow shipping an AI tutor over content they already own is a quarter of work. The growth strategy wins not by out-spending incumbents but by **owning the two surfaces they're structurally unready for: the 48-hour crisis moment and NExT Paper II.**

**Growth instrumentation:** cohort retention by acquisition channel + student category; CAC by channel with **payback < 90 days** as the bar (ambassador vs influencer vs paid measured separately, not blended); referral rate (ambassador-driven); resurrection rate (exam-cycle reactivation); and free→paid **at exam-time** (the only conversion number that matters). Don't ship vanity dashboards — pre-PMF, three numbers matter: D30 retention, exam-time free→paid, and answer correctness.

---

# SECTION R — Competitive Moats

**The deck markets the weakest moats and buries the strongest.** The four it top-bills — curated corpus, RAG plumbing, model routing, generic "agentic planning" — are table-stakes engineering a funded competitor copies in a quarter. The real moats are **data and people-and-process assets that compound**: slow to build, slow to copy, exactly what makes a moat. Both prior plans ranked moats and reached the same conclusion; this is the merged, reconciled ranking (scored 1–5; 5 = strongest).

| # | Moat | Replication difficulty | Defensibility | Network effects | Data-flywheel | Revenue impact | **Total** | Tier |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | **Validated clinical case + rubric bank + NExT Paper-II alignment** | 5 | 5 | 4 | 5 | 5 | **24** | Build (start now) |
| 2 | **Weakness/outcome data graph** (misconceptions × exam outcomes, cross-cohort, per-university) | 5 | 5 | 3 | 5 | 5 | **23** | Build (pre-wire now) |
| 3 | **Faculty + institutional embedding (B2B2C)** | 4 | 5 | 5 | 4 | 4 | **22** | Build (Year-2) |
| 4 | **Crisis Mode "last 48 hours" ownership** | 4 | 4 | 2 | 5 | 5 | **20** | Build (spearhead) |
| 5 | **Per-college PYQ / examiner-pattern intelligence** | 4 | 4 | 3 | 4 | 4 | **19** | Build (compounds) |
| 6 | **Brand-as-default for NExT / "the exam-survival app"** | 4 | 4 | 4 | 2 | 4 | **18** | Earn (via outcomes) |
| 7 | **Correctness / eval flywheel** (SME-labeled medical answers) | 4 | 4 | 1 | 4 | 3 | **16** | Build (foundation) |
| 8 | **Per-student behavioral/learning lock-in** | 3 | 4 | 2 | 5 | 4 | **18** | Compounds with use |
| 9 | **Curriculum-native exam-weighted corpus** (deck's #1) | 2 | 3 | 1 | 3 | 3 | **12** | Hygiene |
| 10 | **Agentic planning** (deck's #3) | 2 | 2 | 1 | 3 | 2 | **10** | Hygiene |
| 11 | **Model routing / OpenRouter** (implied moat) | 1 | 1 | 1 | 1 | 2 | **6** | **Not a moat — stop calling it one** |

**How to read this:** concentrate moat-building effort on rows 1–5. The strategic instructions that follow from it: **(a) fund a clinician network early** to author and validate cases — the slowest moat, so start in month one; **(b) close the data loop** (predict → outcome → improve) so the weakness graph *compounds* rather than merely accumulating; **(c) land lighthouse colleges** to begin institutional embedding; and **(d) win the two unowned surfaces** (the crisis moment, NExT Paper II). Treat rows 9–11 as *hygiene* — necessary, not differentiating — and do not let the team spend its best months polishing the commodity layer.

**The nature of the network effects matters.** AlmondAI's are mostly **data network effects** (more students → better predictions → better product) and **institutional ones** (more faculty author cases → more students → more faculty), not classic social effects. That's fine — data network effects are harder to see but harder to dislodge. Make them real by closing the loop, not by bolting on a social feed. **NExT alignment is the multiplier on moat #1:** if Paper II ships, the clinical library isn't just a moat — it's the only product in the category. Even if NExT slips, a validated clinical simulator is defensible on pedagogy alone. Every exam cycle widens moats #1, #2, and #5 automatically; that automatic widening is the entire long-term defensibility of the company.

# SECTION S — 12-Month Roadmap

Assumes the $1.2M seed closes; Q1 = first quarter post-raise. Sequenced around **one truth: get Crisis Mode converting during a real exam cycle before building anything else.** Team grows ~4 → ~10, hired *when needed, not front-loaded* (cash discipline). The detailed month-by-month version is the final section ("THE RECOMMENDED ALMONDAI BUILD ORDER"); this is the quarterly frame with objectives, dependencies, and exit metrics.

**Q1 (Months 1–3) — Trustworthy core + the missing pillars.**
*Objective:* fix the tech debt and build the foundation of trust. *Deliverables:* RAG correctness overhaul (pgvector + strong embeddings + BGE reranker + groundedness verifier + calibrated refusals); **kill ChromaDB**; `ModelGateway` (Bedrock-primary / OpenRouter-fallback); **eval harness + 500-question golden set + CI eval gate + Langfuse**; semantic answer cache; the exam-weighted curriculum graph in Postgres; mobile PWA; DPDP/consent v1 (age-gating, consent ledger, visible memory); Terraform IaC; Sentry + basic Datadog. *Team (4→6):* CTO/AI, 1–2 full-stack, +Senior AI/ML (RAG/eval), +part-time clinician advisor (start the case-validation relationship now), +2–3 stipended MBBS SME graders. *Dependencies:* SME availability for the golden set; a clean curriculum/PYQ dataset; design-partner colleges lined up. *Exit metric:* groundedness **>95%**; retrieval recall@10 up measurably; eval gate live in CI; zero ChromaDB in prod; D7 **>35%**.

**Q2 (Months 4–6) — Build the spearhead: Crisis Mode + payments that convert.**
*Objective:* a real Crisis Mode end-to-end, instrumented for outcomes. *Deliverables:* deterministic high-yield + sacrifice + **calibrated readiness** engines over the curriculum graph; last-night offline packs (PWA); rapid-MCQ gauntlet; **wellbeing distress-detection + support routing**; paywall + Razorpay tuned for the crisis window (with dunning/UPI-mandate handling); semantic cache live; **closed-loop outcome capture wired** (even at small N); Planner deterministic core + FSRS begun. *Team (6→7):* +Product/frontend (PWA). *Dependencies:* Q1 RAG + eval; payment + DPDP sign-off; a partner college with an exam in Q3. *Exit metric:* Crisis Mode live with ≥3 design-partner colleges; semantic-cache hit-rate **>20%**; COGS-per-active-user measured and within target; readiness Brier improving.

**Q3 (Months 7–9) — Prove monetization on a real exam cycle; start the Planner.**
*Objective:* convert during a live exam spike. *Deliverables:* **Crisis Mode GA into the Jul/Aug exam spike**; conversion + retention instrumented; deterministic Planner v1 (scheduler + LLM edges) for inter-exam retention; flywheel mart v1; per-college PYQ intelligence v1; PostHog analytics + experimentation; HA/DR readiness for peak (pre-scale, load-test). *Team (7→8):* +Data/analytics engineer (flywheel, KPIs, warehouse). *Dependencies:* exam-cycle calendar; ambassador motion feeding trials. *Exit metric:* **crisis-window free→paid >20%**; p95 latency held under peak; D30 baseline; predictions logged against outcomes.

**Q4 (Months 10–12) — Ship the moat: Clinical Mode v1 (NExT Paper-II beta).**
*Objective:* stand up the highest-defensibility asset and assemble the Series-A story. *Deliverables:* clinician-authored **validated case library** (narrow — 2–3 specialties); voice virtual-patient history-taking; **rubric-based case-sheet grading calibrated vs. faculty**; faculty authoring/review tooling v0; AI viva (voice, adaptive) begun; readiness model recalibrated on a full real cycle (**the flywheel turns**); warm-standby DR live; second inference path hardened; ambassador rollout begins. *Team (8→10):* +Clinical content lead (owns the case library + clinician network), +Senior backend/infra (scale, DR, security). *Dependencies:* clinician panel; faculty design partners; accumulated outcome data. *Exit metric:* **grader-vs-faculty agreement above an agreed threshold**; Clinical beta NPS; ≥N validated cases live; CAC payback < 6 months proven; Series-A narrative assembled (Crisis revenue + Clinical moat + flywheel wired).

**Cross-cutting all four quarters:** eval gate on every model/prompt change; COGS dashboard with alerts; security/DPDP posture; weekly groundedness + wellbeing-routing review. **Hiring philosophy: small and senior** — one excellent AI engineer beats three juniors, and the clinician relationship is as important as any engineer for the moat. **The financing reality, stated now:** Crisis revenue starts ~Q3, so the plan *must* reach a clear Series-A milestone by Q4 or you'll be raising on a flat metric. Sequencing Crisis before Clinical is precisely what de-risks the next raise.

---

# SECTION T — 24-Month Roadmap

Months 13–24 are about **turning one converting exam-cycle into year-round retention, a spinning flywheel, and the first institutional revenue** — the transition from "a tool that works during a spike" to "the exam-survival default."

**Months 13–18 — Retention beyond the spike + full Crisis/Clinical depth.** Ship full Clinical Mode depth (OSCE circuits, viva with examiner archetypes, ward rounds, deteriorating patients) across more specialties; expand the validated case library aggressively (the moat's supply side); mature the Planner into a real engine (university calendars, multi-exam optimization across the year); deepen the weakness graph so personalization is visibly better; harden infra for exam-season peaks. Launch the **NEET-PG / NExT-aspirant track** to lift ARPU. *Outcome:* D90 retention that survives the inter-exam trough; **NRR > 100%** on annual plans; the flywheel measurably recalibrating predictions cycle-over-cycle.

**Months 19–24 — Scale distribution + the institutional wedge.** Scale the campus + influencer engine on proven unit economics; ship per-college content packs and **faculty/college dashboards** (the B2B2C institutional wedge); land the first **college license deals** (colleges distribute AlmondAI to students; faculty author and assess on it); ship the React Native app once retention justifies the second frontend; introduce self-hosted hot models for COGS *if* the cost crossover is crossed. Begin **FMGE / foreign-licensing** as the first career-lifecycle adjacency. *Outcome:* top-2 awareness among MBBS students in target regions; ₹100 Cr+ ARR trajectory; multi-college B2B revenue; defensible, *measured* gross margins; predictions and high-yield lists demonstrably beating incumbents'.

**The 24-month thesis:** by the end of Year 2 the company has three of its five durable moats actively compounding (clinical case library, weakness/outcome graph, per-college PYQ intelligence), the fourth begun (institutional embedding), and a revenue base that no longer depends on a single seasonal spike. That is the Series-B story: *a proven, profitable-trajectory category challenger with compounding data moats and a regulatory tailwind (NExT).*

---

# SECTION U — 36-Month Vision

Months 25–36 are the **category-leader → platform** transition: become the standard, embed in the institution, and begin the lifecycle and geographic expansion that make the "operating system" framing literally true.

**Own NExT and the institution (the category-leader move).** Position AlmondAI as the canonical NExT-prep platform — *the* answer to Paper II, where the validated case library has no serious competitor. Land **institutional/B2B2C deals at scale**: colleges license AlmondAI for their students, faculty author and assess on it, making AlmondAI part of how medical education is *delivered*, not just studied. B2B2C raises ARPU and slashes CAC (colleges distribute for you); the data moat makes you the obvious default. Ship institutional admin/LMS-grade features, CBME competency-mapping, assessment/proctoring-adjacent tooling, and NMC-aligned outcome reporting for colleges.

**The platform endgame (where "OS" stops being a slide title).** AlmondAI becomes the layer medical learners and institutions build on: a **public API + MCP tool ecosystem** for case and content authoring, a **clinician-authored content marketplace** (rev-share), and a **lifelong medical-learning graph** that follows the doctor from student → intern → resident → practicing clinician. Extend along the career (internship companion → residency/PG prep → **CME for practicing doctors**, recurring revenue + huge TAM) and into adjacent verticals on the same engine (nursing, dental/BDS, pharmacy/allied health). Begin **global-South expansion** to other exam-driven medical systems with the same structural pain — huge syllabus, high-stakes exit exam, weak personalization (other South-Asian, African, Middle-Eastern licensing regimes; and USMLE/PLAB for the international-licensing cohort).

**Why it is defensible at this scale:** by Year 3 the moat is four compounding assets, none copyable in a quarter — the **outcome-validated clinical case library**, the **cross-cohort weakness/outcome dataset**, **institutional embedding**, and **brand-as-default**. Dominance = being the default at the moment of highest stakes (the exam), trusted because you're measurably right (the data), and embedded where the teaching happens (the institution). Capturing the doctor for ten years instead of one exam, on a compounding outcome dataset, *is* the operating system — and a genuine multi-hundred-million-dollar, plausibly billion-dollar, outcome.

**The honest throughline across all three horizons:** you do not get to the Year-3 platform by building four modules at once in Year 1. You get there by making **one** module undeniable, then letting trust and data compound into the next. The roadmap is a discipline of sequencing, not a list of features.

---

# SECTION V — What To Delay

Delay is not rejection — it is sequencing. Each item below is valuable and survives in the ranked repository; each is *premature now* and has an explicit **trigger** for when it becomes appropriate. Building any of these in Year 1 steals hours from correctness, Crisis conversion, and the clinical library.

- **Full 19-subject corpus coverage** → *Trigger:* the 2–3 high-yield subjects hit groundedness + correctness targets and coverage telemetry shows demand. *Why delay:* breadth before depth produces wrong/empty answers and kills trust.
- **Clinical Mode at full scope** → *Trigger:* Crisis Mode proves >20% crisis-window conversion (Q3). *Why delay:* it's the most expensive module to build well; build it after the company can convert. (The case-library *relationship* still starts now.)
- **The LLM "agentic planner"** → *Trigger:* the deterministic Planner v1 has adoption and the constraint solver is solid. *Why delay:* a non-deterministic planner erodes the trust the planner exists to create.
- **Native iOS + Android** → *Trigger:* PWA retention justifies a second frontend (≈Year 2). *Why delay:* three frontends at seed is unaffordable; PWA covers mobile-first need.
- **NEET-PG / FMGE / USMLE / PLAB / CME adjacencies** → *Trigger:* core MBBS + Crisis loop is converting and retaining. *Why delay:* ARPU-rich but a focus tax before the core works.
- **Voice everywhere** → *Trigger:* premium viva + last-night voice prove value and COGS is controlled. *Why delay:* it's the margin killer; bound it to two premium use-cases.
- **706-college ambassador army** → *Trigger:* unit economics proven on 3–10 design partners. *Why delay:* a 700-node field-sales org disguised as a growth hack, with real cash cost.
- **Self-hosted GPU inference (vLLM on G5/G6)** → *Trigger:* monthly OpenRouter/Bedrock spend crosses ~$8–12k (the hardware crossover). *Why delay:* don't run GPUs you can't keep busy.
- **EKS / microservices / multi-region active-active** → *Trigger:* a module has a genuinely different scaling profile, or single-writer Postgres is the proven bottleneck. *Why delay:* premature distribution triples ops load pre-PMF.
- **The platform / public API / MCP marketplace** → *Trigger:* Stage 5 (Year 3+), after institutional embedding. *Why delay:* it's the endgame, not the launch.
- **Study-groups / social / community / co-study rooms, content marketplace, rank predictors, Anki sync, research assistant, and most of the 100 extensions** → *Trigger:* data + distribution earn the right to each, one at a time. *Why delay:* a startup dies of building 100 things, not of building too few.
- **Heavy gamification ("lives"/streaks)** → *Trigger:* validated that it doesn't insult exam-terrified students (see "What To Kill" — this is on probation, not auto-delayed).

---

# SECTION W — What To Kill

These are not delays. They are wrong for where the company is going and should be removed, not rescheduled.

- **Per-student ChromaDB vector stores.** 🔴 The single biggest scaling/cost landmine: thousands of tiny in-memory indexes, no horizontal scaling, no filtered HNSW, walls at 5–10M vectors. Replace with one multi-tenant pgvector collection (`student_id` filter) + structured memory in Postgres. Kill it in Q1.
- **MiniLM embeddings without a reranker.** 🔴 ~56 MTEB is a quality ceiling that silently produces wrong-but-confident medical citations. Replace with Qwen3-Embedding/Voyage + BGE-reranker-v2-m3.
- **OpenRouter as the *sole* inference path.** 🔴 A single point of failure for your entire inference path, no SLA you control, a data posture you don't govern. Keep it as a *secondary* behind your own gateway; Bedrock primary. (Augment-not-kill, but kill the *sole-dependency*.)
- **"Agentic everything" / agent-washing.** 🔴 Calling deterministic features "agents" tempts the team to *build* them as agents — burning tokens, latency, and testability on problems that want plain code. Kill the framing and the impulse.
- **Selling RAG plumbing / model routing / corpus size as "moats."** 🔴 They are hygiene a competitor copies in a quarter. Over-claiming them reads as naïveté to investors and misallocates the team's best months. Stop calling them moats.
- **Voice-first free tier.** 🔴 The most expensive COGS line, unbounded, in the tier that doesn't pay. Cap hard; make voice premium + use-case-bounded.
- **False-precision "readiness score."** 🔴 A confident numeric prediction you can't yet validate betrays a terrified student at the worst moment if it's wrong. Ship banded + humble until outcome data earns precision.
- **Top-down TAM theater ($12B → $1.8B → $240M).** 🔴 The $12B India-edtech number is irrelevant (you don't serve K-12 or upskilling) and "600K paying = ~50% of all MBBS students" is not credible. Replace with bottom-up math anchored on Marrow's real revenue.
- **Calling a prototype "production-ready" to investors.** 🔴 It contradicts the demo and the subcontext; say "working prototype" (impressive at seed) and raise to make it production-ready.
- **Heavy gamification ("lives") — on probation, kill unless validated.** 🟡 Duolingo-style "lives" can feel *insulting* to exam-terrified medical students. Validate it isn't a vanity feature with real users; if it doesn't lift retention without harming trust, kill it.

---

# SECTION X — Final Founder Recommendations

This is the section to read twice. Everything above is analysis; this is the decision.

**The one sentence to put on the wall:** *Build the most trustworthy, most calming, most correct answer to the hardest moment in an Indian medical student's life — the exam they cannot afford to fail — and let the data from being there make you impossible to catch.*

**Build first, in order:** (1) the correctness stack (pgvector + strong embeddings + reranker + groundedness verifier + eval gate + Langfuse) — nothing medical ships without it; (2) the exam-weighted curriculum graph — the deterministic brain; (3) Crisis Mode as deterministic triage with a hard wellbeing guardrail, wired to payments and to outcome capture; (4) the closed data loop from day one, even at tiny N. One spearhead, proven on one exam cycle, with the data loop pre-wired. Everything else waits.

**Do NOT build yet:** all four modules at once; an LLM free-hand planner; native iOS+Android; per-student vector DBs, microservices, EKS, multi-region, or a self-hosted GPU fleet; voice everywhere; a 706-college sales army; the "OS" platform surface; false-precision readiness. (Full triggers in Sections V and W.)

**Where engineering effort is currently wasted, reallocate every hour:** from surface-area-over-depth (RAG + voice + MCQ + spaced-rep + payments all half-built, nothing load-bearing or *correct*) and from polishing the commodity layer (corpus size, routing, "agentic" framing) — **to** correctness, Crisis conversion, and starting the clinical case library.

**The seven things that gate the next raise (the investor's list, made yours):**
1. A working, *converting* Crisis Mode on ≥1 design-partner college with early conversion data.
2. Groundedness/eval numbers that prove the medical answers are safe (>95–97%).
3. A DPDP + clinical-safety program with a named owner and counsel engaged (budget it properly — the deck's 10% ops/legal is light).
4. Bottom-up financials with measured per-module COGS and **one** ARPU.
5. A credible NExT-positioned narrative + evidence you can build Clinical Mode (a validated case + faculty agreement on grading).
6. Proven retention on one cohort (D30 + inter-exam-trough survival).
7. Evidence of senior engineering + a clinical lead (adopting this architecture is a good start).

**The ten things to do on Monday** (if the whole document collapsed to one sprint backlog, in order):
1. Replace ChromaDB with pgvector (one multi-tenant collection, `student_id` filter); delete per-student stores.
2. Swap MiniLM → Qwen3-Embedding + add a BGE reranker; re-index; measure recall@10 before/after.
3. Add a groundedness verifier that blocks unsupported medical claims, and stand up an eval gate in CI.
4. Build the exam-weighted curriculum graph in Postgres — the deterministic brain.
5. Wrap inference in your own `ModelGateway` (Bedrock primary, OpenRouter fallback).
6. Scope Crisis Mode to deterministic triage (high-yield, sacrifice, last-night, banded readiness) + wellbeing guardrail; cut everything else from the next two quarters.
7. Wire outcome capture (post-exam "what happened?") now, even at tiny N — start the flywheel.
8. Stand up the DPDP/consent + clinical-safety layer; name an owner; engage counsel.
9. Sign 3–10 design-partner colleges for the next exam cycle.
10. Start the clinician relationship for Clinical Mode case validation — the slowest moat, begun today.

**The founder-honest verdict:** strong concept, exceptional wedge (the crisis moment + NExT Paper II), immature execution, over-claiming. The market is proven, the pain is real and unowned, and the upside — the default medical-education OS for the global South — is genuine. The job between now and the Series A is to turn the thesis into a converting, safe, measured product on one exam cycle. Do that, and the A prices itself. The moat is the data, not the chatbot. **Build the moat.**

---

# CONFLICT RESOLUTIONS — where the two plans disagreed, and the single decision

Both drafts agree on ~80% of the substance. Where they diverged — or where either over-reached — one decision is recorded here, with the reason, the rejected alternative, and the trigger that would reopen it.

**1. NExT positioning — central thesis vs. footnote.**
**Decision:** NExT is the central strategic frame; the company is "the platform built for NExT," and Clinical Mode is the answer to Paper II. **Reason:** it's the regulatory tailwind that makes the two premium modules the only tools designed for the exam every Indian doctor will need to pass, it unifies the MBBS-vs-NEET-PG ambiguity, and it opens a green-field where incumbents' content libraries don't transfer. **Rejected alternative:** Plan 2's near-silence on NExT (NEET-PG-centric framing) — it leaves the company fighting incumbents on their turf instead of creating a category. **Upgrade/hedge trigger:** build for NExT's *structure* (MCQ + clinical practical) so you win if it ships and don't lose if it slips; revisit emphasis only if the NMC formally cancels NExT (not merely delays it).

**2. Launch spearhead — Crisis-first (Plan 1) vs. Tutor-first (Plan 2).**
**Decision:** *Trustworthy Tutor is the Q1 foundation; Crisis Mode is the monetization spearhead shipped Q2–Q3.* The two are not actually opposed — a trustworthy Crisis Mode is impossible without the correct RAG/Tutor underneath. So: foundation = Tutor correctness + curriculum graph; wedge = Crisis. **Reason:** medical safety forbids shipping Crisis on an unevaluated RAG stack, and financing reality forbids spending four months polishing a Tutor with no monetization path. **Rejected alternatives:** (a) Crisis before the correctness stack (Plan 1's aggressive read) — dangerous in a medical product; (b) four months of Tutor-only with no paid module (Plan 2's literal read) — flat-metric financing risk. **Upgrade trigger:** none — this sequencing is the de-risking move.

**3. Vector DB — pgvector vs. Qdrant (and ChromaDB).**
**Decision:** **pgvector now, Qdrant at scale, ChromaDB killed.** **Reason:** pgvector co-locates with the Postgres system of record, is production-grade in 2026, and removes a moving part; one fewer thing to operate at seed matters more than Qdrant's headroom. **Rejected alternative:** standing up Qdrant on day one (premature ops) or keeping ChromaDB (a dead end). **Upgrade trigger:** cross ~5–10M corpus vectors, or need heavy filtered-HNSW/hybrid at a latency pgvector can't hold → migrate corpus to Qdrant (memory stays in Postgres). Pinecone is the managed fallback if you'd rather not run a vector DB.

**4. Embedding model — Qwen3-Embedding/Voyage (Plan 1) vs. BGE-large/E5/medical-tuned (Plan 2).**
**Decision:** **Qwen3-Embedding (0.6B/4B) or Voyage `voyage-3-large` as primary + BGE-reranker-v2-m3.** **Reason:** stronger MTEB retrieval than BGE-large/E5, and *the reranker matters more than the base embedder* — get the cross-encoder in and the base-model choice is second-order. **Rejected alternative:** MiniLM (both kill it); committing to a specific medical-tuned embedder sight-unseen. **Upgrade trigger:** validate the *exact* checkpoint on your own medical golden set — benchmarks don't transfer; if a medical-tuned model wins on *your* recall@k, switch.

**5. Inference path — OpenRouter-only vs. Bedrock-primary.**
**Decision:** **Bedrock primary (in-region, DPDP-governed) for anything touching student data; OpenRouter secondary; both behind your own `ModelGateway`.** **Reason:** the routing *policy* is your IP and must live in your code with real failover; a sole third-party router is a single point of failure with a data posture you don't govern. **Rejected alternative:** OpenRouter as the only path (fatal as core infra). **Upgrade trigger:** add a third path (self-hosted vLLM) at the GPU cost crossover.

**6. Product analytics — PostHog (Plan 2) vs. Amplitude/Pendo + warehouse (Plan 1).**
**Decision:** **PostHog (self-hosted) for product analytics + experimentation + feature flags early; ClickHouse/Redshift warehouse + event spine for the flywheel mart as you scale.** **Reason:** India data-residency, lower cost pre-PMF, and one tool for funnels/flags/experiments; the warehouse is a Stage-3 concern. **Rejected alternative:** SaaS Amplitude/Pendo early (residency + cost). **Upgrade trigger:** flywheel/warehouse questions outgrow PostHog → add ClickHouse.

**7. Auth — Cognito vs. Clerk vs. self-hosted Keycloak/Ory.**
**Decision:** **Cognito.** **Reason:** managed, in-region, MFA + OTP/social common in India, offloads a security-critical surface at seed. **Rejected alternative:** self-hosted Keycloak/Ory (more control, more ops you can't afford now); Clerk (fine, but Cognito keeps you in the AWS/in-region posture). **Upgrade trigger:** a B2B/enterprise requirement for full identity control → revisit self-host.

**8. Voice scope — tutor-with-caps (Plan 1) vs. premium-only viva+last-night (Plan 2).**
**Decision:** **Voice is premium + use-case-bounded (viva + last-night revision); not voice-first Tutor; hard free-tier caps; cached TTS for static content; small model by default.** **Reason:** voice is the most expensive, unbounded COGS line; the two bounded use-cases carry real value, voice-first Tutor does not. Leans to Plan 2's tighter call. **Rejected alternative:** voice across the free Tutor (margin killer). **Upgrade trigger:** Indian-accent-robust medical STT proves a defensible Year-2+ investment with controlled COGS.

**9. Memory model — 7 types (Plan 1) vs. 9 types (Plan 2).**
**Decision:** **Adopt Plan 2's granular 9-layer table (it maps cleanly to access patterns) with Plan 1's principles** (80% structured, one shared `student_id`-filtered vector collection, deterministic extractors, visible/DPDP-transparent, decay-as-a-feature). **Reason:** the 9-layer split is strictly more useful for engineering; the principles are what keep it cheap and compliant. **Rejected alternative:** either in isolation. **Upgrade trigger:** none — merge stands.

**10. ARPU — ₹1,800 vs. ₹3,300.**
**Decision:** **Pick one, model per-module, bottom-up.** Use **₹1,800 as the conservative blended retail ARPU** in the base case and show the path to **~₹3,000** via annual-plan attach + NEET-PG/NExT-aspirant ARPU + B2B2C mix. **Reason:** a 1.8× discrepancy in your own deck destroys credibility; blended hides that Crisis/Clinical COGS differs wildly. **Rejected alternative:** quoting both, or blended-only. **Upgrade trigger:** real cohort data replaces the directional number.

**11. Service shape — modular monolith vs. microservices.**
**Decision:** **Modular monolith first** (both plans agree); extract only voice and eval-workers early (different scaling profiles). **Reason:** microservices at seed are premature distribution that triples ops load. **Upgrade trigger:** a module has a proven different scaling profile.

**12. Deep Agents — how much autonomy.**
**Decision:** **Sparingly, Year-2, one place (multi-source synthesis).** **Reason:** the autonomous harness burns ~20× the tokens of a tight LangGraph flow. **Rejected alternative:** Deep-Agent patterns across modules. **Upgrade trigger:** a genuinely long-horizon synthesis task with proven ROI.

**13. Compute platform — Fargate vs. EKS.**
**Decision:** **ECS Fargate now; EKS only when GPU scheduling/bin-packing matters.** **Reason:** no node ops, Multi-AZ, fast iteration; EKS control isn't worth its complexity pre-scale. **Upgrade trigger:** self-hosted GPU fleet or fine-grained scheduling needs.

**14. Roadmap stage timing — 0–6mo (Plan 1) vs. 0–4mo (Plan 2) for Stage 1.**
**Decision:** **Q1 = foundation/correctness; Crisis GA into a Q3 exam spike; Clinical v1 in Q4.** A merged timeline (see Sections S and the monthly build order). **Reason:** anchors the plan to a *real exam cycle* rather than an abstract month count. **Upgrade trigger:** the available design-partner exam calendar shifts the GA target.

**15. "Lives"/gamification — keep vs. cut.**
**Decision:** **On probation — validate or kill.** **Reason:** both plans flag that Duolingo-style "lives" can insult exam-terrified medical students; neither has data. **Rejected alternative:** shipping it as a core engagement mechanic unvalidated. **Upgrade trigger:** A/B evidence that it lifts retention without harming trust → keep; otherwise kill.

---

# THE MASTER PRIORITY MATRIX — every major idea, scored and ranked

This is AlmondAI's master execution queue. Every major idea from both source plans survives here (literal duplicates merged; the granular Crisis/Clinical feature lists live in Sections N/O and the Top-100 below). Each is scored 0–100 on six dimensions and assigned a build size and priority tier.

**Scoring methodology (stated so the numbers are auditable, not magic).** These are directional CTO/VC judgment scores, not false-precision measurements; replace them with real data as it arrives. The six inputs: **Strategic Value (SV)**, **Revenue Impact (RI)**, **User Impact (UI)**, **Moat / Competitive Advantage (Moat)**, **Implementation Difficulty (Diff)**, **Operational Complexity (Cplx)**. The **Final Weighted Score** rewards value and discounts cost:

> **Value** = 0.28·SV + 0.24·RI + 0.18·UI + 0.30·Moat  (a moat-and-strategy-weighted blend of the four benefit dimensions)
> **Cost factor** = 1 − 0.30 × (0.6·Diff + 0.4·Cplx)/100  (build cost shaves up to ~30%)
> **Final = Value × Cost factor**, rounded.

**Time-to-Build:** XS (<1wk) · S (1–4wk) · M (1–2mo) · L (1–2 quarters) · XL (2+ quarters).
**Priority tiers:** **P0** Build Immediately (Q1–Q2 foundation + spearhead) · **P1** High Priority (Q2–Q4) · **P2** Important (Year 2) · **P3** Later (Year 2–3 adjacencies) · **P4** Long-Term (platform/expansion).

**Important nuance — the table is sorted by Final Weighted Score, but the Priority Tier also encodes dependency and gating.** Some items carry a moderate weighted score yet are **P0** because everything depends on them (marked **†** = enabling/gating) — e.g., the ModelGateway, the DPDP layer, and the pgvector migration score in the 49–55 band but must ship first. One item is **P1\*** (the Clinical case library): begun in month one because it is the slowest moat, even though it *ships* much later. Read the Final score as "intrinsic value-per-cost" and the Tier as "when to build it given dependencies."

| Rank | Idea | SV | RI | UI | Moat | Diff | Cplx | TTB | **Final** | Tier |
|---:|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | Crisis Mode core (high-yield + sacrifice + readiness engine) | 95 | 95 | 92 | 85 | 60 | 55 | L | **76** | P0 |
| 2 | Outcome-capture closed loop (the flywheel's closing step) | 95 | 72 | 68 | 95 | 35 | 40 | S | **75** | P0 |
| 3 | Exam-weighted curriculum graph (the deterministic brain) | 93 | 80 | 85 | 80 | 52 | 45 | M | **72** | P0 |
| 4 | Evaluation & correctness harness (golden sets + CI gate + Langfuse) | 95 | 65 | 88 | 80 | 48 | 42 | M | **71** | P0 |
| 5 | Clinical case library (clinician-authored, validated) | 96 | 80 | 88 | 96 | 82 | 78 | XL | **69** | P1\* |
| 6 | Groundedness / faithfulness verifier | 90 | 62 | 90 | 72 | 45 | 40 | S | **68** | P0 |
| 7 | NExT Paper-I track (positioning of Tutor+Crisis) | 85 | 78 | 80 | 72 | 45 | 45 | M | **68** | P1 |
| 8 | Structured memory / weakness graph (Postgres + filtered pgvector) | 88 | 65 | 80 | 85 | 55 | 52 | L | **67** | P0 |
| 9 | Crisis — last-night offline packs | 80 | 78 | 90 | 65 | 42 | 40 | M | **67** | P0 |
| 10 | NExT Paper-II clinical track (positioning of Clinical Mode) | 92 | 78 | 82 | 94 | 80 | 75 | XL | **67** | P1 |
| 11 | Reranker + embedding upgrade (hybrid retrieval) | 88 | 60 | 90 | 58 | 32 | 30 | S | **66** | P0 |
| 12 | Clinical — stateful AI patient (progressive disclosure) | 88 | 72 | 85 | 88 | 72 | 68 | L | **66** | P1 |
| 13 | B2B2C college contracts / institutional embedding | 88 | 82 | 58 | 88 | 60 | 65 | XL | **66** | P2 |
| 14 | Clinical — rubric case-sheet grading (faculty-calibrated) | 88 | 70 | 82 | 90 | 75 | 70 | L | **65** | P1 |
| 15 | Per-college PYQ / examiner-pattern intelligence | 82 | 65 | 75 | 85 | 55 | 55 | M | **65** | P1 |
| 16 | Cross-cohort misconception graph | 85 | 60 | 70 | 90 | 58 | 58 | L | **64** | P1 |
| 17 | Trustworthy AI Tutor (RAG, examiner-aware, real citations) | 82 | 70 | 88 | 55 | 45 | 42 | M | **63** | P0 |
| 18 | Clinical — AI viva examiner (adaptive, examiner personas) | 80 | 68 | 82 | 82 | 68 | 62 | L | **63** | P2 |
| 19 | Clinical — faculty case-authoring studio + dashboards | 85 | 72 | 70 | 90 | 72 | 70 | XL | **63** | P2 |
| 20 | "Explain like the examiner wants" mode | 75 | 60 | 82 | 68 | 40 | 40 | S | **62** | P1 |
| 21 | Clinical — differential / clinical-reasoning scoring | 82 | 65 | 82 | 85 | 72 | 68 | L | **62** | P1 |
| 22 | Clinical — OSCE station bank | 80 | 68 | 82 | 82 | 70 | 65 | L | **62** | P2 |
| 23 | Freemium funnel + paywall tuned to the crisis window | 80 | 88 | 60 | 50 | 35 | 40 | S | **62** | P0 |
| 24 | Mobile PWA + offline last-night mode | 80 | 62 | 88 | 58 | 48 | 45 | M | **61** | P0 |
| 25 | Deterministic Planner (scheduler + LLM edges + FSRS) | 78 | 62 | 78 | 72 | 58 | 52 | L | **60** | P1 |
| 26 | Tutor → teaching (Socratic, mastery-tracking, check-questions) | 76 | 58 | 82 | 68 | 52 | 48 | M | **60** | P1 |
| 27 | Crisis — predicted question paper (PYQ-pattern mock) | 70 | 68 | 78 | 68 | 50 | 45 | M | **60** | P1 |
| 28 | Clinical — vernacular / Indian-context patients | 72 | 58 | 78 | 82 | 62 | 58 | M | **60** | P2 |
| 29 | Clinical — voice history-taking | 78 | 62 | 80 | 78 | 70 | 65 | L | **59** | P1 |
| 30 | FMGE / foreign-grad licensing prep | 72 | 72 | 68 | 60 | 50 | 48 | L | **58** | P2 |
| 31 | Crisis — rapid MCQ gauntlet / active-recall blitz | 68 | 62 | 82 | 50 | 35 | 35 | S | **57** | P1 |
| 32 | Crisis — emotional-regulation suite (panic-to-plan, reframe) | 72 | 58 | 82 | 52 | 38 | 40 | M | **57** | P1 |
| 33 | Clinical — multimodal (ECG / X-ray / image interpretation) | 72 | 60 | 80 | 75 | 68 | 62 | L | **57** | P2 |
| 34 | Planner — enterprise (university calendars, multi-exam opt.) | 72 | 60 | 72 | 75 | 62 | 58 | L | **57** | P2 |
| 35 | "I don't know" / calibrated refusal path | 75 | 45 | 78 | 55 | 35 | 35 | S | **56** | P0 |
| 36 | Crisis — wellbeing distress detection + support routing | 82 | 48 | 78 | 55 | 45 | 48 | M | **56** | P0† |
| 37 | Crisis — exam-day tactical (answer structuring, hall timing) | 65 | 58 | 80 | 50 | 30 | 30 | S | **56** | P1 |
| 38 | Multimodal tutor (anatomy / radiology images in answers) | 70 | 58 | 82 | 60 | 55 | 52 | M | **56** | P1 |
| 39 | Analytics event spine + warehouse + flywheel mart | 78 | 55 | 55 | 72 | 52 | 55 | M | **56** | P2 |
| 40 | Clinical — ward rounds / deteriorating patient | 72 | 58 | 78 | 75 | 68 | 66 | L | **56** | P2 |
| 41 | Exam-cycle launch playbook | 72 | 72 | 58 | 52 | 35 | 42 | S | **56** | P1 |
| 42 | pgvector migration (kill ChromaDB) | 85 | 50 | 68 | 45 | 40 | 35 | S | **55** | P0† |
| 43 | Lifelong medical-learning graph (platform endgame) | 75 | 58 | 55 | 78 | 65 | 65 | XL | **55** | P4 |
| 44 | Memory lifecycle (extractors / decay / consolidation jobs) | 72 | 50 | 68 | 62 | 48 | 50 | M | **54** | P1 |
| 45 | MCQ engine + spaced repetition (FSRS) | 70 | 55 | 78 | 48 | 40 | 38 | M | **54** | P1 |
| 46 | Crisis — human-doctor SOS marketplace | 62 | 72 | 70 | 58 | 48 | 62 | L | **54** | P2 |
| 47 | Campus ambassador program (design-partner colleges first) | 72 | 70 | 55 | 55 | 40 | 58 | M | **54** | P1 |
| 48 | Edu-influencer partnerships (trust-borrowing) | 68 | 70 | 52 | 48 | 28 | 35 | S | **54** | P1 |
| 49 | Annual plans + dunning / UPI-mandate churn fix | 70 | 78 | 50 | 45 | 35 | 42 | S | **54** | P1 |
| 50 | CME for practicing doctors (recurring, huge TAM) | 70 | 72 | 58 | 58 | 52 | 55 | L | **54** | P3 |
| 51 | NEET-PG legacy track (until NExT fully replaces it) | 68 | 72 | 65 | 50 | 48 | 48 | L | **54** | P2 |
| 52 | Coverage telemetry (corpus-gap detection) | 68 | 45 | 65 | 62 | 35 | 38 | S | **54** | P1 |
| 53 | Clinical — emergency / ACLS branching scenarios | 68 | 55 | 76 | 72 | 66 | 62 | L | **54** | P2 |
| 54 | Clinical — communication / breaking-bad-news sims | 66 | 52 | 74 | 70 | 58 | 55 | M | **54** | P2 |
| 55 | Multilingual / regional-language content | 65 | 55 | 72 | 62 | 52 | 50 | M | **53** | P2 |
| 56 | Global-South licensing-exam expansion | 72 | 62 | 55 | 68 | 60 | 65 | XL | **53** | P4 |
| 57 | Medical-safety guardrails (educational ≠ clinical advice) | 80 | 40 | 60 | 50 | 38 | 40 | S | **51** | P0† |
| 58 | Semantic answer cache (COGS lever) | 70 | 68 | 55 | 35 | 30 | 32 | S | **51** | P0 |
| 59 | Crisis — group crisis mode (synced hostel study) | 58 | 52 | 70 | 52 | 42 | 45 | M | **50** | P2 |
| 60 | DPDP & consent layer (age-gating, ledger, visible memory) | 82 | 42 | 52 | 55 | 45 | 52 | M | **50** | P0† |
| 61 | Per-module unit-economics model (measured COGS, one ARPU) | 70 | 65 | 40 | 40 | 25 | 30 | S | **50** | P0 |
| 62 | Public API + MCP tool ecosystem (platform) | 70 | 55 | 45 | 72 | 62 | 68 | XL | **50** | P4 |
| 63 | Rank / college predictor (NEET-PG/NExT) | 55 | 58 | 65 | 52 | 42 | 42 | M | **50** | P3 |
| 64 | USMLE / PLAB international licensing track | 62 | 65 | 58 | 52 | 55 | 52 | L | **50** | P3 |
| 65 | Residency / PG prep (post-NExT) | 62 | 62 | 60 | 50 | 48 | 48 | L | **50** | P3 |
| 66 | ModelGateway (Bedrock primary + OpenRouter fallback) | 78 | 48 | 55 | 42 | 42 | 45 | S | **49** | P0† |
| 67 | Crisis — voice revision (hands-free last-night) | 62 | 55 | 72 | 48 | 52 | 55 | M | **49** | P2 |
| 68 | Observability / monitoring (Langfuse + Datadog + Sentry + SLOs) | 75 | 42 | 50 | 45 | 35 | 40 | S | **48** | P0 |
| 69 | Voice infrastructure (premium viva + last-night cascade) | 62 | 55 | 70 | 50 | 58 | 58 | M | **48** | P1 |
| 70 | Internship / CRRI survival companion | 58 | 50 | 65 | 48 | 42 | 42 | M | **48** | P3 |
| 71 | Topper-notes / content marketplace (rev-share) | 55 | 58 | 58 | 58 | 50 | 58 | L | **48** | P3 |
| 72 | Multi-AZ HA + graceful degradation | 72 | 45 | 55 | 48 | 45 | 50 | M | **48** | P1 |
| 73 | Cost / COGS dashboard with anomaly alerts | 68 | 58 | 40 | 40 | 30 | 35 | S | **47** | P0 |
| 74 | Row-level security / tenant isolation (Postgres RLS) | 70 | 42 | 45 | 50 | 38 | 40 | S | **47** | P0 |
| 75 | Nursing exam & clinical prep track | 55 | 58 | 55 | 45 | 45 | 45 | L | **46** | P3 |
| 76 | CI/CD + eval gate in pipeline + Terraform IaC | 72 | 40 | 42 | 45 | 40 | 42 | S | **45** | P0 |
| 77 | Anki-style deck auto-builder (from weaknesses) | 52 | 45 | 68 | 42 | 32 | 32 | S | **45** | P3 |
| 78 | Study-buddy / community / co-study rooms | 52 | 45 | 62 | 50 | 42 | 48 | M | **45** | P3 |
| 79 | Dental (BDS / NEET-MDS) track | 52 | 55 | 52 | 42 | 45 | 45 | L | **43** | P3 |
| 80 | Research assistant (lit review, evidence-grading) | 52 | 48 | 55 | 45 | 45 | 45 | M | **43** | P3 |
| 81 | Async worker plane (SQS + workers) | 68 | 40 | 45 | 35 | 38 | 42 | S | **42** | P0 |
| 82 | Self-hosted GPU inference (vLLM, at cost crossover) | 58 | 65 | 40 | 42 | 62 | 68 | L | **42** | P3 |
| 83 | Warm-standby DR (cross-region) | 62 | 38 | 48 | 42 | 48 | 52 | M | **41** | P1 |
| 84 | Pharmacy / physiotherapy / allied-health tracks | 48 | 50 | 48 | 40 | 45 | 45 | L | **40** | P4 |

**How to use this table:** the top ~24 rows are the company for the next 12 months. Anything **P0** ships in Q1–Q2 regardless of its row (the **†** enablers and gates are P0 because everything downstream depends on them). **P1** fills Q2–Q4. **P2/P3/P4** are the Year-2+ menu — valuable, ranked, and explicitly *not now*. The discipline the table enforces: build the high-moat, high-revenue, low-cost rows first (Crisis core, outcome loop, curriculum graph, eval harness, reranker), start the high-moat high-cost row now even though it ships later (Clinical case library), and resist the long tail until data and distribution earn each one.

---

# THE RECOMMENDED ALMONDAI BUILD ORDER

*If AlmondAI started today with one engineering team (≈4 growing to ≈10), this is exactly what to build, month by month, for the next 12 months.* The spine: **Q1 foundation/correctness → Q2 build Crisis → Q3 prove Crisis on a real exam spike → Q4 ship the Clinical/NExT moat and assemble the Series A.** Every month lists objectives, deliverables, dependencies, and expected business impact.

### Month 1 — Kill the landmines, stand up measurement
**Objectives:** remove the two riskiest infra choices; make quality measurable for the first time; begin the slowest moat.
**Deliverables:** pgvector migration (one multi-tenant collection, `student_id` filter) — delete per-student ChromaDB; Langfuse tracing on every model call; eval-harness scaffold + first ~150 golden questions (Anatomy/Physio/Pharma); `ModelGateway` skeleton (Bedrock primary, OpenRouter fallback); Terraform over current infra; recruit 2–3 stipended MBBS SME graders; **sign the first clinician advisor** (the Clinical case library's two-year clock starts now).
**Dependencies:** SME/clinician recruiting; AWS `ap-south-1` baseline.
**Business impact:** eliminates the #1 scaling/cost landmine and turns "we think it's good" into "we measure it." No user-facing change — this is the foundation everything stands on.

### Month 2 — Retrieval correctness overhaul
**Objectives:** make the Tutor's every answer trustworthy.
**Deliverables:** swap MiniLM → Qwen3-Embedding/Voyage; add **BGE reranker** over top-50; **hybrid search** (BM25 + dense); re-index the corpus; grow the golden set to ~500; **CI eval gate** enforced (regressions block deploy); groundedness verifier v1 wired into the pipeline.
**Dependencies:** Month-1 pgvector + eval harness.
**Business impact:** recall@10 and groundedness jump; the single biggest accuracy lever lands; the Tutor stops emitting wrong-but-confident citations — the trust foundation for every paid feature.

### Month 3 — The deterministic brain + the compliance floor
**Objectives:** build the curriculum graph; close the correctness loop; clear the legal gate.
**Deliverables:** exam-weighted **curriculum graph** in Postgres for the 2–3 launch subjects (exam_weight, pyq_frequency, dependencies); groundedness gate blocking unsupported claims + the calibrated **"I don't know"** path; **DPDP/consent v1** (age-gating, consent ledger, visible/user-controllable memory); medical-safety guardrail v1; mobile **PWA shell** + offline cache scaffold; semantic answer cache live.
**Dependencies:** clean curriculum/PYQ dataset; counsel engaged.
**Business impact:** unblocks high-yield/sacrifice/planner/readiness (all read the graph); removes the existential DPDP risk that blocks B2B; turns on a 20–40% COGS lever. **Exit Q1:** groundedness >95%, eval gate live, zero ChromaDB, D7 >35%.

### Month 4 — Crisis Mode deterministic core
**Objectives:** build the spearhead's brain.
**Deliverables:** deterministic high-yield extractor (80/20 over the graph); **sacrifice engine** (master/skim/abandon with marks-math); subject-triage dashboard; time-to-marks optimizer; structured weakness graph wired to the memory service.
**Dependencies:** Month-3 curriculum graph + memory service.
**Business impact:** the core of the paid product exists and is *explainable* (queries, not LLM guesses) — which is exactly what makes it trustworthy and hard to copy.

### Month 5 — Crisis readiness model + last-night + wellbeing + payments
**Objectives:** complete Crisis end-to-end; make it safe and payable.
**Deliverables:** calibrated **readiness model v1** (banded, on the student's own MCQ data, Brier instrumented); **last-night offline packs** (PWA/IndexedDB); rapid-MCQ gauntlet; **wellbeing distress-detection + support routing**; paywall + Razorpay (with dunning/UPI-mandate handling); **outcome-capture loop wired** (even at small N).
**Dependencies:** Month-4 core; payment + DPDP sign-off.
**Business impact:** a real, monetizable Crisis Mode with the flywheel's closing step pre-wired; the wellbeing guardrail keeps the company ethical and DPDP-safe at the exact moment it could go wrong.

### Month 6 — Harden, onboard design partners, begin the Planner
**Objectives:** get Crisis production-ready for a cohort; start the retention engine.
**Deliverables:** Crisis end-to-end with **≥3 design-partner colleges** (dark-launched via feature flags); semantic-cache hit-rate >20%; COGS-per-active-user dashboard with alerts; emotional-regulation suite + exam-day tactical; deterministic **Planner core + FSRS** begun; exam-spike load-test plan.
**Dependencies:** design-partner colleges with a Q3 exam; Months 4–5.
**Business impact:** Crisis validated with real students *before* the spike; margins measured before any claim; the inter-exam retention glue underway. **Exit Q2:** Crisis live with ≥3 colleges, cache >20%, COGS within target, readiness Brier improving.

### Month 7 — Crisis Mode GA into the exam spike
**Objectives:** prove monetization on a real exam cycle.
**Deliverables:** **Crisis Mode GA into the Jul/Aug spike**; pre-scaled infra (read replicas, Fargate scale-out, Multi-AZ); conversion + retention instrumented; predictions logged against forthcoming outcomes; exam-cycle launch playbook executed; influencer trust-borrowing campaign.
**Dependencies:** Month-6 hardening; HA/DR readiness; ambassador/influencer motion.
**Business impact:** THE monetization test — **crisis-window free→paid >20%** is the PMF signal; holding p95 latency under peak protects the brand at the 2 a.m. moment users have no backup for.

### Month 8 — Planner v1 + per-college PYQ intelligence + analytics
**Objectives:** convert the spike into retention; turn on the data engine.
**Deliverables:** deterministic **Planner v1 GA**; **per-college PYQ/examiner-pattern intelligence v1**; flywheel mart v1; PostHog analytics + experimentation; "explain like the examiner" mode.
**Dependencies:** Month-7 GA + data; curriculum graph.
**Business impact:** attacks the trough-retention weakness of a seasonal model; PYQ intelligence begins the per-college moat; the funnel becomes legible and improvable.

### Month 9 — Close the loop + Tutor→teaching + Series-A evidence
**Objectives:** turn the flywheel for the first time; deepen engagement.
**Deliverables:** post-exam **outcome capture** (opt-in results) → first **readiness recalibration**; Tutor→teaching upgrade (Socratic check-questions feeding the weakness graph); D30 retention baseline; assemble the conversion/retention evidence pack.
**Dependencies:** exam results arriving; Months 7–8.
**Business impact:** the first proof that predictions get *measurably better* against real outcomes — the moat made visible, and the Series-A's core data point. **Exit Q3:** crisis-window free→paid >20%, p95 held, predictions logged vs outcomes, D30 baseline set.

### Month 10 — Clinical Mode foundations (the NExT Paper-II moat)
**Objectives:** stand up the highest-moat module's safe core.
**Deliverables:** case-object schema + authoring pipeline; first **clinician-authored validated cases** (2–3 specialties); **stateful AI patient** (progressive disclosure, persona/affect) over the fixed case object; clinical-safety boundary enforced in product.
**Dependencies:** clinician panel (relationship begun in Month 1); clinical eval track.
**Business impact:** the NExT Paper-II wedge becomes real; the validated-case design scales clinical realism *without* scaling clinical risk.

### Month 11 — Calibrated grading + voice history + viva
**Objectives:** make Clinical trustworthy and assessable.
**Deliverables:** **rubric-based case-sheet grading calibrated vs. faculty** (inter-rater agreement measured *before* any grade is shown); voice history-taking; **AI viva examiner** (adaptive, personas) v1; faculty authoring/review tooling v0.
**Dependencies:** Month-10 cases; faculty design partners.
**Business impact:** the grader trust gate is cleared on measurement, not vibes (unvalidated grading is worse than none); faculty tooling seeds the two-sided B2B2C network.

### Month 12 — Clinical beta + flywheel recalibration + Series-A readiness
**Objectives:** ship Clinical v1 beta; assemble the raise.
**Deliverables:** **Clinical Mode v1 beta** to a cohort; readiness model recalibrated on a full real cycle (**the flywheel turns**); warm-standby DR live; second inference path hardened; ambassador rollout begins on proven economics; Tutor fine-tuned on best-rated answers; Series-A data room (Crisis revenue + Clinical moat + flywheel evidence).
**Dependencies:** accumulated outcome data; Months 10–11.
**Business impact:** the company now has a *converting* monetization engine (Crisis), a *defensible, validated* moat asset (Clinical/NExT Paper II), and a *measurably-improving* flywheel — the three things that price a Series A. **Exit Q4:** grader-vs-faculty agreement above threshold, CAC payback <6 months proven, Series-A narrative assembled.

**The throughline of the build order:** nothing user-facing and paid ships before correctness is measurable (Months 1–3); the spearhead is built and validated on real students before the company bets on it (Months 4–7); retention and the data loop are turned on before scaling (Months 8–9); and the slow, high-moat asset — begun in Month 1 — is shipped as the Series-A differentiator (Months 10–12). One spearhead, one exam cycle, the loop pre-wired, the moat begun early.

---

# EXECUTIVE RANKINGS

Ten ranked lists distilled from everything above — the fastest way to brief a new hire, an investor, or yourself on a Monday.

## Top 25 Things AlmondAI Must Build First

*The Q1–Q2 foundation + spearhead, in build order. Items 1–20 are largely P0; 21–25 begin in this window but ship later.*

1. Evaluation & correctness harness (golden sets + CI eval gate + Langfuse).
2. pgvector migration — kill per-student ChromaDB.
3. Reranker + strong embeddings (Qwen3/Voyage) + hybrid retrieval.
4. Groundedness verifier + calibrated "I don't know" path.
5. Exam-weighted curriculum graph in Postgres (the deterministic brain).
6. `ModelGateway` (Bedrock primary + OpenRouter fallback).
7. Structured memory / weakness graph (Postgres + one filtered pgvector collection).
8. Outcome-capture closed loop (the flywheel's closing step), wired at tiny N.
9. DPDP & consent layer (age-gating, consent ledger, visible memory).
10. Medical-safety guardrails (educational ≠ clinical advice) as code.
11. Trustworthy AI Tutor (examiner-aware, real verifiable citations).
12. Mobile PWA + offline last-night mode.
13. Semantic answer cache (COGS lever).
14. Crisis Mode deterministic core (high-yield 80/20 + sacrifice engine).
15. Calibrated, banded readiness model v1 (Brier-instrumented).
16. Crisis last-night offline packs.
17. Crisis wellbeing distress-detection + support routing.
18. Freemium funnel + paywall + Razorpay with dunning/UPI-mandate handling.
19. Observability/monitoring + COGS-per-active-user dashboard + SLOs.
20. Per-module unit-economics model (measured COGS, one ARPU).
21. Clinical case library — begin the clinician network now (slowest moat).
22. Deterministic Planner core + FSRS (inter-exam retention glue).
23. Per-college PYQ / examiner-pattern intelligence v1.
24. Exam-cycle launch playbook + sign 3–10 design-partner colleges.
25. Analytics event spine + flywheel mart (pre-wire the data engine).

## Top 50 Highest-ROI Features

*User-facing features ranked by value-per-effort. The first ~15 are the conversion and trust core; build them first within their modules.*

1. High-yield 80/20 extractor (Crisis) — deterministic, exam-weighted.
2. Sacrifice engine with marks-math (Crisis).
3. Last-night offline packs (Crisis).
4. Calibrated, banded readiness estimate (Crisis).
5. "Explain like the examiner wants" mode (Tutor) — the curriculum-native magic.
6. Real, verifiable citations to page/figure (Tutor) — trust vs. ChatGPT.
7. Rapid-MCQ gauntlet weighted to weak topics (Crisis).
8. Panic-to-plan converter (Crisis) — the core emotional promise.
9. Subject-triage dashboard: safe / at-risk / lost-cause (Crisis).
10. PYQ-frequency heatmap per university (Crisis).
11. One-pager per subject, auto-generated, exam-weighted (Crisis).
12. Spaced repetition (FSRS) (core learning engine).
13. Mnemonic generator for the facts you keep forgetting (Crisis).
14. Tutor → teaching: Socratic check-questions feeding the weakness graph.
15. Examiner-trap radar (Crisis).
16. Mark-gap closer — "the fastest 8 marks" (Crisis).
17. Predicted question paper from PYQ patterns (Crisis premium).
18. Confidence-vs-competence map (Crisis) — the dangerous quadrant.
19. Answer-structuring templates for max marks (Crisis exam-day).
20. Multimodal tutor — anatomy/radiology images in answers.
21. Error-replay / last-pass error log (Crisis).
22. Deterministic study plan (Planner).
23. "What happens if I skip today?" instant replan (Planner).
24. Sleep-vs-study advisor (Crisis wellbeing, science-backed).
25. Pass-probability live tracker (Crisis) — effort feels like progress.
26. Stateful AI patient with progressive disclosure (Clinical).
27. AI viva examiner, adaptive with personas (Clinical).
28. Rubric-based case-sheet grading, faculty-calibrated (Clinical).
29. OSCE station bank, timed + scored (Clinical).
30. Differential-diagnosis builder with Bayesian feedback (Clinical).
31. Red-flag radar (Clinical) — can't-miss findings.
32. Premature-closure / anchoring detector (Clinical).
33. Vernacular / Indian-context patients (Clinical) — a unique moat.
34. Voice history-taking (Clinical).
35. Data-interpretation stations: ECG/ABG/CBC/LFT (Clinical).
36. Reasoning-trace grading — graded on *how* you reasoned (Clinical).
37. Confusion-pair drills on your exact X-vs-Y mistakes (Crisis).
38. Teach-it-back / blurting mode (Crisis) — generation effect.
39. Case-of-the-day (Clinical) — between-exam engagement.
40. Weak-topic memory injection (personalization across modules).
41. Breaking-bad-news / SPIKES simulator (Clinical).
42. Multi-exam crisis optimization (Crisis premium).
43. Personal crisis dossier — shareable "state of my prep" (Crisis premium).
44. Logistics checklist — hall ticket/ID/route (Crisis, removes day-of load).
45. Ward-round / deteriorating-patient sim (Clinical).
46. Human-doctor SOS — topper/junior-doctor call (Crisis marketplace).
47. Group crisis mode — synced hostel study (Crisis social).
48. Anki-style deck auto-builder from weaknesses.
49. Skill-gap memory serving targeted next cases (Clinical).
50. Rank/college predictor calibrated on real cohorts.

## Top 100 Product Extensions (Ranked)

*Both source plans contained ~100 ideas; this is the merged, de-duplicated superset of ~100 distinct extensions, ranked by strategic priority and horizon. The discipline (stated in both plans and re-affirmed): the value of having 100 is **optionality and pattern-spotting** — build ~3 well, not 100 badly. Items 1–25 are roadmap-relevant; the long tail is the lifecycle menu to earn one at a time as data and distribution justify each.*

**Horizon 1 — core, build-soon (1–25)**
1. NExT Paper-II clinical track (the moat module).
2. NExT Paper-I prep track (high-yield + MCQ).
3. Virtual patient simulator (history + exam).
4. OSCE circuit trainer.
5. AI viva examiner.
6. AI Tutor with verified citations (the trust layer).
7. Faculty case-authoring studio.
8. College admin dashboard (cohort analytics, at-risk early warning).
9. University prof-exam mode (per-college PYQ-tuned).
10. FMGE prep for foreign med graduates (large, underserved).
11. Per-concept mastery tracker & dashboard.
12. Rank predictor calibrated on real cohorts.
13. PYQ bank with examiner-trap tagging.
14. Clinical-reasoning trainer (differential + Bayesian feedback).
15. Ward-round & deteriorating-patient simulation.
16. Full-length timed mock exams with analytics.
17. Predicted question papers (PYQ-pattern + this-year focus).
18. ECG/ABG/X-ray interpretation gym.
19. Emergency/ACLS branching scenarios.
20. Procedure step-trainer (catheter, suturing, ABG; checklist + sterility).
21. Breaking-bad-news & informed-consent communication sims.
22. Spaced-rep deck auto-generated from weaknesses.
23. Image-occlusion flashcards from textbook figures.
24. NEET-PG full prep track (legacy, until NExT fully replaces it).
25. White-label AlmondAI for medical colleges.

**Horizon 2 — adjacencies & lifecycle (26–55)**
26. Residency/PG entrance prep (post-NExT).
27. Internship/CRRI survival companion.
28. CME for practicing doctors (recurring revenue, huge TAM).
29. Licensing prep abroad (USMLE Step 1/2, PLAB, AMC).
30. Logbook auto-filler & CBME competency tracker.
31. Clinical-posting companion (what to learn each rotation).
32. Histology/pathology slide trainer.
33. Anatomy 3D / spotter trainer.
34. Drug/pharmacology rapid-reference + interaction quizzes.
35. Integrated-subject concept maps (anatomy↔physio↔path).
36. Auto-summarized chapter notes from any textbook page.
37. Diagram/flowchart generator for pathways & mechanisms.
38. Multilingual content (regional languages).
39. AI-narrated audio revision (commute learning).
40. Lab-values trainer (normal values rapid-recall).
41. Microbiology rapid-recall.
42. Forensic/PSM high-yield track.
43. Case-presentation coach.
44. SOAP / SBAR documentation training.
45. Prescription-writing trainer (dosing/interaction checks).
46. Ethics scenario simulator (confidentiality, capacity, end-of-life).
47. Management-plan grading vs. standard guidelines.
48. Cognitive-bias report across cases (anchoring/availability/confirmation).
49. Cost-aware diagnosis trainer (Indian-reality investigation choices).
50. Faculty question-paper generator (PYQ-aware).
51. Internal assessment & exam-conduct tooling.
52. CBME competency-mapping & reporting.
53. At-risk-student early-warning dashboard (faculty).
54. Institutional outcome reports (NMC-aligned).
55. Subject-wise crash courses (exam-cycle timed).

**Horizon 3 — social, content & productivity (56–80)**
56. Study-buddy / peer matching by syllabus & pace.
57. Virtual co-study rooms with timers.
58. College-cohort leaderboards & challenges.
59. Senior↔junior mentorship matching.
60. Doubt-solving communities (moderated, per subject).
61. Group study-plan sync for friend circles.
62. Topper-notes / student-content marketplace (moderated, rev-share).
63. Crowd-sourced examiner-trap reporting.
64. Anonymous "how did you pass this?" playbooks.
65. Accountability pledges & streaks (DPDP-safe).
66. Lecture-recording → notes + flashcards.
67. Handwritten-notes OCR → searchable + quizzable.
68. Personal "second brain" over a student's own materials.
69. Case-report writing assistant.
70. Presentation/seminar builder for med students.
71. Reference manager + citation helper.
72. Medical research assistant (lit review, summarize, critique).
73. Evidence-grading & guideline-summarizer.
74. Statistics/biostat helper for research projects.
75. Thesis/dissertation assistant (PG students).
76. AI study-skills / metacognition coach.
77. Personalized weakness-graph explorer (student-facing).
78. "What changed in medicine this year" learner.
79. Journal-club facilitator.
80. Whiteboard-explainer video generator.

**Horizon 4 — adjacent verticals & platform endgame (81–100)**
81. Nursing exam & clinical prep.
82. Dental (BDS / NEET-MDS).
83. Pharmacy (B.Pharm / GPAT).
84. Physiotherapy & allied health.
85. AYUSH / integrative streams.
86. Paramedic / EMT training.
87. Veterinary.
88. Nursing / allied-health CME.
89. Medical-coding & health-administration training.
90. Public-health / epidemiology learners.
91. Public API + MCP tools for partners/faculty.
92. Clinician-authored content marketplace (rev-share).
93. Hospital / residency-program training contracts.
94. Coaching-institute partnership platform.
95. Scholarship / financing partners for premium access.
96. AlmondAI certifications (signal of mastery).
97. Anonymized insights reports for med-ed researchers/publishers.
98. Hardware / clinical-skills-lab integrations.
99. Global-South licensing-exam expansion (Africa, MENA, SE-Asia).
100. Lifelong medical-learning graph (the platform endgame).

## Top 20 Competitive Moats (Ranked)

1. Validated clinician-authored clinical case + rubric bank (NExT Paper-II aligned) — the highest, slowest-to-copy moat.
2. Cross-cohort weakness-and-outcome data graph (how Indian students fail + what fixes it).
3. Faculty + institutional embedding (B2B2C) — two-sided switching costs.
4. Crisis Mode "last 48 hours" ownership — the unowned high-WTP moment.
5. Per-college PYQ / examiner-pattern intelligence — hyper-local, un-scrapeable.
6. Brand-as-default for NExT ("the exam-survival app") — word-of-mouth in tight communities.
7. Per-student behavioral/learning lock-in (their graph, history, plan live here).
8. Correctness / eval flywheel (SME-labeled medical answers → fine-tuning data).
9. Readiness-prediction calibration per university (compounds every exam cycle).
10. Clinical-reasoning trace dataset (hardest data to acquire, gold for Paper II).
11. Outcome-validated high-yield rankings (predictions visibly more right).
12. Vernacular / Indian-context clinical realism (uniquely Indian).
13. Faculty-authored case marketplace (two-sided network effect).
14. Lifelong learning graph (student → resident → CME career lock-in).
15. Examiner-aware answering (how marks are actually awarded).
16. Multimodal medical content (images / ECG / X-ray) at quality.
17. Mobile-first offline capability (the hostel-2am reality incumbents ignore).
18. Curriculum-native exam-weighted corpus (hygiene — necessary, not differentiating).
19. Distribution density (ambassador + influencer first-mover advantage).
20. Model routing / RAG plumbing — **explicitly NOT a moat; stop calling it one.**

## Top 20 Technical Priorities (Ranked)

1. Evaluation harness + CI eval gate + Langfuse observability.
2. pgvector migration (kill ChromaDB).
3. Reranker + strong embeddings + hybrid retrieval.
4. Groundedness verifier + calibrated "I don't know."
5. Exam-weighted curriculum graph in Postgres.
6. Structured memory / weakness graph (single `student_id`-filtered collection).
7. `ModelGateway` (Bedrock primary + OpenRouter fallback).
8. Semantic answer cache (COGS).
9. Outcome-capture event loop (the flywheel's closing step).
10. DPDP/consent + medical-safety guardrails as code.
11. Mobile PWA + offline cache.
12. Async worker plane (SQS + workers).
13. Observability + COGS dashboard + business SLOs.
14. CI/CD eval-gate pipeline + Terraform IaC.
15. Row-level security / tenant isolation (Postgres RLS).
16. Multi-AZ HA + graceful degradation chains.
17. Analytics warehouse + flywheel mart.
18. Voice cascade pipeline (premium-bounded).
19. Warm-standby DR + quarterly game-days.
20. Self-hosted GPU inference (only at the cost crossover).

## Top 20 Revenue Opportunities (Ranked)

1. Crisis-mode conversion at exam-time (the primary engine; target >20%).
2. Annual plans + net revenue retention (beat seasonality).
3. B2B2C college contracts (low CAC, sticky, ARPU-lifting).
4. NEET-PG / NExT-aspirant track (students already pay ₹40k–₹2L).
5. Clinical Mode premium tier (replaces ₹50k/mo clinical coaching).
6. FMGE / foreign-grad licensing prep (large, underserved).
7. CME for practicing doctors (recurring revenue, huge TAM).
8. Human-doctor SOS marketplace (high-margin).
9. Predicted question paper / premium mock exams.
10. White-label for medical colleges.
11. USMLE / PLAB international licensing track.
12. Clinician-authored case marketplace (rev-share).
13. Premium model depth (paid "explain deeply").
14. Multi-exam crisis optimization (back-to-back MBBS exams).
15. Faculty / institutional assessment tooling.
16. Residency / PG prep track.
17. Topper-notes / content marketplace.
18. Hospital / residency-program training contracts.
19. Coaching-institute partnerships.
20. Anonymized med-ed research insights & datasets.

## Top 20 Growth Opportunities (Ranked)

1. 3–10 design-partner colleges before an exam cycle (the PMF wedge).
2. Exam-cycle launch playbook (four spikes/year).
3. Edu-influencer trust-borrowing (the cheapest credible CAC).
4. Word-of-mouth powered by measurably-better predictions.
5. B2B2C college distribution (colleges distribute for you).
6. Campus-ambassador density (scaled only post-PMF, true cost in CAC).
7. Crisis-window virality (group crisis mode, shared decks).
8. NExT positioning as category creator (own Paper II).
9. Free trustworthy Tutor as top-of-funnel acquisition + data intake.
10. Outcome stories ("Crisis Mode moved my result").
11. Faculty network as two-sided growth (authors attract students).
12. College leaderboards & challenges.
13. Senior↔junior mentorship referral loops.
14. Regional-language expansion (TAM widening).
15. FMGE underserved-segment capture.
16. Per-college content packs as land-and-expand.
17. Internship companion (lifecycle retention → referrals).
18. Topper / AMA community series.
19. Scholarship / financing partners (access expansion).
20. Global-South geographic expansion.

## Top 20 Biggest Risks (Ranked)

1. Medical hallucination at the worst moment — no eval layer today (existential; fixed first).
2. DPDP child-data + behavioral-profiling exposure (penalties to ₹200 Cr; Consent Manager live 13 Nov 2026).
3. Incumbent (Marrow, ₹773 Cr profitable) ships an AI tutor on owned content.
4. Crisis Mode tipping into exploiting anxiety (wellbeing harm + dark-pattern/DPDP).
5. Unvalidated clinical grading teaches wrong medicine with false authority.
6. ChromaDB-per-student + OpenRouter-only infra collapsing at scale.
7. Margins inverting as premium (token-heavy) features scale.
8. Internally inconsistent unit economics (₹1,800 vs ₹3,300) destroying investor trust.
9. No proven monetization/retention — everything live today is the free tier.
10. NExT rollout slipping or changing (build for structure to hedge).
11. Involuntary churn from UPI-mandate/auto-debit failures (30–50% common in India).
12. Seasonality / weak trough retention between the four spikes.
13. Solo-founder key-person risk + thin team for a medical product's scope.
14. Readiness prediction wrong → betrays a terrified student → reputational death.
15. Voice COGS unbounded in a free tier.
16. CAC rising as the cheap ambassador channel exhausts.
17. Corpus coverage gaps → wrong/empty answers → churn.
18. Clinician-network supply (case library) slow + relationship-dependent.
19. Over-claiming moats reading as naïveté in diligence.
20. Scope creep (four modules at once) → four half-products.

## Top 20 Architectural Decisions (Ranked)

1. Deterministic by default; agentic only where ambiguity is irreducible.
2. Correctness as a first-class subsystem — evaluated everywhere.
3. One multi-tenant data plane; never per-user infrastructure.
4. pgvector now → Qdrant at ~5–10M vectors; ChromaDB killed.
5. Reranker + hybrid retrieval + strong embeddings (the accuracy lever).
6. Groundedness gate before display + calibrated "I don't know."
7. Bedrock-primary inference behind your own `ModelGateway`.
8. Modular monolith first; extract only voice + eval-workers early.
9. Curriculum graph in Postgres as the deterministic brain.
10. ~80% structured memory; one shared `student_id`-filtered vector collection.
11. One LangGraph supervisor per module + MCP as the tool bus.
12. Stateless compute, stateful managed stores.
13. ECS Fargate now; EKS only when GPU scheduling demands it.
14. `ap-south-1` primary + `ap-south-2` warm-standby DR (in-region for DPDP).
15. SSE for token streaming; one multiplexed WebSocket for voice + live plan.
16. Postgres RLS for tenant isolation (DB-enforced, not app-enforced).
17. Semantic cache + aggressive routing for COGS discipline.
18. PWA-first mobile; React Native only once retention justifies it.
19. Event-sourced memory (rebuildable, auditable, DPDP-erasable).
20. Feature flags for dark-launch + per-cohort exam-cycle rollout.

## Top 20 PMF Drivers (Ranked)

1. Crisis-window free→paid conversion >20%.
2. Measured exam-readiness / outcome lift vs. baseline (the whole thesis).
3. Answer groundedness / correctness >95–97%.
4. D30 retention that survives the inter-exam trough.
5. Organic referral spike in tight med-student communities.
6. NPS (Crisis + Clinical beta) above target.
7. Trustworthy, verifiable citations (vs. ChatGPT's none).
8. Mobile-first offline reliability at 2 a.m. on bad wifi.
9. Predictions visibly more right than generic AI.
10. Time-to-first-value < 5 minutes.
11. Wellbeing / distress-routing done right (trust, not exploitation).
12. Per-college relevance (PYQ-tuned, examiner-aware answers).
13. Readiness-prediction calibration (Brier improving each cycle).
14. Clinical grader-vs-faculty agreement above threshold.
15. Repeat crisis usage next cycle (resurrection rate).
16. Activation rate (first grounded answer + first weak topic found) >60%.
17. Annual-plan attach + NRR >100%.
18. Examiner-aware answering ("how marks are awarded").
19. Faculty adoption (case authoring) as an institutional signal.
20. Referral-rate / word-of-mouth coefficient.

---

## Closing note — how to keep this document alive

This is a living source of truth, not a monument. Three operating habits keep it true: **revisit the evaluation architecture (Section L) and the moat ranking (Section R) every planning cycle** — they are the heartbeat of the company; **replace every directional score in the Master Priority Matrix with real cohort data** as it arrives (the scores are honest judgment, not measurement); and **re-run the Conflict Resolutions** whenever a trigger fires (a vector-DB scale wall, a NExT regulatory change, a COGS crossover). The strategy compresses to one line, worth repeating: *the moat is the data and the validated clinical library, not the chatbot — so build the most trustworthy, most calming, most correct answer to the exam a student cannot afford to fail, instrument the outcome loop from day one, and let being measurably right make you impossible to catch.*

*Consolidated from the two AlmondAI master plans (the 1,367-line edition and the 919-line `linux` edition). Every idea from both was preserved and ranked; every conflict was resolved with a single decision. Targets and scores are directional benchmarks to be replaced with real data. This is strategic and engineering guidance, not legal or financial advice — engage qualified DPDP counsel for the compliance program and a financial advisor for the model.*









