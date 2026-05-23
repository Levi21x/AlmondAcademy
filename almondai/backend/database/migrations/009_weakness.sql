CREATE TABLE IF NOT EXISTS public.weakness_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    analysis_type TEXT CHECK (analysis_type IN ('full', 'subject', 'quick')) DEFAULT 'full',
    subject TEXT,
    weakness_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
    critical_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    strong_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    overall_readiness_score INTEGER DEFAULT 0,
    estimated_marks_at_risk INTEGER DEFAULT 0,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weakness_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    analysis_id UUID REFERENCES public.weakness_analyses(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    subject TEXT NOT NULL,
    weakness_score INTEGER NOT NULL,
    intervention_plan TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weakness_analyses_user ON public.weakness_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_weakness_analyses_user_generated ON public.weakness_analyses(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_weakness_interventions_user ON public.weakness_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_weakness_interventions_user_priority ON public.weakness_interventions(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_weakness_interventions_user_resolved ON public.weakness_interventions(user_id, is_resolved);

ALTER TABLE public.weakness_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weakness_interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weakness_analyses_select_own ON public.weakness_analyses;
CREATE POLICY weakness_analyses_select_own ON public.weakness_analyses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_analyses_insert_own ON public.weakness_analyses;
CREATE POLICY weakness_analyses_insert_own ON public.weakness_analyses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_analyses_update_own ON public.weakness_analyses;
CREATE POLICY weakness_analyses_update_own ON public.weakness_analyses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_analyses_delete_own ON public.weakness_analyses;
CREATE POLICY weakness_analyses_delete_own ON public.weakness_analyses
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_interventions_select_own ON public.weakness_interventions;
CREATE POLICY weakness_interventions_select_own ON public.weakness_interventions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_interventions_insert_own ON public.weakness_interventions;
CREATE POLICY weakness_interventions_insert_own ON public.weakness_interventions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_interventions_update_own ON public.weakness_interventions;
CREATE POLICY weakness_interventions_update_own ON public.weakness_interventions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS weakness_interventions_delete_own ON public.weakness_interventions;
CREATE POLICY weakness_interventions_delete_own ON public.weakness_interventions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

GRANT ALL ON public.weakness_analyses TO authenticated;
GRANT ALL ON public.weakness_interventions TO authenticated;
GRANT ALL ON public.weakness_analyses TO service_role;
GRANT ALL ON public.weakness_interventions TO service_role;

DROP TRIGGER IF EXISTS set_weakness_interventions_updated_at ON public.weakness_interventions;
CREATE TRIGGER set_weakness_interventions_updated_at
    BEFORE UPDATE ON public.weakness_interventions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
