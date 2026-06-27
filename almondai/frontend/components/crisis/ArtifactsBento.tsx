"use client";

import { useState } from "react";
import { X, Loader } from "lucide-react";
import { ArtifactCard } from "./ArtifactCard";
import { markArtifactRead } from "@/lib/api/crisis.api";
import type { JarArtifact, JarJob } from "@/lib/api/crisis.api";

interface Props {
  token: string;
  sessionId: string;
  artifacts: JarArtifact[];
  jobs: JarJob[];
  onArtifactsChange: (artifacts: JarArtifact[]) => void;
}

function JobStatusRow({ job }: { job: JarJob }) {
  const labelMap: Record<string, string> = {
    mock_paper: "Mock Paper",
    cheat_sheet: "Cheat Sheet",
    recall_deck: "Recall Deck",
    knowing_vs_scoring: "Knowing vs Scoring",
  };
  const statusColor: Record<string, string> = {
    pending: "var(--aa-text-3)",
    running: "#ffcf9d",
    completed: "var(--aa-green)",
    failed: "var(--aa-coral)",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: "var(--aa-r)",
        background: "var(--aa-s3)",
        border: "1px solid var(--aa-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {job.status === "running" && (
          <Loader size={11} strokeWidth={2} style={{ color: "#ffcf9d", animation: "aaSpinSlow 1s linear infinite" }} />
        )}
        <span style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-2)" }}>
          {labelMap[job.job_type] ?? job.job_type}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--aa-fb)",
          fontWeight: 600,
          color: statusColor[job.status] ?? "var(--aa-text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {job.status}
      </span>
    </div>
  );
}

function ArtifactModal({ artifact, onClose }: { artifact: JarArtifact; onClose: () => void }) {
  const content = artifact.content as Record<string, unknown>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--aa-s2)",
          border: "1px solid var(--aa-border2)",
          borderRadius: "var(--aa-r-xl)",
          padding: 24,
          maxWidth: 640,
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontFamily: "var(--aa-fd)", color: "var(--aa-text-1)", fontWeight: 700 }}>
              {artifact.title}
            </h2>
            {artifact.subtitle && (
              <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 2 }}>
                {artifact.subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--aa-text-3)",
              padding: 4,
            }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {content.error ? (
          <p style={{ fontSize: 13, fontFamily: "var(--aa-fb)", color: "var(--aa-coral)" }}>
            {String(content.error)}
          </p>
        ) : (
          <div className="flowing-text">
            <pre
              style={{
                fontSize: 11,
                fontFamily: "var(--aa-fb)",
                color: "var(--aa-text-2)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function ArtifactsBento({ token, sessionId, artifacts, jobs, onArtifactsChange }: Props) {
  const [selected, setSelected] = useState<JarArtifact | null>(null);

  async function handleClick(artifact: JarArtifact) {
    setSelected(artifact);
    if (!artifact.is_read) {
      await markArtifactRead(token, sessionId, artifact.id);
      onArtifactsChange(artifacts.map((a) => a.id === artifact.id ? { ...a, is_read: true } : a));
    }
  }

  const pendingJobs = jobs.filter((j) => j.status !== "completed");
  const newCount = artifacts.filter((a) => !a.is_read).length;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p
              style={{
                fontSize: 11,
                fontFamily: "var(--aa-fb)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--aa-amber)",
                marginBottom: 2,
              }}
            >
              Artifacts
            </p>
            <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)" }}>
              {newCount > 0 ? `${newCount} new · ` : ""}{artifacts.length} ready
            </p>
          </div>
        </div>

        {/* Artifacts grid */}
        {artifacts.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} onClick={() => handleClick(artifact)} />
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "20px 16px",
              borderRadius: "var(--aa-r-md)",
              background: "var(--aa-s2)",
              border: "1px solid var(--aa-border)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)" }}>
              Deep agents are building your artifacts overnight
            </p>
            <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 4 }}>
              Mock paper, cheat sheet, and analysis will appear here
            </p>
          </div>
        )}

        {/* Pending jobs */}
        {pendingJobs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginBottom: 4 }}>
              In progress
            </p>
            {pendingJobs.map((job) => (
              <JobStatusRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {selected && <ArtifactModal artifact={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
