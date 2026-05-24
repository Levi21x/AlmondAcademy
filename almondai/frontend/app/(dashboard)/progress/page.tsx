"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getAchievements, type AchievementsCatalog } from "@/lib/api/achievements.api";
import {
  getProgressOverview,
  getSubjectProgress,
  getWeeklyData,
  type ProgressOverview,
  type SubjectProgress,
  type WeeklyData,
} from "@/lib/api/progress.api";
import { useAuthStore } from "@/lib/store/authStore";

const tierColors: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  bronze: { bg: "rgba(184,115,51,0.1)", text: "#cd7f32", border: "rgba(184,115,51,0.3)", emoji: "🥉" },
  silver: { bg: "rgba(192,192,192,0.1)", text: "#a8a8a8", border: "rgba(192,192,192,0.3)", emoji: "🥈" },
  gold: { bg: "rgba(230,200,122,0.12)", text: "#e6c87a", border: "rgba(230,200,122,0.35)", emoji: "🥇" },
  platinum: { bg: "rgba(213,197,168,0.12)", text: "#d5c5a8", border: "rgba(213,197,168,0.35)", emoji: "💎" },
};

function initialYearFilter(year: number | null | undefined): "all" | "year1" | "year2" | "year3plus" {
  if (year === 1) return "year1";
  if (year === 2) return "year2";
  if (year && year >= 3) return "year3plus";
  return "all";
}

