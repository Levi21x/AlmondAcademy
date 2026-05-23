const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface DeepgramToken {
  token: string;
  language: string;
  model: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function getDeepgramToken(authToken: string): Promise<DeepgramToken> {
  const res = await fetch(`${apiBase}/api/v1/voice/deepgram-token`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!res.ok) {
    let message = "Failed to connect to voice service";
    try {
      const body = await res.json();
      message = body?.detail?.message ?? body?.detail ?? body?.message ?? message;
    } catch {
      // Keep fallback message when response is not JSON.
    }
    throw new Error(message);
  }

  const data = (await res.json()) as ApiEnvelope<DeepgramToken>;
  return data.data;
}

export async function askVoiceQuestion(
  authToken: string,
  transcript: string,
  conversationHistory: VoiceMessage[],
  subject?: string,
  sessionId?: string,
): Promise<string> {
  const res = await fetch(`${apiBase}/api/v1/voice/ask-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      transcript,
      subject,
      session_id: sessionId,
      conversation_history: conversationHistory.map((message) => ({ role: message.role, content: message.content })),
    }),
  });

  if (!res.ok) {
    throw new Error("Voice request failed");
  }

  const data = (await res.json()) as ApiEnvelope<{ text_response: string }>;
  return data.data.text_response;
}
