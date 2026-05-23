const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface StudentBenchmark {
  percentile_rank: number;
  cohort_label: "getting_started" | "building_momentum" | "on_track" | "top_performer" | "elite";
  questions_percentile: number;
  completion_percentile: number;
  streak_percentile: number;
  mcq_accuracy_percentile: number;
}

export interface PlatformStruggle {
  topic: string;
  subject: string;
  student_count: number;
  message: string;
  is_also_your_struggle: boolean;
}

export interface PeerNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PeerInsights {
  benchmark: StudentBenchmark;
  platform_struggles: PlatformStruggle[];
  top_performer_insights: string[];
  cohort_comparison: {
    your_questions_today: number;
    cohort_average_questions: number;
    gap: number;
    message: string;
  };
  trending_this_week: {
    hot_subject: string;
    reason: string;
  };
}

function emptyBenchmark(): StudentBenchmark {
  return {
    percentile_rank: 0,
    cohort_label: "getting_started",
    questions_percentile: 0,
    completion_percentile: 0,
    streak_percentile: 0,
    mcq_accuracy_percentile: 0,
  };
}

function emptyPeerInsights(): PeerInsights {
  return {
    benchmark: emptyBenchmark(),
    platform_struggles: [],
    top_performer_insights: [],
    cohort_comparison: {
      your_questions_today: 0,
      cohort_average_questions: 0,
      gap: 0,
      message: "Platform intelligence builds as more students join AlmondAI",
    },
    trending_this_week: {
      hot_subject: "General",
      reason: "Platform intelligence builds as more students join AlmondAI",
    },
  };
}

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function getPeerInsights(token: string): Promise<PeerInsights> {
  try {
    const res = await fetch(`${apiBase}/api/v1/peer/insights`, {
      method: "GET",
      headers: authHeader(token),
    });

    if (!res.ok) {
      return emptyPeerInsights();
    }

    const payload = (await res.json()) as ApiEnvelope<PeerInsights>;
    return payload.data ?? emptyPeerInsights();
  } catch {
    return emptyPeerInsights();
  }
}

export async function getBenchmark(token: string): Promise<StudentBenchmark> {
  try {
    const res = await fetch(`${apiBase}/api/v1/peer/benchmark`, {
      method: "GET",
      headers: authHeader(token),
    });

    if (!res.ok) {
      return emptyBenchmark();
    }

    const payload = (await res.json()) as ApiEnvelope<StudentBenchmark>;
    return payload.data ?? emptyBenchmark();
  } catch {
    return emptyBenchmark();
  }
}

export async function getStrugglingTopics(token: string): Promise<PlatformStruggle[]> {
  try {
    const res = await fetch(`${apiBase}/api/v1/peer/struggling-topics`, {
      method: "GET",
      headers: authHeader(token),
    });

    if (!res.ok) {
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<PlatformStruggle[]>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function getNotifications(token: string): Promise<PeerNotification[]> {
  try {
    const res = await fetch(`${apiBase}/api/v1/peer/notifications`, {
      method: "GET",
      headers: authHeader(token),
    });

    if (!res.ok) {
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<PeerNotification[]>;
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  try {
    await fetch(`${apiBase}/api/v1/peer/notifications/${id}/read`, {
      method: "PATCH",
      headers: authHeader(token),
    });
  } catch {
    // Silent fallback for non-blocking UX.
  }
}
