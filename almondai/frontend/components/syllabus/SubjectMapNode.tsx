"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";

export interface SubjectMapData {
  label: string;
  year: number;
  totalTopics: number;
  completedTopics: number;
  completionPct: number;
  isExpanded: boolean;
  isLoading: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  mountIndex: number;
  subjectId: string;
}

const R = 42;
const CIRC = 2 * Math.PI * R;

export const SubjectMapNode = memo(function SubjectMapNode({ data, selected }: NodeProps) {
  const d = data as unknown as SubjectMapData;
  const dashOffset = CIRC * (1 - d.completionPct / 100);

  return (
    <>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: d.isDimmed ? 0.22 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: (d.mountIndex ?? 0) * 0.055 }}
        whileHover={{ scale: 1.07 }}
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: selected || d.isHighlighted
            ? "linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.08))"
            : "linear-gradient(135deg,rgba(38,34,26,0.97),rgba(26,23,18,0.97))",
          border: `2px solid ${selected || d.isHighlighted ? "var(--aa-amber)" : "rgba(213,197,168,0.16)"}`,
          boxShadow: selected || d.isHighlighted
            ? "0 0 24px rgba(213,197,168,0.28),inset 0 0 18px rgba(213,197,168,0.05)"
            : "0 4px 28px rgba(0,0,0,0.55)",
          cursor: "pointer",
          position: "relative",
          userSelect: "none",
          transition: "border-color 0.25s,box-shadow 0.25s,background 0.25s",
        }}
      >
        {/* Progress ring */}
        <svg
          viewBox="0 0 106 106"
          style={{
            position: "absolute",
            top: -5,
            left: -5,
            width: 106,
            height: 106,
            transform: "rotate(-90deg)",
            pointerEvents: "none",
          }}
        >
          <circle cx="53" cy="53" r={R} fill="none" stroke="rgba(213,197,168,0.07)" strokeWidth={3} />
          <circle
            cx="53" cy="53" r={R}
            fill="none"
            stroke={d.completionPct >= 100 ? "#64d37c" : "var(--aa-amber)"}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.25,1,0.5,1)" }}
          />
        </svg>

        {/* Loading spinner */}
        {d.isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "2.5px solid transparent",
              borderTopColor: "var(--aa-amber)",
              zIndex: 3,
            }}
          />
        )}

        <span style={{
          fontSize: "0.58rem",
          fontWeight: 700,
          textAlign: "center",
          color: selected || d.isHighlighted ? "var(--aa-amber)" : "var(--aa-text-1)",
          lineHeight: 1.25,
          padding: "0 9px",
          zIndex: 1,
          fontFamily: "var(--aa-fb)",
          maxWidth: "100%",
          wordBreak: "break-word",
        }}>
          {d.label}
        </span>
        <span style={{ fontSize: "0.5rem", color: "rgba(213,197,168,0.4)", marginTop: 2, zIndex: 1 }}>
          {d.completionPct}%
        </span>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: d.isExpanded ? 45 : 0, scale: d.isExpanded ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          style={{
            position: "absolute",
            bottom: -11,
            left: "50%",
            marginLeft: -10,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: d.isExpanded ? "var(--aa-amber)" : "rgba(213,197,168,0.1)",
            border: "1.5px solid rgba(213,197,168,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: d.isExpanded ? "#1a1510" : "var(--aa-amber)",
            boxShadow: d.isExpanded ? "0 0 10px rgba(213,197,168,0.35)" : "none",
            transition: "background 0.2s,box-shadow 0.2s,color 0.2s",
            lineHeight: 1,
          }}
        >
          +
        </motion.div>
      </motion.div>
    </>
  );
});
