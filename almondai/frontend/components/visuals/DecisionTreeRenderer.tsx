"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface Branch {
  condition?: string;
  outcome?: string;
  next?: string;
}

export function DecisionTreeRenderer({ data }: VisualRendererProps) {
  const root = toString(data.root, "Start");
  const branches = toArray<Branch>(data.branches);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#d5c5a8]/35 bg-[#2a2520] p-3 text-sm font-semibold text-[#fff2de]">Root: {root}</div>
      <div className="space-y-2">
        {branches.map((branch, index) => (
          <div key={`${toString(branch.condition)}-${index}`} className="rounded-xl border border-[#353534] bg-[#181818] p-3">
            <p className="text-xs uppercase tracking-wide text-[#b7ada0]">Condition</p>
            <p className="text-sm text-[#fff2de]">{toString(branch.condition, "-")}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-[#b7ada0]">Outcome</p>
            <p className="text-sm text-[#e5e2e1]">{toString(branch.outcome, "-")}</p>
            {branch.next ? <p className="mt-2 text-xs text-[#d5c5a8]">Next: {branch.next}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
