const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  subject?: string | null;
  mode?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview?: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getSessions(token: string): Promise<ChatSession[]> {
  const res = await fetch(`${apiBase}/api/v1/chat/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch sessions");
  }
  const payload = (await res.json()) as ApiEnvelope<ChatSession[]>;
  return payload.data ?? [];
}

export async function getSession(token: string, sessionId: string): Promise<ChatSessionWithMessages> {
  const res = await fetch(`${apiBase}/api/v1/chat/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch session");
  }
  const payload = (await res.json()) as ApiEnvelope<ChatSessionWithMessages>;
  return payload.data;
}

export async function createSession(token: string, subject?: string, mode?: string): Promise<ChatSession> {
  const res = await fetch(`${apiBase}/api/v1/chat/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subject: subject ?? null, mode: mode ?? null }),
  });
  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  const payload = (await res.json()) as ApiEnvelope<ChatSession>;
  return payload.data;
}

export async function deleteSession(token: string, sessionId: string): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to delete session");
  }
}

export async function saveMessage(
  token: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<ChatMessage> {
  const res = await fetch(`${apiBase}/api/v1/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role, content }),
  });
  if (!res.ok) {
    throw new Error("Failed to save message");
  }
  const payload = (await res.json()) as ApiEnvelope<ChatMessage>;
  return payload.data;
}
