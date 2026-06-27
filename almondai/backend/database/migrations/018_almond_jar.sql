-- ============================================================
-- 018_almond_jar.sql
-- Almond Jar, deep-agent job queue, artifacts, nudges
-- Crisis Mode v2 — Co-Work for medical students
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. almond_jar_items — everything dropped into the jar
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almond_jar_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    item_type        TEXT NOT NULL CHECK (item_type IN (
                         'text_paste', 'pdf', 'image', 'audio',
                         'url', 'pasted_notes', 'graded_script'
                     )),
    item_category    TEXT CHECK (item_category IN (
                         'canon', 'own_notes', 'lecture', 'pyq_cram',
                         'image_spotter', 'graded_feedback', 'datesheet', 'unknown'
                     )) DEFAULT 'unknown',
    original_name    TEXT,
    storage_path     TEXT,
    raw_text         TEXT,
    extracted_text   TEXT,
    is_processed     BOOLEAN DEFAULT FALSE,
    is_graded_script BOOLEAN DEFAULT FALSE,
    trust_flags      JSONB DEFAULT '[]'::jsonb,
    agent_tags       JSONB DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jar_items_session
    ON public.almond_jar_items(session_id);
CREATE INDEX IF NOT EXISTS idx_jar_items_user_session
    ON public.almond_jar_items(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_jar_items_unprocessed
    ON public.almond_jar_items(session_id, is_processed) WHERE NOT is_processed;
CREATE INDEX IF NOT EXISTS idx_jar_items_graded
    ON public.almond_jar_items(session_id, is_graded_script) WHERE is_graded_script;

ALTER TABLE public.almond_jar_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jar_items_select_own ON public.almond_jar_items;
CREATE POLICY jar_items_select_own ON public.almond_jar_items
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS jar_items_insert_own ON public.almond_jar_items;
CREATE POLICY jar_items_insert_own ON public.almond_jar_items
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jar_items_update_own ON public.almond_jar_items;
CREATE POLICY jar_items_update_own ON public.almond_jar_items
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jar_items_delete_own ON public.almond_jar_items;
CREATE POLICY jar_items_delete_own ON public.almond_jar_items
    FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT ALL ON public.almond_jar_items TO authenticated;
GRANT ALL ON public.almond_jar_items TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 2. almond_jar_jobs — Postgres-backed deep-agent job queue
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almond_jar_jobs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_type       TEXT NOT NULL CHECK (job_type IN (
                       'mock_paper', 'cheat_sheet', 'recall_deck',
                       'knowing_vs_scoring', 'examiner_pattern'
                   )),
    status         TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
    result         JSONB,
    error_message  TEXT,
    attempts       INTEGER DEFAULT 0,
    scheduled_for  TIMESTAMPTZ DEFAULT NOW(),
    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jar_jobs_pending
    ON public.almond_jar_jobs(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jar_jobs_session
    ON public.almond_jar_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_jar_jobs_user
    ON public.almond_jar_jobs(user_id);

ALTER TABLE public.almond_jar_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jar_jobs_select_own ON public.almond_jar_jobs;
CREATE POLICY jar_jobs_select_own ON public.almond_jar_jobs
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS jar_jobs_insert_own ON public.almond_jar_jobs;
CREATE POLICY jar_jobs_insert_own ON public.almond_jar_jobs
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.almond_jar_jobs TO authenticated;
GRANT ALL ON public.almond_jar_jobs TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 3. almond_jar_artifacts — finished objects the student wakes up to
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.almond_jar_artifacts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id     UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id         UUID REFERENCES public.almond_jar_jobs(id) ON DELETE SET NULL,
    artifact_type  TEXT NOT NULL CHECK (artifact_type IN (
                       'mock_paper', 'cheat_sheet', 'recall_deck',
                       'knowing_vs_scoring', 'schedule_grid'
                   )),
    title          TEXT NOT NULL,
    subtitle       TEXT,
    content        JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read        BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_session
    ON public.almond_jar_artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_unread
    ON public.almond_jar_artifacts(session_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_artifacts_user_session
    ON public.almond_jar_artifacts(user_id, session_id);

ALTER TABLE public.almond_jar_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS artifacts_select_own ON public.almond_jar_artifacts;
CREATE POLICY artifacts_select_own ON public.almond_jar_artifacts
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS artifacts_insert_own ON public.almond_jar_artifacts;
CREATE POLICY artifacts_insert_own ON public.almond_jar_artifacts
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS artifacts_update_own ON public.almond_jar_artifacts;
CREATE POLICY artifacts_update_own ON public.almond_jar_artifacts
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.almond_jar_artifacts TO authenticated;
GRANT ALL ON public.almond_jar_artifacts TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 4. crisis_nudges — proactive reach-outs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crisis_nudges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    nudge_type    TEXT NOT NULL CHECK (nudge_type IN (
                      'topic_check', 'time_warning', 'sleep_call',
                      'motivation', 'artifact_ready'
                  )),
    content       TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}'::jsonb,
    scheduled_for TIMESTAMPTZ NOT NULL,
    is_sent       BOOLEAN DEFAULT FALSE,
    sent_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nudges_pending
    ON public.crisis_nudges(user_id, scheduled_for, is_sent) WHERE NOT is_sent;
CREATE INDEX IF NOT EXISTS idx_nudges_session
    ON public.crisis_nudges(session_id);

ALTER TABLE public.crisis_nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nudges_select_own ON public.crisis_nudges;
CREATE POLICY nudges_select_own ON public.crisis_nudges
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS nudges_insert_own ON public.crisis_nudges;
CREATE POLICY nudges_insert_own ON public.crisis_nudges
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nudges_update_own ON public.crisis_nudges;
CREATE POLICY nudges_update_own ON public.crisis_nudges
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT ALL ON public.crisis_nudges TO authenticated;
GRANT ALL ON public.crisis_nudges TO service_role;


-- ─────────────────────────────────────────────────────────────
-- 5. Extend crisis_sessions with v2 columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.crisis_sessions
    ADD COLUMN IF NOT EXISTS jar_enabled       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS artifact_summary  JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS team_status       TEXT DEFAULT 'idle'
                                                   CHECK (team_status IN ('idle', 'forming', 'active', 'completed')),
    ADD COLUMN IF NOT EXISTS wellbeing_override BOOLEAN DEFAULT FALSE;
