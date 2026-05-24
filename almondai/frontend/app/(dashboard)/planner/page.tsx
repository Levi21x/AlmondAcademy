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
  Network,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
import { getSubjects } from "@/lib/api/syllabus.api";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuthStore } from "@/lib/store/authStore";

const examTypeOptions: Array<{ value: ExamType; label: string }> = [
  { value: "university", label: "University Exam" },
  { value: "neet_pg", label: "NEET-PG" },
  { value: "fmge", label: "FMGE" },
  { value: "internal", label: "Internal Assessment" },
  { value: "other", label: "Other" },
];

function urgencyColor(days: number): string {
  if (days < 15) {
    return "text-[#e4b4a0]";
  }
  if (days <= 30) {
    return "text-[#e6c87a]";
  }
  return "text-[#d5c5a8]";
}

function priorityPill(priority: string): string {
  if (priority === "high") {
    return "bg-[#4a3022] text-[#ffccb3]";
  }
  if (priority === "medium") {
    return "bg-[#3a3327] text-[#e6c87a]";
  }
  return "bg-[#2a2b2a] text-[#c3cec3]";
}

function buildTutorPrompt(topic: PlanTopic, day: PlanDay, studentCategory: string, durationMinutes: number): string {
  const styleByCategory: Record<string, string> = {
    survivor: "in simple, direct bullet points. Focus ONLY on what will appear in the exam. Skip theory - give me mnemonics and key facts.",
    sprinter: "comprehensively but efficiently. Cover all important aspects with clinical correlations.",
    anxious_grinder: "step by step, slowly and clearly. Start from basics and build up. Be reassuring.",
    passionate: "in depth with the underlying mechanisms and clinical relevance. I want to truly understand why, not just what.",
    lost: "as simply as possible using everyday analogies. Assume I know nothing. Be patient.",
    strategic_climber: "focusing on NEET-PG high yield points. What are the most tested aspects? Give me exam patterns.",
  };

  const style = styleByCategory[studentCategory] ?? styleByCategory.survivor;

  return `I have ${durationMinutes} minutes to study ${topic.topic} from ${topic.subject}. This is Day ${day.day} of my study plan and today's focus is: ${day.focus ?? topic.subject}.

Please explain ${topic.topic} ${style}

${topic.notes ? `Study note from my plan: ${topic.notes}` : ""}

${topic.exam_tip ? `Exam tip I need to cover: ${topic.exam_tip}` : ""}

Keep your explanation to what I can realistically cover in ${durationMinutes} minutes.`;
}

