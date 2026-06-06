"use client";

import { MessageCircle, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { streamCrisisAsk, getCrisisAskHistory, type CrisisAskMessage } from "@/lib/api/crisis.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

interface AskAIPanelProps {
  sessionId: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="aa-typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  msg,
  isStreaming,
}: {
  msg: CrisisAskMessage;
  isStreaming?: boolean;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md border border-[#4c463d] bg-[#2a2520] px-4 py-3 text-sm text-[#e5e2e1]">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[#4c463d]"
        style={{ background: "rgba(213,197,168,0.06)" }}
      >
        <MessageCircle size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-[#353534] bg-[#1f1f1f] px-4 py-3">
        {isStreaming && !msg.content ? (
          <TypingDots />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#e5e2e1]">
            {msg.content}
            {isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#ffcf9d]" />}
          </p>
        )}
      </div>
    </div>
  );
}

export function AskAIPanel({ sessionId }: AskAIPanelProps) {
  const fallbackToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<CrisisAskMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getToken = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? fallbackToken ?? null;
  }, [fallbackToken]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const hist = await getCrisisAskHistory(token, sessionId);
        if (!cancelled) setMessages(hist);
      } catch { /* no history yet */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [sessionId, getToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const token = await getToken();
    if (!token) { setError("Please sign in again."); return; }

    const userMsg: CrisisAskMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const placeholderId = crypto.randomUUID();
    const placeholder: CrisisAskMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setInput("");
    setIsStreaming(true);
    setStreamingId(placeholderId);
    setError(null);

    const history = [...messages, userMsg].slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let accumulated = "";
    try {
      for await (const chunk of streamCrisisAsk(token, sessionId, text, history)) {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: accumulated } : m)),
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Stream failed.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: `[Error: ${errMsg}]` } : m,
        ),
      );
      setError(errMsg);
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const starters = [
    "What should I study in the next 3 hours?",
    "Am I going to pass given my situation?",
    "Which subject should I focus on tomorrow?",
    "Give me your single most important tip.",
  ];

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-[#353534] bg-[#131313]" style={{ minHeight: 500 }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#353534] px-4 py-3">
        <MessageCircle size={14} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
          If I Were You — Tactical AI
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-8">
            <TypingDots />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-[#8f887e]">Get tactical advice from your crisis AI advisor.</p>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="aa-press rounded-xl border border-[#353534] bg-[#1f1f1f] px-3 py-2 text-left text-xs text-[#cec5b9] transition-colors hover:border-[#4c463d] hover:text-[#e5e2e1]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
            >
              <MessageBubble
                msg={msg}
                isStreaming={isStreaming && msg.id === streamingId}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-[#e4b4a0]">{error}</p>
      )}

      {/* Input */}
      <div className="border-t border-[#353534] p-3">
        <div className="flex items-end gap-2 rounded-xl border border-[#4c463d] bg-[#1f1f1f] px-3 py-2.5 focus-within:border-[rgba(213,197,168,0.4)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Ask anything about your exam strategy..."
            className="flex-1 resize-none bg-transparent text-sm text-[#e5e2e1] placeholder-[#4c463d] outline-none"
            style={{ maxHeight: 160 }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || isStreaming}
            className="aa-press flex h-7 w-7 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
            style={{
              background: isStreaming ? "rgba(228,180,160,0.1)" : "var(--aa-amber)",
            }}
            aria-label={isStreaming ? "Stop" : "Send"}
          >
            {isStreaming ? (
              <Square size={12} strokeWidth={2.5} style={{ color: "var(--aa-coral)" }} />
            ) : (
              <Send size={12} strokeWidth={2.5} style={{ color: "#131313" }} />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[0.6rem] text-[#4c463d]">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
