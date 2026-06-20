# AlmondAI — "Upload Your Material" Knowledge-Base Feature — Implementation Plan

**Status:** DRAFT for review · Date: 17 June 2026 · Scope: MVP · **No tech-stack change**

> **Update (17 Jun, per founder):** four items first parked as out-of-scope are now **in scope** — (a) **spaced-repetition** scheduling of flashcards, (b) **OCR + diagram/image understanding** for scanned/image PDFs and uploaded photos, (c) **Whisper** transcription of YouTube audio when captions are missing, and (d) **multi-document "study sets"** with sharing & (async) collaboration. Each is implemented by **reusing a provider already configured** (Gemini vision, Groq Whisper) so the stack still doesn't change — the only new dependency is `yt-dlp`.

> A student uploads **any** study material — PDF, DOC/DOCX, Excel/CSV, a YouTube video, or a web link — and AlmondAI turns it into a personal, queryable knowledge base. On top of that material the student can: **(1) ask doubts to the LLM**, **(2) generate flashcards**, **(3) generate quizzes**, and **(4) talk to it in Voice Mode**.

This document is **for review only**. Nothing is implemented yet. Once approved we execute phase by phase.

---

## 0. Guiding constraints (locked by the founder)

1. **Keep the current stack.** ChromaDB (vectors), `sentence-transformers/all-MiniLM-L6-v2` (embeddings), Supabase (system of record + auth), Groq/OpenRouter/Gemini (LLMs), FastAPI backend, Next.js frontend. **No migration to pgvector/Qwen/LangGraph etc.** for this feature.
2. **MVP, not the cathedral.** Smallest correct thing that delivers all four capabilities. No eval harness, no worker queue, no microservices. Reuse what exists.
3. **Reuse before building.** The chunker, the embedding manager, the per-student Chroma collection pattern, the MCQ generator, the SSE tutor stream, and the voice WS pipeline already exist — we extend them, we don't rewrite them.

---

## 1. What already exists (and what we reuse)

| Capability | Where it lives today | How this feature reuses it |
|---|---|---|
| PDF text extraction + chunking | `backend/app/services/rag/ingestion.py` (`DocumentIngester.chunk_text`) | **Reuse `chunk_text()` as-is**; add new *from-bytes* extractors for DOCX/XLSX/YouTube/URL that feed the same chunker |
| Embeddings | `backend/app/services/rag/embeddings.py` (`EmbeddingManager`) | **Reuse unchanged** (MiniLM, `embed_batch`) |
| Vector store + per-student collections | `backend/app/services/rag/vector_store.py` (`ChromaVectorStore`, `get_or_create_student_collection`, `student_memory_{id}`) | **Mirror the pattern**: new `student_uploads_{user_id[:8]}` collection + add/search/delete methods |
| RAG retrieval into prompts | `backend/app/services/rag/retriever.py` + `pipeline.py` | Add an **"uploads" retrieval path** the tutor pipeline can choose |
| Doubt-solver SSE stream | `backend/app/api/routes/doubt_solver.py` (`/api/v1/doubt-solver/ask`) | Add optional `document_ids` to the request; route retrieval to uploads |
| MCQ generation | `backend/app/services/mcq/mcq_generator.py` | Add a **grounded variant** that writes MCQs from retrieved upload chunks |
| Voice WS pipeline | `backend/app/api/routes/voice.py` + `services/voice/voice_pipeline.py` | Inject retrieved upload context into `_build_messages()`; add `document_ids` to the WS `config` message |
| Chat input (file param already stubbed) | `frontend/components/ui/ai-prompt-box.tsx` (`onSend(msg, files: File[])` — currently always `[]`) | **Wire the existing `files` param** to a new attach button |
| Supabase migrations + RLS pattern | `backend/database/migrations/*.sql` (e.g. `007_mcq.sql`) | New `019_documents.sql` following the exact same RLS/grant/trigger conventions |
| Per-feature FE API clients | `frontend/lib/api/*.api.ts` | New `documents.api.ts` |
| Vision-capable LLM | Gemini already configured (`gemini_api_key`, `google-genai` in `requirements.txt`) | **Reuse for OCR + diagram/image understanding** — no new provider, no Tesseract binary |
| Hosted Whisper STT | Groq already configured (`groq_api_key`) — `whisper-large-v3` | **Reuse for YouTube audio** when captions are missing — no local model |
| Spaced-repetition precedent | FSRS due-queue is the master-plan target; MCQ already uses Supabase + Redis-style flows | MVP uses lightweight **SM-2** in pure code; graduates to FSRS later |

