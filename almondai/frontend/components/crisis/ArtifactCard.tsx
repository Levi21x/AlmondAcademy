"use client";

import { FileText, BookOpen, FlaskConical, BarChart2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { JarArtifact } from "@/lib/api/crisis.api";

const artifactMeta: Record<
  string,
  { icon: React.ReactNode; accentColor: string; bgColor: string }
> = {
  mock_paper: {
    icon: <FileText size={18} strokeWidth={1.8} />,
    accentColor: "#ffcf9d",
    bgColor: "rgba(255,207,157,0.07)",
  },
  cheat_sheet: {
    icon: <BookOpen size={18} strokeWidth={1.8} />,
    accentColor: "#d5c5a8",
    bgColor: "rgba(213,197,168,0.07)",
  },
  recall_deck: {
    icon: <FlaskConical size={18} strokeWidth={1.8} />,
    accentColor: "#a8c8a5",
    bgColor: "rgba(168,200,165,0.07)",
  },
  knowing_vs_scoring: {
    icon: <BarChart2 size={18} strokeWidth={1.8} />,
    accentColor: "#cab3ff",
    bgColor: "rgba(202,179,255,0.07)",
  },
  schedule_grid: {
    icon: <Clock size={18} strokeWidth={1.8} />,
    accentColor: "#d5c5a8",
    bgColor: "rgba(213,197,168,0.07)",
  },
};

interface Props {
  artifact: JarArtifact;
  onClick: () => void;
}

export function ArtifactCard({ artifact, onClick }: Props) {
  const meta = artifactMeta[artifact.artifact_type] ?? artifactMeta.cheat_sheet;
  const isNew = !artifact.is_read;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: "var(--aa-r-md)",
        background: meta.bgColor,
        border: `1px solid ${isNew ? meta.accentColor + "44" : "var(--aa-border)"}`,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isNew && (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: meta.accentColor,
            boxShadow: `0 0 6px ${meta.accentColor}88`,
          }}
        />
      )}

      <div style={{ color: meta.accentColor, marginBottom: 8 }}>{meta.icon}</div>

      <p
        style={{
          fontSize: 13,
          fontFamily: "var(--aa-fb)",
          fontWeight: 600,
          color: "var(--aa-text-1)",
          marginBottom: 3,
          lineHeight: 1.3,
        }}
      >
        {artifact.title}
      </p>

      {artifact.subtitle && (
        <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", lineHeight: 1.3 }}>
          {artifact.subtitle}
        </p>
      )}

      <p
        style={{
          fontSize: 10,
          fontFamily: "var(--aa-fb)",
          color: "var(--aa-text-3)",
          marginTop: 8,
          letterSpacing: "0.04em",
        }}
      >
        {new Date(artifact.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </motion.button>
  );
}
