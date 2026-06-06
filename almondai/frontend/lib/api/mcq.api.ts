const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type Difficulty = "easy" | "medium" | "hard";
export type SessionType = "daily" | "subject" | "mixed" | "timed";

export interface MCQQuestion {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: Difficulty;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  is_high_yield: boolean;
}

export interface MCQAttemptResult {
  is_correct: boolean;
  correct_option: "a" | "b" | "c" | "d";
  explanation: string;
  selected_option: "a" | "b" | "c" | "d";
  subject: string | null;
  topic: string | null;
  almond_update?: AlmondStatus | null;
}

export interface AlmondStatus {
  almonds_count: number;
  max_almonds: number;
  minutes_until_reset: number | null;
  is_full: boolean;
  redirect_to_tutor?: boolean;
}

export interface MCQSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  subject: string | null;
  difficulty: Difficulty | null;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

export interface SubjectStat {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface MCQStats {
  total_attempted: number;
  total_correct: number;
  accuracy_percentage: number;
  today_attempted: number;
  today_limit: number | null;
  today_remaining: number | null;
  by_subject: SubjectStat[];
  weak_subjects: string[];
  strong_subjects: string[];
}

export interface DailyStatus {
  today_attempted: number;
  today_correct: number;
  today_accuracy: number;
  daily_limit: number | null;
  today_remaining: number | null;
  quota_complete: boolean;
  practice_streak_days: number;
}

export interface GetQuestionsParams {
  subject?: string;
  difficulty?: Difficulty;
  limit?: number;
  highYieldOnly?: boolean;
  excludeAttempted?: boolean;
}

export interface CreateMCQSessionPayload {
  session_type: SessionType;
  subject?: string;
  difficulty?: Difficulty;
  total_questions: number;
}

export interface CompleteMCQSessionPayload {
  correct_answers: number;
  total_questions: number;
  time_taken_seconds: number;
}

export interface SubmitAttemptPayload {
  question_id: string;
  selected_option: "a" | "b" | "c" | "d";
  time_taken_seconds?: number;
  session_id?: string;
}

export async function getQuestions(token: string, params: GetQuestionsParams): Promise<{ questions: MCQQuestion[]; total_available: number }> {
  const url = new URL(`${apiBase}/api/v1/mcq/questions`);
  if (params.subject) url.searchParams.set("subject", params.subject);
  if (params.difficulty) url.searchParams.set("difficulty", params.difficulty);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (typeof params.highYieldOnly === "boolean") url.searchParams.set("high_yield_only", String(params.highYieldOnly));
  if (typeof params.excludeAttempted === "boolean") url.searchParams.set("exclude_attempted", String(params.excludeAttempted));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to load MCQ questions");
  }

  const payload = (await res.json()) as ApiEnvelope<{ questions: MCQQuestion[]; total_available: number }>;
  return payload.data;
}

export async function submitAttempt(token: string, data: SubmitAttemptPayload): Promise<MCQAttemptResult> {
  const res = await fetch(`${apiBase}/api/v1/mcq/attempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Failed to submit attempt";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // Keep fallback.
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<MCQAttemptResult>;
  return payload.data;
}

export async function createSession(token: string, data: CreateMCQSessionPayload): Promise<MCQSession> {
  const res = await fetch(`${apiBase}/api/v1/mcq/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to create MCQ session");
  }

  const payload = (await res.json()) as ApiEnvelope<MCQSession>;
  return payload.data;
}

export async function completeSession(token: string, sessionId: string, data: CompleteMCQSessionPayload): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/mcq/sessions/${sessionId}/complete`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to complete MCQ session");
  }
}

export async function getMCQStats(token: string): Promise<MCQStats> {
  const res = await fetch(`${apiBase}/api/v1/mcq/stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch MCQ stats");
  }

  const payload = (await res.json()) as ApiEnvelope<MCQStats>;
  return payload.data;
}

export async function getDailyStatus(token: string): Promise<DailyStatus> {
  const res = await fetch(`${apiBase}/api/v1/mcq/daily-status`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch daily MCQ status");
  }

  const payload = (await res.json()) as ApiEnvelope<DailyStatus>;
  return payload.data;
}