**What does NOT exist today (net-new):** any upload endpoint, DOCX/XLSX/YouTube/URL/image ingestion, a documents table, flashcards (anywhere), spaced-repetition scheduling, grounded quizzes, vision OCR/diagram understanding, Whisper audio transcription, study sets / sharing, and any RAG in voice mode.

---

## 2. The architecture in one picture

```
                          ┌──────────────────────────────────────────────┐
   Upload (file or URL)   │  INGESTION (new)                             │
   PDF/DOCX/XLSX/CSV/  ─► │  extract text → chunk_text() (reuse) →       │
   YouTube/Web link/IMG   │  MiniLM embed (reuse) →                       │
                          │  Chroma collection student_uploads_{uid}     │
        fallbacks:        │  metadata: {user_id, document_id, ...}       │
   • scanned/empty PDF ─► │                                              │
     & images  → Gemini   └───────────────┬──────────────────────────────┘
     vision (OCR+diagram) │  (status + provenance in Supabase: student_documents)
   • YouTube w/o captions ▼
     → Groq Whisper       │
            ┌───────────────┬─────────────┴───────────┬────────────────────┐
            ▼               ▼                          ▼                    ▼
     (1) ASK DOUBTS   (2) FLASHCARDS            (3) QUIZZES          (4) VOICE MODE
     tutor pipeline   new service:              extend mcq_generator  voice_pipeline
     retrieves from   retrieve chunks → LLM →   with grounded variant injects retrieved
     uploads, cites   cards + SM-2 spaced-rep   → store MCQs tagged   upload chunks into
     filename/page    review queue              w/ document_id        the spoken answer

   All four consumers accept a single document_id, a list, OR a study_set_id
   (a saved/shared group of documents) — retrieval already supports an $in filter.
```

**Tenant scoping:** every upload chunk carries `user_id` + `document_id` in Chroma metadata, and every Supabase row is `user_id`-scoped with RLS — identical to how `student_mcq_attempts` and `student_memory` already work. A student can only ever retrieve their own uploads (or a study set explicitly shared with them).

---

## 3. Data model (new migration `019_documents.sql`)

Following the exact conventions of `007_mcq.sql` (UUID PK, `users(id)` FK, RLS `USING (user_id = auth.uid())`, grants, `set_updated_at` trigger).

### `student_documents` — one row per uploaded item
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | document_id used everywhere downstream |
| `user_id` | UUID FK → users | tenant |
| `title` | TEXT | filename or fetched page/video title |
| `source_type` | TEXT CHECK in (`pdf`,`docx`,`xlsx`,`csv`,`youtube`,`weblink`,`image`) | drives the extractor; `image` = uploaded photo/scan |
| `source_url` | TEXT NULL | for youtube/weblink |
| `storage_path` | TEXT NULL | Supabase Storage path for raw file (see §Decision D2) |
| `extraction_method` | TEXT NULL | provenance shown to the student: `text` / `ocr_vision` / `vision_description` / `caption` / `audio_whisper` |
| `status` | TEXT CHECK in (`processing`,`ready`,`failed`) DEFAULT `processing` | polled by FE |
| `error_message` | TEXT NULL | shown if `failed` |
| `chunk_count` | INT DEFAULT 0 | |
| `subject` | TEXT NULL | optional student-set label, reused by tutor/quiz |
| `created_at` / `updated_at` | TIMESTAMPTZ | trigger-maintained |

