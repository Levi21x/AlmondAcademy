"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import Link from "next/link";

import { getPeerInsights, type PeerInsights } from "@/lib/api/peer.api";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

interface PeerInsightsWidgetProps {
  token?: string | null;
  compact?: boolean;
}

const cohortBadgeStyle: Record<string, string> = {
  getting_started: "bg-[#353534] text-[#e5e2e1]",
  building_momentum: "bg-[#193247] text-[#b7e2ff]",
  on_track: "bg-[#4a411f] text-[#ffe08a]",
  top_performer: "bg-[#5a321b] text-[#ffd5b8]",
  elite: "bg-[#574530] text-[#fff2de]",
};

const emptyMessage = "Platform intelligence builds as more students join AlmondAI";

function percentileWidth(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function PeerInsightsWidget({ token, compact = false }: PeerInsightsWidgetProps) {
  const [insights, setInsights] = useState<PeerInsights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) {
      setInsights(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getPeerInsights(token);
    setInsights(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [token]);

  const hasData = useMemo(() => {
    if (!insights) return false;
    return (
      insights.benchmark.percentile_rank > 0 ||
      insights.platform_struggles.length > 0 ||
      insights.top_performer_insights.length > 0
    );
  }, [insights]);

  if (compact) {
    if (loading) {
      return (
        <div className="aa-card" style={{ padding: "20px 22px" }}>
          <SkeletonLoader className="h-5 w-40" />
          <div className="mt-3 space-y-2">
            <SkeletonLoader className="h-8" />
            <SkeletonLoader className="h-8" />
            <SkeletonLoader className="h-8" />
          </div>
        </div>
      );
    }
    return (
      <div className="aa-card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: "var(--aa-teal)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
          <span className="aa-h4">Peer Intelligence</span>
        </div>
        {!hasData || !insights ? (
          <p className="aa-body-sm" style={{ color: "var(--aa-text-2)" }}>{emptyMessage}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { name: "Batch avg accuracy", val: `${insights.benchmark.mcq_accuracy_percentile}%ile`, color: "var(--aa-text-2)" },
              { name: "Hot topic this week", val: insights.trending_this_week.hot_subject, color: "var(--aa-amber)" },
              { name: "Your rank", val: `Top ${Math.max(1, 100 - insights.benchmark.percentile_rank)}%`, color: insights.benchmark.percentile_rank > 50 ? "var(--aa-green)" : "var(--aa-coral)" },
            ].map((item) => (
              <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 10px", background: "var(--aa-s1)", borderRadius: "var(--aa-r-sm)" }}>
                <span className="aa-caption">{item.name}</span>
                <span style={{ fontFamily: "var(--aa-fd)", fontSize: "0.875rem", fontWeight: 600, color: item.color }}>{item.val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
        <SkeletonLoader className="h-6 w-56" />
        <SkeletonLoader className="mt-3 h-4 w-72" />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <SkeletonLoader className="h-28" />
          <SkeletonLoader className="h-28" />
        </div>
      </section>
    );
  }

  if (!hasData || !insights) {
    return (
      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#fff2de]">Platform Intelligence</h2>
            <p className="text-xs text-[#b7ada0]">Based on all AlmondAI students</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-[#353534] p-2 text-[#cec5b9] hover:bg-[#2a2a2a]"
            aria-label="Refresh peer insights"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm text-[#b7ada0]">{emptyMessage}</p>
      </section>
    );
  }

  const benchmark = insights.benchmark;
  const gap = insights.cohort_comparison.gap;

  return (
    <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#fff2de]">Platform Intelligence</h2>
          <p className="text-xs text-[#b7ada0]">Based on all AlmondAI students</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-[#353534] p-2 text-[#cec5b9] hover:bg-[#2a2a2a]"
          aria-label="Refresh peer insights"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[#353534] bg-[#131313] p-4">
          <h3 className="text-sm font-semibold text-[#fff2de]">Your Rank</h3>
          <p className="mt-1 text-2xl font-bold text-[#fff2de]">Top {Math.max(1, 100 - benchmark.percentile_rank)}%</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] ${cohortBadgeStyle[benchmark.cohort_label] ?? cohortBadgeStyle.getting_started}`}>
            {benchmark.cohort_label.replace(/_/g, " ")}
          </span>

          <div className="mt-4 space-y-2 text-xs">
            {[
              { label: "Questions", value: benchmark.questions_percentile },
              { label: "Topics", value: benchmark.completion_percentile },
              { label: "Streak", value: benchmark.streak_percentile },
              { label: "MCQ Accuracy", value: benchmark.mcq_accuracy_percentile },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[#cec5b9]">
                  <span>{item.label}</span>
                  <span>{item.value}%ile</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#2a2a2a]">
                  <div className="h-1.5 rounded-full bg-[#d5c5a8]" style={{ width: `${percentileWidth(item.value)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#353534] bg-[#131313] p-4">
          <h3 className="text-sm font-semibold text-[#fff2de]">Trending Difficulties</h3>
          <div className="mt-3 space-y-2">
            {insights.platform_struggles.slice(0, 3).map((item) => (
              <div key={`${item.subject}-${item.topic}`} className="rounded-md border border-[#2a2a2a] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-[#e5e2e1]">{item.topic}</p>
                    <p className="text-xs text-[#b7ada0]">{item.subject} · {item.student_count} students struggling</p>
                  </div>
                  {item.is_also_your_struggle ? <span className="text-[11px] text-[#ffb4ab]">You too</span> : null}
                </div>
                <Link href="/insights" className="mt-2 inline-block text-xs text-[#d5c5a8] hover:text-[#fff2de]">
                  Study Now
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#353534] bg-[#131313] p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#fff2de]">What top students do differently</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {insights.top_performer_insights.slice(0, 3).map((item) => (
              <span key={item} className="rounded-full border border-[#d5c5a8]/40 bg-[#2a2520] px-3 py-1 text-xs text-[#d5c5a8]">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-[#353534] bg-[#131313] p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#fff2de]">Cohort Comparison</h3>
          <div className="mt-2 grid gap-2 text-sm text-[#cec5b9] md:grid-cols-3">
            <p>Your questions today: {insights.cohort_comparison.your_questions_today}</p>
            <p>Your cohort average: {insights.cohort_comparison.cohort_average_questions}</p>
            <p className={gap > 0 ? "text-[#ffcf9d]" : "text-[#9ce7ad]"}>{insights.cohort_comparison.message}</p>
          </div>
          <p className="mt-2 text-xs text-[#b7ada0]">This week&apos;s hot subject: {insights.trending_this_week.hot_subject}.</p>
        </article>
      </div>
    </section>
  );
}
