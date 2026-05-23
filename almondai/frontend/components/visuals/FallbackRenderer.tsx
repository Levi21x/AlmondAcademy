"use client";

import { VisualRendererProps } from "@/components/visuals/types";

export function FallbackRenderer({ data }: VisualRendererProps) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-[#353534] bg-[#171717] p-3 text-xs text-[#e5e2e1]">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