### `document_flashcards` — generated cards **+ SM-2 spaced-repetition state**
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | tenant |
| `document_id` | UUID FK → student_documents (ON DELETE CASCADE) | |
| `front` | TEXT | prompt/question |
| `back` | TEXT | answer/explanation |
| `hint` | TEXT NULL | optional |
| `state` | TEXT CHECK in (`new`,`learning`,`review`,`lapsed`) DEFAULT `new` | SRS lifecycle |
| `ease_factor` | REAL DEFAULT 2.5 | SM-2 ease |
| `interval_days` | REAL DEFAULT 0 | current interval |
| `repetitions` | INT DEFAULT 0 | consecutive correct |
| `lapses` | INT DEFAULT 0 | times forgotten |
| `due_at` | TIMESTAMPTZ DEFAULT now() | drives the due-queue |
| `last_reviewed_at` | TIMESTAMPTZ NULL | |
| `created_at` | TIMESTAMPTZ | |

### `flashcard_reviews` — one row per review (history + analytics)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | tenant |
| `flashcard_id` | UUID FK → document_flashcards (ON DELETE CASCADE) | |
| `rating` | TEXT CHECK in (`again`,`hard`,`good`,`easy`) | feeds the SM-2 update |
| `prev_interval_days` | REAL | before this review |
| `new_interval_days` | REAL | after this review |
| `reviewed_at` | TIMESTAMPTZ DEFAULT now() | |

### Quizzes — **reuse `mcq_questions`**, add two nullable columns
- `ALTER TABLE mcq_questions ADD COLUMN document_id UUID NULL` (+ index) and reuse `source` set to `'document'`.
- Existing `student_mcq_attempts` / `mcq_sessions` flow is reused untouched (the quiz UI already exists).

**Vectors (Chroma, no migration needed):** collection `student_uploads_{user_id[:8]}`, chunk metadata `{user_id, document_id, title, source_type, page_or_section, chunk_index, chunk_id}`. A **study set** is just a saved group of `document_id`s, so retrieval across a set is a single `where={"document_id": {"$in": [...]}}` query — no new vector structure.

### Study sets, sharing & collaboration (new tables)

**`study_sets`** — a named group of documents
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | study_set_id |
| `owner_id` | UUID FK → users | creator |
| `name` / `description` | TEXT | |
| `is_shareable` | BOOLEAN DEFAULT false | enables link sharing |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**`study_set_documents`** — membership of docs in a set (`set_id`, `document_id`, `added_by`, `added_at`; PK on `(set_id, document_id)`). A doc may belong to many sets.

**`study_set_members`** — async collaboration: who can access/contribute (`set_id`, `user_id`, `role` CHECK in (`owner`,`member`), `added_at`). Owner invites members; members add their own documents to the shared set.

**`study_set_shares`** — read-only link sharing (`id`, `set_id`, `token` UNIQUE, `access` CHECK in (`view`,`clone`), `created_by`, `expires_at` NULL, `revoked` BOOLEAN). Anyone with the token can view (and, if `clone`, copy the set into their own materials).

> **Access rule (RLS + service checks):** a user may read a set's documents if they are the `owner_id`, a row in `study_set_members`, or hold a valid `study_set_shares` token. Retrieval expands `study_set_id` → the accessible `document_id`s only.

---

## 4. Phase-by-phase actionable steps

Each phase is independently shippable and testable. **Phases 1–4 are the spine (upload → stored → visible). Phases 5–8 are the four consumers and can be built in parallel once the spine is in.**

### PHASE 1 — Data model & storage scaffolding
- [ ] `backend/database/migrations/019_documents.sql` — `student_documents` (incl. `extraction_method`, `image` source type), `document_flashcards` (+ SM-2 columns), `flashcard_reviews`, `study_sets`, `study_set_documents`, `study_set_members`, `study_set_shares`, `mcq_questions.document_id`; RLS + grants + trigger for all.
- [ ] `backend/app/schemas/documents.py` (or inline Pydantic in the route) — `DocumentOut`, `DocumentListOut`, `IngestUrlRequest`, `FlashcardOut`, `ReviewRequest`, `StudySetOut`, `ShareLinkOut`.
- [ ] (If D2 = store raw) create Supabase Storage bucket `user-documents` (private) + helper in `core/database.py` for service-role storage access.
- **Test:** migration applies up/down clean; insert/select a row under a user; RLS blocks cross-user read.

