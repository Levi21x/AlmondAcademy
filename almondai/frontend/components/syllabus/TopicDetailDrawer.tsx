"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BookOpen, CheckCircle2, Circle, Clock3, Layers, X } from "lucide-react";
import type { SubjectTopic, TopicStatus } from "@/lib/api/syllabus.api";

interface TopicDetailDrawerProps {
  topic: SubjectTopic | null;
  subjectName: string;
  onClose: () => void;
  onStatusChange: (topic: SubjectTopic) => void;
  onAskTutor: (topic: SubjectTopic, subject: string) => void;
  onVisualize: (topic: SubjectTopic, subject: string) => void;
}

function statusLabel(s: TopicStatus) {
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  if (s === "needs_revision") return "Needs Revision";
  return "Not Started";
}

function statusIcon(s: TopicStatus) {
  const shared = { width: 14, height: 14 } as React.CSSProperties;
  if (s === "in_progress") return <Clock3 style={{ ...shared, color: "#d5c5a8" }} strokeWidth={2} />;
  if (s === "completed") return <CheckCircle2 style={{ ...shared, color: "#64d37c" }} strokeWidth={2} />;
  if (s === "needs_revision") return <AlertTriangle style={{ ...shared, color: "#e6b37a" }} strokeWidth={2} />;
  return <Circle style={{ ...shared, color: "#8f887e" }} strokeWidth={2} />;
}

function difficultyColor(d: string) {
  if (d === "hard") return "#ff8f8f";
  if (d === "easy") return "#64d37c";
  return "var(--aa-amber)";
}

export function TopicDetailDrawer({ topic, subjectName, onClose, onStatusChange, onAskTutor, onVisualize }: TopicDetailDrawerProps) {
  return (
    <AnimatePresence>
      {topic && (
        <>
          <motion.div
            key="drawer-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 10 }}
          />

          <motion.aside
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 290, damping: 30 }}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 320,
              background: "var(--aa-s1)",
              borderLeft: "1px solid rgba(53,53,52,0.85)",
              zIndex: 20,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "18px 16px 14px",
              borderBottom: "1px solid rgba(53,53,52,0.8)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              flexShrink: 0,
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.12em", color: "rgba(143,136,126,0.65)", marginBottom: 5,
                }}>
                  {subjectName}
                </p>
                <h2 style={{
                  fontFamily: "var(--aa-fd)", fontSize: "1.05rem", fontWeight: 800,
                  color: "var(--aa-text-1)", lineHeight: 1.22, wordBreak: "break-word",
                }}>
                  {topic.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: 6, borderRadius: 8, border: "1px solid rgba(53,53,52,0.8)",
                  background: "transparent", cursor: "pointer", color: "var(--aa-text-3)",
                  flexShrink: 0, lineHeight: 0, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(213,197,168,0.07)"; e.currentTarget.style.color = "var(--aa-text-1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--aa-text-3)"; }}
              >
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Status cycle */}
              <div>
                <p style={{ fontSize: "0.57rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(143,136,126,0.65)", marginBottom: 7 }}>
                  Status
                </p>
                <button
                  type="button"
                  onClick={() => onStatusChange(topic)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 13px", borderRadius: 100,
                    border: "1px solid rgba(213,197,168,0.18)",
                    background: "rgba(213,197,168,0.05)",
                    cursor: "pointer",
                    fontSize: "0.73rem", fontWeight: 600, color: "var(--aa-text-1)",
                    transition: "all 0.18s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.38)"; e.currentTarget.style.background = "rgba(213,197,168,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.18)"; e.currentTarget.style.background = "rgba(213,197,168,0.05)"; }}
                >
                  {statusIcon(topic.status)}
                  {statusLabel(topic.status)}
                  <span style={{ fontSize: "0.57rem", color: "var(--aa-text-3)", marginLeft: 2 }}>tap to cycle</span>
                </button>
              </div>

              {/* Metadata grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {[
                  {
                    label: "Difficulty",
                    value: topic.difficulty.charAt(0).toUpperCase() + topic.difficulty.slice(1),
                    color: difficultyColor(topic.difficulty),
                  },
                  {
                    label: "High Yield",
                    value: topic.is_high_yield ? "Yes" : "No",
                    color: topic.is_high_yield ? "#f3bc8f" : "var(--aa-text-3)",
                  },
                  {
                    label: "NEET-PG",
                    value: topic.neet_pg_relevant ? "Relevant" : "—",
                    color: topic.neet_pg_relevant ? "#cab3ff" : "var(--aa-text-3)",
                  },
                ].map((item) => (
                  <div key={item.label} style={{
                    padding: "9px 11px", borderRadius: 9,
                    background: "rgba(213,197,168,0.03)", border: "1px solid rgba(53,53,52,0.8)",
                  }}>
                    <p style={{ fontSize: "0.53rem", color: "var(--aa-text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 3 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {(topic.is_high_yield || topic.neet_pg_relevant) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {topic.is_high_yield && (
                    <span style={{
                      padding: "4px 10px", borderRadius: 100,
                      background: "rgba(243,188,143,0.1)", border: "1px solid rgba(243,188,143,0.22)",
                      color: "#f3bc8f", fontSize: "0.63rem", fontWeight: 700,
                    }}>High Yield</span>
                  )}
                  {topic.neet_pg_relevant && (
                    <span style={{
                      padding: "4px 10px", borderRadius: 100,
                      background: "rgba(202,179,255,0.07)", border: "1px solid rgba(202,179,255,0.18)",
                      color: "#cab3ff", fontSize: "0.63rem", fontWeight: 700,
                    }}>NEET-PG</span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding: "12px 16px 18px", borderTop: "1px solid rgba(53,53,52,0.8)", display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => onAskTutor(topic, subjectName)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--aa-amber)", color: "#1a1510",
                  border: "none", cursor: "pointer",
                  fontSize: "0.76rem", fontWeight: 700, fontFamily: "var(--aa-fb)",
                  transition: "background 0.18s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}
              >
                <BookOpen style={{ width: 14, height: 14 }} />
                Ask AlmondAI
              </button>
              <button
                type="button"
                onClick={() => onVisualize(topic, subjectName)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "10px 14px", borderRadius: 10,
                  background: "transparent", border: "1px solid rgba(213,197,168,0.18)",
                  cursor: "pointer",
                  fontSize: "0.76rem", fontWeight: 600, color: "var(--aa-text-2)",
                  fontFamily: "var(--aa-fb)", transition: "all 0.18s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.38)"; e.currentTarget.style.color = "var(--aa-text-1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.18)"; e.currentTarget.style.color = "var(--aa-text-2)"; }}
              >
                <Layers style={{ width: 14, height: 14 }} />
                Visualise Topic
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
