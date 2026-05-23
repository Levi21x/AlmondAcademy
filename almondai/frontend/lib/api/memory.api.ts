const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface StrugglePattern {
  topic: string;
  subject: string | null;
  mention_count: number;
  last_mentioned: string;
  is_resolved: boolean;
}

export interface MemoryStats {
  total_interactions: number;
  subjects_covered: string[];
  collection_exists: boolean;
}

export interface WeeklySummary {
  summary: string;
  strong_areas: string[];
  weak_areas: string[];
  recommended_focus: string[];
  study_pattern: string;
  encouragement: string;
  generated_at?: string;
}

export interface MemoryInsights {
  struggle_patterns: StrugglePattern[];
  memory_stats: MemoryStats;
  latest_summary: WeeklySummary | null;
}

export async function getMemoryInsights(token: string): Promise<MemoryInsights> {
  const res = await fetch(`${apiBase}/api/v1/memory/insights`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch memory insights");
  }

  const payload = (await res.json()) as ApiEnvelope<MemoryInsights>;
  return payload.data;
}

export async function generateWeeklySummary(token: string): Promise<WeeklySummary> {
  const res = await fetch(`${apiBase}/api/v1/memory/weekly-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to generate weekly summary");
  }

  const payload = (await res.json()) as ApiEnvelope<WeeklySummary>;
  return payload.data;
}

export async function getWeeklySummary(token: string): Promise<WeeklySummary | null> {
  const res = await fetch(`${apiBase}/api/v1/memory/summary`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch weekly summary");
  }

  const payload = (await res.json()) as ApiEnvelope<WeeklySummary | null>;
  return payload.data;
}

export async function resolveStruggle(token: string, topic: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/memory/struggles/${encodeURIComponent(topic)}/resolve`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to resolve struggle pattern");
  }
}
