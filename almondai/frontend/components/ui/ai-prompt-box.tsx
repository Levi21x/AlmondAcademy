"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowUp, BarChart2, Globe, Layers, Mic, Paperclip, Radio, X } from "lucide-react";

type PromptMode = "none" | "search" | "deep-explain" | "visualise";

interface PromptInputBoxProps {
  onSend: (message: string, files: File[]) => void;
  isLoading?: boolean;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  draftMessage?: string;
  onDraftConsumed?: () => void;
  isListening?: boolean;
  interimTranscript?: string;
  onMicClick?: () => void;
  speechSupported?: boolean;
  onModeChange?: (mode: PromptMode) => void;
  acceptAttachments?: boolean;
  /** Activates/deactivates continuous voice mode (separate from dictation mic) */
  onVoiceModeClick?: () => void;
  /** Whether continuous voice mode is currently active */
  isVoiceMode?: boolean;
}

function ToolButton({
  active,
  onClick,
  label,
  title,
  icon,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
            active
              ? "border-[#d5c5a8]/45 bg-[#2a2520] text-[#d5c5a8]"
              : "border-[#4c463d] bg-[#1a1a1a] text-[#cec5b9] hover:text-[#fff2de]"
          } ${className ?? ""}`}
        >
          {icon}
          <span>{label}</span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 rounded-md border border-[#4c463d] bg-[#1a1a1a] px-2 py-1 text-xs text-[#e5e2e1] shadow-[0_4px_24px_rgba(0,0,0,0.35)]" sideOffset={6}>
          {title}
          <Tooltip.Arrow className="fill-[#1a1a1a]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function PromptInputBox({
  onSend,
  isLoading = false,
  onStop,
  placeholder = "Ask Dr. Almond anything about medicine...",
  disabled = false,
  draftMessage,
  onDraftConsumed,
  isListening = false,
  interimTranscript = "",
  onMicClick,
  speechSupported = false,
  onModeChange,
  acceptAttachments = false,
  onVoiceModeClick,
  isVoiceMode = false,
}: PromptInputBoxProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<PromptMode>("none");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const changeMode = (next: PromptMode) => {
    const resolved = mode === next ? "none" : next;
    setMode(resolved);
    onModeChange?.(resolved);
  };

  useEffect(() => {
    if (interimTranscript && !value.trim()) {
      textareaRef.current?.focus();
    }
  }, [interimTranscript, value]);

  useEffect(() => {
    if (!draftMessage) {
      return;
    }
    setValue(draftMessage);
    onDraftConsumed?.();
  }, [draftMessage, onDraftConsumed]);

  const submit = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || disabled) {
      return;
    }
    // Search mode passes search_enabled via callback — no prefix needed
    const promptPrefix =
      mode === "deep-explain"
        ? "[Deep Explain]\n"
        : mode === "visualise"
          ? "[Visualise]\n"
          : "";

    onSend(`${promptPrefix}${trimmed}`, pendingFiles);
    setValue("");
    setPendingFiles([]);
  };

  const activePlaceholder = isListening && interimTranscript ? interimTranscript : placeholder;

  return (
    <Tooltip.Provider>
      <div className="w-full rounded-3xl border border-[#3d3b38] bg-[#242422] p-3 shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled || isLoading}
          onChange={(event) => setValue(event.target.value.slice(0, 1000))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(value);
            }
          }}
          placeholder={activePlaceholder}
          className="max-h-36 min-h-[56px] w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-[#e5e2e1] outline-none placeholder:text-[#6b6460]"
        />

        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 px-1">
            {pendingFiles.map((f, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontFamily: "var(--aa-fb)",
                  fontSize: "0.75rem",
                  color: "var(--aa-amber)",
                  background: "var(--aa-amber-bg)",
                  border: "1px solid var(--aa-amber-border)",
                  borderRadius: "var(--aa-r-full)",
                  padding: "3px 10px 3px 8px",
                }}
              >
                <Paperclip size={11} strokeWidth={2} />
                {f.name}
                <button
                  type="button"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "inherit" }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <ToolButton
              active={mode === "search"}
              onClick={() => changeMode("search")}
              label="Search"
              title="Include real-time web search in your answer"
              icon={<Globe size={16} className="text-current" strokeWidth={1.9} />}
            />
            <ToolButton
              active={mode === "deep-explain"}
              onClick={() => changeMode("deep-explain")}
              label="Deep Explain"
              title="Maximum depth explanation"
              icon={<Layers size={16} className="text-current" strokeWidth={1.9} />}
            />
            <ToolButton
              active={mode === "visualise"}
              onClick={() => changeMode("visualise")}
              label="Visualise"
              title="Prefer tables and visual structuring"
              icon={<BarChart2 size={16} className="text-current" strokeWidth={1.9} />}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Continuous voice mode button */}
            {onVoiceModeClick ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    disabled={disabled || isLoading}
                    onClick={onVoiceModeClick}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                      isVoiceMode
                        ? "border-[var(--aa-amber-border)] bg-[var(--aa-amber-bg)] text-[var(--aa-amber)] shadow-[0_0_0_3px_rgba(213,197,168,0.12)] animate-pulse"
                        : "border-[#4c463d] bg-[#1a1a1a] text-[#e5e2e1] hover:border-[var(--aa-amber-border)] hover:text-[var(--aa-amber)]"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label={isVoiceMode ? "Stop voice mode" : "Start voice mode (Dr. Almond speaks back)"}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={isVoiceMode ? "active" : "idle"}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.13 }}
                      >
                        <Radio size={17} strokeWidth={1.9} />
                      </motion.span>
                    </AnimatePresence>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="z-50 rounded-md border border-[#4c463d] bg-[#1a1a1a] px-2 py-1 text-xs text-[#e5e2e1]" sideOffset={6}>
                    {isVoiceMode ? "Stop voice mode" : "Voice mode — Dr. Almond listens & speaks back"}
                    <Tooltip.Arrow className="fill-[#1a1a1a]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : null}

            {/* Attach button */}
            {acceptAttachments && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPendingFiles((prev) => [...prev, file]);
                    e.target.value = "";
                  }}
                />
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      disabled={disabled || isLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                        pendingFiles.length > 0
                          ? "border-[var(--aa-amber-border)] bg-[var(--aa-amber-bg)] text-[var(--aa-amber)]"
                          : "border-[#4c463d] bg-[#1a1a1a] text-[#e5e2e1] hover:text-[#fff2de]"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                      aria-label="Attach a file"
                    >
                      <Paperclip size={17} strokeWidth={1.9} />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="z-50 rounded-md border border-[#4c463d] bg-[#1a1a1a] px-2 py-1 text-xs text-[#e5e2e1]" sideOffset={6}>
                      Attach a file
                      <Tooltip.Arrow className="fill-[#1a1a1a]" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </>
            )}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  disabled={!speechSupported || disabled || isLoading}
                  onClick={() => {
                    onMicClick?.();
                  }}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    isListening
                      ? "border-amber-400/60 bg-amber-300/20 text-amber-200 shadow-[0_0_0_0_rgba(245,158,11,0.45)] animate-pulse"
                      : "border-[#4c463d] bg-[#1a1a1a] text-[#e5e2e1] hover:text-[#fff2de]"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label={isListening ? "Stop voice input" : "Start voice input"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isListening ? "listening" : "mic"}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Mic size={20} strokeWidth={1.9} />
                    </motion.span>
                  </AnimatePresence>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded-md border border-[#4c463d] bg-[#1a1a1a] px-2 py-1 text-xs text-[#e5e2e1]" sideOffset={6}>
                  {isListening ? "Stop listening" : "Voice input"}
                  <Tooltip.Arrow className="fill-[#1a1a1a]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <button
              type="button"
              onClick={() => {
                if (isLoading) {
                  onStop?.();
                  return;
                }
                submit(value);
              }}
              disabled={disabled || (!isLoading && !value.trim())}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full tactile-gradient text-[#131313] transition-all duration-200 ease-in-out hover:brightness-105 hover:shadow-[0_0_18px_rgba(213,197,168,0.35)] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={isLoading ? "Stop generation" : "Send message"}
            >
              {isLoading ? <span className="h-3.5 w-3.5 rounded-[2px] bg-[#131313]" /> : <ArrowUp size={20} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
