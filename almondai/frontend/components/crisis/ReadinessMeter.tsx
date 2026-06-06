"use client";

import { motion } from "framer-motion";

interface ReadinessMeterProps {
  score: number;
  breakdown?: {
    coverage_score: number;
    time_factor: number;
    weakness_score: number;
    total_topics: number;
    completed_topics: number;
    hours_available: number;
    hours_needed_estimate: number;
  };
}

const R = 54;
const CIRC = 2 * Math.PI * R; // ≈ 339.29

function scoreColor(score: number): string {
  if (score < 30) return "#e4b4a0";  // coral — critical
  if (score < 55) return "#ffcf9d";  // amber — needs work
  if (score < 75) return "#d5c5a8";  // warm gold — moderate
  return "#a8c8a5";                   // muted green — good
}

function scoreLabel(score: number): string {
  if (score < 30) return "Critical";
  if (score < 55) return "Developing";
  if (score < 75) return "Moderate";
  return "Strong";
}

export function ReadinessMeter({ score, breakdown }: ReadinessMeterProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = CIRC * (1 - clampedScore / 100);
  const color = scoreColor(clampedScore);

  const stats = breakdown
    ? [
        {
          label: "Coverage",
          value: `${Math.round(breakdown.coverage_score)}%`,
        },
        {
          label: "Time",
          value: `${Math.round(breakdown.time_factor)}%`,
        },
        {
          label: "Topics done",
          value: `${breakdown.completed_topics}/${breakdown.total_topics}`,
        },
        {
          label: "Hours left",
          value: `${Math.round(breakdown.hours_available)}h`,
        },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-[#353534] bg-[#1f1f1f] p-5">
      <p
        className="mb-4 text-[0.62rem] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--aa-text-3)" }}
      >
        Readiness Score
      </p>

      <div className="flex items-center gap-6">
        {/* SVG gauge */}
        <div className="shrink-0">
          <svg width={128} height={128} viewBox="0 0 128 128" className="-rotate-90">
            {/* Track ring */}
            <circle
              cx={64}
              cy={64}
              r={R}
              fill="none"
              stroke="#353534"
              strokeWidth={10}
            />
            {/* Score arc */}
            <motion.circle
              cx={64}
              cy={64}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            />
          </svg>
          {/* Centred score text, outside the rotation transform */}
          <div className="relative -mt-[128px] flex h-[128px] flex-col items-center justify-center">
            <motion.span
              className="font-headline text-3xl font-bold"
              style={{ color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.6 }}
            >
              {clampedScore}
            </motion.span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
              {scoreLabel(clampedScore)}
            </span>
          </div>
        </div>

        {/* Breakdown stats */}
        {stats.length > 0 && (
          <div className="grid flex-1 grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-[#353534] bg-[#131313] px-3 py-2">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--aa-text-3)" }}>
                  {s.label}
                </p>
                <p className="mt-0.5 text-sm font-bold" style={{ color: "var(--aa-text-1)" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {breakdown && breakdown.hours_needed_estimate > breakdown.hours_available && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#7a5a30] bg-[#1e1913] px-3 py-2 text-xs text-[#cdbb9a]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e6c87a]" />
          Deficit: {Math.round(breakdown.hours_needed_estimate - breakdown.hours_available)}h — sacrifice list applied
        </div>
      )}
    </div>
  );
}
