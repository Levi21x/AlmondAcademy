---
name: almondai-infra-aws
description: Build AlmondAI's AWS production infrastructure with Terraform — VPC, ECS Fargate services, RDS Postgres Multi-AZ with pgvector, ElastiCache, S3, SQS/EventBridge, CloudFront+WAF, Cognito, Bedrock access, Secrets Manager, ap-south-1 primary with ap-south-2 warm-standby DR, blue/green deploys, exam-season pre-scaling, and k6 load tests. Use for anything about deployment, AWS, Terraform, scaling, DR, networking, IAM, certificates, environments, load testing, launch readiness, or production incidents involving infrastructure.
---

# AlmondAI Infrastructure (Phase 8)

Region strategy is a compliance feature: **ap-south-1 (Mumbai) primary, ap-south-2 (Hyderabad) warm standby** — data residency for DPDP, latency for students, DR for exam season (master plan §4). Everything Terraform; nothing console-clicked. The same containers from `make dev` deploy unchanged.

## Terraform layout (`infra/terraform/`)

`modules/`: network (VPC, 3 AZ, private subnets for compute+data, VPC endpoints for S3/Bedrock/Secrets — model traffic never crosses the public internet), ecs (cluster + services api/worker/voice with separate scaling), rds (Postgres 16 Multi-AZ, pgvector, PITR, cross-region snapshot copy), redis (ElastiCache Multi-AZ), storage (S3 + lifecycle Standard→IA→Glacier, CRR for corpus/exports), queues (SQS + DLQs per worker type, EventBridge bus, Firehose→S3), edge (CloudFront + WAF tuned for scrape/credential-stuffing + Shield, Route 53 health-check failover, ACM), auth (Cognito: OTP/social login), observability (CloudWatch, OTel collector, alarm wiring), security (KMS, Secrets Manager + rotation, GuardDuty, Security Hub, Config, CloudTrail, Macie on PII buckets), ci (OIDC role for GitHub Actions — zero long-lived keys).

`envs/staging` + `envs/prod` compose modules with sizes; staging is prod-shaped, smaller. Remote state S3+lock, plan in CI, apply on approval.

## Services & scaling

- **api**: Fargate, ≥2 AZ, ALB (SSE-friendly idle timeouts ≥120s, WS support), target-tracking on CPU + p95 latency; scale-in protection during exam windows.
- **worker**: Fargate **Spot** (interruptible batch: extractors, embeddings, ETL, eval, packs), per-queue autoscaling on depth; DLQ alarms.
- **voice**: separate service (different latency/scaling profile — the one extraction the plan pre-approves, §3.2).
- RDS: read replica for exam-season read spikes; pgvector here until ~5–10M chunks (then Qdrant decision per plan §15.1 — not before).
- Postgres RLS works identically in RDS (roles in migrations, not console).

## Deploys & flags

Blue/green (CodeDeploy on ECS) with automated rollback on SLO breach (alarms from observability skill are the rollback triggers); migrations expand→migrate→contract (never breaking mid-deploy); feature flags gate Crisis/Clinical dark-launches to ambassador cohorts (plan §3.14).

## Exam-season playbook (the defining operational pattern)

Demand is 4 predictable spikes (Jan/Feb, Jul/Aug ± college calendars). **Pre-scale, don't react**: 1–2 weeks before — raise Fargate min counts, RDS instance class/replica, Redis node size, provider rate-limit increases requested, Savings Plans cover the baseline only (burst stays on-demand/Spot). Load-test FIRST: `make loadtest` k6 profiles (exam-spike: 10× baseline, SSE-heavy, triage bursts at midnight IST; soak: 6h) against staging at prod size. Scale down after — the plan's cost rule (§4.3.7).

## DR (warm standby, ap-south-2)

- Replicated: RDS (cross-region read replica or snapshot-copy + PITR), S3 CRR (corpus, exports, raw events), Secrets, AMIs/images. Redis = rebuildable cache, NOT a DR target.
- Standby: IaC-reproduced minimal stack, scaled near-zero; promotion runbook: promote RDS → scale services → Route 53 health-check failover flips. Target RTO ≤ 1h, RPO ≤ 15min (exam-season tightened).
- **Quarterly game-day** (scripted in `ops/runbooks/dr-gameday.md`): restore-from-backup drill + full failover drill. A backup never restored is a hope, not a plan (§4.5).

## Acceptance criteria

- `terraform plan` clean on fresh account (bootstrap docs); staging passes the FULL Phase 2–7 gate suite; k6 exam-spike holds p95 budgets with degradation ladder engaged (never dark — kill the premium provider mid-test and watch fallbacks); DR drill meets RTO/RPO with evidence; OIDC-only CI proven (no AWS keys in secrets); GuardDuty/Security Hub clean baseline; databases unreachable from public internet (scanner proof).

## Anti-patterns

- EKS/Kubernetes now (Fargate until GPU scheduling matters — §3.14); console changes (drift detection should stay silent); single-AZ anything stateful; reactive-only autoscaling for known spikes; pilot-light DR (too slow for exam season — warm standby is the chosen trade, §4.5); long-lived IAM keys anywhere; skipping the game-day because "the backups are automated".

References: IMPLEMENTATION.md Phase 8, §8; master plan §4 (all), §3.14–3.15.
