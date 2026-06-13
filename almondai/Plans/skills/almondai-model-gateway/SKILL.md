---
name: almondai-model-gateway
description: Build and tune AlmondAI's ModelGateway — the owned routing layer over Bedrock (primary) and OpenRouter (fallback): intent-based model tiers, failover, hedging, the Redis semantic cache, token/cost metering, and per-tier model policies. Use for anything involving LLM calls, model selection, provider outages, inference cost, caching answers, rate limits from providers, or "which model should X use" — all model calls in the codebase go through this layer, no exceptions.
---

# AlmondAI ModelGateway (Phase 2)

The routing *policy* is company IP; vendors are interchangeable behind it (master plan §3.9, §15.3). Every LLM call in the codebase goes through `gateway.complete()` / `gateway.stream()` — grep-able invariant.

## Interface

```python
class ModelRequest(BaseModel):
    intent: Literal["lookup","synthesis","deep_reasoning","classify","extract",
                    "roleplay","grade","verify","embed","rerank"]
    messages: list[Message]; tier: Literal["free","premium"]
    latency_sensitive: bool = False; max_tokens: int | None = None
    cacheable: bool = False; cache_context: str | None = None   # e.g. sorted chunk-id hash
    metadata: dict  # student_id?, module, trace_id — flows to Langfuse

async def complete(req) -> ModelResponse        # .text, .usage, .cost_inr, .model, .provider, .cache_hit
async def stream(req) -> AsyncIterator[Chunk]
```

## Routing policy (config-driven: `gateway/policy.yaml`, hot-reloadable)

| Intent | Default | Premium/deep | Notes |
|---|---|---|---|
| lookup, classify, extract, verify | small-fast tier | same | verify batches claims |
| synthesis (RAG answers) | mid (Qwen3-class) | mid | the workhorse |
| deep_reasoning ("explain deeply") | mid | gpt-oss-120B-class | paid gate enforced here |
| roleplay (patient/viva) | mid, temperature per persona | premium for paid | needs consistency settings |
| grade (rubric scoring) | mid, temperature 0, JSON mode | same | determinism matters |
| embed / rerank | embedding + reranker endpoints | same | separate providers OK |

Policy maps intent×tier → ordered `[primary, fallback…]` model+provider list with per-model params. Model IDs live ONLY here — never in module code. Benchmarks on *our* golden sets (eval harness) decide changes, not leaderboard vibes.

## Provider layer

- `BedrockProvider`, `OpenRouterProvider` behind one `Provider` protocol (`complete/stream/health`). Map provider errors to a common taxonomy: `RateLimited`, `Overloaded`, `ContextTooLong`, `ProviderDown`, `ContentFiltered`.
- **Failover**: on `ProviderDown/Overloaded/RateLimited` → next in list (model-equivalent or one tier down), log `failover` event. Circuit breaker per provider+model (open after N failures/30s, half-open probes).
- **Hedging** (latency-sensitive requests only): fire fallback if no first token in 2.5s; first responder wins, loser cancelled. Cap hedge rate <5% via budget guard.
- Student-data governance: requests with `metadata.student_id` prefer the in-region/governed provider (Bedrock in prod) unless it's down — policy flag `data_sensitive_route`.

## Semantic cache (Redis) — the 20–40% COGS lever

- Key: `intent + normalized_query_embedding + cache_context` (cache_context = hash of retrieved chunk ids so corpus changes invalidate naturally).
- Hit rule: cosine ≥ 0.97 against cached query embedding AND identical cache_context AND cached answer was **verified** (groundedness ≥ threshold). Store: answer, citations, verification, model, cost. TTL 7d, LRU bound.
- Only `cacheable=true` flows (tutor synthesis; TTS text in voice skill). Never cache: personalized-memory-injected answers (unless memory summary hash is part of the key), grading, roleplay, anything with PII.
- Serve path: cache hit → emit full SSE replay with `meta.cache_hit=true` (still instant-feeling; replay tokens in chunks).

## Cost metering

Every response computes `cost_inr` from a maintained price table (`gateway/prices.yaml`); emit `model_call` event {module, intent, model, tokens, cost, cache_hit, latency}. This feeds the COGS-per-active-user dashboard (`almondai-observability`) — the metric the master plan demands before any margin claim.

## Acceptance criteria

- Kill primary provider in a test → automatic failover, zero 5xx to clients, `failover` events logged. Near-duplicate query within TTL → cache hit with verified answer. Premium intent from a free-tier user → policy downgrades (and surfaces upgrade hint via error code, not exception). Grep proves no module calls providers/SDKs directly. Cost meter totals reconcile with a synthetic-load fixture ±2%.

## Anti-patterns

- OpenRouter as the router (it's one provider behind YOUR policy). Model IDs hardcoded in modules. Caching unverified or personalized answers. Retrying `ContentFiltered` (handle, don't hammer). Temperature >0 for grading. Skipping the cost meter on "internal" calls — extractors and evals are real COGS too.

References: IMPLEMENTATION.md Phase 2, §7–8; master plan §3.9, §4.3, §15.3.