export default function PlannerPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
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
    exam_name: "",
    exam_date: "",
    exam_type: "university",
    subjects: [],
  });

  const tomorrowIso = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  const hasAnyActivePlan = useMemo(() => exams.some((exam) => exam.has_active_plan), [exams]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    void Promise.all([getExams(token), getSubjects(token)])
      .then(([examRows, subjectRows]) => {
        setExams(examRows);
        const profileData = useAuthStore.getState().profile;
        const year = profileData?.current_year;
        const filtered = (year && year >= 1 && year <= 4)
          ? subjectRows.filter((s) => s.year === year)
          : subjectRows;
        setSubjects(filtered.map((subject) => subject.name));
      })
      .catch(() => {
        setError("Failed to load planner data.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Autonomous manager: on planner open, surface today's focus and check the
  // nearest active plan for drift (client-triggered — free tier has no server cron).
  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;

    const nearestWithPlan = exams.find((exam) => exam.has_active_plan && !exam.is_past) ?? null;

    void getTodayPlan(token)
      .then((data) => {
        if (!cancelled) setTodayPlan(data);
      })
      .catch(() => {
        if (!cancelled) setTodayPlan(null);
      });

    if (nearestWithPlan) {
      setNearestPlanExamId(nearestWithPlan.id);
      void getPlanStatus(token, nearestWithPlan.id)
        .then((status) => {
          if (!cancelled) setNearestStatus(status);
        })
        .catch(() => {
          if (!cancelled) setNearestStatus(null);
        });
    } else {
      setNearestPlanExamId(null);
      setNearestStatus(null);
    }

    return () => {
      cancelled = true;
    };
  }, [token, exams]);

  const onReplan = async (examId: string) => {
    if (!token) {
      return;
    }
    try {
      setReplanningExamId(examId);
      const plan = await replanPlan(token, examId);
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId);
      setExpandedDays({});
      setReplanDismissed(false);
      const [refreshedStatus] = await Promise.all([getPlanStatus(token, examId), refreshExams()]);
      setNearestStatus(refreshedStatus);
      const refreshedToday = await getTodayPlan(token);
      setTodayPlan(refreshedToday);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Replanning failed. Please try again.";
      setError(msg);
    } finally {
      setReplanningExamId(null);
    }
  };

  const toggleSubject = (subject: string) => {
    setForm((prev) => {
      const hasSubject = prev.subjects.includes(subject);
      if (hasSubject) {
        return { ...prev, subjects: prev.subjects.filter((item) => item !== subject) };
      }
      return { ...prev, subjects: [...prev.subjects, subject] };
    });
  };

  const refreshExams = async () => {
    if (!token) {
      return;
    }
    const rows = await getExams(token);
    setExams(rows);
  };

  const onAddExam = async () => {
    if (!token) {
      return;
    }
    if (!form.exam_name.trim() || !form.exam_date) {
      setError("Please add exam name and date.");
      return;
    }

    try {
      const created = await createExam(token, {
        exam_name: form.exam_name.trim(),
        exam_date: form.exam_date,
        exam_type: form.exam_type,
        subjects: form.subjects,
      });
      setExams((prev) => [...prev, created].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setIsAddOpen(false);
      setForm({ exam_name: "", exam_date: "", exam_type: "university", subjects: [] });
      setExpandedPlanId(null);
    } catch {
      setError("Failed to add exam.");
    }
  };

  const onDeleteExam = async (examId: string) => {
    if (!token) {
      return;
    }
    try {
      await deleteExam(token, examId);
      setExams((prev) => prev.filter((exam) => exam.id !== examId));
      setPlansByExamId((prev) => {
        const next = { ...prev };
        delete next[examId];
        return next;
      });
      if (expandedPlanId === examId) {
        setExpandedPlanId(null);
      }
    } catch {
      setError("Failed to delete exam.");
    }
  };

  const onViewPlan = async (examId: string) => {
    if (!token) {
      return;
    }

    if (expandedPlanId === examId) {
      setExpandedPlanId(null);
      return;
    }

    if (plansByExamId[examId]) {
      setExpandedPlanId(examId);
      setExpandedDays({});
      return;
    }

    try {
      setLoadingPlan(examId);
      const plan = await getPlan(token, examId);
      if (!plan) {
        setError("No active plan found for this exam.");
        setExpandedPlanId(null);
        return;
      }
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId);
      setExpandedDays({});
    } catch {
      setError("Failed to load plan.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const onGeneratePlan = async (examId: string, regenerate: boolean) => {
    if (!token) {
      return;
    }

    try {
      setGeneratingExamId(examId);
      const plan = await generatePlan(token, examId, { regenerate, available_hours_per_day: 6.0 });
      setPlansByExamId((prev) => ({ ...prev, [examId]: plan }));
      setExpandedPlanId(examId);
      setExpandedDays({});
      await refreshExams();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Plan generation failed. Please try again.";
      setError(msg);
    } finally {
      setGeneratingExamId(null);
    }
  };

  const handleAskTutor = (topic: PlanTopic, day: PlanDay) => {
    const studentCategory = profile?.student_category ?? "survivor";
    const timeAvailable = topic.duration_minutes ?? 60;
    const prompt = buildTutorPrompt(topic, day, studentCategory, timeAvailable);
    const encodedPrompt = encodeURIComponent(prompt);

    router.push(`/ai-tutor?subject=${encodeURIComponent(topic.subject)}&prefill=${encodedPrompt}&autosend=true`);
  };

  return (
    <div className="aa-anim-fade-up space-y-6">
      {!isPremium && hasAnyActivePlan && showUpgradePrompt ? (
        <section className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#ffcf9d]">Free plan supports one active study plan. Upgrade to create unlimited active plans.</p>
            <div className="flex items-center gap-2">
              <Link href="/upgrade" className="rounded-lg bg-[#fff2de] px-3 py-1.5 text-xs font-semibold text-[#392f1b]">Upgrade</Link>
              <button type="button" onClick={() => setShowUpgradePrompt(false)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">
                Dismiss
              </button>
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#d5c5a8] px-3 py-1.5 text-xs font-semibold text-[#2e2618] transition-transform active:translate-y-px disabled:opacity-60"
              >
                {replanningExamId === nearestPlanExamId ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />}
                {replanningExamId === nearestPlanExamId ? "Replanning..." : "Replan now"}
              </button>
              <button
                type="button"
                onClick={() => setReplanDismissed(true)}
                className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9] transition-colors hover:text-[#fff2de]"
              >
                Dismiss
              </button>
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
                    <p className="text-xs text-[#b7ada0]">
                      {todayPlan.nearest_exam.exam_name} • {todayPlan.nearest_exam.days_remaining} days left
                    </p>
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
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[#353534] bg-[#1a1a1a] p-3 text-left transition-all hover:border-[#d5c5a8]/45 active:translate-y-px"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#e5e2e1]">{topic.topic}</p>
                    <p className="truncate text-xs text-[#8f887e]">{topic.subject} • {topic.duration_minutes} min</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#4c463d] px-2.5 py-1.5 text-xs text-[#cec5b9] transition-colors group-hover:border-[#d5c5a8]/50 group-hover:text-[#fff2de]">
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
          <p className="mt-3 text-sm text-[#e5e2e1]">
            {todayPlan.nearest_exam.exam_name} is in {todayPlan.nearest_exam.days_remaining} days
          </p>
          <p className="mt-1 text-xs text-[#b7ada0]">Generate a study plan below to unlock your daily focus.</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="aa-h1 text-[var(--aa-text-1)]">My Exams</h1>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add Exam
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-28 animate-pulse rounded-xl bg-[#242424]" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#353534] bg-[#131313] p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-[#8f887e]" strokeWidth={1.8} />
            <p className="mt-4 text-lg text-[#e5e2e1]">No exams added yet</p>
            <p className="mt-1 text-sm text-[#b7ada0]">Add your upcoming exam to get a personalized study plan</p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-6 rounded-full bg-[#d5c5a8] px-5 py-2 text-sm font-semibold text-[#2e2618]"
            >
              Add Your First Exam
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <article key={exam.id} className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-[#fff2de]">{exam.exam_name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#2a2520] px-2.5 py-1 text-[11px] text-[#d5c5a8]">{exam.exam_type.replace("_", " ")}</span>
                      <span className="text-xs text-[#b7ada0]">
                        {exam.subjects?.length ? exam.subjects.join(" • ") : "All syllabus subjects"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {exam.is_past ? (
                      <>
                        <p className="text-sm text-[#8f887e]">Exam passed</p>
                      </>
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
                      <button
                        type="button"
                        onClick={() => void onViewPlan(exam.id)}
                        disabled={loadingPlan === exam.id}
                        className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-sm text-[#cec5b9]"
                      >
                        {loadingPlan === exam.id ? "Loading..." : expandedPlanId === exam.id ? "Hide Plan ▲" : "View Plan ▼"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onGeneratePlan(exam.id, true)}
                        disabled={generatingExamId === exam.id}
                        className="rounded-lg px-3 py-1.5 text-sm text-[#d5c5a8] hover:bg-[#2a2520]"
                      >
                        {generatingExamId === exam.id ? "Generating your plan..." : "Regenerate Plan"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onGeneratePlan(exam.id, false)}
                      disabled={generatingExamId === exam.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#d5c5a8] px-3 py-1.5 text-sm font-semibold text-[#2e2618]"
                    >
                      {generatingExamId === exam.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                      {generatingExamId === exam.id ? "Generating your plan..." : "Generate Study Plan"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void onDeleteExam(exam.id)}
                    className="ml-auto rounded-lg p-2 text-[#c39a93] hover:bg-[#3b2523] hover:text-[#ffb4ab]"
                    aria-label={`Delete ${exam.exam_name}`}
                  >
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

                {(() => {
                  const plan = plansByExamId[exam.id];
                  const isExpanded = expandedPlanId === exam.id;
                  const todayIso = new Date().toISOString().slice(0, 10);
                  const todayPlan = plan?.days?.find((day) => day.date === todayIso) ?? (plan?.days?.[0] ?? null);

                  return (
                    <section
                      className={`mt-4 transition-all duration-300 ${
                        isExpanded ? "max-h-[4000px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
                      }`}
                    >
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
                                <button
                                  type="button"
                                  onClick={() => setExpandedPlanId(null)}
                                  className="rounded-lg border border-[#4c463d] px-2 py-1 text-sm text-[#cec5b9]"
                                  aria-label="Close study plan"
                                >
                                  X
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void onGeneratePlan(exam.id, true)}
                                  disabled={generatingExamId === exam.id}
                                  className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-sm text-[#cec5b9]"
                                >
                                  {generatingExamId === exam.id ? "Generating your plan..." : "Regenerate Plan"}
                                </button>
                              </div>
                            </div>
                            <p className="mt-4 text-sm text-[#e5e2e1]">{plan.summary}</p>
                            <p className="mt-2 text-sm text-[#b7ada0]">{plan.weekly_overview}</p>
                          </article>

                          {todayPlan ? (
                            <article className="rounded-xl border border-[#d5c5a8] bg-[#1f1f1f] p-5">
                              <span className="rounded-full bg-[#2a2520] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#d5c5a8]">TODAY</span>
                              <h3 className="mt-3 text-2xl font-bold text-[#fff2de]">{todayPlan.focus}</h3>
                              <div className="mt-4 space-y-3">
                                {todayPlan.topics.map((topic, idx) => (
                                  <div key={`${topic.topic}-${idx}`} className="rounded-lg border border-[#353534] bg-[#131313] p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-semibold text-[#e5e2e1]">{topic.topic}</p>
                                          <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-[10px] text-[#d5c5a8]">{topic.subject}</span>
                                          <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#cec5b9]">{topic.duration_minutes} min</span>
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${priorityPill(topic.priority)}`}>{topic.priority}</span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAskTutor(topic, todayPlan)}
                                        title="Opens AI Tutor with explanation ready"
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4c463d] bg-transparent px-2.5 py-1.5 text-xs text-[#cec5b9] transition-all hover:border-[#d5c5a8]/50 hover:text-[#fff2de] sm:w-auto"
                                      >
                                        <Brain size={12} strokeWidth={1.9} />
                                        Ask AI Tutor
                                      </button>
                                    </div>
                                    <p className="mt-2 text-xs text-[#b7ada0]">{topic.notes}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                                <p className="inline-flex items-center gap-1 text-sm text-[#d5c5a8]"><Clock3 className="h-4 w-4" strokeWidth={1.8} />{todayPlan.total_hours} hours</p>
                                <p className="text-sm text-[#cec5b9]">{todayPlan.day_goal}</p>
                              </div>
                            </article>
                          ) : null}

                          <article className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h3 className="font-headline text-2xl font-bold text-[#fff2de]">Full Plan Timeline</h3>
                              <div className="inline-flex rounded-lg border border-[#353534] bg-[#131313] p-0.5">
                                <button
                                  type="button"
                                  onClick={() => setPlanView("list")}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${planView === "list" ? "bg-[#d5c5a8] text-[#2e2618]" : "text-[#cec5b9] hover:text-[#fff2de]"}`}
                                >
                                  <LayoutList className="h-3.5 w-3.5" strokeWidth={2} /> List
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPlanView("map")}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${planView === "map" ? "bg-[#d5c5a8] text-[#2e2618]" : "text-[#cec5b9] hover:text-[#fff2de]"}`}
                                >
                                  <Network className="h-3.5 w-3.5" strokeWidth={2} /> Map
                                </button>
                              </div>
                            </div>
                            {planView === "map" ? (
                              <div className="mt-4">
                                <PlanGraph plan={plan} />
                              </div>
                            ) : (
                            <div className="mt-4 max-h-[480px] space-y-2 overflow-auto pr-1">
                              {plan.days.map((day: PlanDay) => {
                                const isDayExpanded = Boolean(expandedDays[day.day]);
                                const isToday = day.date === todayIso;
                                const isPast = day.date < todayIso;
                                return (
                                  <div
                                    key={`${day.day}-${day.date}`}
                                    className={`rounded-lg border p-3 ${
                                      isToday ? "border-[#d5c5a8] bg-[#1b1a19]" : "border-[#353534] bg-[#131313]"
                                    } ${isPast ? "opacity-70" : "opacity-100"}`}
                                  >
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between gap-3 text-left"
                                      onClick={() => setExpandedDays((prev) => ({ ...prev, [day.day]: !prev[day.day] }))}
                                    >
                                      <div>
                                        <p className="text-sm font-semibold text-[#e5e2e1]">Day {day.day} • {day.date}</p>
                                        <p className="text-xs text-[#b7ada0]">{day.focus}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <p className="text-xs text-[#cec5b9]">{day.topics.length} topics • {day.total_hours}h</p>
                                        {isDayExpanded ? <ChevronUp className="h-4 w-4 text-[#cec5b9]" /> : <ChevronDown className="h-4 w-4 text-[#cec5b9]" />}
                                      </div>
                                    </button>

                                    {isDayExpanded ? (
                                      <div className="mt-3 space-y-2 border-t border-[#2b2b2b] pt-3">
                                        {day.topics.map((topic, idx) => (
                                          <div key={`${topic.topic}-${idx}`} className="rounded-md bg-[#1d1d1d] p-2">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-sm text-[#e5e2e1]">{topic.topic}</span>
                                                  <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-[10px] text-[#d5c5a8]">{topic.subject}</span>
                                                  <span className="rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] text-[#cec5b9]">{topic.duration_minutes} min</span>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleAskTutor(topic, day)}
                                                title="Opens AI Tutor with explanation ready"
                                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#4c463d] bg-transparent px-2.5 py-1.5 text-xs text-[#cec5b9] transition-all hover:border-[#d5c5a8]/50 hover:text-[#fff2de] sm:w-auto"
                                              >
                                                <Brain size={12} strokeWidth={1.9} />
                                                Ask AI Tutor
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
                              {plan.tips.map((tip, idx) => (
                                <li key={`${tip}-${idx}`} className="rounded-lg bg-[#131313] p-3">• {tip}</li>
                              ))}
                            </ul>
                          </article>
                        </div>
                      ) : null}
                    </section>
                  );
                })()}
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#353534] bg-[#1c1b1b] p-5">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="font-headline text-2xl font-bold text-[#fff2de]">Add Exam</Dialog.Title>
              <Dialog.Close className="rounded-lg p-1 text-[#b7ada0] hover:bg-[#2a2a2a]">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[#b7ada0]">Exam Name</span>
                <input
                  type="text"
                  placeholder="MBBS University Finals 2024"
                  value={form.exam_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, exam_name: event.target.value }))}
                  className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[#b7ada0]">Exam Date</span>
                <input
                  type="date"
                  min={tomorrowIso}
                  value={form.exam_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, exam_date: event.target.value }))}
                  className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[#b7ada0]">Exam Type</span>
                <select
                  value={form.exam_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, exam_type: event.target.value as ExamType }))}
                  className="w-full rounded-xl bg-[#0f0f0f] px-3 py-2 text-sm text-[#e5e2e1] outline-none ring-1 ring-[#353534]"
                >
                  {examTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs text-[#b7ada0]">Subjects</p>
              <div className="grid max-h-48 grid-cols-2 gap-2 overflow-auto rounded-lg border border-[#353534] bg-[#131313] p-3 sm:grid-cols-3">
                {subjects.map((subject) => (
                  <label key={subject} className="flex items-center gap-2 text-xs text-[#cec5b9]">
                    <input
                      type="checkbox"
                      checked={form.subjects.includes(subject)}
                      onChange={() => toggleSubject(subject)}
                      className="h-3.5 w-3.5 accent-[#d5c5a8]"
                    />
                    <span>{subject}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-lg border border-[#4c463d] px-4 py-2 text-sm text-[#cec5b9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onAddExam()}
                className="rounded-lg bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2e2618]"
              >
                Add Exam
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {error ? <Toast message={error} variant="error" onClose={() => setError(null)} /> : null}
    </div>
  );
}
