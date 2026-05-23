"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface ComparisonRow {
  feature?: string;
  a?: string;
  b?: string;
}

export function ComparisonRenderer({ data }: VisualRendererProps) {
  const rows = toArray<ComparisonRow>(data.rows);
  const columns = toArray<string>(data.columns);
  const c1 = columns[1] ?? "Option A";
  const c2 = columns[2] ?? "Option B";

  return (
    <div className="overflow-x-auto rounded-xl border border-[#353534]">
      <table className="min-w-full divide-y divide-[#353534] text-left text-sm">
        <thead className="bg-[#1a1a1a] text-[#d5c5a8]">
          <tr>
            <th className="px-3 py-2">Feature</th>
            <th className="px-3 py-2">{c1}</th>
            <th className="px-3 py-2">{c2}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a2a] bg-[#141414] text-[#e5e2e1]">
          {rows.map((row, idx) => (
            <tr key={`${toString(row.feature)}-${idx}`}>
              <td className="px-3 py-2 font-medium">{toString(row.feature, "-")}</td>
              <td className="px-3 py-2">{toString(row.a, "-")}</td>
              <td className="px-3 py-2">{toString(row.b, "-")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
