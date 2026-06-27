"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentActivityTray } from "./AgentActivityTray";
import { streamWarRoomActivation } from "@/lib/api/crisis.api";
import type { ActivateCrisisPayload, AgentResult } from "@/lib/api/crisis.api";

interface Props {
  token: string;
  payload: ActivateCrisisPayload;
  onComplete: (sessionId: string, openingMessage: string) => void;
  onError: (msg: string) => void;
}

export function ActivationStream({ token, payload, onComplete, onError }: Props) {
  const [phase, setPhase] = useState<"forming" | "agents" | "chief">("forming");
  const [statusMsg, setStatusMsg] = useState("Assembling your War Room team…");
  const [agentResults, setAgentResults] = useState<AgentResult[] | null>(null);
  const [chiefText, setChiefText] = useState("");
  const [sessionId, setSessionId] = useState("");
  const chiefRef = useRef("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    async function run() {
      try {
        for await (const event of streamWarRoomActivation(token, payload)) {
          if (event.type === "status") {
            setStatusMsg(event.message);
          } else if (event.type === "agents_ready") {
            setAgentResults(event.results);
            setPhase("agents");
          } else if (event.type === "session_created") {
            setSessionId(event.session_id);
          } else if (event.type === "chief_resident_start") {
            setPhase("chief");
          } else if (event.type === "chief_resident_text") {
            chiefRef.current += event.text;
            setChiefText(chiefRef.current);
          } else if (event.type === "error") {
            onError(event.message);
            return;
          }
        }
        // Stream complete
        onComplete(sessionId, chiefRef.current);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Activation failed");
      }
    }

    run();
  }, []);

  return (
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "rgba(90,47,42,0.15)",
          border: "1px solid #5a2f2a",
          borderRadius: "var(--aa-r-md)",
        }}
      >
        <Loader size={14} strokeWidth={2} style={{ color: "#ffcf9d", animation: "aaSpinSlow 1s linear infinite", flexShrink: 0 }} />
        <p style={{ fontSize: 13, fontFamily: "var(--aa-fb)", color: "#ffcf9d" }}>{statusMsg}</p>
      </motion.div>

      {/* Agent tray */}
      <div>
        <p
          style={{
            fontSize: 11,
            fontFamily: "var(--aa-fb)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--aa-text-3)",
            marginBottom: 10,
          }}
        >
          War Room Team
        </p>
        <AgentActivityTray results={agentResults} />
      </div>

      {/* Chief Resident opening */}
      <AnimatePresence>
        {phase === "chief" && chiefText && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: "16px 20px",
              background: "rgba(90,47,42,0.12)",
              border: "1px solid #7a3f30",
              borderRadius: "var(--aa-r-lg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7a3f30, #5a2f2a)",
                  border: "1px solid #7a3f30",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                🩺
              </div>
              <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", fontWeight: 600, color: "#ffb4ab" }}>
                Chief Resident
              </p>
            </div>
            <div className="flowing-text" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--aa-text-1)" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{chiefText}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
