const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Primitive types ────────────────────────────────────────────────────────────

export type PreparationLevel = "zero" | "little" | "moderate" | "good";
export type CrisisMode = "standard" | "last_night";

export interface CrisisHourBlock {
  time_block: string;
  subject: string;
  topic: string;
  activity: string;
  key_points: string[];
  exam_tip: string;
  duration_minutes: number;
}

export interface CrisisDay {
  day: number;
  date: string;
  theme: string;
  hours: CrisisHourBlock[];
  daily_goal: string;
  revision_topics: string[];
}

export interface CrisisPlan {
  crisis_summary: string;
  survival_strategy: string;
  what_to_skip: string[];
  must_know: string[];
  days: CrisisDay[];
  emergency_tips: string[];
}

export interface CrisisTopicProgress {
  id: string;
  day_number: number;
  topic_name: string;
  subject: string;
  is_completed: boolean;
  completed_at: string | null;
}

// ── War Room strategy types ────────────────────────────────────────────────────

export interface CrisisReadinessBreakdown {
  readiness_score: number;
  coverage_score: number;
  time_factor: number;
  weakness_score: number;
  stress_penalty: number;
  total_topics: number;
  completed_topics: number;
  hours_available: number;
  hours_needed_estimate: number;
}

export interface CrisisPanicInfo {
  detected: boolean;
  severity: "none" | "moderate" | "severe";
  signals: string[];
  softening_factor: number;
  anchor_message: string;
}

export interface CrisisHighYieldTopic {
  topic: string;
  subject: string;
  why?: string;
  why_skip?: string;
}

export interface CrisisHighYield {
  must: CrisisHighYieldTopic[];
  should: CrisisHighYieldTopic[];
  optional: CrisisHighYieldTopic[];
  skip: CrisisHighYieldTopic[];
}

export interface CrisisSacrificeItem {
  topic: string;
  subject: string;
  reason: string;
  hours_saved: number;
}

export interface CrisisSacrifice {
  sacrifice_list: CrisisSacrificeItem[];
  retain_list: Array<{ topic: string; subject: string }>;
  estimated_marks_coverage: number;
  total_sacrifice_hours: number;
}

export interface CrisisStrategy {
  readiness: CrisisReadinessBreakdown;
  panic: CrisisPanicInfo;
  high_yield?: CrisisHighYield;
  sacrifice?: CrisisSacrifice;
  survival_advice?: string;
  emergency_tips?: string[];
}

// ── Session types ──────────────────────────────────────────────────────────────

export interface CrisisSession {
  id: string;
  user_id: string;
  exam_name: string;
  exam_date: string;
  days_remaining: number;
  subjects: string[];
  preparation_level: PreparationLevel;
  available_hours_per_day: number;
  stress_level: number;
  mode: CrisisMode;
  readiness_score: number | null;
  strategy: CrisisStrategy | null;
  crisis_plan: CrisisPlan;
  current_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  topic_progress?: CrisisTopicProgress[];
}

export interface CrisisActivationStatus {
  can_activate: boolean;
  free_activation_used: boolean;
  is_premium: boolean;
  active_session: CrisisSession | null;
}

export interface TeachingContent {
  topic: string;
  subject: string;
  teaching_content: string;
  mnemonics: string[];
  exam_questions: string[];
  what_to_remember: string[];
}

export interface CrisisAskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ── Last-Night plan types ──────────────────────────────────────────────────────

export interface LastNightHourBlock {
  hour: number;
  time_slot: string;
  focus: string;
  activity: string;
  key_facts: string[];
  mnemonic: string;
  why_now?: string;
}

export interface LastNightPlan {
  strategy: string;
  hour_by_hour: LastNightHourBlock[];
  ultra_high_yield_facts: string[];
  critical_mnemonics: string[];
  viva_hot_topics: string[];
  do_not_study: string[];
  exam_day_strategy: string;
}

// ── Request payload types ─────────────────────────────────────────────────────

