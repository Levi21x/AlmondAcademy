"use client";

import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Brain,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Copy,
  Eye,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  answerVivaQuestion,
  generateCase,
  getSession,
  listCases,
  listSessions,
  requestExamination,
  startSession,
  startViva,
  streamPatientResponse,
  submitCaseSheet,
  type ClinicalCaseSummary,
  type ClinicalDifficulty,
  type ClinicalEvaluation,
  type ClinicalRedFlag,
  type ClinicalSession,
  type ClinicalStatus,
  type ConversationTurn,
  type DiagnosticReasoningDiff,
  type ExaminationResult,
  type MissingFinding,
  type SessionListItem,
  type VivaAnswerResult,
} from "@/lib/api/clinical.api";

// ── Constants ─────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  "General Medicine",
  "Surgery",
  "Pediatrics",
  "Obstetrics & Gynaecology",
  "Psychiatry",
  "Orthopaedics",
  "Dermatology",
  "ENT",
];

const EXAMINATION_SYSTEMS = [
  { key: "general",     label: "General Examination" },
  { key: "cvs",        label: "Cardiovascular" },
  { key: "respiratory", label: "Respiratory" },
  { key: "abdomen",    label: "Abdomen / GIT" },
  { key: "cns",        label: "Neurological" },
  { key: "local",      label: "Local / Specific" },
];

const CASE_SHEET_SECTIONS = [
  { key: "chief_complaints",    label: "Chief Complaints" },
  { key: "hopi",               label: "History of Present Illness" },
  { key: "past_history",       label: "Past Medical History" },
  { key: "family_history",     label: "Family History" },
  { key: "personal_history",   label: "Personal & Social History" },
  { key: "drug_history",       label: "Drug History" },
  { key: "general_examination",label: "General Examination" },
  { key: "systemic_examination",label: "Systemic Examination" },
  { key: "provisional_diagnosis", label: "Provisional Diagnosis" },
  { key: "differentials",      label: "Differential Diagnoses" },
  { key: "investigations",     label: "Investigations Ordered" },
  { key: "management",         label: "Management Plan" },
];

