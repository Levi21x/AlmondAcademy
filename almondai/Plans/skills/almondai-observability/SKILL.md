---
name: almondai-observability
description: Build AlmondAI's three observability planes — Langfuse LLM tracing (every model call with prompt, context, tokens, cost, eval score), OpenTelemetry infra/app metrics into Grafana, Sentry errors, plus SLO alerting (hallucination-escape, latency, COGS anomalies) and the three dashboards-as-code (exec, AI-quality, wellbeing/safety). Use for anything about logging, tracing, monitoring, alerts, dashboards, SLOs, debugging production issues, latency investigation, or cost visibility. Wire it as features are built, not after.
---

# AlmondAI Observability (Phase 0 onward, completed Phase 8)

Three planes, one pane of glass (master plan §3.12). The plane most teams skip — LLM observability — is the one a medical AI product cannot skip: without per-call traces with cost and eval scores you are flying blind on both quality and spend.

## Plane 1 — LLM observability (Langfuse)

- Every `ModelGateway` call auto-traced: prompt (PII-scrubbed already — safety skill runs first), retrieved context ids, model/provider, tokens, cost_inr, latency, cache_hit, intent, module, student tier (not identity), trace_id linking to the request.
- LangGraph runs = nested traces (graph → node spans). Verification results attach as scores; thumbs feedback attaches as scores; eval-harness runs land in Langfuse datasets (one quality timeline across CI and prod).
- Sampling: 100% of calls traced (metadata is cheap); prompt/completion bodies sampled down only if volume forces it — keep 100% for flagged sessions (low groundedness, support_mode, character_break).

## Plane 2 — infra/app (OTel → Prometheus/Grafana locally; +CloudWatch in prod)

- FastAPI auto-instrumentation + manual spans around retrieval stages (embed, search, rerank, verify — the latency budget needs per-stage attribution), Redis/DB clients, queue consumers (lag!), webhook processing.
- RED metrics per route; queue depth/age per worker type; DB: connections, slow queries, partition sizes; cache hit rates (semantic, TTS, quota).
- Trace propagation: one request_id from edge → SSE events (`meta`) → workers (carried in queue envelopes) → Langfuse. Debugging a bad answer must be ONE lookup.

## Plane 3 — errors (Sentry)

API + web + workers, release-tagged, request_id in context. Alert on new-error-type spikes, not raw volume.

## SLOs & alerts (`ops/alerts/` as code; thresholds from IMPLEMENTATION.md §8)

| Alert | Condition | Action |
|---|---|---|
| Hallucination escape | verification failures >5/1k over 1h | page — this is the medical-safety pager |
| Groundedness sag | rolling <95% | page |
| Tutor p95 first-token >1.5s / voice turn >1.2s / triage >700ms | 15-min window | warn → page at 2× |
| COGS anomaly | per-user or total cost z-score spike | warn + auto-report top offenders |
| Distress-routing failure | `distress_detected` without `support_routed` | page (ethics SLO) |
| Provider failover sustained | circuit open >10 min | warn |
| Queue lag | extractor/ETL age > threshold | warn (memory staleness) |
| Payment webhook failures / reconciliation drift | any | page (money) |

## The three dashboards (as code, `ops/dashboards/`; queries from analytics skill)

1. **Exec scorecard**: North Star (outcome lift per paying student), ARR/MRR, crisis conversion, retention curves, groundedness headline.
2. **AI quality**: groundedness/citation/recall trends, eval-gate pass rate, latency percentiles per surface, cache hit, COGS per answer/user, determinism ratio, failover counts.
3. **Wellbeing/safety**: distress detections + routing success, support_mode sessions (weekly human review queue feeds from this), hallucination escapes, character-break rate, grader-agreement trend, refusal correctness. *Not optional — this board is how the product stays on the right side of ethics and DPDP (plan §14.8).*

## Acceptance criteria

- One request_id resolves: API log ↔ trace ↔ Langfuse ↔ worker logs ↔ Sentry (demonstrated in a runbook). Synthetic breach fixtures fire each pager alert in staging. Dashboards render from code on a fresh Grafana. Per-stage retrieval spans visible (a slow answer is attributable to embed/search/rerank/verify/LLM in one view). COGS dashboard reconciles with gateway meter fixture.

## Anti-patterns

- Console-built dashboards (code or it doesn't exist); logging raw prompts with PII (scrub before trace); alert fatigue (every alert above maps to a runbook in `ops/runbooks/` — no runbook, no alert); observability as a Phase-8 retrofit (wire as you build; this skill is referenced from Phase 0); metrics without owners (inherit owner+decision from the KPI registry).

References: IMPLEMENTATION.md §8, Phases 0/2/8; master plan §3.12, §14.