export interface ActivateCrisisPayload {
  exam_name: string;
  exam_date: string;
  subjects: string[];
  preparation_level: PreparationLevel;
  available_hours_per_day: number;
  stress_level?: number;
  mode?: CrisisMode;
  message?: string;
}

export interface UpdateTopicProgressPayload {
  day_number: number;
  topic_name: string;
  is_completed: boolean;
}

export interface RecalibratePayload {
  preparation_level?: PreparationLevel;
  available_hours_per_day?: number;
}

export interface TeachPayload {
  topic_name: string;
  subject: string;
  key_points: string[];
  exam_tip: string;
}

export interface LastNightPayload {
  exam_name: string;
  subjects: string[];
  hours_available: number;
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function getActivationStatus(token: string): Promise<CrisisActivationStatus> {
  const res = await fetch(`${apiBase}/api/v1/crisis/activation-status`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch crisis activation status");
  const payload = (await res.json()) as ApiEnvelope<CrisisActivationStatus>;
  return payload.data;
}

export async function activateCrisisMode(token: string, data: ActivateCrisisPayload): Promise<CrisisSession> {
  const res = await fetch(`${apiBase}/api/v1/crisis/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let message = "Failed to activate crisis mode";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? payload?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function getActiveSession(token: string): Promise<CrisisSession | null> {
  const res = await fetch(`${apiBase}/api/v1/crisis/active-session`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch active crisis session");
  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function updateTopicProgress(
  token: string,
  sessionId: string,
  data: UpdateTopicProgressPayload,
): Promise<void> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/progress`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update topic progress");
}

export async function recalibrateSession(
  token: string,
  sessionId: string,
  data: RecalibratePayload,
): Promise<CrisisSession> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/recalibrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to recalibrate crisis session");
  const payload = (await res.json()) as ApiEnvelope<CrisisSession>;
  return payload.data;
}

export async function getTeachingContent(
  token: string,
  sessionId: string,
  data: TeachPayload,
): Promise<TeachingContent> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/teach`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to load teaching content");
  const payload = (await res.json()) as ApiEnvelope<TeachingContent>;
  return payload.data;
}

export async function generateLastNightPlan(token: string, data: LastNightPayload): Promise<LastNightPlan> {
  const res = await fetch(`${apiBase}/api/v1/crisis/last-night`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let message = "Failed to generate last-night plan";
    try {
      const payload = await res.json();
      message = payload?.detail?.message ?? message;
    } catch { /* keep fallback */ }
    throw new Error(message);
  }
  const payload = (await res.json()) as ApiEnvelope<LastNightPlan>;
  return payload.data;
}

export async function getCrisisAskHistory(token: string, sessionId: string): Promise<CrisisAskMessage[]> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/ask/history`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch ask history");
  const payload = (await res.json()) as ApiEnvelope<CrisisAskMessage[]>;
  return payload.data;
}

// ── War Room v2 types ──────────────────────────────────────────────────────────

export interface AgentResult {
  agent: string;
  success: boolean;
  duration_ms: number;
}

export interface JarItem {
  id: string;
  item_type: "text_paste" | "pdf" | "image" | "pasted_notes" | "graded_script" | "audio" | "url";
  item_category: "canon" | "own_notes" | "lecture" | "pyq_cram" | "image_spotter" | "graded_feedback" | "datesheet" | "unknown";
  original_name: string;
  is_processed: boolean;
  is_graded_script: boolean;
  trust_flags: string[];
  created_at: string;
}

export interface JarArtifact {
  id: string;
  artifact_type: "mock_paper" | "cheat_sheet" | "recall_deck" | "knowing_vs_scoring" | "schedule_grid";
  title: string;
  subtitle: string;
  is_read: boolean;
  created_at: string;
  content: Record<string, unknown>;
}

export interface JarJob {
  id: string;
  job_type: string;
  status: "pending" | "running" | "completed" | "failed";
  attempts: number;
  scheduled_for: string;
  completed_at: string | null;
  error_message: string | null;
}

export type WarRoomSSEEvent =
  | { type: "status"; message: string }
  | { type: "agents_ready"; results: AgentResult[] }
  | { type: "session_created"; session_id: string }
  | { type: "chief_resident_start" }
  | { type: "chief_resident_text"; text: string }
  | { type: "error"; message: string };

export type LiveFeedEvent =
  | { type: "artifacts_ready"; artifacts: Pick<JarArtifact, "id" | "artifact_type" | "title" | "created_at">[] }
  | { type: "nudge"; nudge: { id: string; nudge_type: string; content: string } }
  | { type: "ping" };

// ── Jar API functions ──────────────────────────────────────────────────────────

export async function listJarItems(token: string, sessionId: string): Promise<JarItem[]> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/jar/items`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as ApiEnvelope<JarItem[]>;
  return payload.data;
}

export async function addTextToJar(token: string, sessionId: string, text: string, label?: string): Promise<JarItem> {
  const form = new FormData();
  form.append("text", text);
  if (label) form.append("label", label);
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/jar/text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to add to jar");
  const payload = (await res.json()) as ApiEnvelope<JarItem>;
  return payload.data;
}

/**
 * Upload a file to the Almond Jar via FastAPI → Supabase Storage.
 * Uses XHR so onProgress fires during the actual upload to the server.
 */
export function uploadFileToJar(
  token: string,
  sessionId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<JarItem> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = JSON.parse(xhr.responseText) as ApiEnvelope<JarItem>;
          resolve(payload.data);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err?.detail?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.open("POST", `${apiBase}/api/v1/crisis/sessions/${sessionId}/jar/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Do NOT set Content-Type here — browser sets it with the correct boundary for multipart
    xhr.send(form);
  });
}

