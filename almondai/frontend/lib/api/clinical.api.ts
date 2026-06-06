const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClinicalDifficulty = "basic" | "intermediate" | "advanced";
export type ClinicalStatus =
  | "history_taking"
  | "examination"
  | "case_sheet"
  | "submitted"
  | "evaluated"
  | "viva"
  | "completed";

export interface PatientProfile {
  age: number;
  sex: string;
  occupation: string;
  presenting_complaint: string;
  vitals: Record<string, string>;
  socioeconomic_context?: string;
}

export interface ClinicalCaseSummary {
  id: string;
  specialty: string;
  difficulty: ClinicalDifficulty;
  diagnosis: string;
  tags: string[];
  created_at: string;
  age?: number;
  sex?: string;
  presenting_complaint?: string;
}

export interface ClinicalCase {
  id: string;
  specialty: string;
  difficulty: ClinicalDifficulty;
  patient_profile: PatientProfile;
  hidden_findings?: Record<string, unknown>;  // only returned after submission
  diagnosis?: string;
  differentials?: string[];
  viva_questions?: Array<{
    question: string;
    model_answer: string;
    key_points: string[];
  }>;
  tags: string[];
}

export interface ConversationTurn {
  role: "student" | "patient";
  content: string;
}

export interface ExaminationResult {
  system: string;
  findings: string;
  key_used: string;
}

export interface DiagnosticReasoningDiff {
  differential: string;
  key_differentiator: string;
  distinguishing_feature: string;
}

export interface DiagnosticReasoning {
  primary_diagnosis: string;
  supporting_features: string[];
  against_features: string[];
  favored_over: DiagnosticReasoningDiff[];
}

export interface ClinicalRedFlag {
  flag: string;
  significance: string;
}

export interface ClinicalRedFlags {
  present: ClinicalRedFlag[];
  absent_and_important: ClinicalRedFlag[];
}

export interface MissingFinding {
  category: string;
  finding: string;
  clinical_significance: string;
  suggested_question?: string;
}

export interface ClinicalEvaluation {
  scores: Record<string, number>;
  total_score: number;
  grade: string;
  consultant_summary: string;
  diagnostic_reasoning?: DiagnosticReasoning;
  clinical_red_flags?: ClinicalRedFlags;
  strengths: string[];
  missing_findings: MissingFinding[];
  diagnosis_correct: boolean;
  provisional_diagnosis_given: string;
  feedback_per_section: Record<string, string>;
  overall_feedback: string;
}

export interface VivaAnswerResult {
  score: number;
  max_score: number;
  correct_points_covered: string[];
  missed_points: string[];
  feedback: string;
  model_answer_reveal: string;
  question_index: number;
  next_question: string | null;
  next_question_index: number | null;
  completed: boolean;
}

export interface SessionListItem {
  id: string;
  case_id: string;
  status: ClinicalStatus;
  score: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface ClinicalSession {
  id: string;
  user_id: string;
  case_id: string;
  status: ClinicalStatus;
  conversation: ConversationTurn[];
  case_sheet: Record<string, string>;
  evaluation: ClinicalEvaluation | null;
  viva_log: Array<{ question_index: number; question: string; student_answer: string; evaluation: unknown }>;
  score: number | null;
  revealed_systems: string[];
  /** Revealed examination findings keyed by system — populated by the backend from revealed_systems. */
  examination_findings: Record<string, string>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  case: {
    id: string;
    specialty: string;
    difficulty: ClinicalDifficulty;
    patient_profile: PatientProfile;
    diagnosis: string | null;
    differentials: string[] | null;
    /** Returned only when status is viva or completed — enables frontend to restore viva question index. */
    viva_questions: Array<{ question: string; model_answer: string; key_points: string[] }> | null;
  };
}

// ── API functions ──────────────────────────────────────────────────────────────

export async function getSpecialties(token: string): Promise<string[]> {
  const res = await fetch(`${apiBase}/api/v1/clinical/specialties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch specialties");
  const payload = (await res.json()) as ApiEnvelope<string[]>;
  return payload.data;
}

export async function listCases(
  token: string,
  params?: { specialty?: string; difficulty?: string; limit?: number; offset?: number },
): Promise<ClinicalCaseSummary[]> {
  const url = new URL(`${apiBase}/api/v1/clinical/cases`);
  if (params?.specialty) url.searchParams.set("specialty", params.specialty);
  if (params?.difficulty) url.searchParams.set("difficulty", params.difficulty);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.offset) url.searchParams.set("offset", String(params.offset));

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch cases");
  const payload = (await res.json()) as ApiEnvelope<ClinicalCaseSummary[]>;
  return payload.data;
}

export async function generateCase(
  token: string,
  data: { specialty: string; difficulty: ClinicalDifficulty; custom_instruction?: string },
): Promise<ClinicalCase> {
  const res = await fetch(`${apiBase}/api/v1/clinical/cases/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail?.message ?? "Failed to generate case");
  }
  const payload = (await res.json()) as ApiEnvelope<ClinicalCase>;
  return payload.data;
}

export async function startSession(token: string, caseId: string): Promise<ClinicalSession> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ case_id: caseId }),
  });
  if (!res.ok) throw new Error("Failed to start session");
  const payload = (await res.json()) as ApiEnvelope<ClinicalSession>;
  return payload.data;
}

export async function getSession(token: string, sessionId: string): Promise<ClinicalSession> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch session");
  const payload = (await res.json()) as ApiEnvelope<ClinicalSession>;
  return payload.data;
}

export async function listSessions(token: string): Promise<SessionListItem[]> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const payload = (await res.json()) as ApiEnvelope<SessionListItem[]>;
  return payload.data;
}

/** Patient respond — SSE stream. Yields text chunks. */
export async function* streamPatientResponse(
  token: string,
  sessionId: string,
  studentMessage: string,
): AsyncGenerator<string> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ student_message: studentMessage }),
  });
  if (!res.ok || !res.body) throw new Error("Failed to stream patient response");

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
      if (data === "[CLINICAL_STREAM_END]") return;
      try { yield JSON.parse(data) as string; }
      catch { if (data) yield data; }
    }
  }
}

export async function requestExamination(
  token: string,
  sessionId: string,
  system: string,
): Promise<ExaminationResult> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}/examine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ system }),
  });
  if (!res.ok) throw new Error("Failed to examine system");
  const payload = (await res.json()) as ApiEnvelope<ExaminationResult>;
  return payload.data;
}

export async function submitCaseSheet(
  token: string,
  sessionId: string,
  caseSheet: Record<string, unknown>,
): Promise<ClinicalSession> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ case_sheet: caseSheet }),
  });
  if (!res.ok) throw new Error("Failed to submit case sheet");
  const payload = (await res.json()) as ApiEnvelope<ClinicalSession>;
  return payload.data;
}

export async function startViva(token: string, sessionId: string): Promise<{ question: string; question_index: number; total_questions: number }> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}/viva`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to start viva");
  const payload = (await res.json()) as ApiEnvelope<{ question: string; question_index: number; total_questions: number }>;
  return payload.data;
}

export async function answerVivaQuestion(
  token: string,
  sessionId: string,
  answer: string,
  questionIndex: number,
): Promise<VivaAnswerResult> {
  const res = await fetch(`${apiBase}/api/v1/clinical/sessions/${sessionId}/viva/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answer, question_index: questionIndex }),
  });
  if (!res.ok) throw new Error("Failed to submit viva answer");
  const payload = (await res.json()) as ApiEnvelope<VivaAnswerResult>;
  return payload.data;
}
