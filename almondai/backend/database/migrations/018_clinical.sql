-- Clinical Mode: case library, sessions, and state machine.

CREATE TABLE IF NOT EXISTS public.clinical_cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty       TEXT NOT NULL,
    difficulty      TEXT CHECK (difficulty IN ('basic', 'intermediate', 'advanced')) NOT NULL DEFAULT 'basic',
    patient_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    hidden_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
    diagnosis       TEXT NOT NULL,
    differentials   TEXT[] NOT NULL DEFAULT '{}',
    viva_questions  JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    is_seeded       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clinical_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    case_id         UUID REFERENCES public.clinical_cases(id) ON DELETE CASCADE NOT NULL,
    status          TEXT CHECK (
                        status IN (
                            'history_taking',
                            'examination',
                            'case_sheet',
                            'submitted',
                            'evaluated',
                            'viva',
                            'completed'
                        )
                    ) NOT NULL DEFAULT 'history_taking',
    conversation    JSONB NOT NULL DEFAULT '[]'::jsonb,
    case_sheet      JSONB NOT NULL DEFAULT '{}'::jsonb,
    evaluation      JSONB,
    viva_log        JSONB NOT NULL DEFAULT '[]'::jsonb,
    score           INTEGER CHECK (score BETWEEN 0 AND 100),
    revealed_systems TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_cases_specialty      ON public.clinical_cases(specialty);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_difficulty     ON public.clinical_cases(difficulty);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_specialty_diff ON public.clinical_cases(specialty, difficulty);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_user        ON public.clinical_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_user_status ON public.clinical_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_case        ON public.clinical_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sessions_user_created ON public.clinical_sessions(user_id, created_at DESC);

-- RLS
ALTER TABLE public.clinical_cases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_sessions ENABLE ROW LEVEL SECURITY;

-- Cases: readable by all authenticated users (shared library)
DROP POLICY IF EXISTS clinical_cases_select_all ON public.clinical_cases;
CREATE POLICY clinical_cases_select_all ON public.clinical_cases
    FOR SELECT TO authenticated
    USING (true);

-- Sessions: own-row only
DROP POLICY IF EXISTS clinical_sessions_select_own ON public.clinical_sessions;
CREATE POLICY clinical_sessions_select_own ON public.clinical_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS clinical_sessions_insert_own ON public.clinical_sessions;
CREATE POLICY clinical_sessions_insert_own ON public.clinical_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clinical_sessions_update_own ON public.clinical_sessions;
CREATE POLICY clinical_sessions_update_own ON public.clinical_sessions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clinical_sessions_delete_own ON public.clinical_sessions;
CREATE POLICY clinical_sessions_delete_own ON public.clinical_sessions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Grants
GRANT SELECT ON public.clinical_cases    TO authenticated;
GRANT ALL    ON public.clinical_cases    TO service_role;
GRANT ALL    ON public.clinical_sessions TO authenticated;
GRANT ALL    ON public.clinical_sessions TO service_role;

-- Triggers
DROP TRIGGER IF EXISTS set_clinical_cases_updated_at ON public.clinical_cases;
CREATE TRIGGER set_clinical_cases_updated_at
    BEFORE UPDATE ON public.clinical_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_clinical_sessions_updated_at ON public.clinical_sessions;
CREATE TRIGGER set_clinical_sessions_updated_at
    BEFORE UPDATE ON public.clinical_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
