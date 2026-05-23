const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type SyllabusMode = "mbbs" | "neet_pg" | "both";
export type TopicDifficulty = "easy" | "medium" | "hard";
export type TopicStatus = "not_started" | "in_progress" | "completed" | "needs_revision";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface SubjectProgress {
  id: string;
  name: string;
  year: number;
  mode: SyllabusMode;
  description: string | null;
  icon: string | null;
  sort_order: number;
  total_topics: number;
  completed_topics: number;
  completion_percentage: number;
}

export interface SubjectTopic {
  id: string;
  name: string;
  description: string | null;
  difficulty: TopicDifficulty;
  is_high_yield: boolean;
  neet_pg_relevant: boolean;
  sort_order: number;
  status: TopicStatus;
  completed_at: string | null;
}

export interface SubjectDetail {
  id: string;
  name: string;
  year: number;
  mode: SyllabusMode;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface SubjectWithTopics {
  subject: SubjectDetail;
  topics: SubjectTopic[];
}

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_id: string;
  status: TopicStatus;
  completed_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface SubjectSummary {
  subject_id: string;
  subject_name: string;
  total: number;
  completed: number;
  percentage: number;
}

export interface ProgressSummary {
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  needs_revision_topics: number;
  overall_percentage: number;
  by_subject: SubjectSummary[];
}

export interface TopicLookupResult {
  id: string;
  name: string;
  subject_id: string;
  difficulty: TopicDifficulty;
  is_high_yield: boolean;
  neet_pg_relevant: boolean;
}

export async function getSubjects(token: string, mode?: SyllabusMode): Promise<SubjectProgress[]> {
  const url = new URL(`${apiBase}/api/v1/syllabus/subjects`);
  if (mode) {
    url.searchParams.set("mode", mode);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch syllabus subjects");
  }

  const payload = (await res.json()) as ApiEnvelope<SubjectProgress[]>;
  return payload.data ?? [];
}

export async function getSubjectTopics(token: string, subjectId: string): Promise<SubjectWithTopics> {
  const res = await fetch(`${apiBase}/api/v1/syllabus/subjects/${subjectId}/topics`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch subject topics");
  }

  const payload = (await res.json()) as ApiEnvelope<SubjectWithTopics>;
  return payload.data;
}

export async function updateTopicProgress(token: string, topicId: string, status: TopicStatus): Promise<TopicProgress> {
  const res = await fetch(`${apiBase}/api/v1/syllabus/topics/${topicId}/progress`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error("Failed to update topic progress");
  }

  const payload = (await res.json()) as ApiEnvelope<TopicProgress>;
  return payload.data;
}

export async function getProgressSummary(token: string): Promise<ProgressSummary> {
  const res = await fetch(`${apiBase}/api/v1/syllabus/progress/summary`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch syllabus progress summary");
  }

  const payload = (await res.json()) as ApiEnvelope<ProgressSummary>;
  return payload.data;
}

export async function getTopicByName(token: string, topicName: string, subject?: string): Promise<TopicLookupResult | null> {
  const url = new URL(`${apiBase}/api/v1/syllabus/topics/by-name`);
  url.searchParams.set("topic", topicName);
  if (subject?.trim()) {
    url.searchParams.set("subject", subject.trim());
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error("Failed to resolve topic by name");
  }

  const payload = (await res.json()) as ApiEnvelope<TopicLookupResult>;
  return payload.data ?? null;
}
