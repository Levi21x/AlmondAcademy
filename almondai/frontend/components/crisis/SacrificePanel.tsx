"use client";

import { TrendingDown, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { CrisisSacrifice } from "@/lib/api/crisis.api";

interface SacrificePanelProps {
  sacrifice: CrisisSacrifice;
}

const listItem = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 180, damping: 22 } },
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

export function SacrificePanel({ sacrifice }: SacrificePanelProps) {
  const {
    sacrifice_list = [],
    estimated_marks_coverage = 70,
    total_sacrifice_hours = 0,
  } = sacrifice;

  const coverageColor =
    estimated_marks_coverage >= 75 ? "#a8c8a5" :
    estimated_marks_coverage >= 55 ? "#d5c5a8" :
    "#ffcf9d";

  return (
    <div className="rounded-2xl border border-[#353534] bg-[#1f1f1f] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingDown size={14} strokeWidth={2} style={{ color: "var(--aa-coral)" }} />
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
            Sacrifice Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          {total_sacrifice_hours > 0 && (
            <span className="text-xs text-[#8f887e]">
              {Math.round(total_sacrifice_hours)}h reclaimed
            </span>
          )}
          <div
            className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ background: `${coverageColor}14`, color: coverageColor }}
          >
            {Math.round(estimated_marks_coverage)}% marks achievable
          </div>
        </div>
      </div>

      {sacrifice_list.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#353534] bg-[#131313] px-4 py-4 text-sm text-[#8f887e]">
          <CheckCircle size={14} strokeWidth={1.9} />
          No sacrifices needed — your time is sufficient.
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-[#8f887e]">Skip these — low ROI given your time constraint:</p>
          <motion.ul
            variants={container}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {sacrifice_list.map((item, i) => (
              <motion.li
                key={`${item.subject}-${item.topic}-${i}`}
                variants={listItem}
                className="flex items-start gap-3 rounded-lg border border-[#353534] bg-[#131313] px-3 py-2.5"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e4b4a0]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#cec5b9] line-through decoration-[#8f887e]">
                      {item.topic}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.06em]"
                      style={{ background: "rgba(53,53,52,0.6)", color: "var(--aa-text-3)" }}
                    >
                      {item.subject}
                    </span>
                    {item.hours_saved > 0 && (
                      <span className="text-[0.6rem] text-[#8f887e]">
                        +{item.hours_saved}h saved
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <p className="mt-0.5 text-xs text-[#8f887e]">{item.reason}</p>
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </>
      )}
    </div>
  );
}
