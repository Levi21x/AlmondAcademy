---
name: almondai-foundations
description: Scaffold and maintain the AlmondAI monorepo — FastAPI modular monolith, Next.js PWA workspace, Docker Compose stack, Makefile, CI pipeline, config/error/middleware conventions. Use whenever creating the repo, adding a new module, touching docker-compose/Makefile/CI, app startup, settings, error handling, or when any task says "Phase 0" or "set up the project", even if the user just says "get the project running".
---

# AlmondAI Foundations (Phase 0)

Implements IMPLEMENTATION.md Phase 0 and master plan §3.2/§3.15. Goal: every later task lands on rails — one deployable API, one web app, one compose stack, one CI pipeline.

## Build steps

1. **Monorepo scaffold** exactly per IMPLEMENTATION.md §3. Use `uv` for Python deps, `pnpm` workspaces for JS. Python 3.12, Node 20.
2. **FastAPI app factory** (`apps/api/src/almondai/main.py`):
   - `create_app()` assembling routers from `modules/*/router.py`. Modules register themselves; no god-file imports.
   - Middleware chain, in order: request-ID → CORS → auth context → RLS tenant context → quota check (skippable per route) → safety guardrails (Phase 3 plugs in here) → exception envelope.
   - Lifespan: init async engine (SQLAlchemy 2 async + asyncpg), Redis pool, httpx client, Langfuse client. All clients are app-state singletons; nothing global.
3. **Settings**: `config.py` with pydantic-settings; every key documented in `.env.example` with a comment and a safe local default. Fail fast on missing prod-required keys when `ENV=production`.
4. **Error model**: one exception hierarchy (`AlmondError(code, message, http_status, details)`); handler emits `{code, message, details, request_id}`. Never leak stack traces to clients; always to Sentry.
5. **Docker Compose**: `postgres` (image `pgvector/pgvector:pg16`), `redis:7`, `minio`, `clickhouse`, `langfuse` (+ its postgres), `api`, `web`, `worker`. Healthchecks on all; `api` depends_on healthy postgres/redis. Volumes for data persistence. One network.
6. **Makefile** targets: `bootstrap`, `dev`, `test`, `eval`, `seed`, `migrate`, `loadtest`, `lint`, `fmt`. `bootstrap` must be idempotent and succeed on a clean machine with only Docker + make installed.
7. **CI (GitHub Actions)**: jobs lint(ruff,mypy,tsc,eslint) → test(pytest -x, vitest) → SAST(semgrep) + dep scan → eval gate (from `almondai-eval-harness`; allow `skip-eval` label only for docs-only PRs) → build images. Trunk-based; PRs small; OIDC to AWS later (no long-lived keys, ever).
8. **Worker entrypoint**: same codebase, `python -m almondai.workers` consuming the queue abstraction (`modules/events`); local broker = Redis streams, prod = SQS, behind one `Queue` interface.
9. **Health endpoints**: `/healthz` (process up + build SHA + git ref), `/readyz` (DB/Redis ping).

## Conventions to enforce (these propagate everywhere)

- Async everywhere on the request path; sync only in workers where libs demand it.
- Module boundary rule: modules import from `db`, `gateway`, `events`, `schemas` — never from each other's internals. Cross-module calls go through each module's `service.py` public functions or an MCP tool. This is what keeps the monolith extractable later.
- All times UTC in storage; IST only at presentation.
- Feature flags via a tiny `flags.py` backed by env/Redis now (LaunchDarkly-compatible interface), because Crisis/Clinical dark-launch (master plan §3.14) depends on it.

## Acceptance criteria

- Clean machine: `cp .env.example .env && make bootstrap && make test` green; `curl /healthz` returns SHA.
- A deliberately failing unit test blocks CI; a semgrep finding blocks CI.
- `docker compose down -v && make bootstrap` rebuilds from nothing (idempotency).
- Module-boundary lint (import-linter contract) passes and is in CI.

## Anti-patterns

- Microservices, separate repos, or splitting voice/workers into other codebases now — extraction is allowed only when a module proves a different scaling profile (master plan §3.2).
- Global mutable clients, sync DB drivers, business logic in routers (routers parse/validate → call service → shape response).
- Any infra by console; anything not reproducible by `make bootstrap` doesn't exist.

References: IMPLEMENTATION.md §3–4, Phase 0; master plan §3.2, §3.14–3.15.
