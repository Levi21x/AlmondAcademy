---
name: almondai-tutor
description: Build the AlmondAI Tutor — the SSE-streamed, citation-bearing, verification-gated RAG chat with a Socratic follow-up loop, misconception capture, the MCQ engine, and FSRS spaced repetition. Use for anything about the tutor chat, answering student questions, Socratic probing, citations UX, MCQ generation/scoring, flashcards, spaced repetition, due queues, or "the chatbot" — including bugs like wrong answers (pair with almondai-rag-pipeline) or boring teaching.
---

# AlmondAI Tutor (Phase 4)

A tutor that only answers is a search engine with manners (master plan §5.1). This one answers *correctly* (correctness stack), then *teaches* (Socratic probe), then *remembers* (misconception capture). It is the top of the data funnel — every interaction feeds the weakness graph.

## Answer flow (LangGraph workflow — fixed steps, not a free agent)

`classify(intent, subject/topic) → memory.read(tutor, topic) → retrieve+rerank → generate (stream) → verify → cite → probe`

- **Classify** (gateway `classify`): subject/topic for retrieval filters + depth intent (`quick_lookup` vs `explain_deeply` — routes model tier; `explain_deeply` is the premium-gated intent).
- **Generate**: prompt = category-aware system prompt (`packages/prompts/tutor/answer.md`) + memory summary block + reranked chunks. Instructions: answer at the student's level, inline `[c:chunk_id]` after claim sentences, prefer corpus terminology, no claims beyond chunks.
- **Verify** then emit `verification` SSE event (see rag skill — same verifier instance).
- **Probe (the Socratic move)**: after a verified answer, generate ONE check-question targeting the likeliest misconception (input: answer + `confusable` edges for the topic + memory). Emit as `probe` SSE event; UI renders as tappable chip. Student's reply is scored (gateway `classify` against expected answer) → on miss, emit structured `misconception_detected{concept_a, concept_b, evidence}` marker into the session log — this marker is what the memory extractor consumes (no transcript guessing).
- Multimodal: when the topic maps to figures, include figure-bearing chunks and emit `citation` events with `figure_ref` so the UI shows the plate/slide alongside text.

## MCQ engine + spaced repetition (pure code — never LLM-scored)

- Serving: `GET /v1/tutor/mcq/next` pops the Redis due-queue (`zset due:{student}` by `due_at` from FSRS), fallback to weakest-mastery concepts, then new high-yield items.
- Scoring: deterministic compare; `POST /answer` → is_correct, ms_taken → FSRS update (memory skill's rule) → next due. Explanation shown from `mcq_items.explanation` (authored/curated, citable), not generated on the fly.
- Item authoring: LLM may *draft* items offline (worker, gateway `extract`, with citations to chunks) → human/faculty review queue → only `approved` items serve. Distractors should target known confusion pairs (`confusable` edges + misconception aggregates) — that's what makes them sting.
- Interleaving: due-queue mixer caps same-topic runs at 3 (retrieval practice beats blocked drilling).

## Chat session mechanics

- Session = Redis working memory (last ~10 turns, summarized rollups beyond); on close → extractor job (memory skill).
- Quota check (free: 50 q/day) happens in middleware before any model spend; the 51st question gets a friendly limit screen with the due-MCQ deck offered (free, deterministic, keeps the habit alive without COGS).
- Thumbs + "was this right?" on every answer → eval mining loop.

## Acceptance criteria

- E2E: seeded-corpus question → streamed answer with ≥1 tappable citation resolving to source+page, verified badge, then a probe chip; wrong probe answer → `misconception_detected` row lands via extractor. Tutor suites green (recall/groundedness/citation gates). MCQ next/score round-trip <100ms server-side; FSRS due ordering proven by fixture. Quota exhaustion path renders correctly. p95 first token ≤1.5s local.

## Anti-patterns

- Answering beyond the corpus instead of the honest-fallback path; probes that quiz trivia instead of targeting confusable pairs; LLM-graded MCQs; serving unapproved generated items; stuffing whole chat history into prompts (working-memory summary only); skipping the probe to save tokens — the probe is the data flywheel's intake valve.

References: IMPLEMENTATION.md Phase 4, §6–7; master plan §5.1, §3.8, §13.2.
