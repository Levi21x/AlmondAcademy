CREATE TABLE IF NOT EXISTS public.student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
    message TEXT NOT NULL,
    response TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_feedback_user_id_created_at
    ON public.student_feedback(user_id, created_at DESC);

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_feedback_select_own ON public.student_feedback;
CREATE POLICY student_feedback_select_own ON public.student_feedback
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS student_feedback_insert_own ON public.student_feedback;
CREATE POLICY student_feedback_insert_own ON public.student_feedback
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS student_feedback_update_own ON public.student_feedback;
CREATE POLICY student_feedback_update_own ON public.student_feedback
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.student_feedback TO authenticated;
