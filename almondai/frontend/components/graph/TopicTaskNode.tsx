import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock3, Target } from "lucide-react";

import type { PlanPriority } from "@/lib/api/planner.api";
import type { TopicTaskNodeType } from "./planGraphTypes";

const handleStyle = { width: 7, height: 7, background: "#4c463d", border: "none" } as const;

function priorityColor(priority: PlanPriority): string {
  if (priority === "high") return "#e4b4a0";
  if (priority === "low") return "#8f887e";
  return "#d5c5a8";
}

function TopicTaskNodeImpl({ data }: NodeProps<TopicTaskNodeType>) {
  const isToday = data.temporal === "today";
  const isPast = data.temporal === "past";
  const visibleTopics = data.topics.slice(0, 3);
  const hiddenCount = data.topics.length - visibleTopics.length;

  return (
    <div
      style={{
        width: 290,
        boxSizing: "border-box",
        padding: "14px 16px",
        borderRadius: 16,
        border: `1px solid ${isToday ? "rgba(213,197,168,0.5)" : "rgba(76,70,61,0.45)"}`,
        background: "rgba(31,31,31,0.95)",
        boxShadow: isToday
          ? "0 0 0 1px rgba(213,197,168,0.16), 0 16px 36px rgba(0,0,0,0.5)"
          : "0 8px 22px rgba(0,0,0,0.38)",
        opacity: isPast ? 0.66 : 1,
        transition: "transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease",
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--aa-fb)",
              fontSize: "0.62rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: isToday ? "#2e2618" : "#d5c5a8",
              background: isToday ? "#d5c5a8" : "rgba(213,197,168,0.1)",
              border: isToday ? "none" : "1px solid rgba(213,197,168,0.2)",
              borderRadius: 100,
              padding: "3px 9px",
              flexShrink: 0,
            }}
          >
            Day {data.day}
          </span>
          <span
            style={{
              fontFamily: "var(--aa-fd)",
              fontSize: "0.95rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fff2de",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.focus}
          </span>
        </div>
        {isToday ? (
          <span
            style={{
              fontFamily: "var(--aa-fb)",
              fontSize: "0.58rem",
              fontWeight: 700,
              color: "#69db8b",
              background: "rgba(105,219,139,0.1)",
              border: "1px solid rgba(105,219,139,0.25)",
              borderRadius: 100,
              padding: "2px 8px",
              flexShrink: 0,
            }}
          >
            TODAY
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 5 }}>
        {visibleTopics.map((topic, index) => (
          <div key={`${topic.subject}-${topic.topic}-${index}`} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor(topic.priority), flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "var(--aa-fb)",
                fontSize: "0.76rem",
                color: "#cec5b9",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {topic.topic}
            </span>
          </div>
        ))}
        {hiddenCount > 0 ? (
          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.7rem", color: "#8f887e", paddingLeft: 13 }}>
            +{hiddenCount} more
          </span>
        ) : null}
        {visibleTopics.length === 0 ? (
          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.74rem", color: "#8f887e" }}>Revision / buffer day</span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 11,
          paddingTop: 9,
          borderTop: "1px solid rgba(76,70,61,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--aa-fb)",
          fontSize: "0.68rem",
          color: "#b7ada0",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Clock3 size={11} strokeWidth={2} /> {data.totalHours}h
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
          <Target size={11} strokeWidth={2} color="#d5c5a8" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>
            {data.dayGoal}
          </span>
        </span>
      </div>

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export const TopicTaskNode = memo(TopicTaskNodeImpl);
