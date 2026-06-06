-- MCQ Compete Rooms: live peer competition tables

CREATE TABLE IF NOT EXISTS mcq_compete_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    question_ids UUID[] NOT NULL DEFAULT '{}',
    question_count INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mcq_compete_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES mcq_compete_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '[]',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    UNIQUE (room_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mcq_compete_rooms_code ON mcq_compete_rooms(code);
CREATE INDEX IF NOT EXISTS idx_mcq_compete_rooms_status ON mcq_compete_rooms(status);
CREATE INDEX IF NOT EXISTS idx_mcq_compete_participants_room ON mcq_compete_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_mcq_compete_participants_user ON mcq_compete_participants(user_id);

-- Allow source column on mcq_questions for AI-generated questions
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS student_category TEXT;
