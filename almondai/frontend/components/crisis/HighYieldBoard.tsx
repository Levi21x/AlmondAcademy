"use client";

import { Target, ArrowRight, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import type { CrisisHighYield, CrisisHighYieldTopic } from "@/lib/api/crisis.api";

interface HighYieldBoardProps {
  highYield: CrisisHighYield;
  survivalAdvice?: string;
}

const bucketConfig = {
  must: {
    label: "MUST",
    sublabel: "Will appear — no exceptions",
    bg: "bg-[#1e1a14]",
    border: "border-[#7a5a30]",
    dot: "#ffcf9d",
    text: "text-[#fff2de]",
    badge: "bg-[#ffcf9d]/10 text-[#ffcf9d]",
  },
  should: {
    label: "SHOULD",
    sublabel: "High-yield — study if time allows",
    bg: "bg-[#1a1a1a]",
    border: "border-[#4c463d]",
    dot: "#d5c5a8",
    text: "text-[#e5e2e1]",
    badge: "bg-[#d5c5a8]/08 text-[#d5c5a8]",
  },
  optional: {
    label: "OPTIONAL",
    sublabel: "Study if ahead of schedule",
    bg: "bg-[#161616]",
    border: "border-[#353534]",
    dot: "#8f887e",
    text: "text-[#cec5b9]",
    badge: "bg-[#353534]/60 text-[#8f887e]",
  },
  skip: {
    label: "SKIP",
    sublabel: "Low ROI — leave it",
    bg: "bg-[#131313]",
    border: "border-[#353534]",
    dot: "#4c463d",
    text: "text-[#8f887e]",
    badge: "bg-[#2a2520]/60 text-[#4c463d]",
  },
} as const;

function TopicPill({
  topic,
  bucket,
}: {
  topic: CrisisHighYieldTopic;
  bucket: keyof typeof bucketConfig;
}) {
  const cfg = bucketConfig[bucket];
  const note = topic.why ?? topic.why_skip;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2`}
    >
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: cfg.dot }}
      />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${cfg.text}`}>{topic.topic}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em] ${cfg.badge}`}>
            {topic.subject}
          </span>
          {note && (
            <span className="text-[0.62rem] text-[#8f887e]">{note}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BucketColumn({
  bucket,
  topics,
}: {
  bucket: keyof typeof bucketConfig;
  topics: CrisisHighYieldTopic[];
}) {
  const cfg = bucketConfig[bucket];

  return (
    <div className={`flex flex-col rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.16em]"
          style={{ background: `${cfg.dot}18`, color: cfg.dot }}
        >
          {cfg.label}
        </span>
        <span className="text-[0.62rem] text-[#8f887e]">{topics.length} topics</span>
      </div>
      <p className="mb-3 text-[0.65rem] text-[#8f887e]">{cfg.sublabel}</p>

      {topics.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#353534] py-4 text-[0.7rem] text-[#4c463d]">
          None identified
        </div>
      ) : (
        <motion.div
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {topics.map((t, i) => (
            <motion.div
              key={`${t.subject}-${t.topic}-${i}`}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 24 } },
              }}
            >
              <TopicPill topic={t} bucket={bucket} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function HighYieldBoard({ highYield, survivalAdvice }: HighYieldBoardProps) {
  const { must = [], should = [], optional = [], skip = [] } = highYield;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target size={14} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
          High-Yield Intelligence
        </p>
      </div>

      {survivalAdvice && (
        <div className="flex items-start gap-3 rounded-xl border border-[#4c463d] bg-[#1e1a14] px-4 py-3">
          <ArrowRight size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[#ffcf9d]" />
          <p className="text-sm leading-relaxed text-[#e5e2e1]">{survivalAdvice}</p>
        </div>
      )}

      {/* Asymmetric grid: MUST spans 2, SHOULD spans 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* MUST — 2 cols wide on desktop */}
        <div className="md:col-span-2">
          <BucketColumn bucket="must" topics={must} />
        </div>
        {/* SHOULD — 1 col */}
        <div>
          <BucketColumn bucket="should" topics={should} />
        </div>
      </div>

      {/* OPTIONAL + SKIP — side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BucketColumn bucket="optional" topics={optional} />
        <div className="flex flex-col">
          <BucketColumn bucket="skip" topics={skip} />
          {skip.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#353534] bg-[#131313] px-3 py-2 text-xs text-[#8f887e]">
              <EyeOff size={12} strokeWidth={1.9} />
              These topics have low probability of appearing given your time constraint.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
