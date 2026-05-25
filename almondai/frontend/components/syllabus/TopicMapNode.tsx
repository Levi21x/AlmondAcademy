"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";

export interface TopicMapData {
  label: string;
  status: "not_started" | "in_progress" | "completed" | "needs_revision";
  isHighYield: boolean;
  isNeetPg: boolean;
  difficulty: string;
  isDimmed: boolean;
  isHighlighted: boolean;
  animationDelay: number;
  topicId: string;
  subjectId: string;
}

const STATUS_STYLES: Record<string, { border: string; dot: string; text: string; bg: string }> = {
  not_started: { border: "rgba(143,136,126,0.25)", dot: "#4a4642", text: "var(--aa-text-3)", bg: "rgba(28,27,26,0.96)" },
  in_progress:  { border: "rgba(213,197,168,0.35)", dot: "#d5c5a8", text: "var(--aa-text-1)", bg: "rgba(30,26,20,0.96)" },
  completed:    { border: "rgba(100,211,124,0.35)", dot: "#64d37c", text: "var(--aa-text-1)", bg: "rgba(16,30,19,0.96)" },
  needs_revision:{ border: "rgba(230,179,122,0.38)", dot: "#e6b37a", text: "var(--aa-text-1)", bg: "rgba(30,22,12,0.96)" },
};

export const TopicMapNode = memo(function TopicMapNode({ data, selected }: NodeProps) {
  const d = data as unknown as TopicMapData;
  const s = STATUS_STYLES[d.status] ?? STATUS_STYLES.not_started;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: d.isDimmed ? 0.18 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: d.animationDelay }}
        whileHover={{ scale: 1.07, zIndex: 900 }}
        style={{
          width: 130,
          minHeight: 52,
          borderRadius: 10,
          background: selected ? "rgba(213,197,168,0.1)" : s.bg,
          border: `1.5px solid ${selected ? "var(--aa-amber)" : s.border}`,
          boxShadow: selected
            ? "0 0 18px rgba(213,197,168,0.22)"
            : "0 2px 14px rgba(0,0,0,0.45)",
          padding: "7px 9px",
          cursor: "pointer",
          transition: "border-color 0.2s,box-shadow 0.2s,background 0.2s",
          position: "relative",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
          {/* Pulsing dot */}
          <motion.div
            animate={d.isHighlighted ? { scale: [1, 1.7, 1], opacity: [1, 0.45, 1] } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.75, repeat: d.isHighlighted ? Infinity : 0 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: s.dot,
              marginTop: 4,
              flexShrink: 0,
              boxShadow: d.isHighlighted ? `0 0 7px ${s.dot}` : "none",
            }}
          />
          <span style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            color: s.text,
            lineHeight: 1.32,
            fontFamily: "var(--aa-fb)",
            wordBreak: "break-word",
          }}>
            {d.label}
          </span>
        </div>

        {(d.isHighYield || d.isNeetPg) && (
          <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
            {d.isHighYield && (
              <span style={{
                fontSize: "0.47rem", padding: "1px 5px", borderRadius: 100,
                background: "rgba(243,188,143,0.09)", border: "1px solid rgba(243,188,143,0.2)",
                color: "#f3bc8f", fontWeight: 700, letterSpacing: "0.04em",
              }}>HY</span>
            )}
            {d.isNeetPg && (
              <span style={{
                fontSize: "0.47rem", padding: "1px 5px", borderRadius: 100,
                background: "rgba(202,179,255,0.08)", border: "1px solid rgba(202,179,255,0.17)",
                color: "#cab3ff", fontWeight: 700,
              }}>PG</span>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
});
