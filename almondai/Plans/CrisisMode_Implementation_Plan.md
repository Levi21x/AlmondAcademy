# Crisis Mode v2 — Complete Implementation Plan
## "Co-Work for the Night Before the Exam"

**This is the build plan.** Companion to `CrisisMode_CoWork_Ideation.md` (the *why*). Designed as a senior systems architect would: phase-gated, file-precise, with exact data contracts and clear deterministic/agentic boundaries. Nothing here is speculative — every decision is grounded in the actual codebase read on 2026-06-27.

---

## 0. Pre-Build: What We Know About the Existing Codebase

### Keep (solid, proven — do not touch)
| File | Why it stays |
|---|---|
| `services/crisis/readiness.py` | Deterministic, correct, tested |
| `services/crisis/panic.py` | Deterministic, correct, handles distress |
| `services/crisis/last_night.py` | Stateless, still useful for ≤12h scenario |
| `database/migrations/008_crisis.sql` | All existing tables stay; we ADD new ones |
| `database/migrations/017_crisis_warroom.sql` | Stays |
| All existing `crisis.py` routes | Extended, not replaced |
| `core/cache.py` TTLCache | Already the right pattern |
| `services/llm/openrouter_client.py` | The LLM infra — use as-is |

### Replace / Extend
| Old | New |
|---|---|
| `crisis_generator.py` (monolith single-shot) | Split into `orchestrator.py` + `agents/` module |
| `CrisisContent.tsx` (one-zone form) | Three-zone layout: Jar · Chief Resident · Artifacts |
| `crisis.api.ts` | Extended with new types + functions |

