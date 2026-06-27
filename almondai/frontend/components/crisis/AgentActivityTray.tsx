"use client";

import { CheckCircle, XCircle, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentResult } from "@/lib/api/crisis.api";

const AGENT_META: Record<string, { label: string; pod: string; description: string }> = {
  planner:        { label: "Planner",        pod: "A", description: "Building day-by-day schedule" },
  sacrifice:      { label: "Sacrifice",      pod: "A", description: "Calculating what to skip" },
  examiner_intel: { label: "Examiner Intel", pod: "A", description: "Reading PYQ patterns" },
  notes_auditor:  { label: "Notes Auditor",  pod: "B", description: "Checking your notes" },
  recall_forge:   { label: "Recall Forge",   pod: "B", description: "Forging recall cues" },
  mentor:         { label: "Mentor",         pod: "C", description: "Calibrating tone" },
  wellbeing:      { label: "Wellbeing",      pod: "C", description: "Checking sleep & stress" },
};

const ALL_AGENTS = Object.keys(AGENT_META);

interface Props {
  results: AgentResult[] | null;
}

export function AgentActivityTray({ results }: Props) {
  const resultMap = new Map(results?.map((r) => [r.agent, r]) ?? []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 8,
      }}
    >
      {ALL_AGENTS.map((agentKey, i) => {
        const meta = AGENT_META[agentKey]!;
        const result = resultMap.get(agentKey);
        const isDone = !!result;
        const isSuccess = result?.success ?? false;

        return (
          <motion.div
            key={agentKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--aa-r)",
              background: isDone
                ? isSuccess
                  ? "rgba(34,197,94,0.06)"
                  : "rgba(228,180,160,0.06)"
                : "var(--aa-s3)",
              border: `1px solid ${
                isDone
                  ? isSuccess
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(228,180,160,0.25)"
                  : "var(--aa-border)"
              }`,
              transition: "background 0.3s, border-color 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "var(--aa-fb)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--aa-amber)",
                  textTransform: "uppercase",
                }}
              >
                POD {meta.pod}
              </span>
              <AnimatePresence mode="wait">
                {!isDone ? (
                  <motion.span
                    key="spinning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ color: "var(--aa-text-3)", display: "flex" }}
                  >
                    <Loader size={12} strokeWidth={2} style={{ animation: "aaSpinSlow 1s linear infinite" }} />
                  </motion.span>
                ) : isSuccess ? (
                  <motion.span
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ color: "var(--aa-green)", display: "flex" }}
                  >
                    <CheckCircle size={12} strokeWidth={2} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="fail"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ color: "var(--aa-coral)", display: "flex" }}
                  >
                    <XCircle size={12} strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 2 }}>
              {meta.label}
            </p>
            <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", lineHeight: 1.3 }}>
              {isDone && result ? (
                isSuccess
                  ? `${result.duration_ms}ms`
                  : "fallback used"
              ) : meta.description}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
