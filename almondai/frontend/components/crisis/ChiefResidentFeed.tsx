"use client";

import { useState } from "react";
import { Send, Loader } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamCrisisAsk } from "@/lib/api/crisis.api";
import type { CrisisStrategy } from "@/lib/api/crisis.api";

interface Props {
  token: string;
  sessionId: string;
  openingMessage: string;
  strategy: CrisisStrategy | null;
}

interface Message {
  role: "chief" | "student";
  content: string;
}

export function ChiefResidentFeed({ token, sessionId, openingMessage, strategy }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "chief", content: openingMessage },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);

  const marksTarget = strategy?.sacrifice?.estimated_marks_coverage ?? 0;
  const panicDetected = strategy?.panic?.detected ?? false;
  const readiness = strategy?.readiness?.readiness_score ?? 0;

  async function handleSend() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: userMsg }]);
    setStreaming(true);

    const newHistory = [...history, { role: "user", content: userMsg }];
    let assistantText = "";

    setMessages((prev) => [...prev, { role: "chief", content: "" }]);

    try {
      for await (const chunk of streamCrisisAsk(token, sessionId, userMsg, history)) {
        assistantText += chunk;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "chief", content: assistantText },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "chief", content: "I couldn't respond right now — try again." },
      ]);
    } finally {
      setHistory([...newHistory, { role: "assistant", content: assistantText }]);
      setStreaming(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Header */}
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
          Chief Resident
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {marksTarget > 0 && (
            <span style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: panicDetected ? "var(--aa-coral)" : "#a8c8a5" }}>
              {marksTarget.toFixed(0)}% marks target
            </span>
          )}
          {readiness > 0 && (
            <span style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)" }}>
              Readiness {readiness.toFixed(0)}/100
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 200,
          maxHeight: 440,
        }}
        className="no-scrollbar"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "student" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "chief" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7a3f30, #5a2f2a)",
                    border: "1px solid #7a3f30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                  }}
                >
                  🩺
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)" }}>
                  Chief Resident
                </span>
              </div>
            )}

            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius:
                  msg.role === "chief"
                    ? "2px 12px 12px 12px"
                    : "12px 2px 12px 12px",
                background:
                  msg.role === "chief"
                    ? "var(--aa-s3)"
                    : "rgba(213,197,168,0.1)",
                border:
                  msg.role === "chief"
                    ? "1px solid var(--aa-border)"
                    : "1px solid rgba(213,197,168,0.2)",
              }}
            >
              {msg.content ? (
                <div className="flowing-text" style={{ fontSize: 13 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 4 }}>
                  <span className="aa-typing-dot" />
                  <span className="aa-typing-dot" />
                  <span className="aa-typing-dot" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          background: "var(--aa-s2)",
          border: "1px solid var(--aa-border)",
          borderRadius: "var(--aa-r-lg)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask the Chief Resident anything…"
          disabled={streaming}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            outline: "none",
            fontSize: 13,
            fontFamily: "var(--aa-fb)",
            color: "var(--aa-text-1)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          style={{
            background: streaming || !input.trim() ? "transparent" : "var(--aa-amber-bg)",
            border: "none",
            cursor: streaming || !input.trim() ? "default" : "pointer",
            color: streaming || !input.trim() ? "var(--aa-text-3)" : "var(--aa-amber)",
            padding: 6,
            borderRadius: "var(--aa-r)",
            display: "flex",
            alignItems: "center",
            transition: "color 0.2s",
          }}
          aria-label="Send"
        >
          {streaming ? <Loader size={14} strokeWidth={2} style={{ animation: "aaSpinSlow 1s linear infinite" }} /> : <Send size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
