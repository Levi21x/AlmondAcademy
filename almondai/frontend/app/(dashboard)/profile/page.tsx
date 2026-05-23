"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, CheckCircle2, CircleAlert } from "lucide-react";

import { Toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { getAchievements, type AchievementsCatalog } from "@/lib/api/achievements.api";
import { getMemoryInsights, generateWeeklySummary, resolveStruggle, type MemoryInsights, type WeeklySummary } from "@/lib/api/memory.api";
import { getStreak } from "@/lib/api/progress.api";
import { getQuickSummary, type QuickSummary } from "@/lib/api/weakness.api";
import { updateProfile, type TeachingStyle } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/authStore";
import { useProfile } from "@/lib/hooks/useProfile";
import { categoryMeta } from "@/lib/utils/helpers";

interface ToastState {
  message: string;
  variant: "success" | "error" | "warning" | "info";
}

const styleOptions: Array<{ value: TeachingStyle; label: string; desc: string; emoji: string }> = [
  { value: "concise", label: "Concise", desc: "Short & direct answers", emoji: "⚡" },
  { value: "detailed", label: "Detailed", desc: "Deep explanations with reasoning", emoji: "📖" },
  { value: "visual", label: "Visual", desc: "Diagrams & flowcharts", emoji: "🎨" },
  { value: "conversational", label: "Conversational", desc: "Like talking to a friend", emoji: "💬" },
];

const categoryDescriptions: Record<string, string> = {
  survivor: "High-urgency learner — AlmondAI is optimized for focused exam-season performance",
  sprinter: "Intensive learner — AlmondAI delivers high-yield content for your study sprints",
  anxious_grinder: "Steady learner — AlmondAI provides calm, structured guidance",
  passionate: "Deep learner — AlmondAI goes beyond the syllabus to satisfy your curiosity",
  lost: "Building foundations — AlmondAI starts from basics and builds up steadily",
  strategic_climber: "Rank-focused learner — AlmondAI prioritizes NEET-PG high yield content",
};

const tierColors: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  bronze: { bg: "rgba(184,115,51,0.1)", text: "#cd7f32", border: "rgba(184,115,51,0.3)", emoji: "🥉" },
  silver: { bg: "rgba(192,192,192,0.1)", text: "#a8a8a8", border: "rgba(192,192,192,0.3)", emoji: "🥈" },
  gold: { bg: "rgba(230,200,122,0.12)", text: "#e6c87a", border: "rgba(230,200,122,0.35)", emoji: "🥇" },
  platinum: { bg: "rgba(213,197,168,0.12)", text: "#d5c5a8", border: "rgba(213,197,168,0.35)", emoji: "💎" },
};

