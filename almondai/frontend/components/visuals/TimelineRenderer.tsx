"use client";

import { VisualRendererProps, toArray, toString } from "@/components/visuals/types";

interface EventItem {
  step?: number;
  label?: string;
  detail?: string;
}

export function TimelineRenderer({ data }: VisualRendererProps) {
  const events = toArray<EventItem>(data.events);

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div key={`${toString(event.label)}-${index}`} className="flex gap-3 rounded-xl border border-[#353534] bg-[#1a1a1a] p-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a2520] text-xs font-semibold text-[#d5c5a8]">
            {event.step ?? index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#fff2de]">{toString(event.label, `Step ${index + 1}`)}</p>
            <p className="text-xs text-[#c9bfb3]">{toString(event.detail, "No detail available")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
