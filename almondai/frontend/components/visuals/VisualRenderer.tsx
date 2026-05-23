"use client";

import { ComparisonRenderer } from "@/components/visuals/ComparisonRenderer";
import { DecisionTreeRenderer } from "@/components/visuals/DecisionTreeRenderer";
import { FallbackRenderer } from "@/components/visuals/FallbackRenderer";
import { FlowchartRenderer } from "@/components/visuals/FlowchartRenderer";
import { MindMapRenderer } from "@/components/visuals/MindMapRenderer";
import { ProcessRenderer } from "@/components/visuals/ProcessRenderer";
import { TimelineRenderer } from "@/components/visuals/TimelineRenderer";
import { VisualType } from "@/lib/api/visuals.api";

interface VisualRendererProps {
  type: VisualType | string;
  data: Record<string, unknown>;
}

export function VisualRenderer({ type, data }: VisualRendererProps) {
  if (type === "flowchart") {
    return <FlowchartRenderer data={data} />;
  }
  if (type === "timeline") {
    return <TimelineRenderer data={data} />;
  }
  if (type === "comparison") {
    return <ComparisonRenderer data={data} />;
  }
  if (type === "decision_tree") {
    return <DecisionTreeRenderer data={data} />;
  }
  if (type === "mind_map") {
    return <MindMapRenderer data={data} />;
  }
  if (type === "process") {
    return <ProcessRenderer data={data} />;
  }

  return <FallbackRenderer data={data} />;
}
