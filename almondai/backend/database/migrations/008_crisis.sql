CREATE TABLE IF NOT EXISTS public.crisis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    exam_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    days_remaining INTEGER NOT NULL,
    subjects TEXT[] NOT NULL DEFAULT '{}',
    preparation_level TEXT CHECK (preparation_level IN ('zero', 'little', 'moderate', 'good')) DEFAULT 'zero',
    available_hours_per_day FLOAT DEFAULT 8.0,
    crisis_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
    current_day INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crisis_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.crisis_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    day_number INTEGER NOT NULL,
    topic_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crisis_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    free_activation_used BOOLEAN DEFAULT FALSE,
    free_activation_used_at TIMESTAMPTZ,
    total_activations INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_sessions_user_id ON public.crisis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_sessions_user_active ON public.crisis_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_crisis_topic_progress_session_id ON public.crisis_topic_progress(session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_topic_progress_user_session ON public.crisis_topic_progress(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_activations_user_id ON public.crisis_activations(user_id);

ALTER TABLE public.crisis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crisis_sessions_select_own ON public.crisis_sessions;
CREATE POLICY crisis_sessions_select_own ON public.crisis_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_sessions_insert_own ON public.crisis_sessions;
CREATE POLICY crisis_sessions_insert_own ON public.crisis_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_sessions_update_own ON public.crisis_sessions;
CREATE POLICY crisis_sessions_update_own ON public.crisis_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_sessions_delete_own ON public.crisis_sessions;
CREATE POLICY crisis_sessions_delete_own ON public.crisis_sessions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_topic_progress_select_own ON public.crisis_topic_progress;
CREATE POLICY crisis_topic_progress_select_own ON public.crisis_topic_progress
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_topic_progress_insert_own ON public.crisis_topic_progress;
CREATE POLICY crisis_topic_progress_insert_own ON public.crisis_topic_progress
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_topic_progress_update_own ON public.crisis_topic_progress;
CREATE POLICY crisis_topic_progress_update_own ON public.crisis_topic_progress
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_topic_progress_delete_own ON public.crisis_topic_progress;
CREATE POLICY crisis_topic_progress_delete_own ON public.crisis_topic_progress
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_activations_select_own ON public.crisis_activations;
CREATE POLICY crisis_activations_select_own ON public.crisis_activations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_activations_insert_own ON public.crisis_activations;
CREATE POLICY crisis_activations_insert_own ON public.crisis_activations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_activations_update_own ON public.crisis_activations;
CREATE POLICY crisis_activations_update_own ON public.crisis_activations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS crisis_activations_delete_own ON public.crisis_activations;
CREATE POLICY crisis_activations_delete_own ON public.crisis_activations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

GRANT ALL ON public.crisis_sessions TO authenticated;
GRANT ALL ON public.crisis_topic_progress TO authenticated;
GRANT ALL ON public.crisis_activations TO authenticated;
GRANT ALL ON public.crisis_sessions TO service_role;
GRANT ALL ON public.crisis_topic_progress TO service_role;
GRANT ALL ON public.crisis_activations TO service_role;

DROP TRIGGER IF EXISTS set_crisis_sessions_updated_at ON public.crisis_sessions;
CREATE TRIGGER set_crisis_sessions_updated_at
    BEFORE UPDATE ON public.crisis_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_crisis_activations_updated_at ON public.crisis_activations;
CREATE TRIGGER set_crisis_activations_updated_at
    BEFORE UPDATE ON public.crisis_activations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
