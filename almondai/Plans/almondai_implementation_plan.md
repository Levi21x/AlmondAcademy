# AlmondAI — Implementation Plan
## Planner Intelligence System · Syllabus Map · Crisis Mode · Clinical Mode

---

> **Document Type:** Engineering Implementation Plan  
> **Derived From:** Business Requirements Document v1.0  
> **Status:** Ready for Engineering Kickoff  
> **Audience:** Engineering Lead, Frontend, Backend, AI/ML Engineers

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [Technology Stack](#3-technology-stack)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Data Models](#5-data-models)
6. [API Design](#6-api-design)
7. [Module 1 — Syllabus Intelligence Map](#7-module-1--syllabus-intelligence-map)
8. [Module 2 — Agentic Planner System](#8-module-2--agentic-planner-system)
9. [Module 3 — Crisis Mode](#9-module-3--crisis-mode)
10. [Module 4 — Clinical Mode](#10-module-4--clinical-mode)
11. [AI & LLM Architecture](#11-ai--llm-architecture)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Premium & Monetization Layer](#13-premium--monetization-layer)
14. [Phased Implementation Roadmap](#14-phased-implementation-roadmap)
15. [Trade-off Analysis](#15-trade-off-analysis)
16. [Success Metrics & Instrumentation](#16-success-metrics--instrumentation)
17. [Risks & Mitigations](#17-risks--mitigations)

---

## 1. System Overview

AlmondAI is being redesigned from a collection of academic utilities into a **unified AI Operating System for Medical Students**. The platform targets MBBS and NEET-PG students and covers four primary functional domains:

| Module | Core Value |
|---|---|
| Syllabus Intelligence Map | Visual, spatial cognition of the medical syllabus |
| Agentic Planner | AI-driven, adaptive, real-time study architecture |
| Crisis Mode | Tactical survival intelligence for last-minute preparation |
| Clinical Mode | Virtual ward simulation for practical and viva training |

All four modules are consolidated inside a single **Planner workspace**, which acts as the Central Academic Command Center. The sidebar structure is flattened — no more separate navigation entries for Syllabus or Crisis Mode.

---

## 2. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page Load (LCP) | < 2.5 seconds |
| AI Response Latency | < 3 seconds (streamed) |
| Graph Render (1000+ nodes) | < 1 second with virtualization |
| Uptime | 99.9% (three nines) |
| Concurrent Users (initial) | 5,000 |
| Concurrent Users (scaled) | 50,000+ |
| Auth Security | JWT + refresh token rotation |
| Data Privacy | No medical PII stored; DPDP-compliant (India) |
| Mobile Responsiveness | Responsive down to 375px viewport |
| Accessibility | WCAG 2.1 AA for core flows |

---

## 3. Technology Stack

### Frontend
| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, SEO, file-based routing, API routes |
| Language | TypeScript | Type safety across components and APIs |
| Styling | Tailwind CSS + CSS Variables | Utility-first, themeable |
| Motion | Framer Motion | Spring physics, layout animations, node transitions |
| Graph / Canvas | ReactFlow + D3.js | Miro-like drag-and-drop node graphs |
| State Management | Zustand | Lightweight, performant, no boilerplate |
| Data Fetching | TanStack Query (React Query) | Caching, background refetch, optimistic updates |
| Real-time | Supabase Realtime (WebSocket) | Plan sync, live replanning notifications |
| Forms | React Hook Form + Zod | Validated, performant forms |

### Backend
| Layer | Choice | Rationale |
|---|---|---|
| API Gateway | Next.js API Routes | Co-located with frontend, low operational overhead |
| AI Engine | FastAPI (Python) | Async, fast, native LangChain/LangGraph support |
| Auth | Supabase Auth | JWT, OAuth, row-level security |
| Primary DB | Supabase (PostgreSQL) | Relational, RLS, realtime, storage — all-in-one |
| Cache | Redis (Upstash) | Plan caching, session state, rate limiting |
| Vector DB | ChromaDB | Semantic search for syllabus RAG pipeline |
| File Storage | Supabase Storage / S3 | Uploaded textbooks, resources |
| Queue | BullMQ (Redis-backed) | Async AI jobs (plan generation, evaluation) |

### AI / LLM
| Layer | Choice | Rationale |
|---|---|---|
| LLM Router | OpenRouter | Multi-model access (GPT-4o, Claude, Gemini) |
| Orchestration | LangGraph | Stateful agentic workflows with branching |
| Embeddings | OpenAI text-embedding-3-small | Cost-efficient, high quality |
| Prompt Framework | LangChain (Python) | Chains, agents, RAG tooling |
| Streaming | Server-Sent Events (SSE) | Token-by-token UI streaming |

### Infrastructure
| Layer | Choice | Rationale |
|---|---|---|
| Hosting | Vercel (frontend) + Railway/Render (FastAPI) | Zero-config deployment |
| CDN | Vercel Edge Network | Global static delivery |
| Monitoring | Sentry + PostHog | Error tracking + product analytics |
| CI/CD | GitHub Actions | Automated test + deploy pipeline |

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Syllabus    │  │   Agentic    │  │  Crisis Mode  │  Clin │  │
│  │  Map (Graph) │  │   Planner    │  │  (War Room)   │  Mode │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┴───┬───┘  │
│         └─────────────────┴──────────────────┴───────────┘      │
│                       Zustand + React Query                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / SSE / WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                    Next.js API Gateway                           │
│  /api/auth  /api/syllabus  /api/planner  /api/crisis  /api/clin │
└────────┬─────────────────────────────────────┬───────────────────┘
         │ Supabase Client                      │ HTTP (internal)
┌────────▼────────┐                   ┌─────────▼──────────────────┐
│   Supabase      │                   │    FastAPI AI Engine        │
│  - PostgreSQL   │                   │                             │
│  - Realtime     │◄──────────────────│  LangGraph Agents           │
│  - Auth         │                   │  ├─ SyllabusGraphAgent       │
│  - Storage      │                   │  ├─ PlannerAgent             │
│  - RLS Policies │                   │  ├─ CrisisAgent              │
└────────┬────────┘                   │  └─ ClinicalAgent           │
         │                            │                             │
┌────────▼────────┐           ┌───────▼──────┐  ┌────────────────┐ │
│     Redis       │           │   ChromaDB   │  │  OpenRouter    │ │
│  (Cache/Queue)  │           │  (Vectors)   │  │  (LLM Router)  │ │
└─────────────────┘           └──────────────┘  └────────────────┘ │
                                                                    │
                              └────────────────────────────────────┘
```

### Data Flow Summary

1. User interactions hit Next.js API routes.
2. Simple CRUD and realtime ops go directly to Supabase.
3. AI-intensive operations (plan generation, case evaluation, crisis analysis) are dispatched as async jobs to the FastAPI engine via BullMQ.
4. The FastAPI engine runs LangGraph stateful agents, calls OpenRouter for LLM completions, and queries ChromaDB for RAG.
5. Results are streamed back via SSE or written to Supabase and pushed via Realtime.

---

## 5. Data Models

### `users`
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  exam_type     TEXT,              -- 'NEET_PG', 'MBBS_FINAL', 'USMLE'
  target_rank   INTEGER,
  subscription  TEXT DEFAULT 'free', -- 'free' | 'premium'
  onboarded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `topics`
```sql
CREATE TABLE topics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type           TEXT NOT NULL,
  subject             TEXT NOT NULL,        -- 'Anatomy'
  chapter             TEXT NOT NULL,        -- 'Upper Limb'
  topic               TEXT NOT NULL,        -- 'Brachial Plexus'
  subtopics           JSONB DEFAULT '[]',   -- ['Roots', 'Trunks', ...]
  importance_score    INTEGER DEFAULT 5,    -- 1-10
  pyq_frequency       INTEGER DEFAULT 0,    -- PYQ appearances
  difficulty_score    INTEGER DEFAULT 5,    -- 1-10
  estimated_minutes   INTEGER DEFAULT 30,
  clinical_importance INTEGER DEFAULT 5,    -- 1-10
  dependencies        UUID[],              -- prerequisite topic IDs
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### `user_topic_progress`
```sql
CREATE TABLE user_topic_progress (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id       UUID REFERENCES topics(id) ON DELETE CASCADE,
  status         TEXT DEFAULT 'not_started', -- 'not_started' | 'in_progress' | 'done' | 'revision'
  confidence     INTEGER DEFAULT 0,           -- 0-100
  last_studied   TIMESTAMPTZ,
  revision_count INTEGER DEFAULT 0,
  UNIQUE(user_id, topic_id)
);
```

### `study_plans`
```sql
CREATE TABLE study_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  exam_date      DATE NOT NULL,
  daily_hours    FLOAT NOT NULL,
  plan_graph     JSONB NOT NULL,   -- ReactFlow nodes + edges JSON
  strategy       JSONB,            -- AI-generated metadata
  version        INTEGER DEFAULT 1,
  is_active      BOOLEAN DEFAULT TRUE,
  generated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### `crisis_sessions`
```sql
CREATE TABLE crisis_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  mode             TEXT NOT NULL,    -- 'standard' | 'last_night' | 'clinical_survival'
  exam_date        DATE,
  hours_available  FLOAT,
  stress_level     INTEGER,           -- 1-10
  generated_plan   JSONB NOT NULL,    -- High-yield map, sacrifice list, timeline
  readiness_score  INTEGER,           -- 0-100 predicted pass probability
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### `clinical_cases`
```sql
CREATE TABLE clinical_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty       TEXT NOT NULL,     -- 'General Medicine', 'Surgery', 'Pediatrics'...
  difficulty      TEXT NOT NULL,     -- 'basic' | 'intermediate' | 'advanced'
  patient_profile JSONB NOT NULL,    -- Age, sex, occupation, vitals, chief complaint
  hidden_findings JSONB NOT NULL,    -- Revealed progressively through examination
  diagnosis       TEXT NOT NULL,
  differentials   TEXT[],
  viva_questions  JSONB,             -- Examiner question bank
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `clinical_sessions`
```sql
CREATE TABLE clinical_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  case_id          UUID REFERENCES clinical_cases(id),
  status           TEXT DEFAULT 'active', -- 'active' | 'submitted' | 'evaluated' | 'viva'
  conversation     JSONB DEFAULT '[]',    -- [{role, content, timestamp}]
  case_sheet       JSONB DEFAULT '{}',    -- Student's written case sheet
  evaluation       JSONB,                 -- AI evaluation report
  viva_log         JSONB DEFAULT '[]',
  score            INTEGER,               -- 0-100
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);
```

---

## 6. API Design

All routes use JSON. Auth is via Supabase JWT in `Authorization: Bearer <token>` header. Error responses follow `{ error: string, code: string }`.

### Authentication — `/api/auth`

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, run onboarding AI profile |
| POST | `/api/auth/login` | Email/password sign-in |
| POST | `/api/auth/oauth` | Google OAuth |
| POST | `/api/auth/refresh` | Refresh JWT |
| PUT | `/api/auth/profile` | Update exam type, target rank, study preferences |

### Syllabus — `/api/syllabus`

| Method | Route | Description |
|---|---|---|
| GET | `/api/syllabus/:examType` | Fetch full topic tree as graph JSON |
| POST | `/api/syllabus/generate` | Upload resource → AI generates topic graph |
| GET | `/api/syllabus/topic/:topicId` | Single topic with metadata |
| PUT | `/api/syllabus/topic/:topicId/progress` | Mark progress, set confidence |
| GET | `/api/syllabus/analytics` | Completion %, weak areas, revision due |

### Planner — `/api/planner`

| Method | Route | Description |
|---|---|---|
| POST | `/api/planner/generate` | Input params → AI plan generation (async job) |
| GET | `/api/planner/active` | Fetch active plan (nodes + edges) |
| GET | `/api/planner/:planId` | Fetch specific plan version |
| PUT | `/api/planner/:planId/graph` | Save user drag-and-drop changes |
| POST | `/api/planner/:planId/replan` | Trigger auto-replanning (missed days, new goals) |
| GET | `/api/planner/:planId/analytics` | Progress, velocity, risk alerts |
| GET | `/api/planner/jobs/:jobId` | Poll async generation job status |

### Crisis Mode — `/api/crisis`

| Method | Route | Description |
|---|---|---|
| POST | `/api/crisis/analyze` | Submit situation → AI analysis of readiness gap |
| POST | `/api/crisis/generate` | Generate full crisis plan (standard mode) |
| POST | `/api/crisis/last-night` | Last-Night Mode emergency plan (< 12 hrs) |
| POST | `/api/crisis/clinical-survival` | Practical/viva-focused survival plan |
| GET | `/api/crisis/high-yield/:examType` | Get ranked high-yield topic list |
| GET | `/api/crisis/sacrifice/:planId` | What to skip (sacrifice engine output) |
| POST | `/api/crisis/readiness` | Compute pass probability score |
| POST | `/api/crisis/ask` | "If I were you" freeform AI query |
| GET | `/api/crisis/sessions` | User's past crisis sessions |

### Clinical Mode — `/api/clinical`

| Method | Route | Description |
|---|---|---|
| GET | `/api/clinical/cases` | Browse case library (filter by specialty, difficulty) |
| POST | `/api/clinical/cases/generate` | AI-generate a custom case |
| POST | `/api/clinical/sessions` | Start a new case session |
| GET | `/api/clinical/sessions/:id` | Get full session (conversation, case sheet, eval) |
| POST | `/api/clinical/sessions/:id/respond` | Student message → AI patient response |
| POST | `/api/clinical/sessions/:id/examine` | Request examination → AI reveals findings |
| POST | `/api/clinical/sessions/:id/submit` | Submit completed case sheet |
| GET | `/api/clinical/sessions/:id/evaluate` | Get AI evaluation (triggers if not yet done) |
| POST | `/api/clinical/sessions/:id/viva` | Start viva; returns examiner question |
| POST | `/api/clinical/sessions/:id/viva/answer` | Student answers viva question |

---

## 7. Module 1 — Syllabus Intelligence Map

### Objective
Replace static syllabus navigation with a dynamic, spatial, animated knowledge graph that students can explore visually — similar to Miro/FigJam.

### Component Architecture
```
SyllabusMapPage
├── SyllabusGraphCanvas          ← ReactFlow root canvas
│   ├── SubjectNode              ← Top-level animated subject bubble
│   │   ├── ChapterNode          ← Expands on click
│   │   │   └── TopicNode        ← Leaf nodes with metadata badge
│   ├── GraphControls            ← Zoom, pan, minimap, reset
│   ├── SearchOverlay            ← Semantic topic search
│   └── FilterPanel              ← Filter by importance, PYQ, weak areas
├── TopicDetailDrawer            ← Slide-in panel on topic click
│   ├── TopicMetadataGrid        ← Scores, time, PYQ count
│   ├── DependencyMiniGraph      ← Related topic subgraph
│   ├── ProgressControls         ← Mark done / needs revision
│   └── QuickNoteInput
└── SyllabusGeneratorModal       ← Upload resource → generate graph
```

### Graph Data Format (stored in Supabase as JSONB)
```json
{
  "nodes": [
    {
      "id": "anatomy",
      "type": "subject",
      "data": { "label": "Anatomy", "totalTopics": 120, "completedTopics": 45 },
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "anatomy-upper-limb",
      "type": "chapter",
      "data": { "label": "Upper Limb", "subject": "anatomy" },
      "position": { "x": 300, "y": 150 }
    },
    {
      "id": "anatomy-brachial-plexus",
      "type": "topic",
      "data": {
        "label": "Brachial Plexus",
        "importanceScore": 9,
        "pyqFrequency": 14,
        "difficultyScore": 8,
        "estimatedMinutes": 60,
        "clinicalImportance": 9,
        "status": "not_started",
        "subtopics": ["Roots", "Trunks", "Divisions", "Cords", "Branches", "Lesions"]
      },
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    { "id": "e1", "source": "anatomy", "target": "anatomy-upper-limb" },
    { "id": "e2", "source": "anatomy-upper-limb", "target": "anatomy-brachial-plexus" }
  ]
}
```

### AI Syllabus Generation Pipeline
```
User uploads PDF/textbook resource
        │
        ▼
Document chunking (LangChain TextSplitter)
        │
        ▼
Embed chunks → ChromaDB vector store
        │
        ▼
LLM Extraction Chain:
  "Extract subject → chapter → topic hierarchy
   from these chunks as structured JSON"
        │
        ▼
Topic enrichment (importance, PYQ frequency
  from pre-seeded PYQ database + RAG)
        │
        ▼
Graph layout computation (Dagre layout algorithm)
        │
        ▼
Persist to `topics` table + return graph JSON
```

### Motion Design Specifications

- **Subject node entry:** Spring scale animation on mount (Framer Motion `spring` with stiffness 300, damping 25)
- **Chapter expansion:** Layout animation via `AnimatePresence` — children nodes fly in from parent
- **Topic hover:** Glow ring + floating metadata tooltip
- **Graph traversal:** Smooth camera pan/zoom using ReactFlow's `fitView` + custom easing
- **Progress updates:** Animated fill on node border (CSS `stroke-dashoffset` transition)
- **Dependency highlight:** Ripple pulse on connected nodes when one is selected

---

## 8. Module 2 — Agentic Planner System

### Objective
Replace static timetables with a live AI-driven preparation graph that continuously adapts to the student's progress, missed sessions, and changing goals.

### Component Architecture
```
PlannerWorkspace
├── PlannerGraph                 ← ReactFlow canvas (plan as DAG)
│   ├── PhaseNode                ← "Week 1", "Pre-exam Phase" groupings
│   │   ├── TopicTaskNode        ← Individual study tasks
│   │   └── RevisionLoopNode     ← Spaced repetition cycles
│   ├── DependencyEdge           ← Must-complete-before arrows
│   └── PlannerToolbar           ← Replan, export, analytics toggle
├── PlanInputForm                ← Onboarding / re-generate wizard
├── PlanAnalyticsPanel           ← Progress velocity, risk signals
├── DailyFocusCard               ← "What to study today" widget
└── ReplanAlert                  ← Triggered when plan deviates
```

### LangGraph Agentic Planning Workflow

```
State: { userInputs, syllabusData, userProgress, currentPlan }

[CollectInputsNode]
  → Validate exam date, hours, weak areas, target rank

[SyllabusAnalysisNode]
  → Pull topic list from ChromaDB
  → Score topics: importanceScore × pyqFrequency ÷ difficultyScore
  → Identify dependency ordering

[StrategyNode]
  → Determine available days
  → Calculate total study hours needed vs available
  → Detect deficit: "You need 400 hrs, you have 200 — compression required"
  → Choose strategy: Full Coverage | High-Yield Focus | Survival Mode

[PlanGenerationNode]
  → Allocate topics to days respecting dependencies
  → Insert spaced repetition revision blocks
  → Create phase groupings (Learning / Revision / Mock)
  → Output: nodes[] + edges[] (ReactFlow-compatible)

[ValidationNode]
  → Check no overloading > 90% of daily capacity
  → Ensure all P0 topics are covered
  → Flag if exam date unreachable

[OutputNode]
  → Save plan to study_plans table
  → Return plan graph JSON
```

### Auto-Replanning Triggers

| Trigger | System Response |
|---|---|
| User misses 1+ days | Compress remaining plan, redistribute missed topics |
| User marks topic as "too hard" | Extend allocation, push lower-priority items |
| Exam date changes | Recalculate full plan from current state |
| New weak area detected | Reprioritize topics in that area, add revision loops |
| User requests replan | Full regeneration with updated inputs |

### Plan Node Data Schema
```json
{
  "id": "node-anatomy-brachial-plexus-d3",
  "type": "topicTask",
  "data": {
    "topicId": "uuid",
    "label": "Brachial Plexus",
    "subject": "Anatomy",
    "scheduledDate": "2025-06-15",
    "durationMinutes": 60,
    "priority": "P0",
    "taskType": "learn",
    "status": "pending",
    "revisionDue": "2025-06-22"
  }
}
```

---

## 9. Module 3 — Crisis Mode

### Strategic Context
Crisis Mode is the primary premium conversion driver. It must function as an **AI Exam War Room** — brutally tactical, time-aware, and emotionally calibrated.

### Sub-Feature Architecture

#### 9.1 High-Yield Extraction Engine
```
Input: examType, daysRemaining, hoursPerDay, weakAreas[]

LLM Chain:
  1. Score every topic: (importanceScore × pyqFrequency × clinicalImportance)
  2. Factor in user weakness: multiply weak area scores by 1.3
  3. Sort descending
  4. Apply time constraint: fill daily hours with top topics until time exhausted

Output:
  - MUST_DO: top 30% by score, covers 70% of expected marks
  - SHOULD_DO: next 30%
  - OPTIONAL: if time permits
  - SKIP: bottom 20% — low ROI given time constraint
```

#### 9.2 Dynamic Sacrifice Engine
```
Input: fullSyllabus[], availableHours, targetPassScore

Algorithm:
  1. Calculate required hours for full syllabus coverage
  2. Compute deficit = requiredHours - availableHours
  3. Sort topics by: (weight × frequency) / studyTime  → ROI per hour
  4. Remove lowest-ROI topics until deficit resolved
  5. Add buffer: remove 15% more for revision time

Output:
  - sacrificeList[]: topics to skip with justification
  - retainList[]: topics to cover
  - estimatedMarksCoverage: % of total marks achievable
```

#### 9.3 Last-Night Mode
```
Input: examTomorrow=true, hoursAvailable (1–12)

Output structure:
{
  "emergencyRevisionPlan": [
    { "hour": 1, "focus": "Brachial Plexus — key lesions only", "type": "rapid_read" },
    { "hour": 2, "focus": "Pharmacology ONE-LINERS — top 20 drugs", "type": "mnemonics" }
  ],
  "ultraHighYieldFacts": ["..."],
  "vivaHotTopics": ["..."],
  "criticalMnemonics": ["..."],
  "examDayStrategy": "..."
}
```

#### 9.4 Panic Detection System
```
Signals detected from user inputs:
  - stressLevel >= 8
  - hoursRemaining < 20% of ideally required
  - User phrases: "I haven't studied anything", "I'm going to fail"

Response:
  - Soften plan: reduce daily goals by 30%
  - Switch to survival-only topic list
  - Add psychological anchor: "Here is what you CAN cover..."
  - Show readiness score with optimistic framing
```

#### 9.5 "If I Were You" Intelligence
```
Prompt injection: Full user context (progress, weak areas, time) +
"Given this student's exact situation, what is the single most 
impactful thing they should study in the next 3 hours? 
Be specific, tactical, and honest. No platitudes."

Output: Streamed freeform text response via SSE
```

#### 9.6 Readiness Prediction
```
Model inputs:
  - topicsCovered / totalTopics → coverage score
  - Average confidence of covered topics
  - PYQ hit rate (topics covered that appear in PYQs)
  - Days remaining × hours/day → study time remaining
  - Historical performance (if available)

Score: 0–100 (pass probability proxy)
Display: "Based on your current preparation, estimated readiness: 67%"
```

### Crisis Mode UI Structure
```
CrisisModeDashboard
├── SituationInputForm           ← Exam date, hours, stress level
├── ReadinessScoreMeter          ← Animated circular gauge
├── HighYieldTopicList           ← MUST/SHOULD/OPTIONAL/SKIP columns
├── SacrificePanel               ← Topics to drop with ROI reasoning
├── TacticalTimeline             ← Hour-by-hour plan for remaining days
├── LastNightModeButton          ← Emergency mode CTA (premium)
├── AskAIPanel                   ← "If I were you" freeform chat
└── PanicAlert (conditional)     ← Triggered by stress signals
```

---

## 10. Module 4 — Clinical Mode

### Objective
Simulate a complete real-world patient encounter — from initial presentation through history taking, clinical examination, case sheet writing, AI evaluation, and examiner viva.

### Session State Machine
```
[case_generated]
      │
      ▼
[history_taking]  ←──────────────────────────────┐
      │  (student asks questions)                 │ (can go back)
      ▼                                           │
[examination]                                     │
      │  (student requests system exams)          │
      ▼                                           │
[case_sheet_writing]                              │
      │  (student fills 19-field case sheet)      │
      ▼                                           │
[submitted]                                       │
      │                                           │
      ▼                                           │
[ai_evaluation]  ──── generates consultant summary
      │
      ▼
[viva]  ──── AI examiner Q&A
      │
      ▼
[completed]  ──── score + feedback saved
```

### Clinical Case Generation (AI)
```
Prompt Template:
  "Generate a realistic MBBS clinical case for {specialty} at {difficulty} level.
   Include:
   - Patient demographics, occupation, socioeconomic context
   - Chief complaints (2–3)
   - Vitals at presentation
   - Hidden history findings (revealed on specific questioning)
   - Examination findings by system (revealed on request)
   - Provisional diagnosis and differentials
   - 5 viva questions with model answers
   Format as structured JSON."
```

### Patient Simulation AI Behavior

During history taking, the FastAPI ClinicalAgent:
1. Receives student's question.
2. Matches against hidden findings in the case JSON.
3. If matched: returns the finding (revealed information).
4. If unasked: returns appropriate "patient response" (e.g., "The cough started about 6 weeks ago…").
5. Tracks which findings have been elicited (stored in `conversation` JSONB).

### Case Sheet Evaluation Rubric

| Dimension | Weight |
|---|---|
| Chronological accuracy of HPI | 15% |
| Completeness (all 19 sections present) | 20% |
| Clinical reasoning (provisional Dx logic) | 20% |
| Differential diagnosis quality | 15% |
| Investigation appropriateness | 15% |
| Management plan correctness | 15% |

### Component Architecture
```
ClinicalModePage
├── CaseSelector                 ← Browse/filter case library
├── ActiveCaseSession
│   ├── PatientPresentationCard  ← Chief complaint, vitals, context
│   ├── ConversationInterface    ← Chat-like history taking
│   │   └── ExaminationRequestPanel ← "Request CVS exam" buttons
│   ├── CaseSheetEditor          ← 19-section structured form
│   │   └── SectionProgressBar
│   ├── FindingsRevealPanel      ← Progressive disclosure of exam findings
│   └── SubmitCaseButton
├── EvaluationReport             ← Post-submission AI feedback
│   ├── ScoreBreakdown
│   ├── ConsultantSummaryCard
│   └── MissedFindingsList
└── VivaInterface                ← Examiner chatbot Q&A
    ├── ExaminerQuestionCard
    ├── StudentAnswerInput
    └── ModelAnswerReveal
```

---

## 11. AI & LLM Architecture

### Agent Design (LangGraph)

Each major AI feature is a separate stateful LangGraph agent:

```
SyllabusGraphAgent
  tools: [search_chromadb, extract_topics, compute_layout]
  state: { uploadedChunks, extractedTopics, graphJson }

PlannerAgent
  tools: [get_user_progress, score_topics, generate_schedule, validate_plan]
  state: { userInputs, syllabusData, planDraft, iteration }

CrisisAgent
  tools: [rank_topics, compute_sacrifice, generate_timeline, predict_readiness]
  state: { crisisInputs, topicScores, generatedPlan, readinessScore }

ClinicalAgent
  tools: [generate_case, simulate_patient, reveal_findings, evaluate_sheet, conduct_viva]
  state: { caseData, sessionHistory, revealedFindings, caseSheet, evaluationResult }
```

### LLM Model Strategy

| Task | Model | Reason |
|---|---|---|
| Plan generation | GPT-4o / Claude Sonnet | Complex reasoning, structured output |
| Crisis analysis | GPT-4o / Claude Sonnet | Tactical, high-stakes — quality matters |
| Clinical patient simulation | Claude Sonnet | Nuanced, empathetic patient role-play |
| Case evaluation | GPT-4o | Structured rubric scoring |
| Simple completions (free tier) | GPT-3.5 / Claude Haiku | Cost optimization |
| Syllabus extraction | GPT-4o-mini | Structured JSON extraction from documents |

### RAG Pipeline (ChromaDB)

```
Ingestion:
  PDF → PyPDF2 chunks → OpenAI embeddings → ChromaDB upsert
  Metadata: { subject, chapter, examType, source }

Query:
  User topic request → embed query → ChromaDB similarity search
  → Top 10 chunks → LLM context window → Enriched response
```

### Streaming Architecture

All AI responses stream via Server-Sent Events:
```
Frontend: useStreamingResponse(url)
  → EventSource connection to Next.js route
  → Next.js route: fetch(FastAPI SSE stream)
  → FastAPI: LangChain streaming callback → yield chunks
```

---

## 12. Frontend Architecture

### Routing Structure (Next.js App Router)
```
/app
├── (auth)
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)
│   ├── layout.tsx               ← Sidebar + top bar shell
│   ├── planner/
│   │   ├── page.tsx             ← Planner workspace (default view)
│   │   ├── syllabus/page.tsx    ← Syllabus map (tab within planner)
│   │   ├── crisis/page.tsx      ← Crisis mode (tab within planner)
│   │   └── clinical/page.tsx    ← Clinical mode (tab within planner)
│   ├── settings/page.tsx
│   └── onboarding/page.tsx
```

### Sidebar Architecture
The Planner becomes the Central Command Center. The sidebar has a single **Planner** entry that contains tabbed navigation internally. This satisfies the BRD requirement to eliminate independent sidebar sections.

```
Sidebar
├── Planner (active)
│   └── [Internal tabs: Map | Plan | Crisis | Clinical]
├── Chats
├── Notes
├── Practice
└── Profile
```

### Key Shared Components
```
components/
├── graph/
│   ├── SubjectNode.tsx
│   ├── ChapterNode.tsx
│   ├── TopicNode.tsx
│   └── PlanTaskNode.tsx
├── crisis/
│   ├── ReadinessMeter.tsx
│   ├── HighYieldTable.tsx
│   └── SacrificePanel.tsx
├── clinical/
│   ├── PatientCard.tsx
│   ├── ConversationThread.tsx
│   ├── CaseSheetForm.tsx
│   └── EvaluationReport.tsx
├── ai/
│   ├── StreamingText.tsx        ← Renders SSE token stream
│   └── AIThinkingIndicator.tsx
└── ui/
    ├── PremiumGate.tsx          ← Blur + upgrade prompt wrapper
    ├── ProgressRing.tsx
    └── AnimatedScore.tsx
```

---

## 13. Premium & Monetization Layer

### Feature Gating Matrix

| Feature | Free | Premium |
|---|---|---|
| Syllabus Map (view only) | ✓ | ✓ |
| Syllabus Map (AI generation) | 1 subject | Unlimited |
| Agentic Planner | 1 active plan | Unlimited |
| Auto-replan | — | ✓ |
| Crisis Mode (demo) | 3 uses/month | Unlimited |
| Last-Night Mode | — | ✓ |
| Sacrifice Engine | — | ✓ |
| Readiness Prediction | — | ✓ |
| "If I Were You" AI | — | ✓ |
| Clinical Cases | 2 basic cases | Full library |
| Case Sheet Evaluation | — | ✓ |
| Viva System | — | ✓ |
| Premium LLM Models | — | ✓ |
| Consultant-Grade Summaries | — | ✓ |

### Implementation
```
// PremiumGate component wraps any feature
<PremiumGate feature="last_night_mode">
  <LastNightModeButton />
</PremiumGate>

// Gate checks subscription from Zustand store
// Shows blur overlay + upgrade modal for free users
```

### Stripe Integration
- Subscription tiers via Stripe Billing
- Webhook handler in `/api/webhooks/stripe` updates `users.subscription`
- Row-level security in Supabase enforces feature access at the data layer

---

## 14. Phased Implementation Roadmap

### Phase 0 — Foundation (Weeks 1–2)

**Goal:** Deployable skeleton with auth, DB, and CI/CD.

- [ ] Monorepo setup (Next.js + FastAPI in `/apps/web` and `/apps/ai`)
- [ ] Supabase project init — all table schemas + RLS policies
- [ ] Next.js auth flow (register, login, profile setup)
- [ ] Base Planner shell with tabbed navigation
- [ ] FastAPI service with health check + basic LangChain connectivity
- [ ] GitHub Actions CI/CD pipeline
- [ ] Vercel + Railway deployments configured

**Deliverable:** Authenticated user can log in and see the Planner shell.

---

### Phase 1 — Syllabus Intelligence Map (Weeks 3–6)

**Goal:** Visual graph of NEET-PG / MBBS syllabus with topic metadata.

- [ ] Seed `topics` table with NEET-PG syllabus (manual + AI-assisted)
- [ ] Graph JSON generation from topic tree
- [ ] ReactFlow canvas with SubjectNode, ChapterNode, TopicNode
- [ ] Dagre auto-layout algorithm integration
- [ ] Node expansion animations (Framer Motion)
- [ ] TopicDetailDrawer with metadata display
- [ ] Progress marking (not_started → in_progress → done)
- [ ] Syllabus upload → AI generation pipeline (FastAPI + ChromaDB)
- [ ] Semantic search overlay

**Deliverable:** Students can visually explore the full NEET-PG syllabus, mark progress, and upload custom resources to generate topic maps.

---

### Phase 2 — Agentic Planner (Weeks 7–10)

**Goal:** AI generates personalized, adaptive study plans rendered as interactive graphs.

- [ ] PlanInputForm with all BRD-specified inputs
- [ ] LangGraph PlannerAgent implementation
- [ ] Async job queue (BullMQ) for plan generation
- [ ] Job status polling endpoint + loading UI
- [ ] Plan graph rendered in ReactFlow (PhaseNode, TopicTaskNode)
- [ ] Drag-and-drop reordering → auto-save to Supabase
- [ ] Auto-replan triggers (missed days, topic difficulty updates)
- [ ] DailyFocusCard — "What to study today" surface
- [ ] Plan analytics panel (progress velocity, risk alerts)
- [ ] Supabase Realtime sync for multi-device

**Deliverable:** Students receive a fully personalized study plan that adapts dynamically as they progress.

---

### Phase 3 — Crisis Mode (Weeks 11–14)

**Goal:** Premium AI war room for last-minute exam preparation.

- [ ] Situation input form (exam date, hours, stress level)
- [ ] CrisisAgent implementation in LangGraph
- [ ] High-yield extraction engine with MUST/SHOULD/OPTIONAL/SKIP output
- [ ] Dynamic Sacrifice Engine
- [ ] Readiness Prediction score (0–100)
- [ ] Last-Night Mode emergency plan generator
- [ ] Clinical Survival Mode (viva/practical focus)
- [ ] Panic Detection signals + UI response
- [ ] "If I Were You" freeform streaming AI
- [ ] Auto-replanning engine
- [ ] Premium feature gating + Stripe subscription integration
- [ ] Crisis mode session history

**Deliverable:** Premium subscribers have access to the full Crisis Mode suite. Free users see limited demo with upgrade prompts.

---

### Phase 4 — Clinical Mode (Weeks 15–20)

**Goal:** Full virtual ward simulation — case generation, interactive encounters, case sheet evaluation, viva.

- [ ] Seed clinical_cases table with 50 pre-generated cases (5 specialties × 3 difficulties × varied diagnoses)
- [ ] ClinicalAgent for case generation and patient simulation
- [ ] Case browsing UI with specialty/difficulty filters
- [ ] Patient presentation card
- [ ] Conversation interface (history taking)
- [ ] Examination request panel (system-wise reveal)
- [ ] 19-section case sheet editor with structured fields
- [ ] Case sheet submission + AI evaluation pipeline
- [ ] Consultant-grade summary generation
- [ ] Viva examiner chatbot interface
- [ ] Session scoring and history
- [ ] Premium gating on evaluation and viva features

**Deliverable:** Students can simulate complete patient encounters with AI evaluation and viva practice.

---

### Phase 5 — Polish, Performance & Launch (Weeks 21–24)

**Goal:** Production-grade reliability, performance, and growth instrumentation.

- [ ] Performance audit: LCP < 2.5s, graph render < 1s for 500 nodes
- [ ] ReactFlow node virtualization for large graphs
- [ ] SSE streaming UX polish (typing indicators, error recovery)
- [ ] Mobile responsive audit and fixes
- [ ] PostHog analytics instrumentation on all key events
- [ ] Sentry error tracking integration
- [ ] Onboarding flow for new users (exam type → plan setup wizard)
- [ ] Referral system
- [ ] Load testing at 5,000 concurrent users
- [ ] SEO optimization for landing pages
- [ ] Beta user cohort → feedback iteration

**Deliverable:** Publicly launchable, production-ready product.

---

## 15. Trade-off Analysis

### 1. Next.js + FastAPI vs. Full Python Backend

| Option | Pros | Cons |
|---|---|---|
| Next.js + FastAPI (chosen) | Best-in-class DX for frontend; Python's AI ecosystem for AI; independent scaling | Two services to maintain; cross-service latency |
| Full Next.js | Single codebase | Node.js AI ecosystem weaker; harder to run LangChain natively |
| Full FastAPI | Best for AI | Complex SSR setup; less productive for frontend |

**Decision:** Next.js + FastAPI. FastAPI adds ~20ms internal latency but unlocks native LangChain/LangGraph with Python type safety.

### 2. ReactFlow vs. D3.js for Graph

| Option | Pros | Cons |
|---|---|---|
| ReactFlow (chosen) | React-native, drag-and-drop built-in, minimap, controls | Large bundle (~200KB); less fine-grained control |
| D3.js | Maximum flexibility, proven at massive scale | Non-React paradigm, requires manual drag-and-drop |

**Decision:** ReactFlow for MVP speed and React integration. Migrate specific performance-critical canvases to D3 if node count exceeds 2,000.

### 3. Supabase vs. Custom Postgres + Auth

| Option | Pros | Cons |
|---|---|---|
| Supabase (chosen) | Auth + DB + Realtime + Storage in one; Row-level security; fast start | Vendor lock-in; cost at scale |
| Custom stack | Full control | Auth from scratch, Realtime infra required |

**Decision:** Supabase for MVP. Abstract DB calls behind a data layer so migration is possible at scale.

### 4. ChromaDB vs. pgvector

| Option | Pros | Cons |
|---|---|---|
| ChromaDB (chosen) | Managed, fast ANN, scales to billions | Cost; external dependency |
| pgvector | Co-located with Postgres; no extra service | Lower ANN performance; manual index tuning |

**Decision:** ChromaDB for MVP. If Supabase's pgvector improves, consolidate at Phase 5 review.

### 5. Synchronous vs. Async AI Plan Generation

**Decision:** Async with BullMQ. Plan generation takes 10–40 seconds — synchronous requests would time out. Jobs are queued, status polled or pushed via Supabase Realtime.

---

## 16. Success Metrics & Instrumentation

### Engagement Metrics (PostHog events)

| Event | Trigger |
|---|---|
| `syllabus_map_opened` | User enters Syllabus Map |
| `topic_expanded` | User clicks a topic node |
| `topic_marked_done` | User marks a topic complete |
| `plan_generated` | AI plan generation completes |
| `plan_modified` | User drags/edits plan |
| `crisis_mode_activated` | User opens Crisis Mode |
| `last_night_mode_triggered` | Last-Night Mode used |
| `clinical_session_started` | New clinical session begins |
| `clinical_session_completed` | Case sheet submitted |
| `viva_completed` | Viva session finished |
| `premium_gate_hit` | User hits a premium feature wall |
| `upgrade_clicked` | User clicks upgrade CTA |

### Target Metrics (6-month)

| Metric | Target |
|---|---|
| DAU / MAU ratio | > 40% |
| Average session duration | > 18 minutes |
| Crisis Mode monthly actives | > 30% of total users |
| Clinical case completion rate | > 60% of started sessions |
| Free → Premium conversion | > 8% |
| D30 retention | > 35% |

---

## 17. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| LLM hallucination in clinical cases | Medium | High | Human-reviewed case seed library; evaluation rubric catches factual errors; display disclaimer |
| OpenRouter API downtime | Low | High | Fallback to direct OpenAI API; graceful degradation with cached plans |
| ReactFlow performance with 1000+ nodes | Medium | Medium | Node virtualization, lazy loading, expand-on-demand architecture |
| Supabase RLS misconfiguration leaking user data | Low | Critical | Security review of all RLS policies before launch; row ownership enforced on every table |
| AI plan quality poor for edge-case exam timelines | Medium | Medium | LangGraph validation node rejects/retries plans that fail quality checks; user can always edit manually |
| Premium paywall frustration causing churn | Medium | Medium | Generous free tier with clearly demonstrated value before hitting gates; trial period for Crisis Mode |
| DPDP compliance (India) | Low | High | No sensitive medical data stored; all AI interactions are academic; clear privacy policy |

---

## Appendix A — Environment Variables

```
# Next.js
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_ENGINE_URL=                    # FastAPI internal URL
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# FastAPI AI Engine
OPENROUTER_API_KEY=
OPENAI_API_KEY=                   # For embeddings
CHROMADB_API_KEY=
CHROMADB_ENVIRONMENT=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
```

## Appendix B — Repository Structure

```
almondai/
├── apps/
│   ├── web/                      # Next.js 14 application
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # Shared UI components
│   │   ├── lib/                  # Supabase client, API helpers
│   │   ├── stores/               # Zustand stores
│   │   └── types/                # TypeScript types
│   └── ai/                       # FastAPI AI engine
│       ├── agents/               # LangGraph agents
│       ├── chains/               # LangChain chains
│       ├── routers/              # FastAPI route files
│       ├── services/             # ChromaDB, OpenRouter clients
│       └── models/               # Pydantic models
├── packages/
│   └── shared-types/             # Shared TypeScript types (web + AI bridge)
├── supabase/
│   ├── migrations/               # SQL migration files
│   └── seed/                     # Seed data (topics, clinical cases)
├── .github/
│   └── workflows/                # CI/CD pipelines
└── docker-compose.yml            # Local dev environment
```

---

*This implementation plan was derived from the AlmondAI BRD v1.0 and is intended as the authoritative engineering reference for the Planner Intelligence System, Syllabus Map, Crisis Mode, and Clinical Mode build-out.*
