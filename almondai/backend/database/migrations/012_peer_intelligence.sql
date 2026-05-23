-- === RUN THIS SQL IN SUPABASE SQL EDITOR ===

CREATE TABLE IF NOT EXISTS public.platform_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL CHECK (
        insight_type IN (
            'struggling_topic',
            'popular_subject',
            'top_performer_pattern',
            'cohort_benchmark',
            'weekly_trend'
        )
    ),
    subject TEXT,
    topic TEXT,
    insight_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    student_count INTEGER DEFAULT 0,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    percentile_rank INTEGER DEFAULT 0,
    cohort_label TEXT DEFAULT 'beginner',
    questions_percentile INTEGER DEFAULT 0,
    completion_percentile INTEGER DEFAULT 0,
    streak_percentile INTEGER DEFAULT 0,
    mcq_accuracy_percentile INTEGER DEFAULT 0,
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.peer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_insights_type ON public.platform_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_platform_insights_generated ON public.platform_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_insights_subject ON public.platform_insights(subject);

CREATE INDEX IF NOT EXISTS idx_student_benchmarks_user_id ON public.student_benchmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_peer_notifications_user_id ON public.peer_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_peer_notifications_user_read ON public.peer_notifications(user_id, is_read);

ALTER TABLE public.platform_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_insights_select_authenticated ON public.platform_insights;
CREATE POLICY platform_insights_select_authenticated ON public.platform_insights
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS student_benchmarks_select_own ON public.student_benchmarks;
CREATE POLICY student_benchmarks_select_own ON public.student_benchmarks
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS student_benchmarks_insert_own ON public.student_benchmarks;
CREATE POLICY student_benchmarks_insert_own ON public.student_benchmarks
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS student_benchmarks_update_own ON public.student_benchmarks;
CREATE POLICY student_benchmarks_update_own ON public.student_benchmarks
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS student_benchmarks_delete_own ON public.student_benchmarks;
CREATE POLICY student_benchmarks_delete_own ON public.student_benchmarks
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS peer_notifications_select_own ON public.peer_notifications;
CREATE POLICY peer_notifications_select_own ON public.peer_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS peer_notifications_insert_own ON public.peer_notifications;
CREATE POLICY peer_notifications_insert_own ON public.peer_notifications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS peer_notifications_update_own ON public.peer_notifications;
CREATE POLICY peer_notifications_update_own ON public.peer_notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS peer_notifications_delete_own ON public.peer_notifications;
CREATE POLICY peer_notifications_delete_own ON public.peer_notifications
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

GRANT SELECT ON public.platform_insights TO authenticated;
GRANT ALL ON public.student_benchmarks TO authenticated;
GRANT ALL ON public.peer_notifications TO authenticated;

GRANT ALL ON public.platform_insights TO service_role;
GRANT ALL ON public.student_benchmarks TO service_role;
GRANT ALL ON public.peer_notifications TO service_role;

DROP TRIGGER IF EXISTS set_student_benchmarks_updated_at ON public.student_benchmarks;
CREATE TRIGGER set_student_benchmarks_updated_at
    BEFORE UPDATE ON public.student_benchmarks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
