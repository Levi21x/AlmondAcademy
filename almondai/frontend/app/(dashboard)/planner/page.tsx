"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock3,
  LayoutList,
  Loader2,
  Map,
  Network,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Toast } from "@/components/ui/Toast";
import {
  createExam,
  deleteExam,
  generatePlan,
  getExams,
  getPlan,
  getPlanStatus,
  getTodayPlan,
  replanPlan,
  type CreateExamPayload,
  type ExamType,
  type PlanDay,
  type PlanStatus,
  type PlanTopic,
  type StudyPlan,
  type StudentExam,
  type TodayPlan,
} from "@/lib/api/planner.api";
import { PlanGraph } from "@/components/graph/PlanGraph";
import { SyllabusMapCanvas } from "@/components/syllabus/SyllabusMapCanvas";
import { CrisisContent } from "@/components/crisis/CrisisContent";
import { getSubjects } from "@/lib/api/syllabus.api";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuthStore } from "@/lib/store/authStore";

// ── Types ──────────────────────────────────────────────────────────────────────

type ActiveTab = "map" | "plan" | "crisis" | "clinical";

const examTypeOptions: Array<{ value: ExamType; label: string }> = [
  { value: "university", label: "University Exam" },
  { value: "neet_pg",    label: "NEET-PG" },
  { value: "fmge",       label: "FMGE" },
  { value: "internal",   label: "Internal Assessment" },
  { value: "other",      label: "Other" },
];

function urgencyColor(days: number) {
  if (days < 15) return "text-[#e4b4a0]";
  if (days <= 30) return "text-[#e6c87a]";
  return "text-[#d5c5a8]";
}

function priorityPill(priority: string) {
  if (priority === "high")   return "bg-[#4a3022] text-[#ffccb3]";
  if (priority === "medium") return "bg-[#3a3327] text-[#e6c87a]";
  return "bg-[#2a2b2a] text-[#c3cec3]";
}

function buildTutorPrompt(topic: PlanTopic, day: PlanDay, category: string, minutes: number) {
  const styles: Record<string, string> = {
    survivor:          "in simple, direct bullet points. Focus ONLY on what will appear in the exam.",
    sprinter:          "comprehensively but efficiently. Cover all important aspects with clinical correlations.",
    anxious_grinder:   "step by step, slowly and clearly. Start from basics and build up.",
    passionate:        "in depth with underlying mechanisms and clinical relevance.",
    lost:              "as simply as possible using everyday analogies. Assume I know nothing.",
    strategic_climber: "focusing on NEET-PG high yield points. What are the most tested aspects?",
  };
  const style = styles[category] ?? styles.survivor;
  return `I have ${minutes} minutes to study ${topic.topic} from ${topic.subject}. Day ${day.day} focus: ${day.focus ?? topic.subject}.\n\nExplain ${topic.topic} ${style}\n\n${topic.notes ? `Study note: ${topic.notes}` : ""}\n${topic.exam_tip ? `Exam tip: ${topic.exam_tip}` : ""}`.trim();
}

// ── Tab bar ────────────────────────────────────────────────────────────────────

const TABS: Array<{ key: ActiveTab; label: string; icon: React.ElementType; description: string }> = [
  { key: "map",      label: "Syllabus Map",     icon: Map,      description: "Visual knowledge graph" },
  { key: "plan",     label: "Planner",          icon: Calendar, description: "Adaptive study plan" },
  { key: "crisis",   label: "Crisis Mode",      icon: Zap,      description: "Emergency prep" },
  { key: "clinical", label: "Clinical",         icon: Brain,    description: "Coming soon" },
];

