"use client";

import { useEffect, useMemo, useRef } from "react";
import { Brain } from "lucide-react";

import { ChatMessage } from "@/components/doubt-solver/ChatMessage";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (question: string) => Promise<void>;
  onStop?: () => void;
  isLoading: boolean;
  isStreaming: boolean;
  disabled?: boolean;
  studentCategory?: string;
}

const starterByCategory: Record<string, string[]> = {
  survivor: [
    "What are the highest yield topics for MBBS finals?",
    "Give me a 3-day study plan for Pathology",
    "Quick MCQ patterns for Pharmacology",
  ],
  sprinter: [
    "Differentiate STEMI vs NSTEMI for MCQs",
    "High yield Biochemistry for exams",
    "Surgery short cases - what to know",
  ],
  anxious_grinder: [
    "Help me understand the coagulation cascade",
    "Am I covering enough for my exam?",
    "Explain Renal Physiology step by step",
  ],
  passionate: [
    "Explain the mechanism of septic shock",
    "How does the renin-angiotensin system work?",
    "Clinical correlation of heart failure",
  ],
  lost: [
    "Start from basics - what is pathology?",
    "Explain hypertension in simple terms",
    "How do I begin studying Medicine?",
  ],
  strategic_climber: [
    "Most tested topics in NEET-PG Medicine",
    "High yield Surgery for PG entrance",
    "Rank-boosting topics in Pharmacology",
  ],
};

export function ChatInterface({
  messages,
  onSend,
  onStop,
  isLoading,
  isStreaming,
  disabled,
  studentCategory,
}: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const starters = useMemo(() => {
    return starterByCategory[studentCategory ?? "sprinter"] ?? starterByCategory.sprinter;
  }, [studentCategory]);

  return (
    <div className="flex min-h-[70vh] flex-1 flex-col rounded-2xl border border-[#353534] bg-[#131313]">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[45vh] flex-col items-center justify-center text-center">
            <Brain className="mb-4 text-[#d5c5a8]/30 select-none pointer-events-none" size={80} strokeWidth={0.5} />
            <h2 className="font-headline text-4xl font-bold tracking-tight text-[#fff2de]">How can I help you study today?</h2>
            <p className="mt-2 text-sm text-[#cec5b9]">Studying as: {(studentCategory ?? "sprinter").replace(/_/g, " ")}</p>
            <div className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => {
                    void onSend(starter);
                  }}
                  className="card-glow rounded-xl border border-[#353534] bg-[#1f1f1f] px-4 py-3 text-left text-sm text-[#e5e2e1] transition-all duration-200 ease-in-out"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isLatest = index === messages.length - 1;
            return (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={Boolean(isStreaming && isLatest && message.role === "assistant")}
              />
            );
          })
        )}

        {isLoading && messages.length === 0 ? <div className="text-sm text-[#cec5b9]">Waiting for AlmondAI response...</div> : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#353534] p-4">
        <PromptInputBox
          onSend={(message) => {
            if (message.trim()) {
              void onSend(message);
            }
          }}
          isLoading={isStreaming}
          onStop={onStop}
          disabled={disabled}
          placeholder="Ask AlmondAI anything about medicine..."
        />
      </div>
    </div>
  );
}
