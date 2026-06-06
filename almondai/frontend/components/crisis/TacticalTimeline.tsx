"use client";

import { Check, Clock, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CrisisDay, CrisisHourBlock, CrisisTopicProgress } from "@/lib/api/crisis.api";

interface TacticalTimelineProps {
  days: CrisisDay[];
  topicProgress: CrisisTopicProgress[];
  currentDayNumber: number;
  onToggle: (dayNumber: number, topicName: string, done: boolean) => Promise<void>;
  onStudyNow: (block: CrisisHourBlock) => void;
}

function HourBlockRow({
  block,
  done,
  dayNumber,
  onToggle,
  onStudyNow,
}: {
  block: CrisisHourBlock;
  done: boolean;
  dayNumber: number;
  onToggle: (dayNumber: number, topicName: string, done: boolean) => Promise<void>;
  onStudyNow: (block: CrisisHourBlock) => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(dayNumber, block.topic, !done); }
    finally { setToggling(false); }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        done ? "border-[#353534] bg-[#131313] opacity-60" : "border-[#4c463d] bg-[#1a1a1a]"
      }`}
    >
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={toggling}
        className="aa-press flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#4c463d] transition-colors disabled:opacity-50"
        style={done ? { background: "rgba(213,197,168,0.15)", borderColor: "var(--aa-amber)" } : {}}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {done && <Check size={11} strokeWidth={2.5} style={{ color: "var(--aa-amber)" }} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium ${done ? "line-through text-[#8f887e]" : "text-[#e5e2e1]"}`}
          >
            {block.topic}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em]"
            style={{ background: "rgba(213,197,168,0.07)", color: "var(--aa-amber)" }}
          >
            {block.subject}
          </span>
          <span className="flex items-center gap-1 text-[0.62rem] text-[#8f887e]">
            <Clock size={10} strokeWidth={1.9} />
            {block.duration_minutes}m
          </span>
        </div>
        {block.time_block && (
          <p className="mt-0.5 text-[0.62rem] text-[#8f887e]">{block.time_block}</p>
        )}
      </div>

      {!done && (
        <button
          type="button"
          onClick={() => onStudyNow(block)}
          className="aa-press shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#131313] transition-opacity hover:opacity-90"
          style={{ background: "var(--aa-amber)" }}
        >
          <BookOpen size={11} strokeWidth={2} className="inline mr-1" />
          Study
        </button>
      )}
    </div>
  );
}

export function TacticalTimeline({
  days,
  topicProgress,
  currentDayNumber,
  onToggle,
  onStudyNow,
}: TacticalTimelineProps) {
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({
    [currentDayNumber]: true,
  });

  const toggleDay = (day: number) =>
    setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }));

  const progressMap = topicProgress.reduce<Record<string, boolean>>((acc, p) => {
    acc[`${p.day_number}:${p.topic_name}`] = p.is_completed;
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isToday = day.day === currentDayNumber;
        const isExpanded = Boolean(expandedDays[day.day]);
        const done = day.hours.filter(
          (h) => progressMap[`${day.day}:${h.topic}`],
        ).length;
        const total = day.hours.length;
        const completePct = total ? Math.round((done / total) * 100) : 0;

        return (
          <div
            key={day.day}
            className={`overflow-hidden rounded-xl border transition-colors ${
              isToday ? "border-[#ffcf9d]/30 bg-[#1e1a14]" : "border-[#353534] bg-[#161616]"
            }`}
          >
            {/* Day header */}
            <button
              type="button"
              onClick={() => toggleDay(day.day)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {isToday && (
                    <span className="rounded-full bg-[#ffcf9d]/10 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#ffcf9d]">
                      Today
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[#e5e2e1]">
                    Day {day.day}
                  </span>
                  <span className="text-xs text-[#8f887e]">{day.theme}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#353534]">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{
                        width: `${completePct}%`,
                        background: isToday ? "#ffcf9d" : "var(--aa-amber)",
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[0.6rem] text-[#8f887e]">
                    {done}/{total}
                  </span>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp size={14} strokeWidth={2} className="shrink-0 text-[#8f887e]" />
              ) : (
                <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-[#8f887e]" />
              )}
            </button>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 px-4 pb-4">
                    {day.hours.map((block, i) => (
                      <HourBlockRow
                        key={`${block.topic}-${i}`}
                        block={block}
                        done={Boolean(progressMap[`${day.day}:${block.topic}`])}
                        dayNumber={day.day}
                        onToggle={onToggle}
                        onStudyNow={onStudyNow}
                      />
                    ))}
                    {day.daily_goal && (
                      <p className="pt-1 text-xs text-[#8f887e]">
                        Goal: {day.daily_goal}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
