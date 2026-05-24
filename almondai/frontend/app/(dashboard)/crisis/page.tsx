"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bolt, Check, Lock, X } from "lucide-react";

import {
  activateCrisisMode,
  getActivationStatus,
  getTeachingContent,
  recalibrateSession,
  updateTopicProgress,
  type CrisisActivationStatus,
  type CrisisHourBlock,
  type CrisisSession,
  type PreparationLevel,
  type TeachingContent,
} from "@/lib/api/crisis.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import { useAuthStore } from "@/lib/store/authStore";

const PREP_OPTIONS: Array<{ key: PreparationLevel; title: string; description: string }> = [
  { key: "zero", title: "Zero", description: "I have not studied anything" },
  { key: "little", title: "Little", description: "I have covered less than 25%" },
  { key: "moderate", title: "Moderate", description: "I have covered about half" },
  { key: "good", title: "Good", description: "I need targeted revision" },
];

const LOADING_STEPS = [
  "Analyzing your syllabus completion...",
  "Identifying highest yield topics...",
  "Prioritizing exam-critical content...",
  "Building your hour-by-hour schedule...",
  "Finalizing your rescue plan...",
];

type TeachTab = "explanation" | "key-points" | "exam-tips";

function daysRemainingLabel(examDate: string) {
  const days = Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  if (days <= 3) {
    return `${days} days remaining - critical`;
  }
  if (days <= 7) {
    return `${days} days remaining - urgent`;
  }
  return `${days} days remaining`;
}