export async function getAlmonds(token: string): Promise<AlmondStatus> {
  const res = await fetch(`${apiBase}/api/v1/mcq/almonds`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch almonds");
  }

  const payload = (await res.json()) as ApiEnvelope<AlmondStatus>;
  return payload.data;
}

export async function loseAlmond(token: string, reason = "wrong_answer"): Promise<AlmondStatus> {
  const res = await fetch(`${apiBase}/api/v1/mcq/almonds/lose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    throw new Error("Failed to decrement almonds");
  }

  const payload = (await res.json()) as ApiEnvelope<AlmondStatus>;
  return payload.data;
}

export async function gainAlmond(token: string, reason = "correct_streak"): Promise<AlmondStatus> {
  const res = await fetch(`${apiBase}/api/v1/mcq/almonds/gain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    throw new Error("Failed to increment almonds");
  }

  const payload = (await res.json()) as ApiEnvelope<AlmondStatus>;
  return payload.data;
}

// ─── AI Question Generation ───────────────────────────────────────────────────

export interface GenerateQuestionsParams {
  subject: string;
  topic: string;
  count?: number;
  difficulty?: Difficulty;
  student_category?: string;
}

export async function generateQuestions(token: string, params: GenerateQuestionsParams): Promise<{ questions: MCQQuestion[]; generated_count: number }> {
  const res = await fetch(`${apiBase}/api/v1/mcq/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let message = "Failed to generate MCQ questions";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<{ questions: MCQQuestion[]; generated_count: number }>;
  return payload.data;
}

// ─── Compete Rooms ────────────────────────────────────────────────────────────

export interface CompeteRoom {
  id: string;
  code: string;
  host_user_id: string;
  subject: string;
  topic: string | null;
  status: "waiting" | "active" | "completed";
  question_ids: string[];
  question_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CompeteParticipant {
  user_id: string;
  display_name: string | null;
  score: number;
  finished_at: string | null;
}

export interface CompeteAnswerResult {
  is_correct: boolean;
  correct_option: "a" | "b" | "c" | "d";
  explanation: string;
  score: number;
  is_finished: boolean;
}

export async function createCompeteRoom(
  token: string,
  data: { subject: string; topic?: string; question_count?: number },
): Promise<{ room: CompeteRoom; questions: MCQQuestion[] }> {
  const res = await fetch(`${apiBase}/api/v1/mcq/compete/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create compete room");
  const payload = (await res.json()) as ApiEnvelope<{ room: CompeteRoom; questions: MCQQuestion[] }>;
  return payload.data;
}

export async function joinCompeteRoom(
  token: string,
  code: string,
  displayName?: string,
): Promise<{ room: CompeteRoom; questions: MCQQuestion[]; participants: CompeteParticipant[] }> {
  const res = await fetch(`${apiBase}/api/v1/mcq/compete/rooms/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ display_name: displayName ?? "Player" }),
  });
  if (!res.ok) {
    let message = "Failed to join room";
    try {
      const p = await res.json();
      message = p?.detail?.message ?? p?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  const payload = (await res.json()) as ApiEnvelope<{ room: CompeteRoom; questions: MCQQuestion[]; participants: CompeteParticipant[] }>;
  return payload.data;
}

export async function getCompeteRoom(
  token: string,
  code: string,
): Promise<{ room: CompeteRoom; participants: CompeteParticipant[] }> {
  const res = await fetch(`${apiBase}/api/v1/mcq/compete/rooms/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch room");
  const payload = (await res.json()) as ApiEnvelope<{ room: CompeteRoom; participants: CompeteParticipant[] }>;
  return payload.data;
}

export async function startCompeteRoom(token: string, code: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/mcq/compete/rooms/${code}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to start room");
}

export async function submitCompeteAnswer(
  token: string,
  code: string,
  data: { question_id: string; selected_option: "a" | "b" | "c" | "d"; time_taken_seconds?: number },
): Promise<CompeteAnswerResult> {
  const res = await fetch(`${apiBase}/api/v1/mcq/compete/rooms/${code}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  const payload = (await res.json()) as ApiEnvelope<CompeteAnswerResult>;
  return payload.data;
}
