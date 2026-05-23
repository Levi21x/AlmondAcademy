const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export type VisualType = "flowchart" | "timeline" | "comparison" | "decision_tree" | "mind_map" | "process";

export interface VisualRecord {
  id: string;
  topic: string;
  subject: string | null;
  visual_type: VisualType;
  visual_data: Record<string, unknown>;
  explanation: string;
  created_at: string;
}

function emptyVisual(topic = ""): VisualRecord {
  return {
    id: "",
    topic,
    subject: null,
    visual_type: "flowchart",
    visual_data: {},
    explanation: "",
    created_at: new Date().toISOString(),
  };
}

export async function generateVisual(params: {
  token: string;
  topic: string;
  visualType: VisualType;
  subject?: string;
}): Promise<VisualRecord> {
  const res = await fetch(`${apiBase}/api/v1/visuals/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      topic: params.topic,
      visual_type: params.visualType,
      subject: params.subject,
    }),
  });

  if (!res.ok) {
    let message = "Failed to generate visual";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = (await res.json()) as ApiEnvelope<VisualRecord>;
  return payload.data ?? emptyVisual(params.topic);
}

export async function getVisualLibrary(token: string, limit = 24): Promise<VisualRecord[]> {
  try {
    const url = new URL(`${apiBase}/api/v1/visuals/library`);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[visuals] library failed", res.status);
      return [];
    }

    const payload = (await res.json()) as ApiEnvelope<VisualRecord[]>;
    return payload.data ?? [];
  } catch (error) {
    console.error("[visuals] library error", error);
    return [];
  }
}

export async function deleteVisual(token: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/v1/visuals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (error) {
    console.error("[visuals] delete error", error);
    return false;
  }
}
