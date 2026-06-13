---
name: almondai-data-model
description: Design and evolve AlmondAI's PostgreSQL system of record — every table, Alembic migration, row-level-security policy, index, and time partition. Use whenever creating or altering tables, writing migrations, adding RLS, touching mastery/attempts/consent/subscription/case storage, or whenever any feature needs "where does this data live?" answered. Load this before inventing any new storage.
---

# AlmondAI Data Model (Phase 1)

One multi-tenant Postgres data plane (master plan §3.3, §8). The unit of scale is a row with `student_id` — never a container, schema, or DB per student. ~80% of "memory" is structured rows here; vectors are a minority concern.

## Schema (DDL sketch — implement via Alembic, with FKs, NOT NULLs, and indexes)

**Identity & compliance**
- `colleges(id, name, university, state)`
- `students(id uuid pk, email uniq, phone, name, dob date, college_id fk, year smallint, language_pref, tier text check in ('free','premium'), is_minor bool generated from dob, created_at)`
- `consents(id, student_id, kind text, granted bool, guardian_name, guardian_contact, policy_version, created_at)` — **append-only ledger**: revocation = new row with granted=false. Never UPDATE/DELETE.
- `audit_log(id, actor, action, entity, entity_id, request_id, created_at)` — append-only; every data-rights action and admin access lands here.

**Curriculum & corpus** (detail in `almondai-curriculum-graph` / `almondai-rag-pipeline`)
- `subjects`, `topics`, `concepts` (tree via parent ids), `concept_edges(from_id, to_id, kind check in ('prereq','confusable'))`
- `exam_types(code: prof|next_p1|next_p2|neetpg|fmge)`, `exams(id, college_id null for national, exam_type, name, date)`
- `exam_weights(concept_id, exam_type, college_id nullable, weight numeric, pyq_frequency numeric, is_high_yield bool)`
- `sources(id, title, authors, edition)`, `chunks(id, source_id, subject_id, topic_id, concept_id null, page int, content text, tsv tsvector generated, embedding vector(1024), meta jsonb)`

**Learning state**
- `mastery(student_id, concept_id, score numeric 0..1, stability, difficulty, due_at, reps, lapses, last_reviewed, pk(student_id, concept_id))` — FSRS state lives here.
- `misconceptions(id, student_id, concept_a, concept_b null, count, last_seen, note text)` — the misconception graph; aggregate of this table (anonymized) is the flywheel's crown jewel.
- `mcq_items(id, concept_id, stem, options jsonb, correct_idx, explanation, difficulty, trap_tags text[])`
- `mcq_attempts(id, student_id, item_id, chosen_idx, is_correct, ms_taken, context text check in ('practice','crisis','mock'), created_at)` — **partition by month**.
- `interactions(id, student_id, session_id, module, kind, payload jsonb, created_at)` — **partition by month**; append-only raw log from which memory is derived (rebuildable).

**Plans, crisis, clinical**
- `study_plans(id, student_id, exam_id, params jsonb, status, created_at)`; `plan_blocks(id, plan_id, concept_id, scheduled_on date, minutes, kind check in('learn','review','mock'), status, completed_at)`
- `crisis_sessions(id, student_id, exam_id, hours_left numeric, state jsonb, created_at)`; `triage_decisions(id, crisis_session_id, concept_id, bucket check in('master','skim','abandon'), expected_marks numeric, minutes numeric, reason text)`
- `clinical_cases(id, specialty, difficulty smallint, case_object jsonb, version int, status check in('draft','in_review','validated','retired'), author_id, validated_by, validated_at)` — case_object schema in `almondai-clinical-mode`; only `validated` cases are servable.
- `clinical_attempts(id, student_id, case_id, mode check in('history','osce','viva','ward'), transcript jsonb, case_sheet jsonb, rubric_scores jsonb, total_score numeric, red_flags_caught int, red_flags_total int, created_at)` — partition by month.

**Predictions & outcomes (the flywheel's closing step — wire from day one)**
- `predictions(id, student_id, exam_id, kind, band text, detail jsonb, model_version, created_at)`
- `outcomes(id, student_id, exam_id, result check in('pass','fail','unknown'), score numeric null, self_reported bool, created_at)`

**Billing**
- `subscriptions(id, student_id, plan, status, razorpay_subscription_id, current_period_end, created_at)`; `payments(id, student_id, razorpay_payment_id uniq, amount_inr, status, raw jsonb, created_at)`; `entitlements(student_id pk, tier, source, valid_until)` — the **only** table quota checks read.

## Rules

1. **RLS on every student-owned table.** Policy: `student_id = current_setting('app.student_id')::uuid`. The API sets `app.student_id` per-connection from the JWT (in `db/session.py`); admin/worker roles use a separate role with explicit grants. Add a pytest that connects as student A and proves zero visibility into B across ALL student tables (loop over catalog).
2. **Append-only where trust matters**: consents, audit_log, payments, predictions, outcomes, interactions. Enforce with `REVOKE UPDATE, DELETE` + trigger guard.
3. **Partitioning**: `interactions`, `mcq_attempts`, `clinical_attempts` by month (pg_partman or native). Create next-month partitions via a worker job.
4. **Derived vs canonical**: mastery/misconceptions are *derived* — recomputable from `interactions` + `mcq_attempts`. Write the rebuild job interface now (memory skill implements it).
5. **DPDP erasure path**: a single `erase_student(student_id)` procedure deleting/anonymizing across all tables (consents + audit retained as legal record with PII nulled), called only from the rights endpoint, audit-logged.
6. Indexes: every FK; `(student_id, due_at)` on mastery; `(student_id, created_at desc)` on partitioned tables; GIN on `chunks.tsv`; HNSW on `chunks.embedding` (see rag skill).

## Acceptance criteria

- RLS cross-tenant test green across all student tables; migrations up→down→up clean; partitions auto-created; erasure procedure passes its test (B's data gone, ledger intact); append-only triggers proven by failing UPDATE test.

## Anti-patterns

- Per-student anything (DBs, schemas, collections). JSONB as a lazy default — payload JSONB is fine for logs, never for queried business fields. Soft-deleting consent rows. Reading tier from `students` instead of `entitlements` in quota paths. Trusting `student_id` from a request body anywhere.

References: IMPLEMENTATION.md Phase 1, §6; master plan §3.3, §8.1–8.4, §2.13.
