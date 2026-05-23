CREATE TABLE IF NOT EXISTS public.mcq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    topic TEXT,
    year INTEGER CHECK (year BETWEEN 1 AND 5),
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL CHECK (correct_option IN ('a', 'b', 'c', 'd')),
    explanation TEXT NOT NULL,
    is_high_yield BOOLEAN DEFAULT FALSE,
    neet_pg_relevant BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'almondai',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_mcq_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.mcq_questions(id) ON DELETE CASCADE NOT NULL,
    selected_option TEXT CHECK (selected_option IN ('a', 'b', 'c', 'd')) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    subject TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcq_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT CHECK (session_type IN ('daily', 'subject', 'mixed', 'timed')) DEFAULT 'daily',
    subject TEXT,
    difficulty TEXT,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    time_taken_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcq_questions_subject ON public.mcq_questions(subject);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_subject_difficulty ON public.mcq_questions(subject, difficulty);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_high_yield ON public.mcq_questions(is_high_yield);
CREATE INDEX IF NOT EXISTS idx_student_mcq_attempts_user ON public.student_mcq_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_student_mcq_attempts_user_subject ON public.student_mcq_attempts(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_student_mcq_attempts_user_attempted_at ON public.student_mcq_attempts(user_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_mcq_attempts_question_id ON public.student_mcq_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sessions_user ON public.mcq_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sessions_user_started_at ON public.mcq_sessions(user_id, started_at DESC);

ALTER TABLE public.mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mcq_questions_select_authenticated ON public.mcq_questions;
CREATE POLICY mcq_questions_select_authenticated ON public.mcq_questions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS student_mcq_attempts_select_own ON public.student_mcq_attempts;
CREATE POLICY student_mcq_attempts_select_own ON public.student_mcq_attempts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS student_mcq_attempts_insert_own ON public.student_mcq_attempts;
CREATE POLICY student_mcq_attempts_insert_own ON public.student_mcq_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS student_mcq_attempts_update_own ON public.student_mcq_attempts;
CREATE POLICY student_mcq_attempts_update_own ON public.student_mcq_attempts
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS student_mcq_attempts_delete_own ON public.student_mcq_attempts;
CREATE POLICY student_mcq_attempts_delete_own ON public.student_mcq_attempts
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS mcq_sessions_select_own ON public.mcq_sessions;
CREATE POLICY mcq_sessions_select_own ON public.mcq_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS mcq_sessions_insert_own ON public.mcq_sessions;
CREATE POLICY mcq_sessions_insert_own ON public.mcq_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mcq_sessions_update_own ON public.mcq_sessions;
CREATE POLICY mcq_sessions_update_own ON public.mcq_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mcq_sessions_delete_own ON public.mcq_sessions;
CREATE POLICY mcq_sessions_delete_own ON public.mcq_sessions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

GRANT SELECT ON public.mcq_questions TO authenticated;
GRANT ALL ON public.student_mcq_attempts TO authenticated;
GRANT ALL ON public.mcq_sessions TO authenticated;
GRANT ALL ON public.mcq_questions TO service_role;
GRANT ALL ON public.student_mcq_attempts TO service_role;
GRANT ALL ON public.mcq_sessions TO service_role;

DROP TRIGGER IF EXISTS set_mcq_questions_updated_at ON public.mcq_questions;
CREATE TRIGGER set_mcq_questions_updated_at
    BEFORE UPDATE ON public.mcq_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