function daysSince(iso?: string): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProfilePage() {
  const token = useAuthStore((state) => state.accessToken);
  const { data: profile, refetch: refetchProfile } = useProfile();

  const [insights, setInsights] = useState<MemoryInsights | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [daysActive, setDaysActive] = useState(0);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>("conversational");
  const [resolvedTopics, setResolvedTopics] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [weaknessSummary, setWeaknessSummary] = useState<QuickSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementsCatalog | null>(null);

  useEffect(() => {
    if (!profile?.teaching_style) return;
    setTeachingStyle(profile.teaching_style);
  }, [profile?.teaching_style]);

  useEffect(() => {
    if (!token) return;

    setLoadingInsights(true);
    Promise.all([getMemoryInsights(token), getStreak(token), getAchievements(token)])
      .then(([memoryData, streakData, achievementData]) => {
        setInsights(memoryData);
        setSummary(memoryData.latest_summary);
        setDaysActive(streakData.total_active_days ?? 0);
        setAchievements(achievementData);
      })
      .catch(() => { setInsights(null); setAchievements(null); })
      .finally(() => setLoadingInsights(false));

    void getQuickSummary(token)
      .then((s) => setWeaknessSummary(s))
      .catch(() => setWeaknessSummary(null));
  }, [token]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Student";
  const fullName = profile?.full_name ?? "Student";
  const initials = profile?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "AS";

  const noMemoryYet = !insights || insights.memory_stats.total_interactions <= 0;
  const summaryStale = !summary?.generated_at || daysSince(summary.generated_at) > 7;

  const category = profile?.student_category ?? "sprinter";
  const categoryInfo = categoryMeta[category] ?? categoryMeta.sprinter;
  const profileDescription = categoryDescriptions[category] ?? categoryDescriptions.sprinter;

  const handleResolve = async (topic: string) => {
    if (!token) return;
    try {
      await resolveStruggle(token, topic);
      setResolvedTopics((prev) => ({ ...prev, [topic]: true }));
      setToast({ message: "Marked as resolved.", variant: "success" });
    } catch {
      setToast({ message: "Failed to mark topic as resolved.", variant: "error" });
    }
  };

  const handleGenerateSummary = async () => {
    if (!token) return;
    try {
      setGeneratingSummary(true);
      const generated = await generateWeeklySummary(token);
      setSummary(generated);
      setToast({ message: "Weekly summary generated.", variant: "success" });
    } catch {
      setToast({ message: "Could not generate weekly summary right now.", variant: "error" });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleTeachingStyleChange = async (value: TeachingStyle) => {
    if (!token) return;
    setTeachingStyle(value);
    try {
      setSavingStyle(true);
      await updateProfile(token, { teaching_style: value });
      await refetchProfile();
      setToast({ message: "Teaching style updated.", variant: "success" });
    } catch {
      setToast({ message: "Failed to update teaching style.", variant: "error" });
    } finally {
      setSavingStyle(false);
    }
  };

  const cardStyle: React.CSSProperties = { background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px" };
  const sectionTitleStyle: React.CSSProperties = { fontFamily: "var(--aa-fd)", fontSize: "1.15rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 4 };

  return (
    <div style={{ animation: "aaFadeUp 0.35s ease-out both", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Profile header */}
      <div style={{ ...cardStyle, borderTop: "2px solid rgba(213,197,168,0.3)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#3a3226,#2a2218)", border: "2px solid rgba(213,197,168,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 24px rgba(213,197,168,0.1)" }}>
            <span style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 800, color: "var(--aa-amber)" }}>{initials}</span>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.025em", marginBottom: 4 }}>{fullName}</h1>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 8 }}>Welcome back, {firstName}</p>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", marginBottom: 12, lineHeight: 1.5 }}>{profileDescription}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.2)", borderRadius: 100, padding: "4px 12px", fontWeight: 600 }}>
                {categoryInfo.label}
              </span>
              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", background: "rgba(76,70,61,0.12)", border: "1px solid rgba(76,70,61,0.3)", borderRadius: 100, padding: "4px 12px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {(profile?.mode || "mbbs").replace("_", "-")}
              </span>
            </div>
          </div>

          <Button variant="secondary">Edit Profile</Button>
        </div>
      </div>

      {/* Weakness snapshot */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={sectionTitleStyle}>Weakness Prediction Snapshot</h2>
          <Link href="/insights" style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-amber)", textDecoration: "none" }}>
            Open Insights →
          </Link>
        </div>
        {!weaknessSummary?.has_analysis ? (
          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>No analysis available yet. Run predictive analysis to view your risk map.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
            {[
              { label: "Readiness score", value: weaknessSummary.overall_readiness_score, color: "#69db8b" },
              { label: "Critical gaps", value: weaknessSummary.critical_count, color: "var(--aa-coral)" },
              { label: "High-risk topics", value: weaknessSummary.high_risk_count, color: "#e6c87a" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.35)", background: "rgba(14,14,14,0.4)" }}>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.8rem", fontWeight: 800, color: item.color, letterSpacing: "-0.02em" }}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievement cabinet */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={sectionTitleStyle}>🏆 Achievement Cabinet</h2>
          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)" }}>
            {achievements?.unlocked_count ?? 0}/{achievements?.total_badges ?? 0} unlocked
          </p>
        </div>

        {achievements?.next_streak_milestone && (
          <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(213,197,168,0.2)", background: "rgba(213,197,168,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)", fontWeight: 500 }}>Next streak badge</p>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>
                {achievements.next_streak_milestone.current_streak}/{achievements.next_streak_milestone.target_streak} days
              </p>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min((achievements.next_streak_milestone.current_streak / Math.max(achievements.next_streak_milestone.target_streak, 1)) * 100, 100)}%`,
                background: "linear-gradient(90deg,rgba(213,197,168,0.6),var(--aa-amber))",
                borderRadius: 3,
                boxShadow: "0 0 8px rgba(213,197,168,0.25)",
              }} />
            </div>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginTop: 6 }}>
              {achievements.next_streak_milestone.remaining_days > 0
                ? `${achievements.next_streak_milestone.remaining_days} days to ${achievements.next_streak_milestone.badge_name ?? "next milestone"}`
                : `Milestone reached: ${achievements.next_streak_milestone.badge_name ?? "streak badge"}`}
            </p>
          </div>
        )}

        {(achievements?.items ?? []).some((b) => b.unlocked) ? (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
            {achievements?.items
              .filter((b) => b.unlocked)
              .slice(0, 9)
              .map((badge) => {
                const tier = tierColors[badge.badge_tier?.toLowerCase() ?? ""] ?? tierColors.bronze;
                return (
                  <div key={badge.badge_key} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${tier.border}`, background: tier.bg }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{tier.emoji}</span>
                      <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", fontWeight: 700, color: tier.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>{badge.badge_tier}</span>
                    </div>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 4 }}>{badge.badge_name}</p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", lineHeight: 1.45 }}>{badge.description}</p>
                  </div>
                );
              })}
          </div>
        ) : (
          <div style={{ padding: "24px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
            No achievements unlocked yet. Keep studying and practicing to fill this cabinet.
          </div>
        )}
      </div>

      {/* Memory stats */}
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>What AlmondAI Remembers</h2>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 16, lineHeight: 1.5 }}>
          AlmondAI learns from every interaction to give you increasingly personalized help
        </p>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", marginBottom: 20 }}>
          {[
            { label: "Conversations", value: insights?.memory_stats.total_interactions ?? 0 },
            { label: "Topics covered", value: (insights?.memory_stats as { topics_covered?: number } | undefined)?.topics_covered ?? 0 },
            { label: "Days active", value: daysActive },
          ].map((item) => (
            <div key={item.label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)" }}>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{item.label}</p>
              <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.8rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {!loadingInsights && noMemoryYet && (
          <div style={{ padding: "28px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", textAlign: "center" }}>
            <Brain style={{ width: 36, height: 36, color: "rgba(213,197,168,0.4)", margin: "0 auto 12px" }} strokeWidth={1.5} />
            <h3 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 700, color: "var(--aa-text-1)", marginBottom: 8 }}>AlmondAI is still learning about you</h3>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 16, lineHeight: 1.5 }}>
              The more you study with AlmondAI the better it understands your learning patterns
            </p>
            <Link href="/ai-tutor" style={{ display: "inline-flex", alignItems: "center", padding: "10px 20px", borderRadius: 100, background: "rgba(213,197,168,0.9)", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              Start a study session
            </Link>
          </div>
        )}
      </div>

      {/* Struggle patterns */}
      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>Topics You Find Challenging</h2>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 16, lineHeight: 1.5 }}>
          AlmondAI has noticed you ask about these topics repeatedly
        </p>

        {insights?.struggle_patterns?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.struggle_patterns.map((pattern) => {
              const isResolved = resolvedTopics[pattern.topic] || pattern.is_resolved;
              return (
                <div key={pattern.topic} style={{ padding: "16px", borderRadius: 12, border: `1px solid ${isResolved ? "rgba(105,219,139,0.2)" : "rgba(76,70,61,0.35)"}`, background: isResolved ? "rgba(105,219,139,0.03)" : "rgba(14,14,14,0.4)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        {isResolved
                          ? <CheckCircle2 style={{ width: 16, height: 16, color: "#7ed957", flexShrink: 0 }} strokeWidth={2} />
                          : <CircleAlert style={{ width: 16, height: 16, color: "#e6c87a", flexShrink: 0 }} strokeWidth={2} />
                        }
                        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 600, color: "var(--aa-text-1)", textDecoration: isResolved ? "line-through" : "none", opacity: isResolved ? 0.6 : 1 }}>
                          {pattern.topic}
                        </span>
                        {pattern.subject && (
                          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 100, padding: "2px 8px" }}>
                            {pattern.subject}
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginLeft: 24 }}>
                        Asked {pattern.mention_count} times · {pattern.last_mentioned}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/ai-tutor?subject=${encodeURIComponent(pattern.subject || "Medicine")}&topic=${encodeURIComponent(pattern.topic)}`}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(76,70,61,0.45)", background: "transparent", color: "var(--aa-text-2)", fontFamily: "var(--aa-fb)", fontSize: "0.78rem", textDecoration: "none" }}
                      >
                        Ask AlmondAI
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleResolve(pattern.topic)}
                        disabled={isResolved}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: isResolved ? "rgba(76,70,61,0.2)" : "rgba(213,197,168,0.9)", color: isResolved ? "var(--aa-text-3)" : "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.78rem", fontWeight: 600, cursor: isResolved ? "not-allowed" : "pointer", transition: "all 0.18s" }}
                      >
                        {isResolved ? "Resolved" : "Mark Resolved"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "20px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
            No struggle patterns identified yet.
          </div>
        )}
      </div>

      {/* Weekly summary */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={sectionTitleStyle}>This Week&apos;s Learning Summary</h2>
          {(!summary || summaryStale) && (
            <button
              type="button"
              onClick={() => void handleGenerateSummary()}
              disabled={generatingSummary}
              style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "rgba(213,197,168,0.9)", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.82rem", fontWeight: 600, cursor: generatingSummary ? "not-allowed" : "pointer", opacity: generatingSummary ? 0.6 : 1, transition: "all 0.18s" }}
            >
              {generatingSummary ? "Generating..." : "Generate Summary"}
            </button>
          )}
        </div>

        {summary ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-1)", lineHeight: 1.65 }}>{summary.summary}</p>

            {[
              { key: "strong_areas", label: "Strong areas", color: "#7ed957", bg: "rgba(25,48,31,0.6)", border: "rgba(105,219,139,0.2)" },
              { key: "weak_areas", label: "Weak areas", color: "#f4cd84", bg: "rgba(49,38,21,0.6)", border: "rgba(230,200,122,0.2)" },
              { key: "recommended_focus", label: "Recommended focus", color: "var(--aa-amber)", bg: "rgba(42,37,32,0.6)", border: "rgba(213,197,168,0.2)" },
            ].map((section) => {
              const items = summary[section.key as keyof WeeklySummary] as string[] | undefined;
              if (!items?.length) return null;
              return (
                <div key={section.key}>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: section.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{section.label}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {items.map((topic) => (
                      <span key={topic} style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: section.color, background: section.bg, border: `1px solid ${section.border}`, borderRadius: 100, padding: "4px 12px" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {summary.study_pattern && (
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", lineHeight: 1.6 }}>{summary.study_pattern}</p>
            )}

            {summary.encouragement && (
              <div style={{ padding: "16px 20px", borderRadius: 12, borderLeft: "3px solid var(--aa-amber)", background: "rgba(213,197,168,0.05)" }}>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontStyle: "italic", color: "var(--aa-text-1)", lineHeight: 1.6 }}>{summary.encouragement}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: "20px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
            No weekly summary generated yet.
          </div>
        )}
      </div>

      {/* Learning profile / teaching style */}
      <div style={cardStyle}>
        <h2 style={{ ...sectionTitleStyle, marginBottom: 16 }}>Your Learning Profile</h2>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
          <div>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Teaching style {savingStyle && <span style={{ color: "var(--aa-text-3)", opacity: 0.6 }}>Saving...</span>}
            </p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
              {styleOptions.map((opt) => {
                const active = teachingStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => void handleTeachingStyleChange(opt.value)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1.5px solid ${active ? "rgba(213,197,168,0.45)" : "rgba(76,70,61,0.35)"}`,
                      background: active ? "rgba(213,197,168,0.08)" : "rgba(14,14,14,0.4)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.18s",
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{opt.emoji}</div>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", fontWeight: 600, color: active ? "var(--aa-amber)" : "var(--aa-text-1)", marginBottom: 2 }}>{opt.label}</p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)" }}>{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Student category
            </p>
            <div style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(213,197,168,0.2)", background: "rgba(213,197,168,0.04)", marginBottom: 12 }}>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-amber)", marginBottom: 6 }}>{categoryInfo.label}</p>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", lineHeight: 1.5 }}>{categoryInfo.description}</p>
            </div>
            <Link
              href="/onboarding"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--aa-amber)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--aa-text-3)"; }}
            >
              ✨ Retake assessment
            </Link>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
