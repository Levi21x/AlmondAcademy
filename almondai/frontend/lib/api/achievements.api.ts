const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface AchievementItem {
  badge_key: string;
  badge_name: string;
  badge_tier: AchievementTier;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
  metadata: Record<string, unknown>;
}

export interface StreakMilestone {
  current_streak: number;
  target_streak: number;
  remaining_days: number;
  badge_key: string | null;
  badge_name: string | null;
  badge_tier: AchievementTier | null;
}

export interface AchievementsCatalog {
  items: AchievementItem[];
  unlocked_count: number;
  total_badges: number;
  next_streak_milestone: StreakMilestone | null;
}

export interface AchievementsSummary {
  unlocked_count: number;
  total_badges: number;
  next_streak_milestone: StreakMilestone | null;
  latest_unlock: AchievementItem | null;
}

export interface RecentAchievementUnlocks {
  items: AchievementItem[];
  server_time: string;
}

function getEmptyCatalog(): AchievementsCatalog {
  return {
    items: [],
    unlocked_count: 0,
    total_badges: 0,
    next_streak_milestone: null,
  };
}

function getEmptySummary(): AchievementsSummary {
  return {
    unlocked_count: 0,
    total_badges: 0,
    next_streak_milestone: null,
    latest_unlock: null,
  };
}

export async function getAchievements(token: string): Promise<AchievementsCatalog> {
  try {
    const res = await fetch(`${apiBase}/api/v1/achievements`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[achievements] catalog fetch failed:", res.status);
      return getEmptyCatalog();
    }

    const payload = (await res.json()) as ApiEnvelope<AchievementsCatalog>;
    return payload.data ?? getEmptyCatalog();
  } catch (error) {
    console.error("[achievements] catalog error:", error);
    return getEmptyCatalog();
  }
}

export async function getAchievementSummary(token: string): Promise<AchievementsSummary> {
  try {
    const res = await fetch(`${apiBase}/api/v1/achievements/summary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[achievements] summary fetch failed:", res.status);
      return getEmptySummary();
    }

    const payload = (await res.json()) as ApiEnvelope<AchievementsSummary>;
    return payload.data ?? getEmptySummary();
  } catch (error) {
    console.error("[achievements] summary error:", error);
    return getEmptySummary();
  }
}

export async function getNewAchievements(
  token: string,
  since: string | null,
  limit = 10,
): Promise<RecentAchievementUnlocks> {
  const fallback: RecentAchievementUnlocks = { items: [], server_time: new Date().toISOString() };

  try {
    const url = new URL(`${apiBase}/api/v1/achievements/new`);
    if (since) {
      url.searchParams.set("since", since);
    }
    url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 100))));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error("[achievements] new unlocks fetch failed:", res.status);
      return fallback;
    }

    const payload = (await res.json()) as ApiEnvelope<RecentAchievementUnlocks>;
    return payload.data ?? fallback;
  } catch (error) {
    console.error("[achievements] new unlocks error:", error);
    return fallback;
  }
}
