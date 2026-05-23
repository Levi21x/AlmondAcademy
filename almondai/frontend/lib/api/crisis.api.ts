const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type PreparationLevel = "zero" | "little" | "moderate" | "good";

export interface CrisisHourBlock {
  time_block: string;
  subject: string;
  topic: string;
  activity: string;
  key_points: string[];
  exam_tip: string;
  duration_minutes: number;
}

export interface CrisisDay {
  day: number;
  date: string;
  theme: string;
  hours: CrisisHourBlock[];
  daily_goal: string;
  revision_topics: string[];
}

export interface CrisisPlan {
  crisis_summary: string;
  survival_strategy: string;
  what_to_skip: string[];
  must_know: string[];
  days: CrisisDay[];
  emergency_tips: string[];
}

export interface CrisisTopicProgress {
  id: string;
  day_number: number;
  topic_name: string;
  subject: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface CrisisSession {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  days_remaining: number;
  subjects: string[];
  preparation_level: PreparationLevel;
  available_hours_per_day: number;
  crisis_plan: CrisisPlan;
  current_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  topic_progress?: CrisisTopicProgress[];
}

export interface CrisisActivationStatus {
  can_activate: boolean;
  free_activation_used: boolean;
  is_premium: boolean;
  active_session: CrisisSession | null;
}

export interface TeachingContent {
  topic: string;
  subject: string;
  teaching_content: string;
  mnemonics: string[];
  exam_questions: string[];
  what_to_remember: string[];
}

export interface ActivateCrisisPayload {
  exam_name: string;
  exam_date: string;
  subjects: string[];
  preparation_level: PreparationLevel;
  available_hours_per_day: number;
}

export interface UpdateTopicProgressPayload {
  day_number: number;
  topic_name: string;
  is_completed: boolean;
}

export interface RecalibratePayload {
  preparation_level?: PreparationLevel;
  available_hours_per_day?: number;
}

export interface TeachPayload {
  topic_name: string;
  subject: string;
  key_points: string[];
  exam_tip: string;
}

export async function getActivationStatus(token: string): Promise<CrisisActivationStatus> {
  const res = await fetch(`${apiBase}/api/v1/crisis/activation-status`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch crisis activation status");
  }

  const payload = (await res.json()) as ApiEnvelope<CrisisActivationStatus>;
  return payload.data;
}

export async function activateCrisisMode(token: string, data: ActivateCrisisPayload): Promise<CrisisSession> {
  const res = await fetch(`${apiBase}/api/v1/crisis/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Failed to activate crisis mode";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function getActiveSession(token: string): Promise<CrisisSession | null> {
  const res = await fetch(`${apiBase}/api/v1/crisis/active-session`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error("Failed to fetch active crisis session");
  }

  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function updateTopicProgress(token: string, sessionId: string, data: UpdateTopicProgressPayload): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/progress`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to update topic progress");
  }
}

export async function recalibrateSession(token: string, sessionId: string, data: RecalibratePayload): Promise<CrisisSession> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/recalibrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to recalibrate crisis session");
  }

  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function getTeachingContent(token: string, sessionId: string, data: TeachPayload): Promise<TeachingContent> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/teach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to load teaching content");
  }

  const payload = (await res.json()) as ApiEnvelope<TeachingContent>;
  return payload.data;
}
