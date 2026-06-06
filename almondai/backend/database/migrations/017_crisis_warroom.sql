-- War Room extensions for Crisis Mode
-- Adds stress_level, readiness_score, mode, strategy columns to crisis_sessions.
-- Creates crisis_ask_messages for the "If I Were You" streaming chat.

ALTER TABLE public.crisis_sessions
    ADD COLUMN IF NOT EXISTS stress_level  INTEGER CHECK (stress_level BETWEEN 1 AND 10),
    ADD COLUMN IF NOT EXISTS readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('standard', 'last_night')) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS strategy JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.crisis_ask_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role        TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_ask_messages_session
    ON public.crisis_ask_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_ask_messages_user_session
    ON public.crisis_ask_messages(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_ask_messages_session_created
    ON public.crisis_ask_messages(session_id, created_at);

ALTER TABLE public.crisis_ask_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crisis_ask_messages_select_own ON public.crisis_ask_messages;
CREATE POLICY crisis_ask_messages_select_own ON public.crisis_ask_messages
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_ask_messages_insert_own ON public.crisis_ask_messages;
CREATE POLICY crisis_ask_messages_insert_own ON public.crisis_ask_messages
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_ask_messages_update_own ON public.crisis_ask_messages;
CREATE POLICY crisis_ask_messages_update_own ON public.crisis_ask_messages
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_ask_messages_delete_own ON public.crisis_ask_messages;
CREATE POLICY crisis_ask_messages_delete_own ON public.crisis_ask_messages
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

GRANT ALL ON public.crisis_ask_messages TO authenticated;
GRANT ALL ON public.crisis_ask_messages TO service_role;
