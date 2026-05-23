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

export function Toast({ message, variant = "info", onClose }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
        styleByVariant[variant],
      )}
    >
      <span>{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} className="ml-3 transition-all duration-200 hover:text-[#fff2de]" aria-label="Close toast">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      ) : null}
    </div>
  );
}