export async function removeJarItem(token: string, sessionId: string, itemId: string): Promise<void> {
  await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/jar/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listArtifacts(token: string, sessionId: string): Promise<JarArtifact[]> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/artifacts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as ApiEnvelope<JarArtifact[]>;
  return payload.data;
}

export async function markArtifactRead(token: string, sessionId: string, artifactId: string): Promise<void> {
  await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/artifacts/${artifactId}/read`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listJobs(token: string, sessionId: string): Promise<JarJob[]> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as ApiEnvelope<JarJob[]>;
  return payload.data;
}

/** SSE stream for War Room v2 activation. Yields typed events. */
export async function* streamWarRoomActivation(
  token: string,
  data: ActivateCrisisPayload,
): AsyncGenerator<WarRoomSSEEvent> {
  const res = await fetch(`${apiBase}/api/v1/crisis/activate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok || !res.body) throw new Error("Failed to start War Room activation stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[CRISIS_STREAM_END]") return;
      try {
        yield JSON.parse(raw) as WarRoomSSEEvent;
      } catch { /* malformed chunk — skip */ }
    }
  }
}

/** SSE live feed for nudges + artifact-ready events. */
export async function* connectLiveFeed(
  token: string,
  sessionId: string,
): AsyncGenerator<LiveFeedEvent> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/live`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[FEED_CLOSED]") return;
      try {
        const event = JSON.parse(raw) as LiveFeedEvent;
        if (event.type !== "ping") yield event;
      } catch { /* skip */ }
    }
  }
}

/** Server-Sent Events stream for the "If I Were You" tactical AI. Yields text chunks. */
export async function* streamCrisisAsk(
  token: string,
  sessionId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
): AsyncGenerator<string> {
  const res = await fetch(`${apiBase}/api/v1/crisis/sessions/${sessionId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });

  if (!res.ok || !res.body) {
    throw new Error("Failed to start crisis AI stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[CRISIS_STREAM_END]") return;
      try {
        yield JSON.parse(data) as string;
      } catch {
        if (data) yield data;
      }
    }
  }
}
