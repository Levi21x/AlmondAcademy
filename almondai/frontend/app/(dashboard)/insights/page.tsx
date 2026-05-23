"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

import { getLatestAnalysis, resolveIntervention, runAnalysis, type WeaknessAnalysis, type WeaknessGap } from "@/lib/api/weakness.api";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

const LOADING_STEPS = [
  "Analyzing MCQ performance...",
  "Processing struggle patterns...",
  "Checking syllabus completion...",
  "Reviewing AI tutor sessions...",
  "Calculating weakness scores...",
  "Generating intervention plans...",
];

function readinessColor(score: number) {
  if (score <= 40) return "#ef4444";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#facc15";
  return "#22c55e";
}

function getSubjectHeatmap(gaps: WeaknessGap[]) {
  const bucket: Record<string, { total: number; count: number }> = {};
  for (const gap of gaps) {
    if (!bucket[gap.subject]) {
      bucket[gap.subject] = { total: 0, count: 0 };
    }
    bucket[gap.subject].total += gap.weakness_score;
    bucket[gap.subject].count += 1;
  }

  return Object.entries(bucket).map(([subject, entry]) => ({
    subject,
    average: Math.round(entry.total / Math.max(entry.count, 1)),
    topicCount: entry.count,
  }));
}

export default function InsightsPage() {
  const fallbackToken = useAuthStore((state) => state.accessToken);
  const { isPremium } = useSubscription();

  const [analysis, setAnalysis] = useState<WeaknessAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showHighRisk, setShowHighRisk] = useState(false);
  const [showModerate, setShowModerate] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLatest() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? fallbackToken;
      if (!token) return;

      const latest = await getLatestAnalysis(token);
      if (!cancelled) {
        setAnalysis(latest);
      }
    }

    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, [fallbackToken]);

  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = window.setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  const runFullAnalysis = async (subject?: string) => {
    setIsAnalyzing(true);
    setLoadingStep(0);
    setError(null);

    try {
      if (!isPremium && analysis?.generated_at) {
        const generatedAt = new Date(analysis.generated_at).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - generatedAt < sevenDaysMs) {
          setError("Free plan allows one insights analysis per week. Upgrade for unlimited analyses.");
          return;
        }
      }

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? fallbackToken;
      if (!token) {
        setError("Please sign in again.");
        return;
      }

      const result = await runAnalysis(token, subject);
      if (!result.analysis_id) {
        setError("Could not generate analysis right now.");
      } else {
        setAnalysis(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const allGaps = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.critical_gaps, ...analysis.high_risk, ...analysis.moderate_risk, ...analysis.strong_areas];
  }, [analysis]);

  const heatmap = useMemo(() => getSubjectHeatmap(allGaps), [allGaps]);

  const filtered = useMemo(() => {
    if (!analysis) return null;
    if (!subjectFilter) return analysis;

    const keep = (rows: WeaknessGap[]) => rows.filter((row) => row.subject === subjectFilter);
    return {
      ...analysis,
      critical_gaps: keep(analysis.critical_gaps),
      high_risk: keep(analysis.high_risk),
      moderate_risk: keep(analysis.moderate_risk),
      strong_areas: keep(analysis.strong_areas),
      interventions: analysis.interventions.filter((row) => row.subject === subjectFilter),
    };
  }, [analysis, subjectFilter]);

  const markResolved = async (id?: string) => {
    if (!id || !analysis) return;

    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? fallbackToken;
    if (!token) return;

    await resolveIntervention(token, id);
    setAnalysis({
      ...analysis,
      interventions: analysis.interventions.filter((item) => item.id !== id),
    });
  };

  const readiness = filtered?.overall_readiness_score ?? 0;
  const ringColor = readinessColor(readiness);

  return (
    <div className="aa-anim-fade-up space-y-6">
      {!isPremium && showUpgradePrompt ? (
        <section className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#ffcf9d]">Free plan includes one predictive analysis per week. Premium unlocks unlimited analysis runs.</p>
            <div className="flex items-center gap-2">
              <Link href="/upgrade" className="rounded-lg bg-[#fff2de] px-3 py-1.5 text-xs font-semibold text-[#392f1b]">Upgrade</Link>
              <button type="button" onClick={() => setShowUpgradePrompt(false)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="aa-h1 text-[var(--aa-text-1)]">Predictive Weakness Analysis</h1>
            <p className="text-sm text-[#cec5b9]">AlmondAI has analyzed your performance data to predict where you will lose marks.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#b7ada0]">Last analyzed: {analysis?.generated_at ? new Date(analysis.generated_at).toLocaleString() : "Never"}</p>
            <button type="button" onClick={() => void runFullAnalysis()} className="mt-2 rounded-xl bg-[#fff2de] px-4 py-2 text-sm font-semibold text-[#392f1b]">
              Run Full Analysis
            </button>
          </div>
        </div>
      </section>

      {isAnalyzing ? (
        <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-6">
          <h2 className="font-semibold text-[#fff2de]">Running analysis...</h2>
          <div className="mt-4 space-y-2">
            {LOADING_STEPS.map((step, index) => {
              const visible = index <= loadingStep;
              const done = index < loadingStep;
              return (
                <div key={step} className={`flex items-center gap-2 text-sm transition ${visible ? "opacity-100" : "opacity-35"}`}>
                  {done ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <span className="h-2 w-2 rounded-full bg-[#d5c5a8] animate-pulse" />}
                  <span className="text-[#cec5b9]">{step}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {filtered ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
              <p className="text-sm text-[#b7ada0]">Readiness Score</p>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(${ringColor} ${readiness * 3.6}deg, #2a2a2a 0deg)` }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#131313] text-xl font-bold text-[#fff2de]">{readiness}</div>
                </div>
                <div>
                  <p className="text-sm text-[#cec5b9]">Estimated marks at risk: {filtered.estimated_marks_at_risk}</p>
                  <p className="text-xs text-[#b7ada0]">Generated: {filtered.generated_at ? new Date(filtered.generated_at).toLocaleString() : "-"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
              <p className="text-sm text-[#b7ada0]">Subject Heatmap</p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {heatmap.map((item) => {
                  const avg = item.average;
                  const tone = avg > 75 ? "bg-red-500/20 border-red-500/50" : avg > 50 ? "bg-orange-500/20 border-orange-500/50" : avg > 25 ? "bg-yellow-500/20 border-yellow-500/50" : "bg-green-500/20 border-green-500/50";
                  return (
                    <button
                      key={item.subject}
                      type="button"
                      onClick={() => setSubjectFilter((prev) => (prev === item.subject ? null : item.subject))}
                      className={`rounded-lg border px-2 py-2 text-left ${tone} ${subjectFilter === item.subject ? "ring-1 ring-[#fff2de]" : ""}`}
                    >
                      <p className="text-xs text-[#fff2de]">{item.subject}</p>
                      <p className="text-sm font-semibold text-[#fff2de]">{item.average}</p>
                      <p className="text-[10px] text-[#cec5b9]">{item.topicCount} topics</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-[#5a2f2a] bg-[#1f1f1f] p-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <h2 className="font-headline text-2xl font-bold text-[#fff2de]">Critical Gaps</h2>
            </div>
            <p className="text-sm text-[#cec5b9]">These topics will almost certainly cost you marks.</p>

            {filtered.critical_gaps.length === 0 ? <p className="text-sm text-[#b7ada0]">No critical gaps detected.</p> : null}

            {filtered.critical_gaps.map((gap) => {
              const intervention = filtered.interventions.find((item) => item.topic === gap.topic && item.subject === gap.subject);
              return (
                <article key={`${gap.subject}-${gap.topic}`} className="rounded-xl border-l-4 border-red-500/60 bg-[#131313] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[#fff2de]">{gap.topic}</h3>
                      <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-xs text-[#d5c5a8]">{gap.subject}</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{gap.weakness_score}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[#4c463d] px-2 py-1 text-[#cec5b9]">MCQ: {gap.signals.mcq_accuracy}%</span>
                    <span className="rounded-full border border-[#4c463d] px-2 py-1 text-[#cec5b9]">Asked {gap.signals.question_frequency} times</span>
                    <span className="rounded-full border border-[#4c463d] px-2 py-1 text-[#cec5b9]">Status: {gap.signals.completion_status}</span>
                  </div>

                  {intervention ? (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-[#fff2de]">How to fix this:</p>
                      <p className="text-sm text-[#e5e2e1]">{intervention.intervention_plan}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#2a2520] px-2 py-1 text-xs text-[#d5c5a8]">{intervention.time_required || "2 focused hours"}</span>
                      </div>
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                        Do this now: {intervention.quick_win || "Create one-page active recall notes and test yourself."}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/ai-tutor?subject=${encodeURIComponent(gap.subject)}&topic=${encodeURIComponent(gap.topic)}&prompt=${encodeURIComponent(`Teach me ${gap.topic} for exam scoring`)}`}
                      className="rounded-lg bg-[#fff2de] px-3 py-1.5 text-xs font-semibold text-[#392f1b]"
                    >
                      Study Now
                    </Link>
                    <button type="button" onClick={() => void markResolved(intervention?.id)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">
                      Mark Resolved
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
            <button type="button" onClick={() => setShowHighRisk((prev) => !prev)} className="flex w-full items-center justify-between text-left">
              <span className="font-semibold text-[#fff2de]">High Risk Topics ({filtered.high_risk.length})</span>
              {showHighRisk ? <ChevronUp className="h-4 w-4 text-[#cec5b9]" /> : <ChevronDown className="h-4 w-4 text-[#cec5b9]" />}
            </button>
            {showHighRisk ? (
              <div className="mt-3 space-y-2">
                {filtered.high_risk.map((gap) => (
                  <div key={`${gap.subject}-${gap.topic}`} className="rounded-lg border border-amber-500/40 bg-[#131313] p-3">
                    <p className="text-sm text-[#fff2de]">{gap.topic} <span className="text-xs text-[#b7ada0]">({gap.subject})</span></p>
                    <p className="text-xs text-[#f4cd84]">Score {gap.weakness_score}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
            <button type="button" onClick={() => setShowModerate((prev) => !prev)} className="flex w-full items-center justify-between text-left">
              <span className="font-semibold text-[#fff2de]">Moderate Risk Topics ({filtered.moderate_risk.length})</span>
              {showModerate ? <ChevronUp className="h-4 w-4 text-[#cec5b9]" /> : <ChevronDown className="h-4 w-4 text-[#cec5b9]" />}
            </button>
            {showModerate ? (
              <div className="mt-3 space-y-2">
                {filtered.moderate_risk.map((gap) => (
                  <div key={`${gap.subject}-${gap.topic}`} className="rounded-lg border border-[#4c463d] bg-[#131313] p-3">
                    <p className="text-sm text-[#fff2de]">{gap.topic} <span className="text-xs text-[#b7ada0]">({gap.subject})</span></p>
                    <p className="text-xs text-[#cec5b9]">Score {gap.weakness_score}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-green-500/40 bg-[#1f1f1f] p-5">
            <h2 className="font-semibold text-[#9ce7ad]">Strong Areas</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {filtered.strong_areas.slice(0, 5).map((gap) => (
                <span key={`${gap.subject}-${gap.topic}`} className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-[#9ce7ad]">
                  {gap.topic}
                </span>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-6 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-[#d5c5a8]" />
          <p className="mt-3 text-[#cec5b9]">Run weakness analysis to identify your mark-risk topics.</p>
        </section>
      )}

      {error ? (
        <div className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-3 text-sm text-[#ffcf9d]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
