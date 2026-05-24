import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CalendarRange } from "lucide-react";

import type { PhaseNodeType } from "./planGraphTypes";

const handleStyle = { width: 7, height: 7, background: "#4c463d", border: "none" } as const;

function PhaseNodeImpl({ data }: NodeProps<PhaseNodeType>) {
  const isToday = data.temporal === "today";
  const isPast = data.temporal === "past";

  const accent = isToday ? "#d5c5a8" : isPast ? "#6f685c" : "#a99e8c";

  return (
    <div
      style={{
        width: 210,
        boxSizing: "border-box",
        padding: "12px 14px",
        borderRadius: 14,
        border: `1px solid ${isToday ? "rgba(213,197,168,0.45)" : "rgba(76,70,61,0.5)"}`,
        background: isToday
          ? "linear-gradient(135deg, rgba(213,197,168,0.14), rgba(213,197,168,0.05))"
          : "rgba(26,26,26,0.92)",
        boxShadow: isToday
          ? "0 0 0 1px rgba(213,197,168,0.12), 0 10px 28px rgba(0,0,0,0.45)"
          : "0 6px 18px rgba(0,0,0,0.35)",
        opacity: isPast ? 0.7 : 1,
        transition: "transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease",
        cursor: "default",
      }}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(213,197,168,0.1)",
            border: "1px solid rgba(213,197,168,0.18)",
            flexShrink: 0,
          }}
        >
          <CalendarRange size={14} color={accent} strokeWidth={2} />
        </div>
        <span
          style={{
            fontFamily: "var(--aa-fd)",
            fontSize: "0.98rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: isToday ? "#fff2de" : "#e5e2e1",
          }}
        >
          {data.label}
        </span>
      </div>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "var(--aa-fb)",
          fontSize: "0.72rem",
          color: "#b7ada0",
        }}
      >
        <span>{data.dateRange}</span>
        <span style={{ color: accent, fontWeight: 600 }}>{data.dayCount}d</span>
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export const PhaseNode = memo(PhaseNodeImpl);
