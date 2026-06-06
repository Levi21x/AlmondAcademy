"use client";

import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface PanicBannerProps {
  severity: "none" | "moderate" | "severe";
  anchorMessage: string;
}

const severityStyles = {
  moderate: {
    border: "border-[#7a5a30]",
    bg: "bg-gradient-to-r from-[#241d12] to-[#1e1913]",
    icon: "text-[#e6c87a]",
    text: "text-[#ffe1ad]",
    sub: "text-[#cdbb9a]",
    label: "STRESS DETECTED",
  },
  severe: {
    border: "border-[#7a3f30]",
    bg: "bg-gradient-to-r from-[#2c1d1b] to-[#1e1512]",
    icon: "text-[#ffb4ab]",
    text: "text-[#ffd5cf]",
    sub: "text-[#e8c5bf]",
    label: "PANIC DETECTED",
  },
};

export function PanicBanner({ severity, anchorMessage }: PanicBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (severity === "none" || dismissed) return null;

  const style = severityStyles[severity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`rounded-xl border ${style.border} ${style.bg} px-4 py-3`}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 ${style.icon}`}>
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="mb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em]"
              style={{ color: "var(--aa-caution)" }}
            >
              {style.label}
            </p>
            <p className={`text-sm font-medium ${style.text}`}>{anchorMessage}</p>
            <p className={`mt-1 text-xs ${style.sub}`}>
              Your plan has been adjusted to what you can realistically cover.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-[#8f887e] hover:text-[#cec5b9]"
            aria-label="Dismiss"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
