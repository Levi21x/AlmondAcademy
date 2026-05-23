export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface UsageStatus {
  questions_asked_today: number;
  daily_limit: number | null;
  is_premium: boolean;
  questions_remaining: number | null;
  unlimited: boolean;
}

interface UsageStatusResponse {
  success: boolean;
  data: UsageStatus;
}

export interface PremiumSessionStatus {
  premium_sessions_used: number;
  premium_sessions_limit: number;
  premium_sessions_remaining: number;
  can_use_premium_session: boolean;
}

interface PremiumSessionStatusResponse {
  success: boolean;
  data: PremiumSessionStatus;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type AskEvent = { type: "chunk" | "session" | "end"; data: string };

export async function* askQuestion(params: {
  question: string;
  subject?: string;
  sessionId?: string | null;
  conversationHistory?: ConversationTurn[];
  stream?: boolean;
  token: string;
  signal?: AbortSignal;
  searchEnabled?: boolean;
  source?: string;
}): AsyncGenerator<AskEvent, void, unknown> {
  const response = await fetch(`${apiBase}/api/v1/doubt-solver/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    signal: params.signal,
    body: JSON.stringify({
      question: params.question,
      subject: params.subject,
      session_id: params.sessionId ?? null,
      conversation_history: params.conversationHistory ?? [],
      stream: params.stream ?? true,
      model: "auto",
      search_enabled: params.searchEnabled ?? false,
      source: params.source,
    }),
  });

  if (!response.ok) {
    let message = "Failed to get response from AlmondAI";
    try {
      const payload = await response.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch {
      // Keep fallback message.
    }
    console.error("[diag] askQuestion non-ok response", { status: response.status, message });
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Streaming response body is not available");
  }

  const headerSession = response.headers.get("X-Session-ID");
  if (headerSession) {
    yield { type: "session", data: headerSession };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");
    let boundaryIndex = buffer.indexOf("\n\n");

    while (boundaryIndex !== -1) {
      const eventChunk = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      boundaryIndex = buffer.indexOf("\n\n");

      if (!eventChunk) continue;

      // Collect all data: lines and rejoin with newlines
      // This preserves newlines inside the payload that
      // the SSE format splits across multiple data: lines
      const dataLines = eventChunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));

      if (dataLines.length === 0) continue;

      const payload = dataLines.join("\n");

      if (payload === "[ALMOND_STREAM_END]") {
        yield { type: "end", data: "" };
        return;
      }

      if (payload.startsWith("[SESSION_ID:") && payload.endsWith("]")) {
        const sid = payload.slice(12, -1);
        yield { type: "session", data: sid };
        continue;
      }

      let decodedPayload: string;
      try {
        decodedPayload = JSON.parse(payload) as string;
      } catch {
        decodedPayload = payload;
      }
      yield { type: "chunk", data: decodedPayload };
    }
  }
}

export async function getUsageStatus(token: string): Promise<UsageStatus> {
  const response = await fetch(`${apiBase}/api/v1/doubt-solver/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error("[diag] getUsageStatus non-ok", response.status);
    throw new Error("Failed to fetch usage status");
  }

  const payload = (await response.json()) as UsageStatusResponse;
  return payload.data;
}

export async function getPremiumSessionStatus(token: string): Promise<PremiumSessionStatus> {
  try {
    const response = await fetch(`${apiBase}/api/v1/doubt-solver/premium-session-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        premium_sessions_used: 0,
        premium_sessions_limit: 15,
        premium_sessions_remaining: 15,
        can_use_premium_session: true,
      };
    }

    const payload = (await response.json()) as PremiumSessionStatusResponse;
    return payload.data;
  } catch {
    return {
      premium_sessions_used: 0,
      premium_sessions_limit: 15,
      premium_sessions_remaining: 15,
      can_use_premium_session: true,
    };
  }
}