### Architecture non-negotiables (from CLAUDE.md never-do list)
- No LangGraph, no Celery, no Redis, no per-student vector DBs, no ChromaDB
- No LLM in readiness/panic/scheduling/sacrifice math — those stay deterministic
- No precise readiness scores in UI — banded only ("You're in the red zone")
- No upsell inside detected-distress sessions — ever
- All agent writes go through validating tools only
- Postgres RLS + `student_id` on every new row

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND — Three-Zone Crisis Workspace                         │
│  ┌─────────────┐  ┌──────────────────────┐  ┌───────────────┐  │
│  │ Almond Jar  │  │  Chief Resident Feed  │  │   Artifacts   │  │
│  │  (intake)   │  │   (one calm voice)    │  │    (bento)    │  │
│  └─────────────┘  └──────────────────────┘  └───────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SSE / REST
┌──────────────────────────────▼──────────────────────────────────┐
│  API LAYER                                                       │
│  POST /crisis/activate/stream   → activation SSE                │
│  GET  /crisis/sessions/:id/live → long-lived nudge SSE          │
│  POST /crisis/jar/items         → jar ingest                    │
│  GET  /crisis/sessions/:id/artifacts → artifact polling         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  ORCHESTRATION LAYER                                             │
│                                                                  │
│  ┌─ Chief Resident (orchestrator.py) ──────────────────────┐    │
│  │  Decomposes goal → dispatches pods → synthesizes voice  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Pod A (parallel)         Pod B (parallel)       Pod C (always) │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐  │
│  │ Planner         │    │ Notes Auditor   │    │ Mentor     │  │
│  │ Examiner-Intel  │    │ Recall-Forge    │    │ Wellbeing  │  │
│  │ Sacrifice Engine│    │ Explainer       │    │            │  │
│  └─────────────────┘    └─────────────────┘    └────────────┘  │
│                                                                  │
│  Deep Agents (background — Postgres job queue)                  │
│  ┌──────────────────┐ ┌────────────────────┐ ┌──────────────┐  │
│  │ Mock-Paper       │ │ Cheat-Sheet        │ │ Knowing-vs-  │  │
│  │ Architect        │ │ Compiler           │ │ Scoring Coach│  │
│  └──────────────────┘ └────────────────────┘ └──────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  DATA LAYER (Supabase Postgres + Storage)                        │
│                                                                  │
│  Existing: crisis_sessions, crisis_topic_progress,              │
│            crisis_activations, crisis_ask_messages              │
│                                                                  │
│  New (migration 018): almond_jar_items, almond_jar_jobs,        │
│                        almond_jar_artifacts, crisis_nudges       │
│                                                                  │
│  Supabase Storage bucket: almond-jar/{user_id}/{session_id}/    │
└─────────────────────────────────────────────────────────────────┘
```

### The cardinal law: fast foreground, slow background
The student at 1am gets the Chief Resident's first instruction in **< 3 seconds**. The deep agents run in the background and deliver artifacts the student wakes up to. These two timelines must never block each other.

```
T+0s   → Deterministic spine fires (readiness, panic, schedule grid)
T+0-3s → Activation SSE starts streaming "team forming" events
T+3-15s → Pods A, B, C run in parallel via asyncio.gather()
T+15s  → Chief Resident synthesizes → first instruction delivered
T+15s+ → Deep agents dispatched to Postgres job queue
T+next session → Student wakes to artifacts in Artifacts bento
```

---

## 2. Phase 0 — Database Migration (018_almond_jar.sql)

**New tables only. Zero changes to existing tables or RLS policies.**

### 2.1 `almond_jar_items` — everything dumped into the jar

```sql
CREATE TABLE IF NOT EXISTS public.almond_jar_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    item_type       TEXT NOT NULL CHECK (item_type IN (
                        'text_paste', 'pdf', 'image', 'audio',
                        'url', 'pasted_notes', 'graded_script'
                    )),
    item_category   TEXT CHECK (item_category IN (
                        'canon', 'own_notes', 'lecture', 'pyq_cram',
                        'image_spotter', 'graded_feedback', 'datesheet',
                        'unknown'
                    )) DEFAULT 'unknown',
    original_name   TEXT,                    -- filename or URL
    storage_path    TEXT,                    -- Supabase Storage path (null for text)
    raw_text        TEXT,                    -- extracted/pasted text content
    extracted_text  TEXT,                    -- post-OCR/parse text (for files)
    is_processed    BOOLEAN DEFAULT FALSE,   -- has the team consumed this?
    is_graded_script BOOLEAN DEFAULT FALSE, -- the crown-jewel flag
    trust_flags     JSONB DEFAULT '[]',      -- e.g. ["wrong_claim_detected"]
    agent_tags      JSONB DEFAULT '{}',      -- which agents consumed it and how
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jar_items_session ON public.almond_jar_items(session_id);
CREATE INDEX IF NOT EXISTS idx_jar_items_user_session ON public.almond_jar_items(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_jar_items_unprocessed ON public.almond_jar_items(session_id, is_processed) WHERE NOT is_processed;
```

### 2.2 `almond_jar_jobs` — the Postgres-backed job queue for deep agents

```sql
CREATE TABLE IF NOT EXISTS public.almond_jar_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_type        TEXT NOT NULL CHECK (job_type IN (
                        'mock_paper', 'cheat_sheet', 'recall_deck',
                        'knowing_vs_scoring', 'examiner_pattern'
                    )),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload         JSONB NOT NULL DEFAULT '{}',   -- input context for the agent
    result          JSONB,                          -- output artifact
    error_message   TEXT,
    attempts        INTEGER DEFAULT 0,
    scheduled_for   TIMESTAMPTZ DEFAULT NOW(),      -- can delay jobs
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jar_jobs_pending ON public.almond_jar_jobs(status, scheduled_for)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jar_jobs_session ON public.almond_jar_jobs(session_id);
```

### 2.3 `almond_jar_artifacts` — finished objects the student wakes up to

```sql
CREATE TABLE IF NOT EXISTS public.almond_jar_artifacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id          UUID REFERENCES public.almond_jar_jobs(id) ON DELETE SET NULL,
    artifact_type   TEXT NOT NULL CHECK (artifact_type IN (
                        'mock_paper', 'cheat_sheet', 'recall_deck',
                        'knowing_vs_scoring', 'schedule_grid'
                    )),
    title           TEXT NOT NULL,
    subtitle        TEXT,
    content         JSONB NOT NULL,         -- structured artifact content
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_session ON public.almond_jar_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_unread ON public.almond_jar_artifacts(session_id, is_read) WHERE NOT is_read;
```

### 2.4 `crisis_nudges` — proactive reach-outs

```sql
CREATE TABLE IF NOT EXISTS public.crisis_nudges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    nudge_type      TEXT NOT NULL CHECK (nudge_type IN (
                        'topic_check', 'time_warning', 'sleep_call',
                        'motivation', 'artifact_ready'
                    )),
    content         TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',
    scheduled_for   TIMESTAMPTZ NOT NULL,
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nudges_pending ON public.crisis_nudges(user_id, scheduled_for, is_sent)
    WHERE NOT is_sent;
CREATE INDEX IF NOT EXISTS idx_nudges_session ON public.crisis_nudges(session_id);
```

**Add `artifact_summary` column to existing `crisis_sessions`:**
```sql
ALTER TABLE public.crisis_sessions
    ADD COLUMN IF NOT EXISTS jar_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS artifact_summary JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS team_status TEXT DEFAULT 'idle'
        CHECK (team_status IN ('idle', 'forming', 'active', 'completed'));
```

Apply full RLS + grants (same pattern as existing tables in 008).

---

## 3. Phase 1 — Almond Jar Backend

### File: `backend/app/services/crisis/jar_processor.py`

**Responsibilities:** classify → extract text → route to agents. No LLM for classification — deterministic rules + optional fast-tier LLM only for ambiguous items.

```python
# Key exports:
class JarItem(TypedDict): ...   # matches the DB row shape
async def ingest_item(
    client,
    session_id: str,
    user_id: str,
    item_type: str,              # from request
    raw_text: str | None,        # for pastes
    storage_path: str | None,    # for uploaded files
    original_name: str | None,
    is_graded_script: bool = False,
) -> JarItem
```

**Classification logic (deterministic first):**
```python
def _classify_item(item_type: str, original_name: str | None, raw_text: str | None) -> str:
    name = (original_name or "").lower()
    text = (raw_text or "").lower()

    if item_type == "graded_script":
        return "graded_feedback"
    if any(kw in name for kw in ("pyq", "prev year", "previous year", "question paper")):
        return "pyq_cram"
    if any(kw in name for kw in ("lecture", "slide", "ppt", "notes")):
        return "lecture"
    if any(kw in text[:200] for kw in ("chapter", "unit", "section", "gray", "robbins", "guyton")):
        return "canon"
    if item_type == "image":
        return "image_spotter"
    if any(kw in text[:200] for kw in ("exam", "date", "schedule", "timetable")):
        return "datesheet"
    return "own_notes"   # safest default for unclear pastes
```

**Text extraction (for files):**
- PDF → use `pypdf` (already likely in requirements, or add it — lightweight)
- Image → use `pytesseract` for OCR (v1: basic; v2: Gemini Vision for bad scans)
- Audio → defer to v2 (Whisper/Sarvam transcription)
- URL → fetch + `readability` text extraction

**Post-ingest fan-out:** After classification and text extraction, insert the row and call `_route_to_agents(item)` which tags the item metadata so agents can query their relevant items. This is not a function call to agents — it's a metadata tag. Agents query items by `agent_tags` during their execution.

### File: `backend/app/api/routes/jar.py`

New router with prefix `/api/v1/crisis/jar`:

```python
# Endpoints:
POST   /items           → ingest one item (text or file upload via multipart)
GET    /{session_id}/items  → list all jar items for a session
DELETE /items/{item_id}     → remove an item
GET    /{session_id}/stats  → jar stats (count by category, graded_script count)
```

**Multipart file upload endpoint:**
```python
@router.post("/items")
async def add_jar_item(
    session_id: str = Form(...),
    item_type: str = Form(...),
    raw_text: str | None = Form(None),
    is_graded_script: bool = Form(False),
    file: UploadFile | None = File(None),
    user=Depends(require_auth),
)
```

File → upload to Supabase Storage at `almond-jar/{user_id}/{session_id}/{uuid}_{filename}` → store `storage_path` in DB. Never store raw bytes in Postgres.

---

## 4. Phase 2 — The Agent Orchestrator (The Heart)

### File structure under `backend/app/services/crisis/agents/`

```
agents/
  __init__.py
  base.py          # AgentResult dataclass, shared types
  planner.py       # Pod A — deterministic schedule grid + narration
  examiner_intel.py # Pod A — PYQ pattern inference from jar items
  sacrifice.py     # Pod A — marks-math subtraction (deterministic)
  notes_auditor.py # Pod B — misconception detection in jar notes
  recall_forge.py  # Pod B — card generation from jar + weak topics
  mentor.py        # Pod C — senior voice, distress-aware
  wellbeing.py     # Pod C — always-on safety monitor
```

### File: `backend/app/services/crisis/agents/base.py`

```python
from dataclasses import dataclass, field
from typing import Any, Dict, List

@dataclass
class AgentEvent:
    """Emitted into the SSE stream as an agent starts/finishes a step."""
    agent: str          # "planner", "examiner_intel", etc.
    event: str          # "started", "progress", "completed", "error"
    message: str        # human-readable for the activation stream UI
    data: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentResult:
    agent: str
    success: bool
    output: Dict[str, Any] = field(default_factory=dict)
    events: List[AgentEvent] = field(default_factory=list)
    error: str | None = None
```

### File: `backend/app/services/crisis/orchestrator.py`

This is the Chief Resident. The key design decision: **this file runs the parallel fan-out and synthesizes a `WarRoomState` object**. No single LLM prompt does all this — each agent does one focused job.

```python
from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Dict, List

from app.services.crisis.agents.base import AgentEvent, AgentResult
from app.services.crisis.agents import planner, examiner_intel, sacrifice
from app.services.crisis.agents import notes_auditor, recall_forge
from app.services.crisis.agents import mentor, wellbeing
from app.services.crisis.readiness import compute_readiness_score
from app.services.crisis.panic import detect_panic

@dataclass
class WarRoomState:
    """The shared context object passed to all agents. Immutable after construction."""
    session_id: str
    user_id: str
    exam_name: str
    exam_date: str
    days_remaining: int
    subjects: List[str]
    hours_per_day: float
    preparation_level: str
    student_category: str
    subject_progress: List[Dict]
    topic_data: List[Dict]
    jar_items: List[Dict]           # items already in the jar at activation
    readiness: Dict[str, Any]       # from compute_readiness_score()
    panic: Dict[str, Any]           # from detect_panic()
    schedule_grid: List[Dict]       # deterministic grid (no LLM)
    sacrifice_map: Dict[str, Any]   # deterministic marks-math

async def orchestrate(
    state: WarRoomState,
    event_queue: asyncio.Queue,     # SSE events flow here
) -> Dict[str, Any]:
    """
    Runs Pod A + Pod B in parallel, Pod C as singleton.
    Returns the merged strategy dict that gets stored in crisis_sessions.strategy.
    """
    # Emit "team forming" to SSE
    await event_queue.put(AgentEvent("orchestrator", "started",
        "Your crisis team is assembling..."))

    # Pod A — triage/plan (all deterministic + narration LLM)
    pod_a = asyncio.gather(
        planner.run(state, event_queue),
        examiner_intel.run(state, event_queue),
        sacrifice.run(state, event_queue),
        return_exceptions=True,
    )

    # Pod B — material processing (needs jar items)
    pod_b = asyncio.gather(
        notes_auditor.run(state, event_queue),
        recall_forge.run(state, event_queue),
        return_exceptions=True,
    )

    # Pod C — always-on (runs immediately, no jar dependency)
    pod_c_task = asyncio.create_task(mentor.run(state, event_queue))
    wellbeing_task = asyncio.create_task(wellbeing.run(state, event_queue))

    # Run A and B in parallel
    pod_a_results, pod_b_results = await asyncio.gather(pod_a, pod_b)

    # Merge results
    strategy = _merge_results(state, pod_a_results, pod_b_results)

    # Chief Resident synthesizes the opening instruction
    chief_message = await _synthesize_chief_voice(state, strategy, event_queue)
    strategy["chief_resident_opening"] = chief_message

    # Emit completion
    await event_queue.put(AgentEvent("orchestrator", "completed",
        chief_message, data={"strategy": strategy}))

    return strategy
```

### Each agent — design contract

**`agents/planner.py`** — builds the deterministic schedule grid (DETERMINISTIC):
```
Input:  state.days_remaining, state.hours_per_day, state.subject_progress
Logic:  Slot assignment algorithm — no LLM. Assign high-yield topics to days 1..N-3, revision days N-2..N.
Output: AgentResult(output={"schedule_grid": [...], "narration": "..."})
Note:   narration is the ONE sentence the LLM writes AFTER the math is done.
```

**`agents/examiner_intel.py`** — mines PYQs from the jar (AGENTIC):
```
Input:  state.jar_items filtered to item_category='pyq_cram'
Logic:  LLM reads the PYQ text and extracts frequency patterns by topic
Output: AgentResult(output={"high_freq_topics": [...], "likely_questions": [...], "confidence": "low|medium|high"})
Note:   falls back to "no PYQs in jar — using syllabus weights" gracefully
```

**`agents/sacrifice.py`** — the Anti-Syllabus (DETERMINISTIC):
```
Input:  state.topic_data scored by _score_topic(), state.readiness["hours_available"], state.readiness["hours_needed_estimate"]
Logic:  Sort by ascending exam-relevance score. Chop lowest-scoring topics until deficit is resolved.
Output: AgentResult(output={"sacrifice_list": [...], "hours_saved": float, "coverage_with_sacrifice": float})
Note:   The coverage % is computed, NOT LLM-hallucinated. 
```

**`agents/notes_auditor.py`** — reads the jar's notes (AGENTIC):
```
Input:  state.jar_items filtered to item_category in ('own_notes', 'canon', 'lecture')
Logic:  LLM reads student's notes, flags items that contradict verified facts
Output: AgentResult(output={"trust_flags": [...], "corrections": [...], "jar_item_ids": [...]})
Note:   Trust flags written back to almond_jar_items.trust_flags in DB
```

**`agents/recall_forge.py`** — generates active-recall cards (AGENTIC):
```
Input:  sacrifice_result.sacrifice_list excluded; examiner_intel.high_freq_topics + state.topic_data must_know topics + jar 'pyq_cram' items
Logic:  Generate 10-15 one-liner recall cards: "Q: [...] A: [...]" format
Output: AgentResult(output={"cards": [{"q": "...", "a": "...", "subject": "...", "topic": "..."}]})
Note:   Cards go directly into the 'schedule_grid' artifact (slot_type: 'recall')
```

**`agents/mentor.py`** — the senior voice (AGENTIC):
```
Input:  state.readiness, state.panic, state.exam_name, state.days_remaining
Logic:  If panic.detected → warm, anchor-first, then plan. Else → confident, tactical.
        The ONE paragraph the student reads first.
Output: AgentResult(output={"opening": "...", "tone": "calm|urgent|supportive"})
Note:   Never includes upsell. Never gives false precision on pass probability.
```

**`agents/wellbeing.py`** — always-on safety monitor (DETERMINISTIC + routing):
```
Input:  state.panic, user's message (from activation payload)
Logic:  If panic.severity == 'severe': override team → emit sleep_call nudge + distress resource link.
        Suppress all upsell tokens in the session (write wellbeing_override=True to session).
Output: AgentResult(output={"override": bool, "distress_resources": [...], "ui_mode": "calm|normal"})
Note:   This runs BEFORE Pod A results are shown to the student. Safety is first.
```

### File: `backend/app/services/crisis/chief_resident.py`

The synthesis LLM call — ONE call, at the end, after all deterministic math is done:

```python
async def synthesize_voice(
    state: WarRoomState,
    strategy: Dict[str, Any],
) -> str:
    """
    The Chief Resident's opening paragraph.
    Only called AFTER all deterministic math is complete.
    Receives pre-computed numbers — it narrates, it does NOT compute.
    """
    # System prompt is tight and persona-locked
    system = (
        "You are the Chief Resident — a brilliant, warm, experienced senior doctor "
        "running a student's crisis prep team. You speak in 2-3 sentences only. "
        "You have just received the computed analysis from your team. "
        "Narrate it. Be honest, be specific, be calm. "
        "Never invent numbers. Only use what's given to you in the context."
    )
    # Context is pre-computed values — the LLM narrates, NOT computes
    ...
```

---

## 5. Phase 3 — Background Worker (Deep Agents)

### File: `backend/app/services/crisis/background_worker.py`

A background asyncio coroutine launched at app startup. Polls `almond_jar_jobs` for pending jobs every 30 seconds.

```python
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

_POLL_INTERVAL_SECONDS = 30
_MAX_CONCURRENT_JOBS = 3

async def run_job_worker(app_state: dict) -> None:
    """
    Started via FastAPI lifespan. Runs forever.
    Polls for pending jobs, picks up one at a time per job type,
    runs the deep agent, writes the artifact.
    """
    while True:
        try:
            await _process_pending_jobs()
        except Exception:
            logger.exception("Job worker error — sleeping before retry")
        await asyncio.sleep(_POLL_INTERVAL_SECONDS)

async def _process_pending_jobs() -> None:
    from app.core.database import get_supabase_admin_client
    client = get_supabase_admin_client()

    # Claim up to MAX_CONCURRENT_JOBS pending jobs atomically
    jobs = (
        client.table("almond_jar_jobs")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", datetime.now(timezone.utc).isoformat())
        .order("created_at")
        .limit(_MAX_CONCURRENT_JOBS)
        .execute()
        .data or []
    )

    if not jobs:
        return

    await asyncio.gather(*[_run_one_job(client, job) for job in jobs])
```

### Deep agent: Mock-Paper Architect

**File:** `backend/app/services/crisis/deep_agents/mock_paper.py`

```python
async def run(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates a full predicted paper from:
    - examiner_intel.high_freq_topics (from strategy.examiner_intel, stored in session)
    - sacrifice_result.retain_list topics (what to keep)
    - PYQ items from the jar
    Writes output to almond_jar_artifacts as type='mock_paper'.
    """
    # Structured output: list of questions with expected answer points
    # NOT a streaming call — a single generate_sync call
    ...
```

**Output format:**
```json
{
  "title": "Predicted Paper — Pharmacology Prof 2024",
  "sections": [
    {
      "section": "A",
      "instructions": "Answer any 3 of 5 (10 marks each)",
      "questions": [
        {
          "q_number": 1,
          "question": "Describe the mechanism of action of beta-blockers...",
          "topic": "Beta Blockers",
          "subject": "Pharmacology",
          "expected_answer_points": ["Point 1...", "Point 2..."],
          "marks": 10,
          "why_predicted": "Appeared in 3 of last 5 PYQs; examiner-intel confidence: high"
        }
      ]
    }
  ],
  "generated_from": "PYQs + examiner pattern + your jar items",
  "disclaimer": "Predicted, not guaranteed. Study the listed topics fully."
}
```

### Deep agent: Cheat-Sheet Compiler

**File:** `backend/app/services/crisis/deep_agents/cheat_sheet.py`

Produces a single-page, exam-morning artifact. Input is `strategy.must_know` topics. Output is one dense JSON with mnemonics, one-liner definitions, and high-yield bullet points per topic. Fits in one LLM call.

### Deep agent: Knowing-vs-Scoring Coach

**File:** `backend/app/services/crisis/deep_agents/knowing_vs_scoring.py`

**Only runs when `jar_items` contains a `graded_script` item.** Reads the graded script text, compares against expected answer structure, outputs a structured "what you wrote vs what they expected" diff per question. This is the most differentiated artifact in the entire system.

Input check:
```python
graded_items = [i for i in jar_items if i["is_graded_script"]]
if not graded_items:
    return None  # no graded script in jar — job not applicable
```

### Startup wiring in `main.py`

```python
# In main.py — add lifespan context manager
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.crisis.background_worker import run_job_worker
    worker_task = asyncio.create_task(run_job_worker({}))
    yield
    worker_task.cancel()

app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
```

---

## 6. Phase 4 — New API Routes

### 6.1 Activation SSE endpoint (replaces current `POST /activate`)

**New endpoint:** `POST /api/v1/crisis/activate/stream`

Returns a `text/event-stream` response. The student sees the team form in real time.

**Event format (each SSE line):**
```
data: {"type": "agent_event", "agent": "planner", "event": "completed", "message": "Your 4-day schedule is built."}
data: {"type": "agent_event", "agent": "examiner_intel", "event": "completed", "message": "Found 2 PYQs in your jar — biasing plan toward pharmacology questions."}
data: {"type": "chief_resident", "message": "Here's your situation: you have 4 days and 32 hours available. The real gap is Pharmacology — it's 28% of marks and you've covered 20%. We're cutting Forensic Medicine entirely — saves 6 hours, costs you 4 marks at most. Your first task is ready.", "data": {...full strategy...}}
data: {"type": "artifact_dispatched", "artifact_types": ["mock_paper", "cheat_sheet"]}
data: [CRISIS_ACTIVATION_END]
```

**Implementation:** Uses `asyncio.Queue` to bridge the orchestrator (which runs in a task) and the SSE generator (which reads from the queue).

```python
@router.post("/activate/stream")
async def activate_crisis_stream(payload: ActivateCrisisPayload, user=Depends(require_auth)):
    event_queue: asyncio.Queue = asyncio.Queue()

    async def run_orchestration():
        try:
            state = await _build_war_room_state(payload, user["user_id"])
            strategy = await orchestrate(state, event_queue)
            await _persist_session(client, state, strategy, payload)
            await _dispatch_deep_agents(client, state, strategy)
        except Exception as exc:
            await event_queue.put({"type": "error", "message": str(exc)})
        finally:
            await event_queue.put(None)  # sentinel

    asyncio.create_task(run_orchestration())

    async def event_stream():
        while True:
            event = await event_queue.get()
            if event is None:
                yield "data: [CRISIS_ACTIVATION_END]\n\n"
                return
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", ...)
```

**Keep the existing `POST /activate` endpoint for backwards compatibility** — it now calls `orchestrate()` synchronously and returns the full strategy JSON. The stream endpoint is the new primary path.

### 6.2 Session live feed SSE

**New endpoint:** `GET /api/v1/crisis/sessions/{session_id}/live`

Long-lived SSE. The client connects on page load. The server:
1. Checks `crisis_nudges` for `scheduled_for <= now AND NOT is_sent`
2. Checks `almond_jar_artifacts` for new artifacts since last poll
3. Sends events and marks them consumed
4. Sleeps 30 seconds and repeats (with keep-alive heartbeat every 15s)

```python
@router.get("/sessions/{session_id}/live")
async def session_live_feed(session_id: str, user=Depends(require_auth)):
    async def stream():
        while True:
            # Send heartbeat
            yield "data: {\"type\": \"heartbeat\"}\n\n"
            await asyncio.sleep(15)
            # Check nudges
            nudges = _get_pending_nudges(client, session_id, user_id)
            for nudge in nudges:
                yield f"data: {json.dumps({'type': 'nudge', 'nudge': nudge})}\n\n"
                _mark_nudge_sent(client, nudge['id'])
            # Check new artifacts
            new_artifacts = _get_new_artifacts(client, session_id)
            for artifact in new_artifacts:
                yield f"data: {json.dumps({'type': 'artifact_ready', 'artifact': artifact})}\n\n"
            await asyncio.sleep(15)
    return StreamingResponse(stream(), media_type="text/event-stream", ...)
```

### 6.3 Artifacts endpoint

**New endpoint:** `GET /api/v1/crisis/sessions/{session_id}/artifacts`

Returns all artifacts for a session — the bento grid data source.

### 6.4 Updated `activation-status` response

Include `jar_stats` (count by category, graded_script flag) and `artifact_count` in the existing status endpoint response so the frontend can render the Almond Jar fill-level on initial load.

---

## 7. Phase 5 — Frontend: Three-Zone Crisis Workspace

### File structure
```
frontend/app/(dashboard)/crisis/page.tsx        ← route entry (thin shell)
frontend/components/crisis/
  CrisisWorkspace.tsx       ← the three-zone shell
  AlmondJar.tsx             ← Zone 1: intake vessel
  JarItem.tsx               ← individual item chip
  ChiefResidentFeed.tsx     ← Zone 2: one calm voice + agent tray
  AgentActivityTray.tsx     ← sub-agent live activity (expandable)
  ArtifactsBento.tsx        ← Zone 3: finished objects grid
  ArtifactCard.tsx          ← individual artifact card
  ActivationStream.tsx      ← SSE handler during team formation
  LiveFeedListener.tsx      ← SSE handler for nudges/artifacts
  CrisisSetupForm.tsx       ← pre-activation form (extracted from CrisisContent)
  PanicBanner.tsx           ← (exists — keep, possibly enhance)
  ReadinessMeter.tsx        ← (exists — keep)
```

**Keep `crisis/page.tsx` route path.** Just replace `CrisisContent` with `CrisisWorkspace`.

### Zone 1: Almond Jar (AlmondJar.tsx)

A `"use client"` component. The vessel:

```
Design spec (taste-skill aligned):
- Persistent panel, collapsible on mobile to a bottom sheet
- A vessel visual: amber-tinted container with a subtle animated fill-level indicator
  (height of fill = number of processed items / total items, smooth spring transition)
- Drop zone: full panel is a drop target. Drag files here or tap "+" to open picker
- Three intake methods: "Paste text", "Upload file", "Add URL"
- Item chips appear inside the jar with spring physics (framer-motion scale in)
- Processing state: shimmer animation on unprocessed chips
- Processed state: chip gains amber dot + category tag
- Crown-jewel prompt (when jar has no graded_script):
  A subtle call-to-action: "Got a marked paper from last time? That's the most useful thing you can give me."
- Empty state: "Throw your mess in. Notes, photos, last year's paper, anything. I'll sort it."
```

**State management:** React Query mutation for `POST /crisis/jar/items`. Optimistic update shows chip immediately. Query `GET /crisis/jar/{sessionId}/items` for initial load.

**File upload:** Use `<input type="file" accept=".pdf,.jpg,.png,.jpeg,.docx">`. On select, POST as multipart. Show upload progress via XHR (not fetch — fetch doesn't expose progress).

**Drag-and-drop:** `onDrop` handler on the container, `event.dataTransfer.files`. No library needed.

### Zone 2: Chief Resident Feed (ChiefResidentFeed.tsx)

```
Design spec:
- Zinc-950 background panel
- Top: One instruction at a time — large, readable, amber text
  Spring-in transition when instruction changes (layoutId for smooth morphing)
- Below the instruction: the "next action" button — amber CTA
  (e.g., "Start: Brachial Plexus — 30 min" or "Confirm this sacrifice list")
- Swipe gesture (on mobile) or three buttons (desktop):
  "Done ✓" | "Too much" | "I'm panicking"
  The third button is never hidden, never buried
- Agent Activity Tray (expandable):
  Collapsed: a thin bar showing "3 agents working..."
  Expanded: agent status list — each agent with icon, status dot, last action
  Perpetual breathing dot on active agents (CSS animation, NOT state-driven)
- Mentor opening paragraph: rendered above the first instruction on activation
  Displayed once, then collapses into the tray
```

**Activation flow:** `ActivationStream.tsx` handles the `POST /activate/stream` SSE. Feeds events into a local event list state. The Chief Resident feed renders from the stream in real-time:
- Each `agent_event` adds a line to the Agent Activity Tray
- The `chief_resident` event unlocks the main instruction
- `[CRISIS_ACTIVATION_END]` transitions to the active session state

### Zone 3: Artifacts Bento (ArtifactsBento.tsx)

```
Design spec (taste-skill Bento 2.0):
- Asymmetric grid: 2/3 wide card + 1/3 narrow stack on desktop; single column on mobile
- Each artifact card: rounded-[2rem], 1px border-zinc-800, diffusion shadow
- Cards are "alive" (perpetual micro-interaction per taste-skill §9.C):
  mock_paper card → animated question counter ticking up
  cheat_sheet card → shimmer highlight cycling through bullet points
  recall_deck card → card-flip preview animation
  knowing_vs_scoring → score diff animating in
- "Waking up to" state: unread artifact cards have amber ambient glow (not neon — tinted shadow)
- Click: opens a full-screen modal with the artifact content
  Morphing modal: the card expands via layoutId to fill the screen (Framer Motion)
- Empty state: 
  "Your team is building your artifacts. Check back in the morning."
  Skeleton cards showing the types expected (based on what's in the jar)
```

**Artifact polling:** `LiveFeedListener.tsx` handles `GET /sessions/{id}/live` SSE. When `artifact_ready` event arrives → invalidate `GET /artifacts` React Query. Bento re-renders with new card.

### Pre-activation form (CrisisSetupForm.tsx)

Extracted from `CrisisContent.tsx`. Keep the same inputs (exam name, date, subjects, prep level, hours). **Add Almond Jar as a pre-activation step:**

```
Step 1: Tell me about your exam (existing form)
Step 2: Throw your material in the Jar (optional but surfaced)
Step 3: Your team is forming (activation SSE stream)
```

The Jar in step 2 is a simpler "quick dump" mode — just a textarea + file picker. The full Jar zone appears after activation. This way the team has material to work with from the first second.

### Motion specs (taste-skill compliance)

```
DESIGN_VARIANCE: 8 → asymmetric bento layout, varied card sizes
MOTION_INTENSITY: 6 → spring physics on card-ins, CSS perpetual animations, no GSAP
VISUAL_DENSITY: 5 → balanced, not cockpit-packed
Font: Geist (already in project?) + Geist Mono for all numbers
Accent: amber (#ffcf9d) — the existing amber token, no changes
Base: zinc-950/zinc-900 — existing dark tokens
NO purple/blue AI aesthetics
Perpetual animations: isolated Client Components (React.memo)
Chief Resident text: text-2xl tracking-tight leading-snug amber-tinted
```

---

## 8. Phase 6 — Proactive Nudges

**When do nudges get scheduled?** At the end of orchestration, the Planner agent returns `schedule_grid` with explicit time blocks. The orchestrator uses these to schedule nudges:

```python
def _schedule_nudges(client, session_id: str, user_id: str, schedule_grid: list) -> None:
    nudges = []
    now = datetime.now(timezone.utc)

    for day in schedule_grid:
        for block in day["blocks"]:
            # Nudge 15 min after block end time if student hasn't marked it done
            block_end = _parse_block_end(day["date"], block["end_time"])
            if block_end > now:
                nudges.append({
                    "session_id": session_id,
                    "user_id": user_id,
                    "nudge_type": "topic_check",
                    "content": f"You planned '{block['topic']}' ({block['duration_minutes']}m) — done?",
                    "metadata": {"topic": block["topic"], "day": day["day"]},
                    "scheduled_for": (block_end + timedelta(minutes=15)).isoformat(),
                })

    # Sleep call: 11pm every night until exam
    # Motivation: each morning

    if nudges:
        client.table("crisis_nudges").insert(nudges).execute()
```

The background worker (Phase 3) also checks nudges every 30s and marks them `is_sent = True` after delivery via the SSE live feed.

---

## 9. Phase 7 — `requirements.txt` additions (minimum)

```
pypdf>=4.0.0          # PDF text extraction
python-multipart>=0.0.6  # FastAPI multipart file uploads (may already be present)
```

Do NOT add LangGraph, Celery, or any agent framework. The asyncio.gather() + typed coroutines IS the agent framework.

---

## 10. Build Order and Exit Gates

### Phase 0 — DB Migration
**Exit gate:** Migration runs clean against Supabase. All tables exist, RLS verified.

### Phase 1 — Almond Jar (backend only)
**Exit gate:** 
- `POST /crisis/jar/items` accepts text paste + file upload
- `GET /crisis/jar/{session_id}/items` returns classified items
- Classification test: a PYQ PDF gets `item_category: pyq_cram`; a graded script text gets `is_graded_script: true`

### Phase 2 — Agent Orchestrator (backend only)
**Exit gate:**
- `POST /activate/stream` returns SSE stream with at least 4 agent events + chief_resident event
- Strategy object written to `crisis_sessions.strategy` matches expected shape
- All numbers in strategy are deterministic-origin (readiness, sacrifice math, coverage %)
- No new PYQ data → examiner_intel falls back gracefully (no crash)
- Panic detected → wellbeing override fires → upsell suppressed

### Phase 3 — Background Worker
**Exit gate:**
- Worker starts on app startup (check logs)
- Mock-paper job dispatched at activation → `almond_jar_jobs` row created with status=pending
- Within 2 minutes: job transitions pending → running → completed
- `almond_jar_artifacts` has a new mock_paper row
- Worker handles job failure gracefully (status=failed, retries=3, then gives up)

### Phase 4 — New API Routes
**Exit gate:**
- `/activate/stream` is the primary activation path for the new frontend
- `/sessions/{id}/live` SSE sends heartbeat every 15s
- `/sessions/{id}/artifacts` returns artifact list
- Existing routes (`/activate`, `/active-session`, `/sessions/{id}/progress`) still work unchanged

### Phase 5 — Frontend
**Exit gate:**
- Three zones render correctly on desktop and mobile
- Almond Jar: drag-drop + paste + file upload all work
- Activation: SSE stream drives real-time agent activity tray
- Artifacts bento: mock_paper card appears after background worker completes
- Panic state: UI shifts to calm mode (fewer animations, warmer copy)
- Zero console errors, no hydration mismatches

### Phase 6 — Nudges
**Exit gate:**
- `crisis_nudges` rows created at activation
- Live feed SSE delivers nudge to browser within 1 minute of `scheduled_for`
- "I'm panicking" button in Zone 2 triggers immediate wellbeing nudge

---

## 11. Files Created / Modified — Complete List

### NEW files
```
backend/app/services/crisis/orchestrator.py
backend/app/services/crisis/chief_resident.py
backend/app/services/crisis/jar_processor.py
backend/app/services/crisis/background_worker.py
backend/app/services/crisis/agents/__init__.py
backend/app/services/crisis/agents/base.py
backend/app/services/crisis/agents/planner.py
backend/app/services/crisis/agents/examiner_intel.py
backend/app/services/crisis/agents/sacrifice.py
backend/app/services/crisis/agents/notes_auditor.py
backend/app/services/crisis/agents/recall_forge.py
backend/app/services/crisis/agents/mentor.py
backend/app/services/crisis/agents/wellbeing.py
backend/app/services/crisis/deep_agents/__init__.py
backend/app/services/crisis/deep_agents/mock_paper.py
backend/app/services/crisis/deep_agents/cheat_sheet.py
backend/app/services/crisis/deep_agents/knowing_vs_scoring.py
backend/app/api/routes/jar.py
backend/database/migrations/018_almond_jar.sql

frontend/components/crisis/CrisisWorkspace.tsx
frontend/components/crisis/AlmondJar.tsx
frontend/components/crisis/JarItem.tsx
frontend/components/crisis/ChiefResidentFeed.tsx
frontend/components/crisis/AgentActivityTray.tsx
frontend/components/crisis/ArtifactsBento.tsx
frontend/components/crisis/ArtifactCard.tsx
frontend/components/crisis/ActivationStream.tsx
frontend/components/crisis/LiveFeedListener.tsx
frontend/components/crisis/CrisisSetupForm.tsx
```

### MODIFIED files
```
backend/app/main.py                          → add lifespan + jar router
backend/app/api/routes/crisis.py             → add /activate/stream, /live, /artifacts
backend/app/services/crisis/__init__.py      → export new modules
backend/requirements.txt                     → add pypdf, python-multipart

frontend/app/(dashboard)/crisis/page.tsx     → swap CrisisContent → CrisisWorkspace
frontend/lib/api/crisis.api.ts               → add new types + fetch functions
```

### DO NOT TOUCH
```
backend/app/services/crisis/readiness.py     ← deterministic, perfect
backend/app/services/crisis/panic.py         ← deterministic, perfect
backend/app/services/crisis/last_night.py    ← fine as-is
backend/app/services/crisis/crisis_generator.py ← kept for backwards-compat of old /activate
backend/database/migrations/008_crisis.sql
backend/database/migrations/017_crisis_warroom.sql
frontend/components/crisis/PanicBanner.tsx
frontend/components/crisis/ReadinessMeter.tsx
```

---

## 12. The Three Principles This Plan Refuses to Violate

**1. Sell the team, build the machine.**
Every agent in this plan has a typed input and a typed output. The orchestrator is `asyncio.gather()`. The "agentic" experience is real but the execution is controlled async Python, not a framework of free-roaming LLMs. The student sees a war-room; the system runs deterministic math with narrating LLM calls at the edges.

**2. Fast foreground, slow background.**
The Chief Resident's opening instruction is in the student's hands in 15 seconds. The mock paper arrives while they sleep. These timelines live on separate rails (SSE stream vs. Postgres job queue) and must never merge or block each other.

**3. The jar is the sensor, not the product.**
The Almond Jar's job is not "store your files." Its job is to flow material into the student graph — the `jar_items` become training signal for the mock paper, the recall deck, the trust-flag audit. Each item dropped compounds the model of this student's world. That accumulation, not the artifacts themselves, is the moat the plan is building.
