"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface Stage {
  name?: string;
  input?: string;
  output?: string;
}

export function ProcessRenderer({ data }: VisualRendererProps) {
  const stages = toArray<Stage>(data.stages);

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => (
        <div key={`${toString(stage.name)}-${index}`} className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-3">
          <p className="text-sm font-semibold text-[#fff2de]">{toString(stage.name, `Stage ${index + 1}`)}</p>
          <p className="mt-1 text-xs text-[#b7ada0]">Input: {toString(stage.input, "-")}</p>
          <p className="text-xs text-[#d5c5a8]">Output: {toString(stage.output, "-")}</p>
        </div>
      ))}
    </div>
  );
}
