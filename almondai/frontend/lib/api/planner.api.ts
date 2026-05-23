const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type ExamType = "university" | "neet_pg" | "fmge" | "internal" | "other";
export type PlanPriority = "high" | "medium" | "low";

export interface StudentExam {
  id: string;
  exam_name: string;
  exam_date: string;
  exam_type: ExamType;
  subjects: string[];
  days_remaining: number;
  is_past: boolean;
  has_active_plan: boolean;
  is_active: boolean;
}

export interface PlanTopic {
  subject: string;
  topic: string;
  duration_minutes: number;
  priority: PlanPriority;
  notes: string;
  exam_tip?: string;
}

export interface PlanDay {
  day: number;
  date: string;
  focus: string;
  topics: PlanTopic[];
  total_hours: number;
  day_goal: string;
}

export interface StudyPlan {
  id: string;
  exam_id: string;
  exam_name: string;
  exam_date: string;
  days_remaining: number;
  generated_at: string;
  is_active: boolean;
  summary: string;
  total_days: number;
  daily_hours: number;
  weekly_overview: string;
  days: PlanDay[];
  tips: string[];
}

export interface TodayPlan {
  has_plan: boolean;
  nearest_exam: {
    exam_name: string;
    days_remaining: number;
  } | null;
  today: PlanDay | null;
}

export interface CreateExamPayload {
  exam_name: string;
  exam_date: string;
  exam_type: ExamType;
  subjects: string[];
}

export interface GeneratePlanPayload {
  available_hours_per_day?: number;
  regenerate?: boolean;
}

export async function getExams(token: string): Promise<StudentExam[]> {
  const res = await fetch(`${apiBase}/api/v1/planner/exams`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch exams");
  }

  const payload = (await res.json()) as ApiEnvelope<StudentExam[]>;
  return payload.data ?? [];
}

export async function createExam(token: string, data: CreateExamPayload): Promise<StudentExam> {
  const res = await fetch(`${apiBase}/api/v1/planner/exams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to create exam");
  }

  const payload = (await res.json()) as ApiEnvelope<StudentExam>;
  return payload.data;
}

export async function deleteExam(token: string, examId: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/planner/exams/${examId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to delete exam");
  }
}

export async function generatePlan(token: string, examId: string, options?: GeneratePlanPayload): Promise<StudyPlan> {
  const res = await fetch(`${apiBase}/api/v1/planner/exams/${examId}/generate-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) {
    let message = "Failed to generate plan";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<StudyPlan>;
  return payload.data;
}

export async function getPlan(token: string, examId: string): Promise<StudyPlan | null> {
  const res = await fetch(`${apiBase}/api/v1/planner/exams/${examId}/plan`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to fetch plan");
  }

  const payload = (await res.json()) as ApiEnvelope<StudyPlan>;
  return payload.data;
}

export async function getTodayPlan(token: string): Promise<TodayPlan> {
  const res = await fetch(`${apiBase}/api/v1/planner/today`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch today's plan");
  }

  const payload = (await res.json()) as ApiEnvelope<TodayPlan>;
  return payload.data;
}
