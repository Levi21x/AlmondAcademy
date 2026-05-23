const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface WeaknessSignals {
  mcq_accuracy: number;
  mention_count: number;
  completion_status: string;
  question_frequency: number;
}

export interface WeaknessGap {
  topic: string;
  subject: string;
  weakness_score: number;
  signals: WeaknessSignals;
}

export interface WeaknessIntervention {
  id?: string;
  analysis_id?: string;
  topic: string;
  subject: string;
  weakness_score: number;
  priority: "critical" | "high" | "medium" | "low";
  intervention_plan: string;
  time_required?: string;
  approach?: string;
  key_resources?: string[];
  quick_win?: string;
  is_resolved?: boolean;
  resolved_at?: string | null;
  created_at?: string;
}

export interface WeaknessAnalysis {
  analysis_id: string;
  overall_readiness_score: number;
  estimated_marks_at_risk: number;
  generated_at: string;
  critical_gaps: WeaknessGap[];
  high_risk: WeaknessGap[];
  moderate_risk: WeaknessGap[];
  strong_areas: WeaknessGap[];
  interventions: WeaknessIntervention[];
}

export interface QuickSummary {
  has_analysis: boolean;
  last_analyzed: string;
  critical_count: number;
  high_risk_count: number;
  overall_readiness_score: number;
  top_3_gaps: Array<{ topic: string; subject: string; weakness_score: number }>;
}

function emptyAnalysis(): WeaknessAnalysis {
  return {
    analysis_id: "",
    overall_readiness_score: 0,
    estimated_marks_at_risk: 0,
    generated_at: "",
    critical_gaps: [],
    high_risk: [],
    moderate_risk: [],
    strong_areas: [],
    interventions: [],
  };
}

function emptyQuickSummary(): QuickSummary {
  return {
    has_analysis: false,
    last_analyzed: "Never",
    critical_count: 0,
    high_risk_count: 0,
    overall_readiness_score: 0,
    top_3_gaps: [],
  };
}

export async function runAnalysis(token: string, subject?: string): Promise<WeaknessAnalysis> {
  try {
    const res = await fetch(`${apiBase}/api/v1/weakness/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subject ? { subject } : {}),
    });

    if (!res.ok) {
      console.error("[weakness] run analysis failed", res.status);
      return emptyAnalysis();
    }

    const payload = (await res.json()) as ApiEnvelope<WeaknessAnalysis>;
    return payload.data ?? emptyAnalysis();
  } catch (error) {
    console.error("[weakness] run analysis error", error);
    return emptyAnalysis();
  }
}

export async function getLatestAnalysis(token: string): Promise<WeaknessAnalysis | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/weakness/latest`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      console.error("[weakness] latest analysis failed", res.status);
      return null;
    }

    const payload = (await res.json()) as ApiEnvelope<WeaknessAnalysis>;
    return payload.data ?? null;
  } catch (error) {
    console.error("[weakness] latest analysis error", error);
    return null;
  }
}

export async function getInterventions(token: string): Promise<WeaknessIntervention[]> {
  try {
    const res = await fetch(`${apiBase}/api/v1/weakness/interventions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[weakness] interventions failed", res.status);
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<WeaknessIntervention[]>;
    return payload.data ?? [];
  } catch (error) {
    console.error("[weakness] interventions error", error);
    return [];
  }
}

export async function resolveIntervention(token: string, id: string): Promise<void> {
  try {
    await fetch(`${apiBase}/api/v1/weakness/interventions/${id}/resolve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("[weakness] resolve error", error);
  }
}

export async function getQuickSummary(token: string): Promise<QuickSummary> {
  try {
    const res = await fetch(`${apiBase}/api/v1/weakness/quick-summary`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[weakness] quick summary failed", res.status);
      return emptyQuickSummary();
    }

    const payload = (await res.json()) as ApiEnvelope<QuickSummary>;
    return payload.data ?? emptyQuickSummary();
  } catch (error) {
    console.error("[weakness] quick summary error", error);
    return emptyQuickSummary();
  }
}
