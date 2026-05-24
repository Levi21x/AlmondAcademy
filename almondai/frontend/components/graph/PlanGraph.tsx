"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { StudyPlan } from "@/lib/api/planner.api";
import { PhaseNode } from "./PhaseNode";
import { TopicTaskNode } from "./TopicTaskNode";
import { layoutGraph } from "./useDagreLayout";
import { NODE_SIZES, type PhaseData, type Temporal, type TopicTaskData } from "./planGraphTypes";

const nodeTypes = { phase: PhaseNode, topicTask: TopicTaskNode };

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function temporalFor(dateIso: string, today: string): Temporal {
  if (dateIso < today) return "past";
  if (dateIso > today) return "future";
  return "today";
}

function shortDate(dateIso: string): string {
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildGraph(plan: StudyPlan): { nodes: Node[]; edges: Edge[] } {
  const today = todayIso();
  const days = Array.isArray(plan.days) ? [...plan.days].sort((a, b) => a.day - b.day) : [];

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Group days into week-sized phases.
  const phases = new Map<number, typeof days>();
  for (const day of days) {
    const phaseIndex = Math.floor((Math.max(day.day, 1) - 1) / 7);
    const bucket = phases.get(phaseIndex) ?? [];
    bucket.push(day);
    phases.set(phaseIndex, bucket);
  }

  const orderedPhases = [...phases.entries()].sort((a, b) => a[0] - b[0]);

  orderedPhases.forEach(([phaseIndex, phaseDays], position) => {
    const phaseId = `phase-${phaseIndex}`;
    const dates = phaseDays.map((d) => d.date).filter(Boolean).sort();
    const hasToday = phaseDays.some((d) => d.date === today);
    const allPast = dates.length > 0 && dates[dates.length - 1] < today;
    const temporal: Temporal = hasToday ? "today" : allPast ? "past" : "future";

    const phaseData: PhaseData = {
      label: `Week ${phaseIndex + 1}`,
      dayCount: phaseDays.length,
      dateRange: dates.length ? `${shortDate(dates[0])} – ${shortDate(dates[dates.length - 1])}` : "",
      temporal,
    };

    nodes.push({
      id: phaseId,
      type: "phase",
      position: { x: 0, y: 0 },
      data: phaseData,
      width: NODE_SIZES.phase.width,
      height: NODE_SIZES.phase.height,
      draggable: false,
    });

    // Sequential spine between phases.
    if (position > 0) {
      const prevPhaseId = `phase-${orderedPhases[position - 1][0]}`;
      edges.push({
        id: `e-${prevPhaseId}-${phaseId}`,
        source: prevPhaseId,
        target: phaseId,
        animated: temporal === "today",
        style: { stroke: "rgba(213,197,168,0.35)", strokeWidth: 1.5 },
      });
    }

    for (const day of phaseDays) {
      const dayId = `day-${day.day}`;
      const dayData: TopicTaskData = {
        day: day.day,
        date: day.date,
        focus: day.focus || "Study block",
        topics: Array.isArray(day.topics) ? day.topics : [],
        totalHours: day.total_hours ?? 0,
        dayGoal: day.day_goal || "",
        temporal: temporalFor(day.date, today),
      };
      nodes.push({
        id: dayId,
        type: "topicTask",
        position: { x: 0, y: 0 },
        data: dayData,
        width: NODE_SIZES.topicTask.width,
        height: NODE_SIZES.topicTask.height,
        draggable: false,
      });
      edges.push({
        id: `e-${phaseId}-${dayId}`,
        source: phaseId,
        target: dayId,
        style: { stroke: "rgba(76,70,61,0.55)", strokeWidth: 1.25 },
      });
    }
  });

  return { nodes: layoutGraph(nodes, edges, { direction: "LR" }), edges };
}

function miniMapColor(node: Node): string {
  const temporal = (node.data as { temporal?: Temporal })?.temporal;
  if (temporal === "today") return "#d5c5a8";
  if (temporal === "past") return "#4c463d";
  return "#6f685c";
}

export function PlanGraph({ plan }: { plan: StudyPlan }) {
  const { nodes, edges } = useMemo(() => buildGraph(plan), [plan]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#353534] bg-[#1a1a1a] p-8 text-center">
        <p className="text-sm text-[#b7ada0]">This plan has no scheduled days to map yet.</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-xl border border-[#353534] bg-[#131313]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(213,197,168,0.12)" />
        <Controls showInteractive={false} style={{ background: "#1f1f1f", border: "1px solid #353534", borderRadius: 8 }} />
        <MiniMap
          pannable
          zoomable
          nodeColor={miniMapColor}
          maskColor="rgba(13,13,13,0.7)"
          style={{ background: "#1a1a1a", border: "1px solid #353534", borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  );
}
