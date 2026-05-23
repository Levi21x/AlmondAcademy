"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface NodeItem {
  id: string;
  label: string;
}

interface EdgeItem {
  from: string;
  to: string;
  label?: string;
}

export function FlowchartRenderer({ data }: VisualRendererProps) {
  const nodes = toArray<NodeItem>(data.nodes);
  const edges = toArray<EdgeItem>(data.edges);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <div key={node.id} className="rounded-xl border border-[#3e3a34] bg-[#1a1a1a] p-3 text-sm text-[#f2e8d8]">
            {toString(node.label, "Untitled node")}
          </div>
        ))}
      </div>

      {edges.length > 0 ? (
        <div className="rounded-xl border border-[#353534] bg-[#171717] p-3 text-xs text-[#cabfaa]">
          {edges.map((edge, idx) => (
            <p key={`${edge.from}-${edge.to}-${idx}`}>
              {edge.from}{" -> "}{edge.to}
              {edge.label ? ` (${edge.label})` : ""}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