export default function ProgressPage() {
  const token = useAuthStore((state) => state.accessToken);
  const profile = useAuthStore((state) => state.profile);
  const router = useRouter();

  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [achievements, setAchievements] = useState<AchievementsCatalog | null>(null);
  const [yearFilter, setYearFilter] = useState<"all" | "year1" | "year2" | "year3plus">(() =>
    initialYearFilter(profile?.current_year),
  );
  const [subjectHover, setSubjectHover] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const activeToken = token;
    let mounted = true;

    async function loadProgress() {
      setLoading(true);
      setError(null);

      try {
        const [overviewData, weeklyData, subjectData, achievementsData] = await Promise.all([
          getProgressOverview(activeToken),
          getWeeklyData(activeToken),
          getSubjectProgress(activeToken),
          getAchievements(activeToken),
        ]);

        if (!mounted) return;

        setOverview(overviewData);
        setWeekly(weeklyData);
        setSubjects(subjectData);
        setAchievements(achievementsData);
      } catch (caughtError) {
        console.error(caughtError);
        if (!mounted) return;
        setError("Progress data is temporarily unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProgress();
    return () => { mounted = false; };
  }, [token]);

  const filteredSubjects = useMemo(() => {
    if (yearFilter === "year1") return subjects.filter((s) => s.year === 1);
    if (yearFilter === "year2") return subjects.filter((s) => s.year === 2);
    if (yearFilter === "year3plus") return subjects.filter((s) => s.year >= 3);
    return subjects;
  }, [subjects, yearFilter]);

  const maxQuestions = Math.max(1, ...(weekly?.days.map((d) => d.questions_asked) ?? [0]));
  const totalQuestionsEver = subjects.reduce((sum, s) => sum + (s.questions_asked ?? 0), 0);
  const unlockedBadges = (achievements?.items ?? []).filter((b) => b.unlocked);
  const nextMilestone = achievements?.next_streak_milestone ?? null;

  const statCards = [
    {
      emoji: "🔥",
      label: "Study Streak",
      value: overview?.streak.current_streak ?? 0,
      unit: "day streak",
      note: overview?.streak.current_streak ? `Best: ${overview?.streak.longest_streak ?? 0} days` : "Start your streak today",
      accent: "#e4b4a0",
    },
    {
      emoji: "✅",
      label: "Topics Done",
      value: overview?.syllabus.completed ?? 0,
      unit: `of ${overview?.syllabus.total_topics ?? 0} total`,
      note: `${overview?.syllabus.overall_percentage ?? 0}% complete`,
      accent: "#69db8b",
    },
    {
      emoji: "🧠",
      label: "Questions Asked",
      value: totalQuestionsEver,
      unit: "answered",
      note: `${overview?.this_week.questions_asked ?? 0} this week`,
      accent: "var(--aa-amber)",
    },
    {
      emoji: "📅",
      label: "Active Days",
      value: overview?.streak.total_active_days ?? 0,
      unit: "days studied",
      note: `${overview?.streak.longest_streak ?? 0} day best streak`,
      accent: "var(--aa-teal)",
    },
  ];

  return (
    <div style={{ animation: "aaFadeUp 0.35s ease-out both" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.028em", marginBottom: 6 }}>
          Your Progress
        </h1>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)" }}>
          Track your study activity, streaks, and subject mastery.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", marginBottom: 20 }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              borderRadius: 16,
              border: "1px solid rgba(76,70,61,0.4)",
              background: "var(--aa-s2)",
              padding: "20px",
              borderTop: `2px solid ${card.accent}`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>{card.emoji}</span>
              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{card.label}</span>
            </div>
            <p style={{ fontFamily: "var(--aa-fd)", fontSize: "2.2rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
              {card.value}
            </p>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", marginBottom: 8 }}>{card.unit}</p>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: card.accent }}>{card.note}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(228,180,160,0.3)", background: "rgba(228,180,160,0.06)", marginBottom: 16, fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>
          {error}
        </div>
      )}

      {/* Weekly activity */}
      <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 20 }}>
          This Week
        </h2>
        <div style={{ display: "flex", height: 120, alignItems: "flex-end", gap: 8 }}>
          {(weekly?.days ?? []).map((day) => {
            const ratio = day.questions_asked / maxQuestions;
            const height = Math.max(4, Math.round(ratio * 96));
            const isToday = day.date === new Date().toLocaleDateString("en-CA");
            return (
              <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ position: "relative", width: "100%", height }} title={`${day.questions_asked} questions`}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "4px 4px 0 0",
                      background: day.was_active
                        ? isToday
                          ? "linear-gradient(180deg,#fff2de,#e6c87a)"
                          : "linear-gradient(180deg,rgba(213,197,168,0.7),rgba(213,197,168,0.4))"
                        : "rgba(76,70,61,0.2)",
                      boxShadow: day.was_active && isToday ? "0 0 16px rgba(230,200,122,0.35)" : "none",
                      transition: "all 0.2s",
                    }}
                  />
                </div>
                <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", color: isToday ? "var(--aa-amber)" : "var(--aa-text-3)", fontWeight: isToday ? 700 : 400 }}>
                  {day.day_label}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", marginTop: 16 }}>
          {overview?.this_week.questions_asked ?? 0} questions · {overview?.this_week.topics_completed ?? 0} topics · {overview?.this_week.active_days ?? 0} active days
        </p>
      </div>

      {/* Achievements */}
      <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>
            🏆 Achievements
          </h2>
          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)" }}>
            {achievements?.unlocked_count ?? unlockedBadges.length}/{achievements?.total_badges ?? 0} unlocked
          </span>
        </div>

        {nextMilestone && (
          <div style={{ marginBottom: 20, padding: "16px", borderRadius: 12, border: "1px solid rgba(213,197,168,0.2)", background: "rgba(213,197,168,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)", fontWeight: 500 }}>Next streak milestone</p>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>
                {nextMilestone.current_streak}/{nextMilestone.target_streak} days
              </p>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min((nextMilestone.current_streak / Math.max(nextMilestone.target_streak, 1)) * 100, 100)}%`,
                  background: "linear-gradient(90deg, rgba(213,197,168,0.7) 0%, var(--aa-amber) 100%)",
                  borderRadius: 3,
                  boxShadow: "0 0 8px rgba(213,197,168,0.3)",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginTop: 8 }}>
              {nextMilestone.remaining_days > 0
                ? `${nextMilestone.remaining_days} days to ${nextMilestone.badge_name ?? "next streak badge"}`
                : `Milestone reached: ${nextMilestone.badge_name ?? "streak badge"}`}
            </p>
          </div>
        )}

        {unlockedBadges.length > 0 ? (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {unlockedBadges.slice(0, 9).map((badge) => {
              const tier = tierColors[badge.badge_tier?.toLowerCase() ?? ""] ?? tierColors.bronze;
              return (
                <div key={badge.badge_key} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${tier.border}`, background: tier.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{tier.emoji}</span>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", fontWeight: 700, color: tier.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {badge.badge_tier}
                    </span>
                  </div>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 4 }}>{badge.badge_name}</p>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", lineHeight: 1.45 }}>{badge.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "24px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
            Unlock achievements by asking questions, practicing MCQs, and maintaining your streak.
          </div>
        )}
      </div>

      {/* Subject progress */}
      <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>
            Subject Progress
          </h2>
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { key: "all", label: "All" },
              { key: "year1", label: "Year 1" },
              { key: "year2", label: "Year 2" },
              { key: "year3plus", label: "Year 3+" },
            ] as const).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setYearFilter(f.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 100,
                  border: `1px solid ${yearFilter === f.key ? "rgba(213,197,168,0.4)" : "rgba(76,70,61,0.4)"}`,
                  background: yearFilter === f.key ? "rgba(213,197,168,0.1)" : "transparent",
                  color: yearFilter === f.key ? "var(--aa-amber)" : "var(--aa-text-3)",
                  fontFamily: "var(--aa-fb)",
                  fontSize: "0.78rem",
                  fontWeight: yearFilter === f.key ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredSubjects.map((subject) => {
            const key = `${subject.subject_name}-${subject.year}`;
            const isHovered = subjectHover === key;
            const pct = subject.completion_percentage;
            const barColor = pct <= 25 ? "#7b7368" : pct <= 50 ? "rgba(213,197,168,0.7)" : pct <= 75 ? "#e6d5b8" : "#fff2de";
            return (
              <button
                key={key}
                type="button"
                onClick={() => router.push(`/syllabus?subject=${encodeURIComponent(subject.subject_name)}`)}
                onMouseEnter={() => setSubjectHover(key)}
                onMouseLeave={() => setSubjectHover(null)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${isHovered ? "rgba(76,70,61,0.6)" : "rgba(76,70,61,0.3)"}`,
                  background: isHovered ? "rgba(31,31,31,0.8)" : "rgba(14,14,14,0.4)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.18s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-1)", fontWeight: 500 }}>{subject.subject_name}</span>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 100, padding: "2px 8px" }}>
                      Y{subject.year}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: barColor }}>{pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: pct > 75 ? "linear-gradient(90deg,rgba(213,197,168,0.6),#fff2de)" : barColor,
                      borderRadius: 3,
                      boxShadow: pct > 50 ? `0 0 6px ${barColor}50` : "none",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