const DIFFICULTY_STYLES: Record<ClinicalDifficulty, { label: string; color: string; bg: string }> = {
  basic:        { label: "Basic",        color: "#a8c8a5", bg: "rgba(168,200,165,0.1)" },
  intermediate: { label: "Intermediate", color: "#d5c5a8", bg: "rgba(213,197,168,0.1)" },
  advanced:     { label: "Advanced",     color: "#e4b4a0", bg: "rgba(228,180,160,0.1)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: ClinicalDifficulty }) {
  const s = DIFFICULTY_STYLES[difficulty];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em]"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="aa-typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

// ── Case Selector ─────────────────────────────────────────────────────────────

function CaseSelector({
  token,
  onSelect,
  resumeSession,
  onResume,
}: {
  token: string;
  onSelect: (caseId: string) => void;
  resumeSession?: ClinicalSession | null;
  onResume?: () => void;
}) {
  const [cases, setCases] = useState<ClinicalCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genSpecialty, setGenSpecialty] = useState("General Medicine");
  const [genDifficulty, setGenDifficulty] = useState<ClinicalDifficulty>("basic");
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCases(token, {
        specialty: filterSpecialty || undefined,
        difficulty: filterDifficulty || undefined,
        limit: 30,
      });
      setCases(rows);
    } catch { setCases([]); }
    finally { setLoading(false); }
  }, [token, filterSpecialty, filterDifficulty]);

  useEffect(() => { void load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const c = await generateCase(token, {
        specialty: genSpecialty,
        difficulty: genDifficulty,
      });
      setShowGenPanel(false);
      onSelect(c.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  return (
    <div className="aa-anim-fade-up space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#4c463d]"
            style={{ background: "rgba(213,197,168,0.06)" }}
          >
            <Stethoscope size={16} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
          </div>
          <div>
            <h2 className="aa-h2 text-[var(--aa-text-1)]">Clinical Mode</h2>
            <p className="text-xs" style={{ color: "var(--aa-text-3)" }}>
              Virtual ward · Patient simulation · Viva practice
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGenPanel(true)}
          className="aa-press flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]"
        >
          <Plus size={14} strokeWidth={2.5} />
          Generate Case
        </button>
      </div>

      {/* Resume banner — shown when user navigated back from an active session */}
      {resumeSession && onResume && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="flex items-center justify-between gap-4 rounded-2xl border border-[#4c463d] bg-gradient-to-r from-[#1e1b17] to-[#161616] px-5 py-4"
        >
          <div className="min-w-0">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-amber)" }}>
              Session in progress
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-[#e5e2e1]">
              {resumeSession.case.specialty} · {resumeSession.case.difficulty}
              {resumeSession.case.diagnosis ? ` — ${resumeSession.case.diagnosis}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[#8f887e]">
              Status: {resumeSession.status.replace("_", " ")}
              {resumeSession.conversation?.length
                ? ` · ${resumeSession.conversation.length} turns taken`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="aa-press shrink-0 flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-4 py-2.5 text-sm font-semibold text-[#2e2618]"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
            Resume
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="aa-input rounded-xl text-xs"
        >
          <option value="">All specialties</option>
          {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="aa-input rounded-xl text-xs"
        >
          <option value="">All difficulties</option>
          <option value="basic">Basic</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Cases grid — taste-skill asymmetric layout */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aa-skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[#353534] bg-[#131313] py-16">
          <Stethoscope size={28} strokeWidth={1.5} className="text-[#8f887e]" />
          <p className="text-sm text-[#8f887e]">
            No cases yet. Generate one to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowGenPanel(true)}
            className="aa-press rounded-xl bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]"
          >
            Generate First Case
          </button>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {cases.map((c) => (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className="aa-press group rounded-2xl border border-[#353534] bg-[#1f1f1f] p-5 text-left transition-colors hover:border-[#4c463d]"
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em]"
                    style={{ background: "rgba(213,197,168,0.08)", color: "var(--aa-amber)" }}
                  >
                    {c.specialty}
                  </span>
                  <DifficultyBadge difficulty={c.difficulty} />
                </div>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-[#4c463d] transition-colors group-hover:text-[#8f887e]"
                />
              </div>
              <p className="text-sm font-semibold text-[#e5e2e1]">{c.diagnosis}</p>
              {c.presenting_complaint && (
                <p className="mt-1 text-xs text-[#8f887e] line-clamp-2">
                  {c.age && `${c.age}y `}{c.sex && `${c.sex} · `}{c.presenting_complaint}
                </p>
              )}
              {c.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#353534] px-2 py-0.5 text-[0.58rem] text-[#8f887e]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {error && (
        <p className="text-sm text-[#e4b4a0]">
          <X size={12} strokeWidth={2} className="mr-1 inline-block" />
          {error}
        </p>
      )}

      {/* Generate panel modal */}
      <AnimatePresence>
        {showGenPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-2xl border border-[#4c463d] bg-[#1f1f1f] p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold text-[#fff2de]">Generate Case</h3>
                <button type="button" onClick={() => setShowGenPanel(false)} className="rounded-md p-1 text-[#8f887e]">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs text-[#cec5b9]">Specialty</span>
                  <select
                    value={genSpecialty}
                    onChange={(e) => setGenSpecialty(e.target.value)}
                    className="aa-input w-full rounded-xl text-sm"
                  >
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <div>
                  <span className="mb-2 block text-xs text-[#cec5b9]">Difficulty</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["basic", "intermediate", "advanced"] as ClinicalDifficulty[]).map((d) => {
                      const style = DIFFICULTY_STYLES[d];
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setGenDifficulty(d)}
                          className={`aa-press rounded-xl border py-2 text-xs font-medium capitalize transition-colors ${
                            genDifficulty === d
                              ? "border-[#4c463d] bg-[#2a2520] text-[#fff2de]"
                              : "border-[#353534] text-[#8f887e]"
                          }`}
                          style={genDifficulty === d ? { borderColor: style.color, color: style.color } : {}}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenPanel(false)}
                  className="flex-1 rounded-xl border border-[#4c463d] py-2.5 text-sm text-[#cec5b9]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating}
                  className="aa-press flex-1 rounded-xl bg-[#d5c5a8] py-2.5 text-sm font-semibold text-[#2e2618] disabled:opacity-60"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Evaluation sub-components ─────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="aa-press flex items-center gap-1.5 rounded-lg border border-[#4c463d] px-2.5 py-1.5 text-xs transition-colors hover:border-[#d5c5a8]/40 hover:text-[#fff2de]"
      style={{ color: copied ? "#a8c8a5" : "var(--aa-text-3)" }}
    >
      <Copy size={11} strokeWidth={2} />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ConsultantSummaryCard({ summary }: { summary: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#4c463d] bg-gradient-to-br from-[#1e1b17] to-[#161616]">
      {/* Left accent stripe mimicking medical notes paper */}
      <div className="flex">
        <div className="w-1 shrink-0 bg-[#d5c5a8]" />
        <div className="flex-1 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--aa-text-3)" }}>
                Consultant Presentation Summary
              </p>
            </div>
            <CopyButton text={summary} />
          </div>
          <p className="text-sm leading-[1.8] text-[#e5e2e1]">{summary}</p>
          <p className="mt-3 text-[0.6rem] text-[#4c463d]">
            Use this verbatim during ward rounds or case presentations.
          </p>
        </div>
      </div>
    </div>
  );
}

function DiagnosticReasoningPanel({ reasoning }: { reasoning: NonNullable<ClinicalEvaluation["diagnostic_reasoning"]> }) {
  const { primary_diagnosis, supporting_features = [], against_features = [], favored_over = [] } = reasoning;
  return (
    <div className="rounded-2xl border border-[#353534] bg-[#1a1a1a] p-5">
      <p className="mb-4 text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--aa-text-3)" }}>
        Diagnostic Reasoning
      </p>

      {/* Primary diagnosis + evidence */}
      <div className="mb-4 rounded-xl border border-[#4c463d] bg-[#1f1f1f] p-4">
        <p className="mb-2 text-xs font-semibold text-[#d5c5a8]">{primary_diagnosis}</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {supporting_features.length > 0 && (
            <div>
              <p className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#a8c8a5]">
                Supporting Features
              </p>
              <ul className="space-y-1">
                {supporting_features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#cec5b9]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#a8c8a5]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {against_features.filter((f) => f && f.toLowerCase() !== "none significant").length > 0 && (
            <div>
              <p className="mb-1.5 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[#e4b4a0]">
                Considerations Against
              </p>
              <ul className="space-y-1">
                {against_features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#8f887e]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#e4b4a0]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Differential comparison — no card, use dividers (taste-skill anti-card rule) */}
      {favored_over.length > 0 && (
        <div>
          <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[#8f887e]">
            Favored over differentials
          </p>
          <div className="divide-y divide-[#353534]">
            {favored_over.map((diff: DiagnosticReasoningDiff, i: number) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start gap-2">
                  <span className="rounded px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-[#8f887e]"
                        style={{ background: "rgba(76,70,61,0.4)" }}>
                    {diff.differential}
                  </span>
                  <span className="text-[0.6rem] text-[#4c463d]">→</span>
                  <span className="flex-1 text-xs text-[#cec5b9]">{diff.key_differentiator}</span>
                </div>
                {diff.distinguishing_feature && (
                  <p className="mt-1 pl-2 text-[0.62rem] text-[#8f887e]">
                    Key finding: {diff.distinguishing_feature}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicalRedFlagsPanel({ flags }: { flags: NonNullable<ClinicalEvaluation["clinical_red_flags"]> }) {
  const { present = [], absent_and_important = [] } = flags;
  if (present.length === 0 && absent_and_important.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Present red flags */}
      <div className="rounded-xl border border-[#7a3f30] bg-[#1f1613] p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle size={13} strokeWidth={2} className="text-[#e4b4a0]" />
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#e4b4a0]">
            Red Flags Present
          </p>
        </div>
        {present.length === 0 ? (
          <p className="text-xs text-[#8f887e]">No red flags identified in this case.</p>
        ) : (
          <motion.ul
            className="space-y-2.5"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {present.map((f: ClinicalRedFlag, i: number) => (
              <motion.li
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -6 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
                }}
                className="rounded-lg border border-[#5a2f2a] bg-[#2c1d1b] px-3 py-2"
              >
                <p className="text-xs font-semibold text-[#ffb4ab]">{f.flag}</p>
                <p className="mt-0.5 text-[0.62rem] text-[#8f887e]">{f.significance}</p>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>

      {/* Absent but important — reassurance */}
      <div className="rounded-xl border border-[#2a4a2e] bg-[#131a13] p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={13} strokeWidth={2} className="text-[#a8c8a5]" />
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#a8c8a5]">
            Ruled Out — Absent Signs
          </p>
        </div>
        {absent_and_important.length === 0 ? (
          <p className="text-xs text-[#8f887e]">No specific absent signs noted.</p>
        ) : (
          <motion.ul
            className="space-y-2.5"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {absent_and_important.map((f: ClinicalRedFlag, i: number) => (
              <motion.li
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -6 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
                }}
                className="rounded-lg border border-[#2a4a2e] bg-[#1a2e1a] px-3 py-2"
              >
                <p className="text-xs font-semibold text-[#a8c8a5]">{f.flag}</p>
                <p className="mt-0.5 text-[0.62rem] text-[#8f887e]">{f.significance}</p>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}

function MissingFindingsPanel({ findings }: { findings: MissingFinding[] }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className="rounded-2xl border border-[#353534] bg-[#1a1a1a] p-5">
      <p className="mb-4 text-[0.62rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--aa-text-3)" }}>
        Missing Findings — What You Forgot to Ask
      </p>
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {findings.map((f: MissingFinding, i: number) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
            }}
            className="rounded-xl border border-[#353534] bg-[#131313] p-4"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]"
                style={{ background: "rgba(228,180,160,0.1)", color: "#e4b4a0" }}
              >
                {f.category}
              </span>
              <p className="text-sm font-medium text-[#e5e2e1]">{f.finding}</p>
            </div>
            <p className="mb-2.5 text-xs text-[#8f887e]">{f.clinical_significance}</p>

            {/* Suggested question — speech bubble styling */}
            {f.suggested_question && (
              <div className="relative ml-4 mt-2">
                <div
                  className="rounded-xl rounded-tl-none border border-[#4c463d] bg-[#1f1f1f] px-3 py-2 text-xs text-[#cec5b9]"
                >
                  <span className="mr-1.5 font-semibold" style={{ color: "var(--aa-amber)" }}>Ask:</span>
                  &ldquo;{f.suggested_question}&rdquo;
                </div>
                {/* Speech bubble tail */}
                <div
                  className="absolute -left-1.5 top-2 h-3 w-3 border-b border-l border-[#4c463d] bg-[#1f1f1f]"
                  style={{ transform: "rotate(45deg)" }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function EvaluationTab({
  eval_data,
  hasViva,
  onStartViva,
}: {
  eval_data: ClinicalEvaluation;
  hasViva: boolean;
  onStartViva: () => void;
}) {
  const RUBRIC_MAX: Record<string, number> = {
    hpi_accuracy: 15, completeness: 20, clinical_reasoning: 20,
    differentials: 15, investigations: 15, management: 15,
  };

  return (
    <motion.div
      key="evaluation"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      className="space-y-5"
    >
      {/* 1. Consultant Summary — full width, prominent */}
      <ConsultantSummaryCard summary={eval_data.consultant_summary} />

      {/* 2. Score + Strengths — asymmetric */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#4c463d] bg-[#1f1f1f] p-6">
          <p className="mb-1 text-[0.58rem] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--aa-text-3)" }}>
            Score
          </p>
          <p className="font-headline text-5xl font-black text-[#fff2de]">{eval_data.total_score}</p>
          <p className="text-lg font-bold" style={{ color: "var(--aa-amber)" }}>{eval_data.grade}</p>
          <span
            className="mt-2 rounded-full px-2.5 py-1 text-[0.6rem] font-semibold"
            style={{
              background: eval_data.diagnosis_correct ? "rgba(168,200,165,0.12)" : "rgba(228,180,160,0.12)",
              color: eval_data.diagnosis_correct ? "#a8c8a5" : "#e4b4a0",
            }}
          >
            {eval_data.diagnosis_correct ? "Correct dx" : "Incorrect dx"}
          </span>
        </div>
        <div className="space-y-3">
          {/* Rubric bars */}
          <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-4">
            <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
              Score Breakdown
            </p>
            <div className="space-y-2.5">
              {Object.entries(eval_data.scores ?? {}).map(([key, score]) => {
                const max = RUBRIC_MAX[key] ?? 15;
                const pct = Math.round((score / max) * 100);
                const label = key.split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
                const feedback = eval_data.feedback_per_section?.[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[#cec5b9]">{label}</span>
                      <span className="font-medium text-[#e5e2e1]">{score}/{max}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#353534]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: pct >= 70 ? "#a8c8a5" : pct >= 50 ? "#d5c5a8" : "#e4b4a0" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    {feedback && (
                      <p className="mt-0.5 text-[0.6rem] text-[#8f887e]">{feedback}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths */}
          {eval_data.strengths?.length > 0 && (
            <div className="rounded-xl border border-[#2a4a2e] bg-[#131a13] px-4 py-3">
              <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[#a8c8a5]">
                Strengths
              </p>
              <ul className="space-y-1">
                {eval_data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#a8c8a5]">
                    <CheckCircle size={11} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 3. Diagnostic Reasoning */}
      {eval_data.diagnostic_reasoning && (
        <DiagnosticReasoningPanel reasoning={eval_data.diagnostic_reasoning} />
      )}

      {/* 4. Clinical Red Flags */}
      {eval_data.clinical_red_flags && (
        <ClinicalRedFlagsPanel flags={eval_data.clinical_red_flags} />
      )}

      {/* 5. Missing Findings */}
      <MissingFindingsPanel findings={eval_data.missing_findings ?? []} />

      {/* 6. Overall feedback */}
      {eval_data.overall_feedback && (
        <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] px-4 py-3">
          <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
            Overall Feedback
          </p>
          <p className="text-sm leading-relaxed text-[#cec5b9]">{eval_data.overall_feedback}</p>
        </div>
      )}

      {/* 7. Start Viva CTA */}
      {!hasViva && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onStartViva}
            className="aa-press flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-6 py-3 text-sm font-semibold text-[#2e2618]"
          >
            <Brain size={14} strokeWidth={2.5} />
            Proceed to Viva
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ── Active Session ─────────────────────────────────────────────────────────────

type SessionInternalTab = "history" | "examination" | "case_sheet" | "evaluation" | "viva";

function ActiveSession({
  session: initialSession,
  token,
  onBack,
}: {
  session: ClinicalSession;
  token: string;
  onBack: () => void;
}) {
  const [session, setSession] = useState<ClinicalSession>(initialSession);

  // ── Restore tab from status ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SessionInternalTab>(() => {
    const map: Record<ClinicalStatus, SessionInternalTab> = {
      history_taking: "history",
      examination:    "examination",
      case_sheet:     "case_sheet",
      submitted:      "evaluation",
      evaluated:      "evaluation",
      viva:           "viva",
      completed:      "viva",
    };
    return map[initialSession.status] ?? "history";
  });

  const [conversation, setConversation] = useState<ConversationTurn[]>(
    initialSession.conversation ?? [],
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");

  // ── Restore examination findings already revealed ────────────────────────────
  const [examinationResults, setExaminationResults] = useState<ExaminationResult[]>(() =>
    Object.entries(initialSession.examination_findings ?? {}).map(([key, findings]) => ({
      system: key,
      findings,
      key_used: key,
    })),
  );

  // ── Restore case sheet the student was writing ───────────────────────────────
  const [caseSheet, setCaseSheet] = useState<Record<string, string>>(() => {
    const saved = initialSession.case_sheet ?? {};
    return Object.fromEntries(
      CASE_SHEET_SECTIONS.map((s) => [s.key, String(saved[s.key] ?? "")]),
    );
  });

  const [submitting, setSubmitting] = useState(false);

  // ── Restore viva question index ──────────────────────────────────────────────
  const [vivaData, setVivaData] = useState<{
    currentQuestion: string;
    questionIndex: number;
    total: number;
  } | null>(() => {
    if (!["viva", "completed"].includes(initialSession.status)) return null;
    const vqs = initialSession.case?.viva_questions ?? [];
    const nextIndex = initialSession.viva_log?.length ?? 0;
    if (nextIndex < vqs.length && vqs[nextIndex]) {
      return {
        currentQuestion: vqs[nextIndex].question,
        questionIndex: nextIndex,
        total: vqs.length,
      };
    }
    return null;
  });
  const [vivaAnswer, setVivaAnswer] = useState("");
  const [vivaResult, setVivaResult] = useState<VivaAnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, streamBuffer]);

  // Derive tab availability from status
  const status = session.status;
  const canExamine = ["history_taking", "examination"].includes(status);
  const canFillSheet = ["history_taking", "examination", "case_sheet"].includes(status);
  const canSubmit = canFillSheet;
  const hasEval = ["evaluated", "viva", "completed"].includes(status);
  const hasViva = ["viva", "completed"].includes(status);

  const patientProfile = session.case.patient_profile;
  const specialty = session.case.specialty;
  const difficulty = session.case.difficulty;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    const studentTurn: ConversationTurn = { role: "student", content: text };
    setConversation((prev) => [...prev, studentTurn]);
    setInput("");
    setIsStreaming(true);
    setStreamBuffer("");
    setError(null);

    let accumulated = "";
    try {
      for await (const chunk of streamPatientResponse(token, session.id, text)) {
        accumulated += chunk;
        setStreamBuffer(accumulated);
      }
      const patientTurn: ConversationTurn = { role: "patient", content: accumulated };
      setConversation((prev) => [...prev, patientTurn]);
      setStreamBuffer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patient response failed");
    } finally {
      setIsStreaming(false);
    }
  };

  const examineSystem = async (system: string) => {
    if (!canExamine) return;
    try {
      const result = await requestExamination(token, session.id, system);
      setExaminationResults((prev) => {
        const exists = prev.some((r) => r.key_used === result.key_used);
        return exists ? prev : [...prev, result];
      });
      setActiveTab("examination");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Examination failed");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitCaseSheet(token, session.id, caseSheet);
      setSession(updated);
      setActiveTab("evaluation");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally { setSubmitting(false); }
  };

  const handleStartViva = async () => {
    try {
      const viva = await startViva(token, session.id);
      setVivaData({
        currentQuestion: viva.question,
        questionIndex: viva.question_index,
        total: viva.total_questions,
      });
      setActiveTab("viva");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start viva");
    }
  };

  const handleVivaAnswer = async () => {
    if (!vivaData || !vivaAnswer.trim()) return;
    try {
      const result = await answerVivaQuestion(token, session.id, vivaAnswer.trim(), vivaData.questionIndex);
      setVivaResult(result);
      setVivaAnswer("");
      if (!result.completed && result.next_question) {
        setVivaData({
          currentQuestion: result.next_question,
          questionIndex: result.next_question_index ?? vivaData.questionIndex + 1,
          total: vivaData.total,
        });
        setVivaResult(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Viva answer failed");
    }
  };

  const TABS: Array<{ key: SessionInternalTab; label: string; icon: React.ElementType; disabled?: boolean }> = [
    { key: "history",    label: "History",    icon: Mic },
    { key: "examination", label: "Examine",   icon: Stethoscope, disabled: false },
    { key: "case_sheet", label: "Case Sheet", icon: ClipboardList, disabled: !canFillSheet },
    { key: "evaluation", label: "Evaluation", icon: CheckCircle, disabled: !hasEval },
    { key: "viva",       label: "Viva",       icon: Brain, disabled: !hasViva && !hasEval },
  ];

  const eval_data = session.evaluation as ClinicalEvaluation | null;

  return (
    <div className="space-y-4">
      {/* Back + case info */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="aa-press mt-1 rounded-lg border border-[#4c463d] p-2 text-[#8f887e] hover:text-[#cec5b9]"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <div className="flex-1 overflow-hidden rounded-2xl border border-[#4c463d] bg-[#1f1f1f] px-5 py-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em]"
              style={{ background: "rgba(213,197,168,0.08)", color: "var(--aa-amber)" }}
            >
              {specialty}
            </span>
            <DifficultyBadge difficulty={difficulty} />
            <span
              className="rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em]"
              style={{
                background:
                  status === "completed"
                    ? "rgba(168,200,165,0.1)"
                    : "rgba(213,197,168,0.07)",
                color: status === "completed" ? "#a8c8a5" : "var(--aa-text-3)",
              }}
            >
              {status.replace("_", " ")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <User size={13} strokeWidth={2} className="text-[#8f887e]" />
              <span className="text-sm text-[#e5e2e1]">
                {patientProfile.age}y {patientProfile.sex}
                {patientProfile.occupation ? `, ${patientProfile.occupation}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={13} strokeWidth={2} className="text-[#8f887e]" />
              <span className="text-sm text-[#cec5b9]">{patientProfile.presenting_complaint}</span>
            </div>
          </div>
          {/* Vitals row */}
          {patientProfile.vitals && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(patientProfile.vitals).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-lg border border-[#353534] bg-[#131313] px-2 py-1 text-[0.62rem] text-[#cec5b9]"
                >
                  <span className="text-[#8f887e]">{k}: </span>{v}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar flex overflow-x-auto border-b border-[#353534]">
        {TABS.map(({ key, label, icon: Icon, disabled }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && setActiveTab(key)}
              disabled={disabled}
              className="aa-press flex shrink-0 items-center gap-1.5 px-4 py-3 text-[0.75rem] font-medium transition-colors disabled:opacity-30"
              style={{
                borderBottom: isActive ? "2px solid var(--aa-amber)" : "2px solid transparent",
                color: isActive ? "var(--aa-amber)" : "var(--aa-text-3)",
                fontWeight: isActive ? 700 : 500,
                marginBottom: -1,
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.2 : 1.9} />
              {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ── History Taking ── */}
        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-3"
          >
            {/* Examination systems quick access */}
            {canExamine && (
              <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-3">
                <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
                  Request Examination
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMINATION_SYSTEMS.map((sys) => {
                    const done = examinationResults.some((r) => r.key_used === sys.key);
                    return (
                      <button
                        key={sys.key}
                        type="button"
                        onClick={() => void examineSystem(sys.key)}
                        className={`aa-press rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          done
                            ? "border-[#4c463d] bg-[#2a2520] text-[#d5c5a8]"
                            : "border-[#353534] bg-[#131313] text-[#8f887e] hover:border-[#4c463d] hover:text-[#cec5b9]"
                        }`}
                      >
                        {done && <CheckCircle size={10} strokeWidth={2} className="mr-1 inline-block text-[#a8c8a5]" />}
                        {sys.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat interface */}
            <div
              className="flex flex-col rounded-2xl border border-[#353534] bg-[#131313]"
              style={{ minHeight: 380 }}
            >
              <div className="flex items-center gap-2 border-b border-[#353534] px-4 py-2.5">
                <User size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                  Patient Encounter
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {conversation.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <User size={24} strokeWidth={1.5} className="text-[#4c463d]" />
                    <p className="text-sm text-[#8f887e]">
                      Greet the patient and begin taking history.
                    </p>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        "Good morning. What brings you in today?",
                        "How long have you had this problem?",
                        "Can you describe the pain?",
                        "Any relevant medical history?",
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setInput(s); }}
                          className="rounded-xl border border-[#353534] bg-[#1f1f1f] px-3 py-2 text-left text-xs text-[#cec5b9] hover:border-[#4c463d]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {conversation.map((turn, i) => (
                  <div
                    key={i}
                    className={`flex ${turn.role === "student" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        turn.role === "student"
                          ? "rounded-br-md border border-[#4c463d] bg-[#2a2520] text-[#e5e2e1]"
                          : "rounded-tl-md border border-[#353534] bg-[#1f1f1f] text-[#cec5b9]"
                      }`}
                    >
                      {turn.role === "patient" && (
                        <p className="mb-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#8f887e]">
                          Patient
                        </p>
                      )}
                      {turn.content}
                    </div>
                  </div>
                ))}

                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-[#353534] bg-[#1f1f1f] px-4 py-3 text-sm text-[#cec5b9]">
                      <p className="mb-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#8f887e]">
                        Patient
                      </p>
                      {streamBuffer ? (
                        <>
                          {streamBuffer}
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#d5c5a8]" />
                        </>
                      ) : (
                        <TypingDots />
                      )}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-[#353534] p-3">
                <div className="flex items-end gap-2 rounded-xl border border-[#4c463d] bg-[#1f1f1f] px-3 py-2 focus-within:border-[rgba(213,197,168,0.35)]">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
                    }}
                    disabled={isStreaming || status !== "history_taking"}
                    placeholder={
                      status === "history_taking"
                        ? "Ask the patient a question..."
                        : "History taking phase ended"
                    }
                    className="flex-1 resize-none bg-transparent text-sm text-[#e5e2e1] placeholder-[#4c463d] outline-none"
                    style={{ maxHeight: 120 }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!input.trim() || isStreaming || status !== "history_taking"}
                    className="aa-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
                    style={{ background: "var(--aa-amber)" }}
                    aria-label="Send"
                  >
                    <Send size={12} strokeWidth={2.5} style={{ color: "#131313" }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Advance to case sheet button */}
            {status === "history_taking" && conversation.length >= 4 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("case_sheet")}
                  className="aa-press flex items-center gap-2 rounded-xl border border-[#4c463d] bg-[#1f1f1f] px-4 py-2 text-sm text-[#cec5b9] hover:text-[#e5e2e1]"
                >
                  Fill Case Sheet
                  <ChevronRight size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Examination ── */}
        {activeTab === "examination" && (
          <motion.div
            key="examination"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {EXAMINATION_SYSTEMS.map((sys) => {
                const result = examinationResults.find((r) => r.key_used === sys.key);
                return (
                  <div key={sys.key} className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {result ? (
                        <CheckCircle size={12} strokeWidth={2} className="text-[#a8c8a5]" />
                      ) : (
                        <Eye size={12} strokeWidth={2} className="text-[#4c463d]" />
                      )}
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.08em]" style={{ color: "var(--aa-text-3)" }}>
                        {sys.label}
                      </p>
                    </div>
                    {result ? (
                      <p className="text-xs leading-relaxed text-[#cec5b9]">{result.findings}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void examineSystem(sys.key)}
                        className="aa-press mt-1 w-full rounded-lg border border-[#353534] bg-[#131313] py-1.5 text-xs text-[#8f887e] hover:border-[#4c463d] hover:text-[#cec5b9]"
                        disabled={!canExamine}
                      >
                        Examine
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {examinationResults.length > 0 && canFillSheet && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab("case_sheet")}
                  className="aa-press flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]"
                >
                  Proceed to Case Sheet
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Case Sheet ── */}
        {activeTab === "case_sheet" && (
          <motion.div
            key="case_sheet"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CASE_SHEET_SECTIONS.map((section) => (
                <label key={section.key} className={`block ${section.key === "hopi" || section.key === "systemic_examination" ? "md:col-span-2" : ""}`}>
                  <span className="mb-1.5 block text-xs text-[#cec5b9]">{section.label}</span>
                  <textarea
                    rows={section.key === "hopi" || section.key === "systemic_examination" ? 4 : 2}
                    value={caseSheet[section.key] ?? ""}
                    onChange={(e) => setCaseSheet((prev) => ({ ...prev, [section.key]: e.target.value }))}
                    disabled={!canSubmit}
                    className="aa-input w-full resize-none rounded-xl text-sm"
                    placeholder={`Enter ${section.label.toLowerCase()}...`}
                  />
                </label>
              ))}
            </div>

            {canSubmit && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="aa-press rounded-xl bg-[#d5c5a8] px-5 py-2.5 text-sm font-semibold text-[#2e2618] disabled:opacity-60"
                >
                  {submitting ? "Submitting & Evaluating..." : "Submit Case Sheet"}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Evaluation ── */}
        {activeTab === "evaluation" && eval_data && (
          <EvaluationTab
            eval_data={eval_data}
            hasViva={hasViva}
            onStartViva={() => void handleStartViva()}
          />
        )}

        {/* ── Viva ── */}
        {activeTab === "viva" && (
          <motion.div
            key="viva"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            {!vivaData && (
              <div className="flex justify-center py-8">
                <button
                  type="button"
                  onClick={() => void handleStartViva()}
                  className="aa-press flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-6 py-3 text-sm font-semibold text-[#2e2618]"
                >
                  <Brain size={14} strokeWidth={2.5} />
                  Begin Viva
                </button>
              </div>
            )}

            {vivaData && (
              <div className="space-y-4">
                {/* Question */}
                <div className="rounded-2xl border border-[#4c463d] bg-[#1f1f1f] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
                      Examiner Question {vivaData.questionIndex + 1}/{vivaData.total}
                    </p>
                    <div className="flex gap-1">
                      {Array.from({ length: vivaData.total }).map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 w-5 rounded-full"
                          style={{
                            background:
                              i < vivaData.questionIndex ? "#a8c8a5" :
                              i === vivaData.questionIndex ? "#d5c5a8" :
                              "#353534",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-base font-semibold text-[#fff2de]">{vivaData.currentQuestion}</p>
                </div>

                {/* Previous answer result */}
                {vivaResult && !vivaResult.completed && (
                  <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#cec5b9]">Examiner feedback</p>
                      <span className="text-sm font-bold" style={{ color: "var(--aa-amber)" }}>
                        {vivaResult.score}/{vivaResult.max_score}
                      </span>
                    </div>
                    <p className="text-sm text-[#cec5b9]">{vivaResult.feedback}</p>
                    {vivaResult.model_answer_reveal && (
                      <div className="mt-2 rounded-lg border border-[#353534] bg-[#131313] px-3 py-2 text-xs text-[#8f887e]">
                        <span className="font-semibold text-[#d5c5a8]">Model answer: </span>
                        {vivaResult.model_answer_reveal}
                      </div>
                    )}
                  </div>
                )}

                {/* Completed */}
                {vivaResult?.completed && (
                  <div className="rounded-2xl border border-[#4c463d] bg-gradient-to-br from-[#1e1a14] to-[#161616] p-6 text-center">
                    <CheckCircle size={32} strokeWidth={1.5} className="mx-auto mb-3 text-[#a8c8a5]" />
                    <p className="font-headline text-xl font-bold text-[#fff2de]">Viva Complete</p>
                    <p className="mt-1 text-sm text-[#cec5b9]">
                      Final score: <span className="font-bold text-[#fff2de]">{session.score ?? "–"}/100</span>
                    </p>
                  </div>
                )}

                {/* Answer input */}
                {!vivaResult?.completed && (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={vivaAnswer}
                      onChange={(e) => setVivaAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="aa-input w-full resize-none rounded-xl text-sm"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleVivaAnswer()}
                        disabled={!vivaAnswer.trim()}
                        className="aa-press flex items-center gap-2 rounded-xl bg-[#d5c5a8] px-5 py-2.5 text-sm font-semibold text-[#2e2618] disabled:opacity-60"
                      >
                        <Send size={13} strokeWidth={2.5} />
                        Submit Answer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-lg border border-[#7a3f30] bg-[#2c1d1b] px-4 py-2.5 text-sm text-[#ffcf9d]">
          <X size={12} strokeWidth={2} className="mr-2 inline-block" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-3 text-[#8f887e]">
            <X size={11} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function ClinicalMode() {
  const fallbackToken = useAuthStore((s) => s.accessToken);
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<ClinicalSession | null>(null);
  // Session the user navigated away from — shown as a "Resume" option in the selector
  const [resumeSession, setResumeSession] = useState<ClinicalSession | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    void (async () => {
      const sb = getSupabaseClient();
      const { data: { session: authSession } } = await sb.auth.getSession();
      const t = authSession?.access_token ?? fallbackToken ?? null;
      setToken(t);

      if (!t) { setInitializing(false); return; }

      // On every mount (including page refresh): find the most recent non-completed session
      // and auto-restore it so no progress is ever lost.
      try {
        const sessions = await listSessions(t);
        const ongoing = sessions.find((s) => s.status !== "completed");
        if (ongoing) {
          const full = await getSession(t, ongoing.id);
          setSession(full);
        }
      } catch {
        // No ongoing session — fresh start
      } finally {
        setInitializing(false);
      }
    })();
  }, [fallbackToken]);

  const handleSelectCase = async (caseId: string) => {
    if (!token) return;
    try {
      const s = await startSession(token, caseId);
      setSession(s);
      setResumeSession(null);
    } catch (e) {
      console.error("Failed to start session", e);
    }
  };

  const handleBack = () => {
    // Remember the session so the user can resume from the selector
    setResumeSession(session);
    setSession(null);
  };

  if (initializing || !token) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm" style={{ color: "var(--aa-text-3)" }}>
        <span className="aa-typing-dot" />
        <span className="aa-typing-dot" style={{ animationDelay: "0.2s" }} />
        <span className="aa-typing-dot" style={{ animationDelay: "0.4s" }} />
        <span className="ml-2">Loading Clinical Mode...</span>
      </div>
    );
  }

  if (session) {
    return (
      <ActiveSession
        session={session}
        token={token}
        onBack={handleBack}
      />
    );
  }

  return (
    <CaseSelector
      token={token}
      onSelect={(id) => void handleSelectCase(id)}
      resumeSession={resumeSession}
      onResume={() => { if (resumeSession) setSession(resumeSession); }}
    />
  );
}
