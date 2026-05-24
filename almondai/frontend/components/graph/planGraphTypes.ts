import type { Node } from "@xyflow/react";
import type { PlanTopic } from "@/lib/api/planner.api";

export type Temporal = "past" | "today" | "future";

export interface PhaseData extends Record<string, unknown> {
  label: string;
  dayCount: number;
  dateRange: string;
  temporal: Temporal;
}

export interface TopicTaskData extends Record<string, unknown> {
  day: number;
  date: string;
  focus: string;
  topics: PlanTopic[];
  totalHours: number;
  dayGoal: string;
  temporal: Temporal;
}

export type PhaseNodeType = Node<PhaseData, "phase">;
export type TopicTaskNodeType = Node<TopicTaskData, "topicTask">;

export const NODE_SIZES = {
  phase: { width: 210, height: 92 },
  topicTask: { width: 290, height: 168 },
} as const;
