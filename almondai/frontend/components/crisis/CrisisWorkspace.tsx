"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { CrisisSetupForm } from "./CrisisSetupForm";
import { ActivationStream } from "./ActivationStream";
import { AlmondJar } from "./AlmondJar";
import { ChiefResidentFeed } from "./ChiefResidentFeed";
import { ArtifactsBento } from "./ArtifactsBento";
import { LiveFeedListener } from "./LiveFeedListener";
import {
  getActivationStatus,
  listJarItems,
  listArtifacts,
  listJobs,
} from "@/lib/api/crisis.api";
import type {
  ActivateCrisisPayload,
  CrisisSession,
  JarItem,
  JarArtifact,
  JarJob,
} from "@/lib/api/crisis.api";

type Phase = "loading" | "setup" | "activating" | "active";

interface Props {
  token: string;
}

export function CrisisWorkspace({ token }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<CrisisSession | null>(null);
  const [activationPayload, setActivationPayload] = useState<ActivateCrisisPayload | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [openingMessage, setOpeningMessage] = useState("");

  const [jarItems, setJarItems] = useState<JarItem[]>([]);
  const [artifacts, setArtifacts] = useState<JarArtifact[]>([]);
  const [jobs, setJobs] = useState<JarJob[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);

  // Load session on mount
  useEffect(() => {
    async function load() {
      try {
        const status = await getActivationStatus(token);
        if (status.active_session) {
          setSession(status.active_session);
          setPhase("active");
          // Load jar + artifacts
          const [items, arts, jbs] = await Promise.all([
            listJarItems(token, status.active_session.id),
            listArtifacts(token, status.active_session.id),
            listJobs(token, status.active_session.id),
          ]);
          setJarItems(items);
          setArtifacts(arts);
          setJobs(jbs);
          // Reconstruct opening message from strategy
          const strategy = status.active_session.strategy;
          const mentor = (strategy as Record<string, unknown>)?.mentor as Record<string, string> | undefined;
          setOpeningMessage(mentor?.opening ?? "Your War Room is active. What do you need?");
        } else {
          setPhase("setup");
        }
      } catch {
        setPhase("setup");
      }
    }
    load();
  }, [token]);

  function handleActivateClick(payload: ActivateCrisisPayload) {
    setActivationPayload(payload);
    setActivationError(null);
    setPhase("activating");
  }

  async function handleActivationComplete(newSessionId: string, opening: string) {
    setOpeningMessage(opening);
    // Reload full session
    try {
      const status = await getActivationStatus(token);
      if (status.active_session) {
        setSession(status.active_session);
        const [arts, jbs] = await Promise.all([
          listArtifacts(token, status.active_session.id),
          listJobs(token, status.active_session.id),
        ]);
        setArtifacts(arts);
        setJobs(jbs);
        setJarItems([]);
      }
    } catch {
      // Proceed anyway
    }
    setPhase("active");
  }

  function handleActivationError(msg: string) {
    setActivationError(msg);
    setPhase("setup");
  }

  function handleReset() {
    setSession(null);
    setOpeningMessage("");
    setJarItems([]);
    setArtifacts([]);
    setJobs([]);
    setPhase("setup");
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        <div className="aa-skeleton" style={{ width: "100%", height: 200, borderRadius: "var(--aa-r-lg)" }} />
      </div>
    );
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <CrisisSetupForm
          onActivate={handleActivateClick}
          loading={false}
          error={activationError}
        />
      </div>
    );
  }

  // ── Activating ────────────────────────────────────────────────────────────
  if (phase === "activating" && activationPayload) {
    return (
      <ActivationStream
        token={token}
        payload={activationPayload}
        onComplete={handleActivationComplete}
        onError={handleActivationError}
      />
    );
  }

  // ── Active workspace ──────────────────────────────────────────────────────
  if (phase === "active" && session) {
    return (
      <>
        {/* Nudge banner */}
        <AnimatePresence>
          {nudge && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "rgba(90,47,42,0.15)",
                border: "1px solid #5a2f2a",
                borderRadius: "var(--aa-r)",
                marginBottom: 12,
              }}
            >
              <p style={{ flex: 1, fontSize: 13, fontFamily: "var(--aa-fb)", color: "#ffcf9d" }}>
                {nudge}
              </p>
              <button
                onClick={() => setNudge(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--aa-text-3)", display: "flex" }}
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session info bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            padding: "10px 16px",
            background: "rgba(90,47,42,0.1)",
            border: "1px solid #5a2f2a33",
            borderRadius: "var(--aa-r)",
          }}
        >
          <div>
            <p style={{ fontSize: 14, fontFamily: "var(--aa-fd)", fontWeight: 700, color: "#ffb4ab" }}>
              🔥 {session.exam_name}
            </p>
            <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 1 }}>
              {session.days_remaining}d remaining · {session.available_hours_per_day}h/day · readiness {session.readiness_score?.toFixed(0) ?? "—"}/100
            </p>
          </div>
          <button
            onClick={handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "none",
              border: "1px solid var(--aa-border)",
              borderRadius: "var(--aa-r-full)",
              color: "var(--aa-text-3)",
              fontSize: 11,
              fontFamily: "var(--aa-fb)",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={11} strokeWidth={2} />
            New session
          </button>
        </div>

        {/* Three-zone grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) minmax(300px, 1.5fr) minmax(220px, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Zone 1 — Almond Jar */}
          <div
            style={{
              background: "var(--aa-s2)",
              border: "1px solid var(--aa-border)",
              borderRadius: "var(--aa-r-lg)",
              padding: 16,
            }}
          >
            <AlmondJar
              token={token}
              sessionId={session.id}
              items={jarItems}
              onItemsChange={setJarItems}
            />
          </div>

          {/* Zone 2 — Chief Resident */}
          <div
            style={{
              background: "var(--aa-s2)",
              border: "1px solid #5a2f2a55",
              borderRadius: "var(--aa-r-lg)",
              padding: 16,
              minHeight: 480,
            }}
          >
            <ChiefResidentFeed
              token={token}
              sessionId={session.id}
              openingMessage={openingMessage}
              strategy={session.strategy}
            />
          </div>

          {/* Zone 3 — Artifacts */}
          <div
            style={{
              background: "var(--aa-s2)",
              border: "1px solid var(--aa-border)",
              borderRadius: "var(--aa-r-lg)",
              padding: 16,
            }}
          >
            <ArtifactsBento
              token={token}
              sessionId={session.id}
              artifacts={artifacts}
              jobs={jobs}
              onArtifactsChange={setArtifacts}
            />
          </div>
        </div>

        {/* Responsive: collapse to single column on narrow screens */}
        <style>{`
          @media (max-width: 900px) {
            .crisis-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <LiveFeedListener
          token={token}
          sessionId={session.id}
          onArtifactsReady={(newArts) => {
            setArtifacts((prev) => {
              const ids = new Set(prev.map((a) => a.id));
              const fresh = newArts.filter((a) => !ids.has(a.id));
              if (!fresh.length) return prev;
              return [
                ...fresh.map((a) => ({ ...a, is_read: false, subtitle: "", content: {} as Record<string, unknown> })),
                ...prev,
              ];
            });
            setJobs((prev) => prev.map((j) => j.status === "running" ? { ...j, status: "completed" as const } : j));
          }}
          onNudge={(content) => setNudge(content)}
        />
      </>
    );
  }

  return null;
}
