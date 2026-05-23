"use client";

import { useState } from "react";
import { Brain, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  personalized?: boolean;
}

export function ChatMessage({ role, content, isStreaming = false, personalized = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";
  const cleanContent = content
    .replace(/\*?\[general\]\*?/gi, "")
    .replace(/\*?\[from general knowledge\]\*?/gi, "")
    .replace(/\*?\[rag\]\*?/gi, "")
    .replace(/\[MCQ_PROMPT_SENT\]/gi, "")
    .replace(/\[MCQ_INVITE_SENT\]/gi, "")
    .trim();
  const visibleContent = cleanContent;
  const processedContent = cleanContent.replace(/\\n/g, "\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(visibleContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="group w-full">
      {isUser ? (
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-br-sm border border-[#4c463d] bg-[#1f1f1f] px-4 py-3 text-sm text-[#e5e2e1]">
            <p className="whitespace-pre-wrap">{visibleContent}</p>
          </div>
        </div>
      ) : (
        <div className="relative w-full px-1 py-1 text-sm text-[#e5e2e1]">
          <div className="mb-2 flex items-center gap-2 text-xs text-[#d5c5a8]">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#d5c5a8]/10">
              <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
            </div>
            <span className="uppercase tracking-widest">AlmondAI</span>
            {personalized ? (
              <span
                title="Response personalized based on your learning history"
                className="rounded-full border border-[#d5c5a8]/35 bg-[#2a2520] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#d5c5a8]"
              >
                Personalized
              </span>
            ) : null}
            {isStreaming ? (
              <span className="ml-1 inline-flex items-center gap-1">
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "0ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "150ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "300ms" }} />
              </span>
            ) : null}
          </div>

          <div className="flowing-text border-l-2 border-[#d5c5a8]/20 pl-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {processedContent}
            </ReactMarkdown>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            className="absolute right-0 top-0 hidden rounded-md border border-[#4c463d] bg-[#1a1a1a] px-2 py-1 text-[11px] text-[#cec5b9] transition-all duration-200 ease-in-out hover:text-[#fff2de] group-hover:block"
          >
            <span className="inline-flex items-center gap-1">
              <Copy className="h-3.5 w-3.5" strokeWidth={1.9} />
              {copied ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      )}
      {!isUser ? <div className="mt-5 border-b border-[#353534]" /> : null}
    </div>
  );
}
