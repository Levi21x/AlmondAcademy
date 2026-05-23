const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  streak_started_date: string | null;
  total_active_days: number;
}

export interface ProgressOverview {
  streak: {
    current_streak: number;
    longest_streak: number;
    total_active_days: number;
    last_active_date: string | null;
  };
  syllabus: {
    total_topics: number;
    completed: number;
    in_progress: number;
    needs_revision: number;
    not_started: number;
    overall_percentage: number;
  };
  today: {
    questions_asked: number;
    topics_completed: number;
    topics_started: number;
  };
  this_week: {
    questions_asked: number;
    topics_completed: number;
    active_days: number;
  };
}

export interface Activity {
  id: string;
  activity_type: string;
  subject: string | null;
  topic_name: string | null;
  created_at: string;
  time_ago: string;
}

export interface WeeklyDay {
  date: string;
  day_label: string;
  questions_asked: number;
  topics_completed: number;
  was_active: boolean;
}

export interface WeeklyData {
  days: WeeklyDay[];
}

export interface SubjectProgress {
  subject_name: string;
  year: number;
  total_topics: number;
  completed: number;
  in_progress: number;
  needs_revision: number;
  not_started: number;
  completion_percentage: number;
  questions_asked: number;
}

function getEmptyWeeklyData(): WeeklyData {
  const days: WeeklyDay[] = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
    days.push({
      date: day.toISOString().split("T")[0],
      day_label: dayLabels[dayIndex],
      questions_asked: 0,
      topics_completed: 0,
      was_active: false,
    });
  }

  return { days };
}

function getEmptyOverview(): ProgressOverview {
  return {
    streak: {
      current_streak: 0,
      longest_streak: 0,
      total_active_days: 0,
      last_active_date: null,
    },
    syllabus: {
      total_topics: 0,
      completed: 0,
      in_progress: 0,
      needs_revision: 0,
      not_started: 0,
      overall_percentage: 0,
    },
    today: {
      questions_asked: 0,
      topics_completed: 0,
      topics_started: 0,
    },
    this_week: {
      questions_asked: 0,
      topics_completed: 0,
      active_days: 0,
    },
  };
}

function getEmptyStreak(): StreakData {
  return {
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    streak_started_date: null,
    total_active_days: 0,
  };
}

export async function getProgressOverview(token: string): Promise<ProgressOverview> {
  try {
    const res = await fetch(`${apiBase}/api/v1/progress/overview`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[progress] overview fetch failed:", res.status);
      return getEmptyOverview();
    }

    const payload = (await res.json()) as ApiEnvelope<ProgressOverview>;
    return payload.data ?? getEmptyOverview();
  } catch (error) {
    console.error("[progress] overview error:", error);
    return getEmptyOverview();
  }
}

export async function getActivityFeed(token: string, limit = 20): Promise<Activity[]> {
  try {
    const url = new URL(`${apiBase}/api/v1/progress/activity`);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[progress] activity fetch failed:", res.status);
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<Activity[]>;
    return payload.data ?? [];
  } catch (error) {
    console.error("[progress] activity error:", error);
    return [];
  }
}

export async function getWeeklyData(token: string): Promise<WeeklyData> {
  try {
    const res = await fetch(`${apiBase}/api/v1/progress/weekly`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[progress] weekly fetch failed:", res.status);
      return getEmptyWeeklyData();
    }

    const payload = (await res.json()) as ApiEnvelope<WeeklyData>;
    return payload.data ?? getEmptyWeeklyData();
  } catch (error) {
    console.error("[progress] weekly error:", error);
    return getEmptyWeeklyData();
  }
}

export async function getSubjectProgress(token: string): Promise<SubjectProgress[]> {
  try {
    const res = await fetch(`${apiBase}/api/v1/progress/subjects`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[progress] subjects fetch failed:", res.status);
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<SubjectProgress[]>;
    return payload.data ?? [];
  } catch (error) {
    console.error("[progress] subjects error:", error);
    return [];
  }
}

export async function getStreak(token: string): Promise<StreakData> {
  try {
    const res = await fetch(`${apiBase}/api/v1/progress/streak`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[progress] streak fetch failed:", res.status);
      return getEmptyStreak();
    }

    const payload = (await res.json()) as ApiEnvelope<StreakData>;
    return payload.data ?? getEmptyStreak();
  } catch (error) {
    console.error("[progress] streak error:", error);
    return getEmptyStreak();
  }
}
