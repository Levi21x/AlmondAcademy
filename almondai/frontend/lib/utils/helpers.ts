export function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(" ");
}

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export const categoryMeta = {
  survivor: {
    label: "The Survivor",
    description: "High urgency mode for your immediate exam sprint.",
  },
  sprinter: {
    label: "The Sprinter",
    description: "Calibrated for focused exam-season performance.",
  },
  anxious_grinder: {
    label: "The Anxious Grinder",
    description: "Steady confidence building with daily momentum loops.",
  },
  passionate: {
    label: "The Passionate Learner",
    description: "Concept-first learning tuned for deep understanding.",
  },
  lost: {
    label: "The Explorer",
    description: "A structured study system to remove overwhelm.",
  },
  strategic_climber: {
    label: "The Strategic Climber",
    description: "Long-view NEET-PG strategy with smart prioritization.",
  },
} as const;
