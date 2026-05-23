-- === RUN IN SUPABASE SQL EDITOR ===

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS almonds_count INTEGER DEFAULT 5;

ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS almonds_last_reset TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.almond_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT CHECK (event_type IN ('lost', 'gained', 'reset')) NOT NULL,
  reason TEXT,
  almonds_before INTEGER,
  almonds_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almond_events_user_created_at
ON public.almond_events(user_id, created_at DESC);

ALTER TABLE public.almond_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS almond_events_select_own ON public.almond_events;
CREATE POLICY almond_events_select_own
ON public.almond_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS almond_events_insert_own ON public.almond_events;
CREATE POLICY almond_events_insert_own
ON public.almond_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS almond_events_update_own ON public.almond_events;
CREATE POLICY almond_events_update_own
ON public.almond_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS almond_events_delete_own ON public.almond_events;
CREATE POLICY almond_events_delete_own
ON public.almond_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT ALL ON public.almond_events TO authenticated;
GRANT ALL ON public.almond_events TO service_role;