export default function CrisisPage() {
  const fallbackToken = useAuthStore((state) => state.accessToken);
  const { subjects: subjectList } = useSubjectList();

  const [status, setStatus] = useState<CrisisActivationStatus | null>(null);
  const [session, setSession] = useState<CrisisSession | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [examName, setExamName] = useState("MBBS University Finals");
  const [examDate, setExamDate] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preparationLevel, setPreparationLevel] = useState<PreparationLevel>("zero");
  const [hoursPerDay, setHoursPerDay] = useState(8);

  const [isActivating, setIsActivating] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const [teachModal, setTeachModal] = useState<{ open: boolean; block: CrisisHourBlock | null }>({ open: false, block: null });
  const [teachingContent, setTeachingContent] = useState<TeachingContent | null>(null);
  const [teachingLoading, setTeachingLoading] = useState(false);
  const [teachTab, setTeachTab] = useState<TeachTab>("explanation");

  const [recalibrateOpen, setRecalibrateOpen] = useState(false);
  const [recalibrateHours, setRecalibrateHours] = useState(8);
  const [recalibratePrep, setRecalibratePrep] = useState<PreparationLevel>("moderate");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? fallbackToken;
      if (!token) {
        throw new Error("Please sign in again.");
      }

      const response = await getActivationStatus(token);
      setStatus(response);
      setSession(response.active_session);
      if (response.active_session) {
        setRecalibrateHours(Math.round(response.active_session.available_hours_per_day));
        setRecalibratePrep(response.active_session.preparation_level);
      }
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to load crisis status";
      setError(message);
    } finally {
      setLoadingStatus(false);
    }
  }, [fallbackToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!isActivating) {
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStepIndex((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isActivating]);

  const todayData = useMemo(() => {
    if (!session?.crisis_plan?.days?.length) {
      return null;
    }
    const nextDay = session.crisis_plan.days.find((day) => {
      const dayBlocks = day.hours || [];
      const completion = (session.topic_progress || []).filter((entry) => entry.day_number === day.day && entry.is_completed).length;
      return completion < dayBlocks.length;
    });
    return nextDay || session.crisis_plan.days[0];
  }, [session]);

  const todayProgress = useMemo(() => {
    if (!session || !todayData) {
      return { completed: 0, total: 0, percent: 0 };
    }
    const total = todayData.hours.length;
    const completed = (session.topic_progress || []).filter((entry) => entry.day_number === todayData.day && entry.is_completed).length;
    return {
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [session, todayData]);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => (prev.includes(subject) ? prev.filter((item) => item !== subject) : [...prev, subject]));
  };

  const activate = async () => {
    if (!examName.trim() || !examDate || selectedSubjects.length === 0) {
      setError("Please complete all required fields.");
      return;
    }

    setIsActivating(true);
    setLoadingStepIndex(0);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? fallbackToken;
      if (!token) {
        throw new Error("Please sign in again.");
      }

      const created = await activateCrisisMode(token, {
        exam_name: examName.trim(),
        exam_date: examDate,
        subjects: selectedSubjects,
        preparation_level: preparationLevel,
        available_hours_per_day: hoursPerDay,
      });

      setSession(created);
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              active_session: created,
              can_activate: prev.is_premium,
              free_activation_used: prev.is_premium ? prev.free_activation_used : true,
            }
          : prev,
      );
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to activate crisis mode";
      setError(message);
    } finally {
      setIsActivating(false);
    }
  };

  const openTeach = async (block: CrisisHourBlock) => {
    if (!session) {
      return;
    }

    setTeachModal({ open: true, block });
    setTeachTab("explanation");
    setTeachingContent(null);
    setTeachingLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? fallbackToken;
      if (!token) {
        throw new Error("Please sign in again.");
      }

      const content = await getTeachingContent(token, session.id, {
        topic_name: block.topic,
        subject: block.subject,
        key_points: block.key_points || [],
        exam_tip: block.exam_tip || "",
      });
      setTeachingContent(content);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to load teaching content";
      setError(message);
    } finally {
      setTeachingLoading(false);
    }
  };

  const markComplete = async (dayNumber: number, topicName: string, isCompleted: boolean) => {
    if (!session) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? fallbackToken;
      if (!token) {
        throw new Error("Please sign in again.");
      }

      await updateTopicProgress(token, session.id, {
        day_number: dayNumber,
        topic_name: topicName,
        is_completed: isCompleted,
      });
      await loadStatus();
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to update progress";
      setError(message);
    }
  };

  const doRecalibrate = async () => {
    if (!session) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const token = authSession?.access_token ?? fallbackToken;
      if (!token) {
        throw new Error("Please sign in again.");
      }

      const updated = await recalibrateSession(token, session.id, {
        available_hours_per_day: recalibrateHours,
        preparation_level: recalibratePrep,
      });

      setSession(updated);
      setRecalibrateOpen(false);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to recalibrate";
      setError(message);
    }
  };

  if (loadingStatus) {
    return <div className="p-8 text-sm text-[#cec5b9]">Loading Crisis Mode...</div>;
  }

  const locked = status && !status.can_activate && !status.active_session;

  return (
    <div className="aa-anim-fade-up relative min-h-[calc(100vh-5.5rem)] space-y-4">
      {locked ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl border border-[#5a2f2a] bg-[#131313]/95 p-6">
          <div className="w-full max-w-xl rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-[#ffb4ab]" />
            <h1 className="aa-h2 mt-3 text-[var(--aa-text-1)]">Crisis Mode - Premium Feature</h1>
            <p className="mt-2 text-sm text-[#cec5b9]">You have used your free Crisis Mode activation.</p>
            <p className="text-sm text-[#cec5b9]">Upgrade to AlmondAI Premium for unlimited Crisis Mode access.</p>
            <Link href="/upgrade" className="mt-5 inline-block rounded-xl bg-[#ffb4ab] px-5 py-2 text-sm font-semibold text-[#3f1d19]">
              Upgrade to Premium
            </Link>
            <ul className="mt-4 space-y-1 text-left text-sm text-[#e5e2e1]">
              <li>Unlimited crisis activations</li>
              <li>Daily plan recalibration</li>
              <li>Built-in topic teaching assistance</li>
            </ul>
          </div>
        </div>
      ) : null}

      {!session ? (
        <section className="rounded-2xl border border-[#5a2f2a] bg-[#131313] p-5 md:p-8">
          <div className="mb-4 flex items-center gap-2 text-[#ffcf9d]">
            <Bolt className="h-5 w-5" />
            <h1 className="aa-h2">Crisis Mode</h1>
          </div>
          <p className="mb-4 text-sm text-[#cec5b9]">Emergency exam preparation. AlmondAI will build your rescue plan.</p>

          {status && !status.free_activation_used ? (
            <div className="mb-4 rounded-xl border border-green-700/60 bg-green-900/20 px-3 py-2 text-sm text-green-300">1 free activation available</div>
          ) : null}

          <div className="mx-auto w-full max-w-2xl rounded-xl border border-[#353534] bg-[#1f1f1f] p-6">
            {!isActivating ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm text-[#cec5b9]">Exam Name</span>
                  <input
                    value={examName}
                    onChange={(event) => setExamName(event.target.value)}
                    placeholder="MBBS University Finals"
                    className="w-full rounded-xl border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm text-[#cec5b9]">Exam Date</span>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(event) => setExamDate(event.target.value)}
                    className="w-full rounded-xl border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1]"
                  />
                  {examDate ? <p className="mt-1 text-xs text-[#ffcf9d]">{daysRemainingLabel(examDate)}</p> : null}
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-[#cec5b9]">Subjects to cover</p>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjects(selectedSubjects.length === subjectList.length ? [] : subjectList)}
                      className="text-xs text-[#ffcf9d]"
                    >
                      {selectedSubjects.length === subjectList.length ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {subjectList.map((subject) => {
                      const active = selectedSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className={`rounded-lg border px-2 py-2 text-xs ${active ? "border-[#ffcf9d] bg-[#ffcf9d]/10 text-[#fff2de]" : "border-[#4c463d] text-[#cec5b9]"}`}
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm text-[#cec5b9]">Current preparation level</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {PREP_OPTIONS.map((option) => {
                      const active = preparationLevel === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setPreparationLevel(option.key)}
                          className={`rounded-xl border p-3 text-left ${active ? "border-[#ffcf9d] bg-[#ffcf9d]/10" : "border-[#4c463d] bg-[#131313]"}`}
                        >
                          <p className="text-sm font-semibold text-[#fff2de]">{option.title}</p>
                          <p className="text-xs text-[#cec5b9]">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm text-[#cec5b9]">Available hours per day: {hoursPerDay}</p>
                  <input
                    type="range"
                    min={4}
                    max={16}
                    step={1}
                    value={hoursPerDay}
                    onChange={(event) => setHoursPerDay(Number(event.target.value))}
                    className="w-full accent-[#ffcf9d]"
                  />
                </div>

                <button type="button" onClick={() => void activate()} className="w-full rounded-xl bg-[#ffcf9d] px-4 py-3 text-sm font-semibold text-[#3f2a16]">
                  Activate Crisis Mode ⚡
                </button>
                <p className="text-xs text-[#b7ada0]">This will use your free activation. Premium users get unlimited.</p>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <Bolt className="mx-auto h-10 w-10 animate-pulse text-[#ffcf9d]" />
                <h3 className="text-lg font-semibold text-[#fff2de]">AlmondAI is building your crisis plan...</h3>
                <div className="space-y-2 text-left">
                  {LOADING_STEPS.map((step, index) => {
                    const visible = index <= loadingStepIndex;
                    const complete = index < loadingStepIndex;
                    return (
                      <div key={step} className={`flex items-center gap-2 text-sm transition ${visible ? "opacity-100" : "opacity-30"}`}>
                        {complete ? <Check className="h-4 w-4 text-green-300" /> : <span className="h-2 w-2 rounded-full bg-[#ffcf9d] animate-pulse" />}
                        <span className="text-[#cec5b9]">{step}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[#b7ada0]">This takes 15-20 seconds</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {session ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-[#7a3f30] bg-gradient-to-r from-[#3a1d1b] to-[#2a1d14] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#ffcf9d]">⚡ CRISIS MODE ACTIVE</p>
                <h2 className="text-xl font-bold text-[#fff2de]">{session.exam_name}</h2>
                <p className="text-sm text-[#ffcf9d]">{daysRemainingLabel(session.exam_date)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRecalibrateOpen(true)} className="rounded-lg border border-[#ffcf9d]/60 px-3 py-2 text-sm text-[#fff2de]">
                  Recalibrate Plan
                </button>
                <button type="button" onClick={() => setSession(null)} className="rounded-lg border border-[#8f6c5a] px-3 py-2 text-sm text-[#cec5b9]">
                  End Crisis Mode
                </button>
              </div>
            </div>
          </div>

          {todayData ? (
            <div className="rounded-xl border border-[#5a2f2a] bg-[#1f1f1f] p-5">
              <h3 className="font-headline text-2xl font-bold text-[#fff2de]">TODAY - Day {todayData.day}</h3>
              <p className="mt-1 text-sm text-[#ffcf9d]">{todayData.theme}</p>
              <p className="text-sm text-[#cec5b9]">{todayData.daily_goal}</p>

              <div className="mt-4 space-y-3">
                {todayData.hours.map((block, index) => {
                  const done = (session.topic_progress || []).some(
                    (entry) => entry.day_number === todayData.day && entry.topic_name === block.topic && entry.is_completed,
                  );
                  return (
                    <div key={`${block.topic}-${index}`} className="rounded-lg border border-[#4c463d] bg-[#131313] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={(event) => {
                              void markComplete(todayData.day, block.topic, event.target.checked);
                            }}
                            className="h-4 w-4 accent-[#ffcf9d]"
                          />
                          <p className="font-semibold text-[#fff2de]">{block.topic}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-[#2a2520] px-2 py-1 text-xs text-[#ffcf9d]">{block.subject}</span>
                          <span className="rounded-full border border-[#4c463d] px-2 py-1 text-xs text-[#cec5b9]">{block.duration_minutes}m</span>
                          <button type="button" onClick={() => void openTeach(block)} className="rounded-md bg-[#ffcf9d] px-2 py-1 text-xs font-semibold text-[#3f2a16]">
                            Study Now
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#b7ada0]">{block.time_block}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <p className="text-xs text-[#cec5b9]">
                  {todayProgress.completed}/{todayProgress.total} topics done today
                </p>
                <div className="mt-1 h-2 rounded-full bg-[#353534]">
                  <div className="h-2 rounded-full bg-[#ffcf9d]" style={{ width: `${todayProgress.percent}%` }} />
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#5a2f2a] bg-[#1f1f1f] p-4">
              <h4 className="font-semibold text-[#ffcf9d]">Skip these - they will not likely appear</h4>
              <ul className="mt-2 space-y-1 text-sm text-[#cec5b9]">
                {(session.crisis_plan.what_to_skip || []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#7a3f30] bg-[#1f1f1f] p-4">
              <h4 className="font-semibold text-[#ffcf9d]">These WILL appear in your exam</h4>
              <ul className="mt-2 space-y-1 text-sm text-[#fff2de]">
                {(session.crisis_plan.must_know || []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-4">
            <details open>
              <summary className="cursor-pointer text-sm font-semibold text-[#fff2de]">Full Plan Timeline</summary>
              <div className="mt-3 space-y-3">
                {(session.crisis_plan.days || []).map((day) => {
                  const dayCompleted = (session.topic_progress || []).filter((entry) => entry.day_number === day.day && entry.is_completed).length;
                  const total = day.hours.length;
                  return (
                    <details key={day.day} className={`rounded-lg border p-3 ${todayData?.day === day.day ? "border-[#ffcf9d]/60" : "border-[#4c463d]"}`}>
                      <summary className="cursor-pointer text-sm text-[#e5e2e1]">
                        Day {day.day} - {day.theme} ({dayCompleted}/{total})
                      </summary>
                      <div className="mt-2 space-y-1 text-sm text-[#cec5b9]">
                        {day.hours.map((block, index) => (
                          <p key={`${day.day}-${index}`}>{block.time_block} - {block.subject}: {block.topic}</p>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          </div>
        </section>
      ) : null}

      {teachModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline text-2xl font-bold text-[#fff2de]">{teachModal.block?.topic}</h3>
                <p className="text-sm text-[#ffcf9d]">{teachModal.block?.subject}</p>
              </div>
              <button type="button" onClick={() => setTeachModal({ open: false, block: null })} className="rounded-md border border-[#4c463d] p-1 text-[#cec5b9]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setTeachTab("explanation")} className={`rounded-full px-3 py-1 text-xs ${teachTab === "explanation" ? "bg-[#ffcf9d] text-[#3f2a16]" : "border border-[#4c463d] text-[#cec5b9]"}`}>
                Explanation
              </button>
              <button type="button" onClick={() => setTeachTab("key-points")} className={`rounded-full px-3 py-1 text-xs ${teachTab === "key-points" ? "bg-[#ffcf9d] text-[#3f2a16]" : "border border-[#4c463d] text-[#cec5b9]"}`}>
                Key Points
              </button>
              <button type="button" onClick={() => setTeachTab("exam-tips")} className={`rounded-full px-3 py-1 text-xs ${teachTab === "exam-tips" ? "bg-[#ffcf9d] text-[#3f2a16]" : "border border-[#4c463d] text-[#cec5b9]"}`}>
                Exam Tips
              </button>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-y-auto rounded-xl border border-[#353534] bg-[#131313] p-4 text-sm text-[#e5e2e1]">
              {teachingLoading ? <p>Loading teaching content...</p> : null}
              {!teachingLoading && teachTab === "explanation" ? <p className="whitespace-pre-wrap leading-relaxed">{teachingContent?.teaching_content || "No content"}</p> : null}
              {!teachingLoading && teachTab === "key-points" ? (
                <ol className="list-decimal space-y-2 pl-5">
                  {(teachingContent?.what_to_remember || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : null}
              {!teachingLoading && teachTab === "exam-tips" ? (
                <ul className="list-disc space-y-2 pl-5">
                  {(teachingContent?.exam_questions || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (todayData && teachModal.block) {
                    void markComplete(todayData.day, teachModal.block.topic, true);
                  }
                  setTeachModal({ open: false, block: null });
                }}
                className="rounded-xl bg-[#ffcf9d] px-4 py-2 text-sm font-semibold text-[#3f2a16]"
              >
                Mark as Complete
              </button>
              <Link
                href={`/ai-tutor?subject=${encodeURIComponent(teachModal.block?.subject || "")}&prompt=${encodeURIComponent(`Teach me ${teachModal.block?.topic || ""} for my exam`)}`}
                className="text-sm text-[#ffcf9d]"
              >
                Ask AlmondAI
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {recalibrateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#5a2f2a] bg-[#1f1f1f] p-5">
            <h3 className="text-lg font-semibold text-[#fff2de]">Recalibrate Plan</h3>
            <p className="mt-1 text-sm text-[#cec5b9]">Recalibrate for remaining days with your current pace.</p>

            <label className="mt-4 block text-sm text-[#cec5b9]">
              Available hours per day: {recalibrateHours}
              <input
                type="range"
                min={4}
                max={16}
                value={recalibrateHours}
                onChange={(event) => setRecalibrateHours(Number(event.target.value))}
                className="mt-1 w-full accent-[#ffcf9d]"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-sm text-[#cec5b9]">Preparation level now</span>
              <select
                value={recalibratePrep}
                onChange={(event) => setRecalibratePrep(event.target.value as PreparationLevel)}
                className="mt-1 w-full rounded-lg border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1]"
              >
                {PREP_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRecalibrateOpen(false)} className="rounded-lg border border-[#4c463d] px-3 py-2 text-sm text-[#cec5b9]">
                Cancel
              </button>
              <button type="button" onClick={() => void doRecalibrate()} className="rounded-lg bg-[#ffcf9d] px-3 py-2 text-sm font-semibold text-[#3f2a16]">
                Recalibrate for remaining days
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 right-4 rounded-lg border border-[#7a3f30] bg-[#2c1d1b] px-3 py-2 text-sm text-[#ffcf9d]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
