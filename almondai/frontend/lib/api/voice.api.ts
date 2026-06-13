const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface VoiceAskResult {
  textResponse: string;
  sessionId: string;
  newAchievements: Array<Record<string, unknown>>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

function derivedExtension(blob: Blob): string {
  const t = blob.type;
  if (t.includes("mp4")) return "mp4";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("wav")) return "wav";
  return "webm";
}

export async function transcribeAudio(authToken: string, audio: Blob): Promise<string> {
  const formData = new FormData();
  // Use the blob's own MIME type — don't strip it — so the backend can pass the correct
  // content-type to Sarvam instead of always sending "audio/webm"
  const ext = derivedExtension(audio);
  formData.append("file", audio, `recording.${ext}`);

  const res = await fetch(`${apiBase}/api/v1/voice/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
    body: formData,
  });

  if (!res.ok) {
    let message = "Transcription failed. Please speak more clearly and try again.";
    try {
      const body = await res.json();
      message = body?.detail?.message ?? body?.detail ?? body?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }

  const data = (await res.json()) as ApiEnvelope<{ transcript: string }>;
  return data.data.transcript ?? "";
}

export async function askVoiceQuestion(
  authToken: string,
  transcript: string,
  conversationHistory: VoiceMessage[],
  subject?: string,
  sessionId?: string,
): Promise<VoiceAskResult> {
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
      conversation_history: conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    let message = "Voice request failed. Please try again.";
    try {
      const body = await res.json();
      message = body?.detail?.message ?? body?.detail ?? body?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }

  const data = (await res.json()) as ApiEnvelope<{
    text_response: string;
    session_id: string;
    new_achievements: Array<Record<string, unknown>>;
  }>;

  return {
    textResponse: data.data.text_response,
    sessionId: data.data.session_id,
    newAchievements: data.data.new_achievements ?? [],
  };
}

export async function checkVoiceHealth(authToken: string): Promise<{ sarvam: boolean; groq: boolean; cartesia: boolean }> {
  const res = await fetch(`${apiBase}/api/v1/voice/health`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) return { sarvam: false, groq: false, cartesia: false };
  const data = (await res.json()) as ApiEnvelope<{ sarvam: boolean; groq: boolean; cartesia: boolean }>;
  return data.data;
}
