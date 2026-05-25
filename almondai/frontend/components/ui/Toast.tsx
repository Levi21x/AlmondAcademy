"use client";

import { cn } from "@/lib/utils/helpers";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose?: () => void;
}

const styleByVariant: Record<ToastVariant, string> = {
  success: "border-[#fff2de]/30 bg-[#201f1f] text-[#e5e2e1]",
  error: "border-[#ffb4ab]/30 bg-[#93000a]/20 text-[#ffb4ab]",
  warning: "border-[#d5c5a8]/30 bg-[#201f1f] text-[#d5c5a8]",
  info: "border-[#4c463d]/30 bg-[#201f1f] text-[#cec5b9]",
};

const accentByVariant: Record<ToastVariant, string> = {
  success: "before:bg-[var(--aa-green)]",
  error: "before:bg-[#ffb4ab]",
  warning: "before:bg-[var(--aa-amber)]",
  info: "before:bg-[var(--aa-text-3)]",
};

export function Toast({ message, variant = "info", onClose }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "aa-anim-slide-r relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border px-4 py-3 pl-5 text-sm shadow-[var(--aa-shadow)]",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-['']",
        styleByVariant[variant],
        accentByVariant[variant],
      )}
    >
      <span>{message}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="aa-press ml-1 rounded-md p-0.5 transition-colors duration-200 hover:text-[#fff2de]"
          aria-label="Close toast"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      ) : null}
    </div>
  );
}