function TabBar({ active, onChange }: { active: ActiveTab; onChange: (t: ActiveTab) => void }) {
  return (
    <div style={{
      display: "flex",
      gap: 0,
      borderBottom: "1px solid rgba(53,53,52,0.85)",
      background: "rgba(15,15,14,0.97)",
      overflowX: "auto",
      flexShrink: 0,
    }}
      className="no-scrollbar"
    >
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        const isSoon = key === "clinical";
        return (
          <button
            key={key}
            type="button"
            className="aa-press"
            disabled={isSoon}
            onClick={() => !isSoon && onChange(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "13px 20px",
              border: "none",
              borderBottom: isActive ? "2px solid var(--aa-amber)" : "2px solid transparent",
              background: "transparent",
              cursor: isSoon ? "default" : "pointer",
              color: isActive ? "var(--aa-amber)" : isSoon ? "rgba(143,136,126,0.4)" : "var(--aa-text-3)",
              fontSize: "0.78rem",
              fontWeight: isActive ? 700 : 500,
              fontFamily: "var(--aa-fb)",
              transition: "color 0.18s, border-color 0.18s",
              whiteSpace: "nowrap",
              flexShrink: 0,
              marginBottom: -1,
            }}
            onMouseEnter={(e) => { if (!isActive && !isSoon) e.currentTarget.style.color = "var(--aa-text-1)"; }}
            onMouseLeave={(e) => { if (!isActive && !isSoon) e.currentTarget.style.color = "var(--aa-text-3)"; }}
          >
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.9} />
            {label}
            {isSoon && (
              <span style={{
                fontSize: "0.52rem", padding: "1px 5px", borderRadius: 100,
                background: "rgba(53,53,52,0.6)", color: "rgba(143,136,126,0.5)",
                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                soon
              </span>
            )}
            {key === "crisis" && !isActive && (
              <span style={{
                fontSize: "0.52rem", padding: "1px 5px", borderRadius: 100,
                background: "rgba(255,207,157,0.08)", border: "1px solid rgba(255,207,157,0.15)",
                color: "#ffcf9d", fontWeight: 700, letterSpacing: "0.04em",
              }}>
                ⚡
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main planner content (Plan tab) ───────────────────────────────────────────

function PlannerContent() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const { data: profile } = useProfile();
  const { isPremium } = useSubscription();

  const [exams, setExams] = useState<StudentExam[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [plansByExamId, setPlansByExamId] = useState<Record<string, StudyPlan>>({});
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [generatingExamId, setGeneratingExamId] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [nearestStatus, setNearestStatus] = useState<PlanStatus | null>(null);
  const [nearestPlanExamId, setNearestPlanExamId] = useState<string | null>(null);
  const [replanningExamId, setReplanningExamId] = useState<string | null>(null);
  const [replanDismissed, setReplanDismissed] = useState(false);
  const [planView, setPlanView] = useState<"list" | "map">("list");

  const [form, setForm] = useState<CreateExamPayload>({
    exam_name: "", exam_date: "", exam_type: "university", subjects: [],
  });

  const tomorrowIso = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  }, []);

  const hasAnyActivePlan = useMemo(() => exams.some((e) => e.has_active_plan), [exams]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void Promise.all([getExams(token), getSubjects(token)])
      .then(([examRows, subjectRows]) => {
        setExams(examRows);
        const profileData = useAuthStore.getState().profile;
        const year = profileData?.current_year;
        const filtered = (year && year >= 1 && year <= 4) ? subjectRows.filter((s) => s.year === year) : subjectRows;
        setSubjects(filtered.map((s) => s.name));
      })
      .catch(() => setError("Failed to load planner data."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const nearestWithPlan = exams.find((e) => e.has_active_plan && !e.is_past) ?? null;
    void getTodayPlan(token).then((d) => { if (!cancelled) setTodayPlan(d); }).catch(() => { if (!cancelled) setTodayPlan(null); });
    if (nearestWithPlan) {
      setNearestPlanExamId(nearestWithPlan.id);
      void getPlanStatus(token, nearestWithPlan.id).then((s) => { if (!cancelled) setNearestStatus(s); }).catch(() => { if (!cancelled) setNearestStatus(null); });
    } else {
      setNearestPlanExamId(null); setNearestStatus(null);
    }
    return () => { cancelled = true; };
  }, [token, exams]);

  const refreshExams = async () => {
    if (!token) return;
    setExams(await getExams(token));
  };

  const onReplan = async (examId: string) => {
    if (!token) return;
    try {
      setReplanningExamId(examId);
      const plan = await replanPlan(token, examId);
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId); setExpandedDays({}); setReplanDismissed(false);
      const [refreshedStatus] = await Promise.all([getPlanStatus(token, examId), refreshExams()]);
      setNearestStatus(refreshedStatus);
      setTodayPlan(await getTodayPlan(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replanning failed.");
    } finally {
      setReplanningExamId(null);
    }
  };

  const toggleSubject = (s: string) =>
    setForm((prev) => ({ ...prev, subjects: prev.subjects.includes(s) ? prev.subjects.filter((x) => x !== s) : [...prev.subjects, s] }));

  const onAddExam = async () => {
    if (!token) return;
    if (!form.exam_name.trim() || !form.exam_date) { setError("Please add exam name and date."); return; }
    try {
      const created = await createExam(token, { exam_name: form.exam_name.trim(), exam_date: form.exam_date, exam_type: form.exam_type, subjects: form.subjects });
      setExams((prev) => [...prev, created].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setIsAddOpen(false);
      setForm({ exam_name: "", exam_date: "", exam_type: "university", subjects: [] });
      setExpandedPlanId(null);
    } catch { setError("Failed to add exam."); }
  };

  const onDeleteExam = async (examId: string) => {
    if (!token) return;
    try {
      await deleteExam(token, examId);
      setExams((prev) => prev.filter((e) => e.id !== examId));
      setPlansByExamId((prev) => { const n = { ...prev }; delete n[examId]; return n; });
      if (expandedPlanId === examId) setExpandedPlanId(null);
    } catch { setError("Failed to delete exam."); }
  };

  const onViewPlan = async (examId: string) => {
    if (!token) return;
    if (expandedPlanId === examId) { setExpandedPlanId(null); return; }
    if (plansByExamId[examId]) { setExpandedPlanId(examId); setExpandedDays({}); return; }
    try {
      setLoadingPlan(examId);
      const plan = await getPlan(token, examId);
      if (!plan) { setError("No active plan found."); setExpandedPlanId(null); return; }
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId); setExpandedDays({});
    } catch { setError("Failed to load plan."); }
    finally { setLoadingPlan(null); }
  };

  const onGeneratePlan = async (examId: string, regenerate: boolean) => {
    if (!token) return;
    try {
      setGeneratingExamId(examId);
      const plan = await generatePlan(token, examId, { regenerate, available_hours_per_day: 6.0 });
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId); setExpandedDays({});
      await refreshExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan generation failed.");
    } finally { setGeneratingExamId(null); }
  };

  const handleAskTutor = (topic: PlanTopic, day: PlanDay) => {
    const category = profile?.student_category ?? "survivor";
    const prompt = buildTutorPrompt(topic, day, category, topic.duration_minutes ?? 60);
    router.push(`/ai-tutor?subject=${encodeURIComponent(topic.subject)}&prefill=${encodeURIComponent(prompt)}&autosend=true`);
  };

  return (
    <div className="aa-anim-fade-up space-y-6 p-6">
      {!isPremium && hasAnyActivePlan && showUpgradePrompt ? (
        <section className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#ffcf9d]">Free plan supports one active study plan. Upgrade for unlimited.</p>
            <div className="flex items-center gap-2">
              <Link href="/upgrade" className="rounded-lg bg-[#fff2de] px-3 py-1.5 text-xs font-semibold text-[#392f1b]">Upgrade</Link>
              <button type="button" onClick={() => setShowUpgradePrompt(false)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">Dismiss</button>
            </div>
          </div>
        </section>
      ) : null}

      {nearestStatus?.replan_recommended && nearestPlanExamId && !replanDismissed ? (
        <section className="rounded-xl border border-[#7a5a30] bg-[#241d12] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#e6c87a]" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-[#ffe1ad]">You&apos;ve drifted off schedule</p>
                <p className="mt-0.5 text-xs text-[#cdbb9a]">{nearestStatus.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void onReplan(nearestPlanExamId)}
                disabled={replanningExamId === nearestPlanExamId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#d5c5a8] px-3 py-1.5 text-xs font-semibold text-[#2e2618] disabled:opacity-60"
              >
                {replanningExamId === nearestPlanExamId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {replanningExamId === nearestPlanExamId ? "Replanning..." : "Replan now"}
              </button>
              <button type="button" onClick={() => setReplanDismissed(true)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">Dismiss</button>
            </div>
          </div>
        </section>
      ) : null}

      {todayPlan?.has_plan && todayPlan.today ? (
        <section className="overflow-hidden rounded-2xl border border-[#353534] bg-gradient-to-br from-[#211d17] to-[#161616] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#d5c5a8]/10 ring-1 ring-[#d5c5a8]/25">
                  <Target className="h-5 w-5 text-[#d5c5a8]" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#d5c5a8]">Today&apos;s focus</p>
                  {todayPlan.nearest_exam ? (
                    <p className="text-xs text-[#b7ada0]">{todayPlan.nearest_exam.exam_name} · {todayPlan.nearest_exam.days_remaining} days left</p>
                  ) : null}
                </div>
              </div>
              <h2 className="mt-3 font-headline text-2xl font-bold text-[#fff2de]">{todayPlan.today.focus}</h2>
              {todayPlan.today.day_goal ? <p className="mt-1 text-sm text-[#b7ada0]">{todayPlan.today.day_goal}</p> : null}
            </div>
            <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#2a2520] px-3 py-1.5 text-sm text-[#d5c5a8]">
              <Clock3 className="h-4 w-4" strokeWidth={1.9} />
              {todayPlan.today.total_hours}h today
            </p>
          </div>
          {todayPlan.today.topics.length > 0 ? (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {todayPlan.today.topics.slice(0, 4).map((topic, idx) => (
                <button
                  key={`${topic.topic}-${idx}`}
                  type="button"
                  onClick={() => todayPlan.today && handleAskTutor(topic, todayPlan.today)}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[#353534] bg-[#1a1a1a] p-3 text-left transition-all hover:border-[#d5c5a8]/45"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#e5e2e1]">{topic.topic}</p>
                    <p className="truncate text-xs text-[#8f887e]">{topic.subject} · {topic.duration_minutes} min</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#4c463d] px-2.5 py-1.5 text-xs text-[#cec5b9] group-hover:border-[#d5c5a8]/50 group-hover:text-[#fff2de]">
                    <Brain size={12} strokeWidth={1.9} />
                    Study
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-[#353534] bg-[#1a1a1a] p-3 text-sm text-[#b7ada0]">
              Revision / buffer day — review your weak areas.
            </p>
          )}
        </section>
      ) : todayPlan && !todayPlan.has_plan && todayPlan.nearest_exam ? (
        <section className="rounded-2xl border border-dashed border-[#353534] bg-[#161616] p-6 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-[#8f887e]" strokeWidth={1.8} />
          <p className="mt-3 text-sm text-[#e5e2e1]">{todayPlan.nearest_exam.exam_name} is in {todayPlan.nearest_exam.days_remaining} days</p>
          <p className="mt-1 text-xs text-[#b7ada0]">Generate a study plan below to unlock your daily focus.</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="aa-h1 text-[var(--aa-text-1)]">My Exams</h1>
          <button type="button" onClick={() => setIsAddOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add Exam
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="aa-skeleton h-28 rounded-xl" />)}</div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#353534] bg-[#131313] p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-[#8f887e]" strokeWidth={1.8} />
            <p className="mt-4 text-lg text-[#e5e2e1]">No exams added yet</p>
            <p className="mt-1 text-sm text-[#b7ada0]">Add your upcoming exam to get a personalized study plan</p>
            <button type="button" onClick={() => setIsAddOpen(true)} className="mt-6 rounded-full bg-[#d5c5a8] px-5 py-2 text-sm font-semibold text-[#2e2618]">Add Your First Exam</button>
          </div>
        ) : (
          <div className="aa-stagger space-y-3">
            {exams.map((exam) => {
              const plan = plansByExamId[exam.id];
              const isExpanded = expandedPlanId === exam.id;
              const todayIso = new Date().toISOString().slice(0, 10);
              const examTodayPlan = plan?.days?.find((d) => d.date === todayIso) ?? plan?.days?.[0] ?? null;
              return (
                <article key={exam.id} className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#fff2de]">{exam.exam_name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#2a2520] px-2.5 py-1 text-[11px] text-[#d5c5a8]">{exam.exam_type.replace("_", " ")}</span>
                        <span className="text-xs text-[#b7ada0]">{exam.subjects?.length ? exam.subjects.join(" · ") : "All syllabus subjects"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {exam.is_past ? (
                        <p className="text-sm text-[#8f887e]">Exam passed</p>
                      ) : (
                        <>
                          <p className={`text-4xl font-bold ${urgencyColor(exam.days_remaining)}`}>{exam.days_remaining}</p>
                          <p className="text-xs text-[#b7ada0]">days remaining</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {exam.has_active_plan ? (
                      <>
                        <button type="button" onClick={() => void onViewPlan(exam.id)} disabled={loadingPlan === exam.id} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-sm text-[#cec5b9]">
                          {loadingPlan === exam.id ? "Loading..." : isExpanded ? "Hide Plan ▲" : "View Plan ▼"}
                        </button>
                        <button type="button" onClick={() => void onGeneratePlan(exam.id, true)} disabled={generatingExamId === exam.id} className="rounded-lg px-3 py-1.5 text-sm text-[#d5c5a8] hover:bg-[#2a2520]">
                          {generatingExamId === exam.id ? "Generating..." : "Regenerate Plan"}
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => void onGeneratePlan(exam.id, false)} disabled={generatingExamId === exam.id} className="inline-flex items-center gap-2 rounded-lg bg-[#d5c5a8] px-3 py-1.5 text-sm font-semibold text-[#2e2618]">
                        {generatingExamId === exam.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {generatingExamId === exam.id ? "Generating your plan..." : "Generate Study Plan"}
                      </button>
                    )}
                    <button type="button" onClick={() => void onDeleteExam(exam.id)} className="ml-auto rounded-lg p-2 text-[#c39a93] hover:bg-[#3b2523] hover:text-[#ffb4ab]" aria-label={`Delete ${exam.exam_name}`}>
                      <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                    </button>
                  </div>

                  {generatingExamId === exam.id ? (
                    <section className="mt-4 rounded-xl border border-[#353534] bg-[#1f1f1f] p-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-full bg-[#2a2520] p-3">
                          <Brain className="h-6 w-6 animate-pulse text-[#d5c5a8]" strokeWidth={1.9} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#fff2de]">AlmondAI is analyzing your progress and building your personalized study plan...</p>
                          <div className="mt-1 flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8] [animation-delay:-0.2s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8] [animation-delay:-0.1s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-[#d5c5a8]" />
                          </div>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  <section className={`mt-4 transition-all duration-300 ${isExpanded ? "max-h-[4000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"}`}>
                    {plan ? (
                      <div className="space-y-4 rounded-xl border border-[#353534] bg-[#151515] p-4">
                        <article className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h2 className="font-headline text-2xl font-bold text-[#fff2de]">{plan.exam_name}</h2>
                              <p className="text-sm text-[#cec5b9]">{exam.days_remaining} days remaining</p>
                              <p className="mt-2 text-xs text-[#8f887e]">Generated: {new Date(plan.generated_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setExpandedPlanId(null)} className="rounded-lg border border-[#4c463d] px-2 py-1 text-sm text-[#cec5b9]">X</button>
                              <button type="button" onClick={() => void onGeneratePlan(exam.id, true)} disabled={generatingExamId === exam.id} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-sm text-[#cec5b9]">
                                {generatingExamId === exam.id ? "Generating..." : "Regenerate"}
                              </button>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-[#e5e2e1]">{plan.summary}</p>
                          <p className="mt-2 text-sm text-[#b7ada0]">{plan.weekly_overview}</p>
                        </article>

                        {examTodayPlan ? (
                          <article className="rounded-xl border border-[#d5c5a8] bg-[#1f1f1f] p-5">
                            <span className="rounded-full bg-[#2a2520] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#d5c5a8]">TODAY</span>
                            <h3 className="mt-3 text-2xl font-bold text-[#fff2de]">{examTodayPlan.focus}</h3>
                            <div className="mt-4 space-y-3">
                              {examTodayPlan.topics.map((topic, i) => (
                                <div key={`${topic.topic}-${i}`} className="rounded-lg border border-[#353534] bg-[#131313] p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-[#e5e2e1]">{topic.topic}</p>
                                        <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-[10px] text-[#d5c5a8]">{topic.subject}</span>
                                        <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#cec5b9]">{topic.duration_minutes} min</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${priorityPill(topic.priority)}`}>{topic.priority}</span>
                                      </div>
                                    </div>
                                    <button type="button" onClick={() => handleAskTutor(topic, examTodayPlan)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4c463d] px-2.5 py-1.5 text-xs text-[#cec5b9] hover:border-[#d5c5a8]/50 hover:text-[#fff2de] sm:w-auto">
                                      <Brain size={12} strokeWidth={1.9} /> Ask AI Tutor
                                    </button>
                                  </div>
                                  <p className="mt-2 text-xs text-[#b7ada0]">{topic.notes}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                              <p className="inline-flex items-center gap-1 text-sm text-[#d5c5a8]"><Clock3 className="h-4 w-4" strokeWidth={1.8} />{examTodayPlan.total_hours} hours</p>
                              <p className="text-sm text-[#cec5b9]">{examTodayPlan.day_goal}</p>
                            </div>
                          </article>
                        ) : null}

                        <article className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="font-headline text-2xl font-bold text-[#fff2de]">Full Plan Timeline</h3>
                            <div className="inline-flex rounded-lg border border-[#353534] bg-[#131313] p-0.5">
                              <button type="button" onClick={() => setPlanView("list")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${planView === "list" ? "bg-[#d5c5a8] text-[#2e2618]" : "text-[#cec5b9]"}`}>
                                <LayoutList className="h-3.5 w-3.5" strokeWidth={2} /> List
                              </button>
                              <button type="button" onClick={() => setPlanView("map")} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${planView === "map" ? "bg-[#d5c5a8] text-[#2e2618]" : "text-[#cec5b9]"}`}>
                                <Network className="h-3.5 w-3.5" strokeWidth={2} /> Map
                              </button>
                            </div>
                          </div>
                          {planView === "map" ? (
                            <div className="mt-4"><PlanGraph plan={plan} /></div>
                          ) : (
                            <div className="mt-4 max-h-[480px] space-y-2 overflow-auto pr-1">
                              {plan.days.map((day: PlanDay) => {
                                const isDayExpanded = Boolean(expandedDays[day.day]);
                                const isToday = day.date === todayIso;
                                const isPast = day.date < todayIso;
                                return (
                                  <div key={`${day.day}-${day.date}`} className={`rounded-lg border p-3 ${isToday ? "border-[#d5c5a8] bg-[#1b1a19]" : "border-[#353534] bg-[#131313]"} ${isPast ? "opacity-70" : ""}`}>
                                    <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setExpandedDays((prev) => ({ ...prev, [day.day]: !prev[day.day] }))}>
                                      <div>
                                        <p className="text-sm font-semibold text-[#e5e2e1]">Day {day.day} · {day.date}</p>
                                        <p className="text-xs text-[#b7ada0]">{day.focus}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <p className="text-xs text-[#cec5b9]">{day.topics.length} topics · {day.total_hours}h</p>
                                        {isDayExpanded ? <ChevronUp className="h-4 w-4 text-[#cec5b9]" /> : <ChevronDown className="h-4 w-4 text-[#cec5b9]" />}
                                      </div>
                                    </button>
                                    {isDayExpanded ? (
                                      <div className="mt-3 space-y-2 border-t border-[#2b2b2b] pt-3">
                                        {day.topics.map((topic, i) => (
                                          <div key={`${topic.topic}-${i}`} className="rounded-md bg-[#1d1d1d] p-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm text-[#e5e2e1]">{topic.topic}</span>
                                                  <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-[10px] text-[#d5c5a8]">{topic.subject}</span>
                                                  <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#cec5b9]">{topic.duration_minutes} min</span>
                                                </div>
                                              </div>
                                              <button type="button" onClick={() => handleAskTutor(topic, day)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4c463d] px-2.5 py-1.5 text-xs text-[#cec5b9] hover:border-[#d5c5a8]/50 hover:text-[#fff2de] sm:w-auto">
                                                <Brain size={12} strokeWidth={1.9} /> Ask AI Tutor
                                              </button>
                                            </div>
                                            <p className="mt-1 text-xs text-[#8f887e]">{topic.notes}</p>
                                          </div>
                                        ))}
                                        <p className="text-xs text-[#b7ada0]">Goal: {day.day_goal}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </article>

                        <article className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-[#d5c5a8]" strokeWidth={1.9} />
                            <h3 className="font-headline text-2xl font-bold text-[#fff2de]">Study Tips</h3>
                          </div>
                          <ul className="space-y-2 text-sm text-[#cec5b9]">
                            {plan.tips.map((tip, i) => <li key={`${tip}-${i}`} className="rounded-lg bg-[#131313] p-3">• {tip}</li>)}
                          </ul>
                        </article>
                      </div>
                    ) : null}
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Add Exam dialog */}
      <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#353534] bg-[#1c1b1b] p-5">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-headline text-2xl font-bold text-[#fff2de]">Add Exam</Dialog.Title>
              <Dialog.Close className="rounded-lg p-1 text-[#b7ada0] hover:bg-[#2a2a2a]"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[#b7ada0]">Exam Name</span>
                <input type="text" placeholder="MBBS University Finals 2025" value={form.exam_name} onChange={(e) => setForm((p) => ({ ...p, exam_name: e.target.value }))} className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#b7ada0]">Exam Date</span>
                <input type="date" min={tomorrowIso} value={form.exam_date} onChange={(e) => setForm((p) => ({ ...p, exam_date: e.target.value }))} className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#b7ada0]">Exam Type</span>
                <select value={form.exam_type} onChange={(e) => setForm((p) => ({ ...p, exam_type: e.target.value as ExamType }))} className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]">
                  {examTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs text-[#b7ada0]">Subjects</p>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-auto rounded-lg border border-[#353534] bg-[#131313] p-3 sm:grid-cols-3">
                {subjects.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-xs text-[#cec5b9]">
                    <input type="checkbox" checked={form.subjects.includes(s)} onChange={() => toggleSubject(s)} className="h-3.5 w-3.5 accent-[#d5c5a8]" />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="rounded-lg border border-[#4c463d] px-4 py-2 text-sm text-[#cec5b9]">Cancel</button>
              <button type="button" onClick={() => void onAddExam()} className="rounded-lg bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]">Add Exam</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {error ? <Toast message={error} variant="error" onClose={() => setError(null)} /> : null}
    </div>
  );
}

// ── Coming soon placeholder ────────────────────────────────────────────────────

function ClinicalComingSoon() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 40 }}>
      <span style={{ fontSize: 48, lineHeight: 1 }}>🩺</span>
      <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 800, color: "var(--aa-text-1)" }}>Clinical Mode</h2>
      <p style={{ fontSize: "0.85rem", color: "var(--aa-text-3)", textAlign: "center", maxWidth: 340, lineHeight: 1.6 }}>
        Virtual ward simulations, patient encounters, case sheet evaluation, and viva practice — arriving in the next update.
      </p>
      <span style={{
        marginTop: 4, padding: "5px 14px", borderRadius: 100,
        border: "1px solid rgba(213,197,168,0.18)", color: "var(--aa-amber)",
        fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
      }}>
        Coming Soon
      </span>
    </div>
  );
}

// ── Page wrapper with tab routing ─────────────────────────────────────────────

function PlannerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "plan";
  const activeTab: ActiveTab = (["map", "plan", "crisis", "clinical"] as ActiveTab[]).includes(rawTab as ActiveTab)
    ? (rawTab as ActiveTab)
    : "plan";

  const setTab = (tab: ActiveTab) => router.replace(`/planner?tab=${tab}`, { scroll: false });

  const isMap = activeTab === "map";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: isMap ? "calc(100vh - 64px)" : "auto", minHeight: isMap ? 0 : undefined }}>
      <TabBar active={activeTab} onChange={setTab} />

      {activeTab === "map" && (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <SyllabusMapCanvas />
        </div>
      )}
      {activeTab === "plan" && <PlannerContent />}
      {activeTab === "crisis" && (
        <div className="p-6">
          <CrisisContent />
        </div>
      )}
      {activeTab === "clinical" && <ClinicalComingSoon />}
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 32, color: "var(--aa-text-3)", fontSize: "0.85rem" }}>Loading...</div>
    }>
      <PlannerPageInner />
    </Suspense>
  );
}
