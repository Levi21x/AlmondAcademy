---
name: almondai-rag-pipeline
description: Build AlmondAI's medical-grade retrieval pipeline — textbook ingestion, semantic chunking, Qwen3/Voyage embeddings into pgvector, hybrid BM25+dense search, BGE reranking, and the groundedness verifier that blocks unsupported medical claims. Use for anything touching ingestion, chunking, embeddings, vector search, retrieval quality, citations, hallucination prevention, or answer verification — even if the request just says "the tutor gave a wrong answer" or "add a textbook".
---

# AlmondAI RAG Pipeline (Phase 2)

The pipeline that must be *correct, not clever* (master plan §3.8). Retrieval failures here become confident wrong medical answers at 2 a.m. before an exam. Every stage is measurable and gated by `almondai-eval-harness`.

## Pipeline stages

**1. Ingestion (worker, offline)**
- Parse: layout-aware PDF parsing (tables, figures, captions are first-class — anatomy/physio meaning lives in them). Keep figure captions attached to their text.
- Chunk: semantic boundaries (headings/concept transitions), target 300–800 tokens, never mid-table. Each chunk gets: `source, subject_id, topic_id, concept_id (mapped where possible), page, meta{figure_refs, headings}`.
- Enrich: map chunks to curriculum concepts (string+embedding match, human-reviewable mapping file) so `exam_weight` becomes a retrieval signal.
- Index: embedding (1024-d) into `chunks.embedding` (HNSW: `m=16, ef_construction=64`), tsvector into `chunks.tsv` (GIN). Idempotent by content hash; re-ingest replaces by `source_id+page+hash`.

**2. Retrieval (request path, `modules/retrieval`)**
```
candidates = RRF( dense_topk(query_emb, 50), bm25_topk(query, 50) )   # k=60
candidates = boost(candidates, exam_weight, recency_of_confusion)      # ×(1 + α·weight), α≈0.15, tuned via eval only
top8       = bge_rerank(query, candidates[:50])[:8]
```
- Filters always applied: subject/topic if classified; `status='active'` sources.
- Reranker runs as its own small service/process (CPU ONNX fine locally); if it's down → dense-only + `quality_degraded=true` flag propagated to the SSE `meta` event (degrade, never dark).

**3. Generation** — via `almondai-model-gateway`, prompt from `packages/prompts/tutor/`, with mandatory inline citation markers `[c:<chunk_id>]` after each claim-bearing sentence.

**4. Groundedness verification (the non-negotiable stage)**
- Split answer into claims (sentence-level, skip hedges/transitions).
- For each claim: entail-check against its cited chunk(s) (small NLI-capable model via gateway `verify` intent; batched; ~1 call).
- Outcomes: `supported` → keep; `unsupported_minor` → repair pass (regenerate the claim constrained to chunks) once; `unsupported_major` or repair fails → drop claim; if >30% claims drop → return honest fallback ("I can only partially answer from the corpus…" + what *is* supported + offer to broaden).
- Emit `verification` SSE event: `{groundedness: 0..1, repaired: n, dropped: n}`. Log claim-level results to Langfuse for eval mining.
- Latency: run on the buffered full answer *before* `done`; budget ≤ 800ms. Stream tokens optimistically, but visibly mark the answer "verified ✓" only after the event (frontend skill renders this).

**5. Capture** — log query, candidate set, rerank order, final chunks, answer, verification, latency, cost → `interactions` + Langfuse trace (the eval harness and flywheel both mine this).

## Acceptance criteria

- Golden sets: recall@10 ≥ 0.85, citation correctness ≥ 95%, groundedness ≥ 95% (CI-gated).
- Drug-name/eponym queries (BM25's job) hit the right chunk in top-8 — keyword fixture test.
- Kill the reranker container → answers still serve with `quality_degraded`; verifier latency p95 ≤ 800ms; re-ingesting a source is idempotent.
- A seeded "trap" eval question whose answer is NOT in the corpus produces the honest fallback, not an invented answer.

## Anti-patterns

- MiniLM or any unbenchmarked embedding swap (eval gate decides, not vibes). Fixed 512-token blind chunking. Skipping rerank "for latency" — fix latency elsewhere. Letting `exam_weight` boost override relevance (cap the boost; tune only via eval). Verifier as a separate "later" ticket — it ships with retrieval or retrieval doesn't ship. Embedding the whole corpus on every deploy (content-hash idempotency).

References: IMPLEMENTATION.md Phase 2, §7–8; master plan §3.4, §3.8, §15.1–15.2.