### PHASE 2 — Ingestion engine (multi-format → chunks → vectors)
- [ ] `backend/app/services/rag/extractors.py` (new) — `extract_text(source_type, data|url) -> List[page-like dicts]` reusing the `{text, page_number, possible_chapter}` shape the chunker expects:
  - **PDF**: reuse existing PyMuPDF/pdfplumber logic (refactor to accept bytes). **If a page yields < ~50 chars of text → vision fallback** (see below).
  - **DOCX**: `python-docx` → paragraphs.
  - **XLSX/CSV**: `openpyxl` / stdlib `csv` → flatten rows to "Sheet/Col: value" text lines.
  - **YouTube**: `youtube-transcript-api` → transcript segments. **If no captions exist → audio fallback** (see below).
  - **Web link**: `httpx` GET → `trafilatura` (or `beautifulsoup4`) main-content extraction.
  - **Image** (`png`/`jpg`/`webp` upload): straight to the vision describer.
- [ ] **Vision fallback / diagram understanding** `services/documents/vision_extractor.py` (new) — render the scanned PDF page to PNG with PyMuPDF (`page.get_pixmap()`), or take the uploaded image, and send to **Gemini vision** (reuse `google-genai` + `gemini_api_key`). One prompt does both OCR (verbatim text) **and** a structured description of any diagram/figure/flowchart, so charts become retrievable, quizzable text. Sets `extraction_method = ocr_vision | vision_description`. (Decision D7.)
- [ ] **Audio fallback (Whisper)** `services/documents/audio_extractor.py` (new) — when a YouTube video has no captions: `yt-dlp` pulls the audio track → **Groq hosted `whisper-large-v3`** (reuse `groq_api_key`) returns the transcript → feed the chunker. Sets `extraction_method = audio_whisper`. Guard with the max-duration cap (Decision D5/D6). (Decision D8.)
- [ ] `ChromaVectorStore` new methods: `add_user_document(user_id, document_id, chunks)`, `search_user_documents(user_id, query, document_ids=None, n_results=6)`, `delete_user_document(user_id, document_id)`. (`document_ids=None` searches all the user's uploads; a list uses an `$in` filter — this is what study sets ride on.)
- [ ] `backend/app/services/documents/ingestion_service.py` (new) — orchestrates: extract (with vision/audio fallbacks) → `chunk_text()` → embed → `add_user_document` → update `student_documents.status/chunk_count/extraction_method`. Runs in the **background** (FastAPI `BackgroundTasks` / `asyncio.create_task`; see Decision D3) and is exception-safe (sets `status='failed'` + `error_message`).
- **Test:** feed one sample of each source type **including a scanned/image-only PDF, a standalone image, and a caption-less YouTube video**; assert text is extracted via the right `extraction_method` and a `search_user_documents` query returns the chunks.

### PHASE 3 — Upload & document management API
New router `backend/app/api/routes/documents.py` (`prefix="/api/v1/documents"`), registered in `main.py`:
- [ ] `POST /upload` — multipart `UploadFile`; validates type/size, creates `student_documents` row (`processing`), kicks off ingestion, returns the row.
- [ ] `POST /ingest-url` — `{source_type: youtube|weblink, url}`; same flow.
- [ ] `GET /` — list the user's documents (status, title, chunk_count).
- [ ] `GET /{id}` — single document status/detail (FE polls until `ready`/`failed`).
- [ ] `DELETE /{id}` — delete Chroma chunks + flashcards + (storage file) + row. **(DPDP-clean deletion.)**
- [ ] Quota gating via existing `AuthService.get_active_subscription` (free vs premium caps — Decision D5).
- **Test:** upload → poll → `ready`; list shows it; delete removes vectors (a follow-up search returns nothing).

### PHASE 4 — Frontend: upload + "My Materials"
- [ ] `frontend/lib/api/documents.api.ts` — `uploadDocument`, `ingestUrl`, `listDocuments`, `getDocument`, `deleteDocument`.
- [ ] New page `app/(dashboard)/materials/page.tsx` — upload (file picker + drag-drop), "paste a YouTube/web link" field, list with per-doc status chips (Processing/Ready/Failed), delete. Add to `Sidebar.tsx`.
- [ ] Wire the **existing** `files` param in `ai-prompt-box.tsx`: add a paperclip/attach button so a student can attach within the tutor (uploads via the same API, then auto-selects the doc as context).
- **Test:** end-to-end upload of each type from the UI; status transitions visible; delete works.

### PHASE 5 — Consumer 1: Ask doubts grounded in uploads
- [ ] Extend `AskRequest` in `doubt_solver.py` with `document_ids: list[str] | None` (and a `scope` hint).
- [ ] Thread `document_ids` through `AlmondRAGPipeline.process_question(...)`. When present, retrieve via `search_user_documents()` instead of the global corpus, and build the context block with **citations to `title` + page/section** (reuse the retriever's source-formatting style).
- [ ] Tutor page (`ai-tutor/page.tsx`): a "context chip" showing which document(s) are active; pass their ids to `askQuestion`.
- **Test:** ask a question answerable only from the uploaded file → answer quotes it and cites the filename; with no doc selected, behavior is unchanged (global corpus).

### PHASE 6 — Consumer 2: Flashcard generation **+ spaced repetition**
- [ ] `backend/app/services/documents/flashcard_service.py` — retrieve representative chunks for a document (or study set) → LLM (reuse `generate_with_fallback_sync`) → strict JSON `[{front, back, hint}]` (mirror the robust JSON-parsing in `mcq_generator.py`) → store in `document_flashcards` with default SM-2 state (`new`, due now).
- [ ] `backend/app/services/documents/srs_service.py` (new) — **SM-2 algorithm in pure code** (~40 lines, no deps): `schedule(card, rating) -> updated state`. `again` resets interval + increments `lapses`; `hard/good/easy` adjust `ease_factor` and grow `interval_days`; compute next `due_at`. Writes a `flashcard_reviews` row each time. (Decision D9: SM-2 now, FSRS later.)
- [ ] API: `POST /documents/{id}/flashcards` (generate), `GET /flashcards/due` (the cross-document due-queue, ordered by `due_at`), `POST /flashcards/{card_id}/review` (`{rating}` → SM-2 update), `GET /documents/{id}/flashcards` (list).
- [ ] FE: a **review mode** (flip card → rate Again/Hard/Good/Easy) plus a "Due today: N" entry point on the Materials page and dashboard; "Generate flashcards" on a document or study set.
- **Test:** generate N cards; review with each rating and assert `due_at`/`interval_days`/`ease_factor` move per SM-2; the due-queue returns only cards with `due_at <= now()` across all documents.

### PHASE 7 — Consumer 3: Quiz generation grounded in uploads
- [ ] Add `generate_mcq_from_document(document_id, user_id, count, ...)` to `mcq_generator.py`: retrieve chunks → prompt the existing MCQ writer **with that context** → store rows with `document_id` + `source='document'` (reuse `generate_and_store_questions` storage path).
- [ ] API: `POST /api/v1/documents/{id}/quiz` returns questions (without `correct_option`, exactly like today).
- [ ] FE: "Quiz me on this" button on the document → reuse the **existing** MCQ attempt/session UI and `mcq.api.ts` (answers/scoring already work).
- **Test:** generated MCQs are answerable from the document; attempts record via the existing flow.

### PHASE 8 — Consumer 4: Voice mode on uploads (the "special part")
- [ ] Voice WS `config` message (`voice.py`): accept `document_ids`.
- [ ] `VoicePipeline._build_messages()` / `stream_response()`: before LLM, run `search_user_documents(user_id, transcript, document_ids)` (fast, local Chroma) and inject a **bounded** context block into the system/user message so Dr. Almond answers from the student's material. Keep it short to protect first-audio latency.
- [ ] FE (`voice-agent/page.tsx` + `useVoiceSession.ts`): a document picker; pass `document_ids` in the WS `config`. A visible "Answering from: <doc>" indicator.
- **Test:** in voice, ask something only in the uploaded doc → spoken answer reflects it; latency stays within today's perceived budget.

### PHASE 9 — Study sets (merge across multiple documents)
- [ ] `backend/app/services/documents/study_set_service.py` (new) — CRUD sets; add/remove documents; `resolve_document_ids(study_set_id, user_id)` returns only the docs the user may access.
- [ ] API: `POST/GET/PATCH/DELETE /api/v1/study-sets`, `POST /study-sets/{id}/documents`, `DELETE /study-sets/{id}/documents/{doc_id}`.
- [ ] **Thread `study_set_id` through all four consumers** — ask (`doubt_solver`), flashcards, quizzes, voice already take a `document_ids` list, so each just calls `resolve_document_ids()` first. One change point per consumer; the `$in` retrieval already exists.
- [ ] FE: a "Study sets" section on Materials — create a set, drag documents in; selecting a set as context anywhere (tutor chip, voice picker); "Generate flashcards / Quiz me on this whole set."
- **Test:** a set of 2 documents answers, quizzes, makes flashcards, and talks in voice across **both** documents; removing a doc from the set removes it from retrieval.

### PHASE 10 — Sharing & (async) collaboration
- [ ] **Read-only share link:** `POST /study-sets/{id}/share` mints a `study_set_shares` token; `GET /shared/{token}` returns the set for viewing; `POST /shared/{token}/clone` copies it into the viewer's own materials (re-ingests/links the documents). Revoke + optional expiry.
- [ ] **Collaborative sets:** `POST /study-sets/{id}/members` (invite by email/user), `DELETE .../members/{user_id}`, `POST /study-sets/{id}/leave`. A `member` can view the set and **contribute their own documents** to it; access enforced by the §3 access rule (owner / member / valid token).
- [ ] FE: a Share dialog (copy link, manage access), a "Shared with me" tab on Materials, and a member list. Contributions show who added each document.
- **Scope (honest):** collaboration is **asynchronous** — add/remove documents, generate, review independently. **No** real-time multi-cursor co-editing.
- **Test:** user B opens a share link → views + clones; an invited member adds a document the owner then sees and can quiz on; revoking the link blocks further access.

### Cross-cutting (done alongside, not a separate phase)
- **Limits/validation:** allowed MIME types, max file size, max pages/duration, max docs per tier (Decision D5). Clear error states surfaced to FE.
- **Deletion/DPDP:** `DELETE` purges vectors + rows + storage; deleting a document cascades flashcards and orphan quiz questions.
- **Safety:** uploaded content is the student's own; we keep the existing medical-boundary tone but do **not** add a groundedness verifier (not in the MVP stack — noted honestly).
- **Observability:** reuse existing logging; per-document ingestion logs (chunks, timing, failures).

---

## 5. New dependencies (all small, pip-installable, no infra)

| Need | Library | Note |
|---|---|---|
| DOCX | `python-docx` | pure-python |
| XLSX | `openpyxl` | pure-python (CSV uses stdlib) |
| YouTube transcript | `youtube-transcript-api` | transcript only, no download |
| Web article extraction | `trafilatura` (or `beautifulsoup4`) | one of the two |
| YouTube audio download (Whisper fallback) | `yt-dlp` | **the only non-trivial new dep**; pulls audio when captions are missing |
| Image handling for vision/rasterization | `Pillow` | likely already transitive; PyMuPDF rasterizes PDF pages itself |

**Reused, NOT new** — OCR + diagram understanding run on **Gemini vision** (`google-genai`, already present) and audio transcription runs on **Groq `whisper-large-v3`** (`groq_api_key`, already present). PDF (`pymupdf`, `pdfplumber`), embeddings, Chroma, and the LLM clients are **already in `requirements.txt`.** No Tesseract binary, no local Whisper weights, no GPU.

---

## 6. Decisions to confirm before we build

| # | Decision | Recommendation |
|---|---|---|
| **D1** | Vector scoping: per-user collection `student_uploads_{uid}` vs one shared collection with `user_id` metadata filter | **Per-user collection** — matches the existing `student_memory_{id}` pattern, trivial per-user delete |
| **D2** | Keep the raw uploaded file (Supabase Storage) or process-in-memory and discard | **Store raw in a private `user-documents` bucket** — cheap, enables re-processing and clean deletion. (Can defer if you want the absolute-smallest MVP.) |
| **D3** | Background processing: FastAPI `BackgroundTasks`/`asyncio` vs synchronous request | **Async background + status polling** — uploads of big PDFs/long videos shouldn't block the request |
| **D4** | Doubt-ask scope when a doc is selected: uploads-only, or blend uploads + global textbook corpus | **Uploads-only when a doc is explicitly selected**, global otherwise (simplest, most predictable) |
| **D5** | Free vs premium limits (docs count, file size, video length, OCR pages, transcription minutes) | Propose: Free = 3 docs / 10 MB / 30-min video / 20 OCR pages; Premium = 50 docs / 50 MB / 3-hr / 300 OCR pages. **Your call on numbers.** |
| **D6** | YouTube: captions-first, **Whisper fallback** when none exist | **Captions first, then Groq Whisper** on the audio (capped by D5 minutes) |
| **D7** | OCR + diagram understanding: **Gemini vision** vs local Tesseract | **Gemini vision** — reuses an existing provider, handles diagrams/figures too, no system binary. (Per-page vision calls cost tokens — capped by D5.) |
| **D8** | Audio transcription: **Groq hosted Whisper** vs local `faster-whisper` | **Groq `whisper-large-v3`** — reuses existing key, no local model/GPU |
| **D9** | Flashcard SRS algorithm: **SM-2** vs FSRS | **SM-2 for MVP** (pure code, no deps); graduate to FSRS later to match the master plan |
| **D10** | Collaboration depth | **Async shared sets** (share link + clone; invited members contribute docs). Real-time co-editing is out. Confirm this is enough for v1. |

---

## 7. Explicitly OUT of scope for this MVP

- pgvector / Qwen embeddings / reranker / groundedness verifier (stack stays).
- **Real-time multi-cursor co-editing** of a study set — collaboration is asynchronous (add/remove/generate/review), not live.
- A worker queue / SQS — we use in-process background tasks.
- Local Tesseract OCR / local Whisper weights / GPU inference — replaced by reusing Gemini vision + Groq Whisper.

---

## 8. Suggested build order & rough sequencing

1. **Phase 1 → 2 → 3 → 4** (the spine): upload anything and see it become "Ready." Ship Phase 2 in two passes — **2a** text extractors first, then **2b** the Gemini-vision (scanned PDF/image) and Groq-Whisper (caption-less YouTube) fallbacks — so the spine is demoable early and gets robust shortly after.
2. Then **Phase 5** (ask doubts) — highest perceived value, smallest delta on existing pipeline.
3. Then **Phase 6 & 7** (flashcards + spaced repetition, quizzes) in parallel — both are "retrieve chunks → LLM → store"; SRS is pure-code on top of 6.
4. Then **Phase 8** (voice) — the differentiator, built on the same retrieval the others prove out.
5. Then **Phase 9** (study sets) — one change point per consumer; unlocks "everything across many docs."
6. Then **Phase 10** (sharing & async collaboration) — the distribution/virality layer, built last.

> **Net:** one ingestion spine (with vision + audio fallbacks) feeding four consumers, then grouped into shareable study sets — every piece built on parts that already exist, every heavy capability delegated to a provider already in the stack. Review the **ten decisions in §6** and the data model in §3 — once you confirm, we start at Phase 1.
