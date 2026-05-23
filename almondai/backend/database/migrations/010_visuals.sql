CREATE TABLE IF NOT EXISTS public.visual_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    topic TEXT NOT NULL,
    subject TEXT,
    visual_type TEXT CHECK (visual_type IN ('flowchart', 'timeline', 'comparison', 'decision_tree', 'mind_map', 'process')) NOT NULL,
    prompt_used TEXT,
    visual_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_explanations_user ON public.visual_explanations(user_id);
CREATE INDEX IF NOT EXISTS idx_visual_explanations_user_created ON public.visual_explanations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visual_explanations_topic ON public.visual_explanations(topic);

ALTER TABLE public.visual_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visual_explanations_select_own ON public.visual_explanations;
CREATE POLICY visual_explanations_select_own ON public.visual_explanations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS visual_explanations_insert_own ON public.visual_explanations;
CREATE POLICY visual_explanations_insert_own ON public.visual_explanations     
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS visual_explanations_update_own ON public.visual_explanations;
CREATE POLICY visual_explanations_update_own ON public.visual_explanations
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS visual_explanations_delete_own ON public.visual_explanations;
CREATE POLICY visual_explanations_delete_own ON public.visual_explanations
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

GRANT ALL ON public.visual_explanations TO authenticated;
GRANT ALL ON public.visual_explanations TO service_role;

DROP TRIGGER IF EXISTS set_visual_explanations_updated_at ON public.visual_explanations;
CREATE TRIGGER set_visual_explanations_updated_at
    BEFORE UPDATE ON public.visual_explanations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
