"use client";

import { Moon, Clock, BookOpen, Lightbulb, Brain, SkipForward } from "lucide-react";
import { motion } from "framer-motion";
import type { LastNightPlan } from "@/lib/api/crisis.api";

interface LastNightModeProps {
  plan: LastNightPlan;
}

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 24 } },
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export function LastNightMode({ plan }: LastNightModeProps) {
  const {
    strategy,
    hour_by_hour = [],
    ultra_high_yield_facts = [],
    critical_mnemonics = [],
    viva_hot_topics = [],
    do_not_study = [],
    exam_day_strategy,
  } = plan;

  return (
    <div className="space-y-6">
      {/* Header strategy */}
      {strategy && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#7a3f30] bg-gradient-to-r from-[#2c1d1b] to-[#1e1512] px-5 py-4">
          <Moon size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-[#ffb4ab]" />
          <div>
            <p className="mb-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#ffcf9d]">
              Last-Night Strategy
            </p>
            <p className="text-sm font-medium leading-relaxed text-[#fff2de]">{strategy}</p>
          </div>
        </div>
      )}

      {/* Hour-by-hour */}
      {hour_by_hour.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
              Hour-by-Hour Sprint
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {hour_by_hour.map((block) => (
              <motion.div
                key={block.hour}
                variants={item}
                className="rounded-xl border border-[#4c463d] bg-[#1f1f1f] p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em]"
                    style={{ background: "rgba(255,207,157,0.1)", color: "#ffcf9d" }}
                  >
                    {block.time_slot}
                  </span>
                  <span className="text-sm font-semibold text-[#e5e2e1]">{block.focus}</span>
                </div>
                {block.key_facts.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {block.key_facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#cec5b9]">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#ffcf9d]" />
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
                {block.mnemonic && (
                  <p className="rounded-lg border border-[#353534] bg-[#131313] px-3 py-1.5 text-xs text-[#d5c5a8]">
                    <span className="font-semibold text-[#ffcf9d]">Mnemonic: </span>
                    {block.mnemonic}
                  </p>
                )}
                {block.why_now && (
                  <p className="mt-1.5 text-[0.62rem] text-[#8f887e]">{block.why_now}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Bottom grid: facts, mnemonics, viva, skip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ultra_high_yield_facts.length > 0 && (
          <div className="rounded-xl border border-[#4c463d] bg-[#1f1f1f] p-4">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                Ultra High-Yield Facts
              </p>
            </div>
            <ul className="space-y-1.5">
              {ultra_high_yield_facts.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#cec5b9]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#ffcf9d]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {critical_mnemonics.length > 0 && (
          <div className="rounded-xl border border-[#4c463d] bg-[#1f1f1f] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Brain size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                Critical Mnemonics
              </p>
            </div>
            <ul className="space-y-2">
              {critical_mnemonics.map((m, i) => (
                <li key={i} className="rounded-lg border border-[#353534] bg-[#131313] px-3 py-2 text-xs text-[#d5c5a8]">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {viva_hot_topics.length > 0 && (
          <div className="rounded-xl border border-[#4c463d] bg-[#1f1f1f] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={13} strokeWidth={2} style={{ color: "var(--aa-amber)" }} />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                Viva Hot Topics
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viva_hot_topics.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#4c463d] bg-[#1a1a1a] px-2.5 py-1 text-xs text-[#cec5b9]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {do_not_study.length > 0 && (
          <div className="rounded-xl border border-[#353534] bg-[#131313] p-4">
            <div className="mb-3 flex items-center gap-2">
              <SkipForward size={13} strokeWidth={2} className="text-[#8f887e]" />
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[#8f887e]">
                Do NOT Study Tonight
              </p>
            </div>
            <ul className="space-y-1">
              {do_not_study.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#8f887e] line-through decoration-[#4c463d]">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#4c463d]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {exam_day_strategy && (
        <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] px-4 py-3">
          <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
            Exam Day Strategy
          </p>
          <p className="text-sm leading-relaxed text-[#cec5b9]">{exam_day_strategy}</p>
        </div>
      )}
    </div>
  );
}
