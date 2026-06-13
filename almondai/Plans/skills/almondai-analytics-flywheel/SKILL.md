---
name: almondai-analytics-flywheel
description: Build AlmondAI's event spine and data flywheel — the typed consent-aware event registry, ClickHouse warehouse, outcome capture (post-exam results + prediction scoring), the topic_confusion and prediction_accuracy marts, and KPI queries for all eight KPI families. Use for anything about analytics, events, tracking, funnels, retention curves, the data flywheel, outcome capture, prediction calibration, KPI dashboards, or cohort analysis. If a feature should emit or measure something, load this to find the right event and mart.
---

# AlmondAI Analytics & Flywheel (Phase 4 onward)

Claiming a flywheel and engineering one are different things (master plan §13). The loop only spins if it CLOSES: capture → aggregate → predict → act → **outcome** → back to aggregate. Step 5 (outcomes + scoring our own predictions) is the step everyone skips — wire it from day one, even at tiny N.

## Event spine (`modules/events`)

- Registry: `events/registry.py` — every event a Pydantic model: `name, version, student_id?, session_id, ts, consent_flags, props`. Adding an event = adding a model (typo-proof, schema-versioned). Full list in IMPLEMENTATION.md §9.
- Flow: `emit()` → local queue (Redis stream dev / Kinesis-Firehose prod) → S3 raw (replayable forever) → ClickHouse typed tables. Client events batch through `POST /v1/events` (server stamps identity; never trust client identity fields).
- **Consent-aware by construction**: emit() checks the purpose flag for behavioral events; minors without consent → event dropped or stripped to anonymous aggregate (decision per event class in the registry, reviewed with safety skill). This is DPDP-safe analytics as architecture, not policy memo.

## Outcome capture (the closing step)

- Post-exam flow: exam date passes → gentle prompt ("how did it go?") → `outcomes` row (pass/fail/score, self_reported). Opt-in result sharing for verified scores later. Make it 10 seconds and skippable-but-re-asked-once.
- Prediction scoring job (per exam cycle): join `predictions` × `outcomes` → Brier score / calibration curves per model_version → `prediction_accuracy` mart. **Crisis readiness copy is allowed to claim accuracy only from this mart.**
- Triage adherence × outcome and plan adherence × outcome marts — the "does following AlmondAI actually work" evidence (the marketing claim that must be earned, and the planner/crisis moat).

## ClickHouse marts (built by ETL workers; the warehouse is for questions, Postgres is for serving)

| Mart | Content | Consumers |
|---|---|---|
| `topic_confusion` | anonymized misconception aggregates: concept-pair × cohort × college × period, min-cohort threshold (k≥20) | content priorities, examiner-traps, the proprietary-dataset story |
| `prediction_accuracy` | calibration per model_version per cycle | crisis trust gate, investor metrics |
| `funnels` | activation (signup→first verified answer→first weak topic), crisis conversion (session→paywall→paid) | growth |
| `retention` | D1/7/30/90 cohort curves, inter-exam trough retention, resurrection at next cycle | the PMF signals (plan §18.5) |
| `cogs` | per-user/module/model cost rollups (from `model_call`/`voice_usage`) | the margin truth (plan §4.3) |
| `learning` | mastery gains, misconception-resolution rate, retention-curve adherence | North-Star feeders (§14.2) |

Aggregation thresholds enforced IN the mart definitions (no small-cell exports) — protects minors and partner-college trust.

## KPI surfacing

KPI queries live as versioned SQL in `ops/dashboards/queries/` consumed by Grafana dashboards-as-code (observability skill renders): exec scorecard (North Star: exam outcomes improved per paying student + ARR, conversion, retention, groundedness), AI-quality, wellbeing/safety. Every KPI carries owner + decision-it-informs as a SQL comment (a metric nobody acts on is vanity — §14).

## Acceptance criteria

- Registry typo-test (unknown event name = compile/test error). Consent fixture: minor-without-consent behavioral event → dropped/stripped, transactional events still flow. Raw S3 → ClickHouse replay proven on fixture (warehouse rebuildable). Outcome prompt e2e; prediction-scoring job produces correct Brier on hand-checked fixture. `topic_confusion` respects k-threshold (query for tiny cohort returns nothing). Funnel events fire end-to-end through real flows (activation funnel covered by integration test).

## Anti-patterns

- Freeform `track("string", {...})` calls (registry or nothing); analytics blocking the request path (always async); identity from client payloads; shipping "78% margin"-style claims not backed by the cogs mart (the plan's explicit rule — §4.3); flywheel slide-ware: aggregates nobody queries — every mart must have a named consumer; deleting raw events (S3 is the replayable source of truth; storage is cheap, history isn't rebuildable).

References: IMPLEMENTATION.md §9, Phases 4–8; master plan §3.11, §13 (all), §14 (all).
