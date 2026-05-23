"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface Branch {
  label?: string;
  points?: string[];
}

export function MindMapRenderer({ data }: VisualRendererProps) {
  const central = toString(data.central, "Core Topic");
  const branches = toArray<Branch>(data.branches);

  return (
    <div className="space-y-4">
      <div className="mx-auto w-fit rounded-full border border-[#d5c5a8]/40 bg-[#2a2520] px-5 py-2 text-sm font-semibold text-[#fff2de]">
        {central}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch, index) => (
          <div key={`${toString(branch.label)}-${index}`} className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-3">
            <p className="text-sm font-semibold text-[#d5c5a8]">{toString(branch.label, `Branch ${index + 1}`)}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#e5e2e1]">
              {toArray<string>(branch.points).map((point, pointIndex) => (
                <li key={`${point}-${pointIndex}`}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
