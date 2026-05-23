"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Layers, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { VisualRenderer } from "@/components/visuals/VisualRenderer";
import { deleteVisual, generateVisual, getVisualLibrary, VisualRecord, VisualType } from "@/lib/api/visuals.api";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuthStore } from "@/lib/store/authStore";

const VISUAL_TYPES: Array<{ value: VisualType; label: string; hint: string }> = [
  { value: "flowchart", label: "Flowchart", hint: "Cause -> mechanism -> outcome" },
  { value: "timeline", label: "Timeline", hint: "Stepwise sequence memory" },
  { value: "comparison", label: "Comparison", hint: "Option A vs Option B" },
  { value: "decision_tree", label: "Decision Tree", hint: "If/then clinical branching" },
  { value: "mind_map", label: "Mind Map", hint: "Central idea + rapid branches" },
  { value: "process", label: "Process", hint: "Input -> transformation -> output" },
];

export default function VisualisePage() {
  const token = useAuthStore((state) => state.accessToken);
  const { isPremium } = useSubscription();
  const searchParams = useSearchParams();

  const deepTopic = (searchParams.get("topic") || "").trim();
  const deepSubject = (searchParams.get("subject") || "").trim();
  const deepType = (searchParams.get("type") || "flowchart").trim() as VisualType;

  const [topic, setTopic] = useState(deepTopic || "");
  const [subject, setSubject] = useState(deepSubject || "");
  const [visualType, setVisualType] = useState<VisualType>(VISUAL_TYPES.some((v) => v.value === deepType) ? deepType : "flowchart");
  const [loading, setLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [library, setLibrary] = useState<VisualRecord[]>([]);
  const [activeVisual, setActiveVisual] = useState<VisualRecord | null>(null);
  const [autoRunConsumed, setAutoRunConsumed] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = useCallback(async (activeToken: string) => {
    setLibraryLoading(true);
    try {
      const rows = await getVisualLibrary(activeToken, 24);
      setLibrary(rows);
      if (rows.length > 0) {
        setActiveVisual((current) => current ?? rows[0]);
      }
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadLibrary(token).catch(() => {
      setLibrary([]);
    });
  }, [loadLibrary, token]);

  const handleGenerate = useCallback(async (override?: { topic?: string; subject?: string; type?: VisualType }) => {
    if (!token) {
      return;
    }

    const finalTopic = (override?.topic ?? topic).trim();
    const finalSubject = (override?.subject ?? subject).trim();
    const finalType = override?.type ?? visualType;

    if (!finalTopic) {
      return;
    }

    const reachedFreeLimit =
      !isPremium &&
      library.filter((item) => String(item.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length >= 2;
    if (reachedFreeLimit) {
      setError("Free visual limit reached for today. Upgrade to continue.");
      return;
    }

    setLoading(true);
    try {
      setError(null);
      const visual = await generateVisual({
        token,
        topic: finalTopic,
        subject: finalSubject || undefined,
        visualType: finalType,
      });

      setActiveVisual(visual);
      setLibrary((prev) => [visual, ...prev.filter((row) => row.id !== visual.id)]);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : "Failed to generate visual";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isPremium, library, subject, token, topic, visualType]);

  useEffect(() => {
    if (!token || !deepTopic || autoRunConsumed) {
      return;
    }

    setAutoRunConsumed(true);
    void handleGenerate({
      topic: deepTopic,
      subject: deepSubject,
      type: VISUAL_TYPES.some((v) => v.value === deepType) ? deepType : "flowchart",
    });
  }, [autoRunConsumed, deepSubject, deepTopic, deepType, handleGenerate, token]);

  const activeTypeLabel = useMemo(
    () => VISUAL_TYPES.find((entry) => entry.value === (activeVisual?.visual_type || visualType))?.label || "Visual",
    [activeVisual?.visual_type, visualType],
  );
  const freeVisualsToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return library.filter((item) => String(item.created_at || "").slice(0, 10) === today).length;
  }, [library]);
  const freeLimitReached = !isPremium && freeVisualsToday >= 2;

  return (
    <div className="aa-anim-fade-up space-y-6">
      {!isPremium && showUpgradePrompt ? (
        <section className="rounded-xl border border-[#7a3f30] bg-[#2a1d1b] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#ffcf9d]">
              Free plan includes 2 visual generations per day. Premium unlocks unlimited visual explanations.
            </p>
            <div className="flex items-center gap-2">
              <Link href="/upgrade" className="rounded-lg bg-[#fff2de] px-3 py-1.5 text-xs font-semibold text-[#392f1b]">Upgrade</Link>
              <button type="button" onClick={() => setShowUpgradePrompt(false)} className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9]">
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#353534] bg-[radial-gradient(circle_at_top_right,#3d2f1f_0%,#1a1a1a_50%,#111111_100%)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d9c6a0]">Segment 11</p>
            <h1 className="aa-h1 mt-2 flex items-center gap-2 text-[var(--aa-text-1)]">
              <ImageIcon className="h-8 w-8 text-[#d5c5a8]" /> Visual Explanation Engine
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#d6cbbd]">Turn dense MBBS topics into exam-focused visuals you can scan, revise, and revisit.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d5c5a8]/40 bg-[#2a2520] px-3 py-1 text-xs text-[#d5c5a8]">
            <Sparkles className="h-3.5 w-3.5" /> AI generated, clinically structured
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value.slice(0, 160))}
            placeholder="Topic (e.g. Septic Shock, Nephrotic Syndrome)"
            className="rounded-lg border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1] outline-none"
          />
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value.slice(0, 80))}
            placeholder="Subject (optional)"
            className="rounded-lg border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1] outline-none"
          />
          <select
            value={visualType}
            onChange={(event) => setVisualType(event.target.value as VisualType)}
            className="rounded-lg border border-[#4c463d] bg-[#131313] px-3 py-2 text-sm text-[#e5e2e1] outline-none"
          >
            {VISUAL_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            disabled={loading || !topic.trim() || freeLimitReached}
            className="rounded-lg bg-[#d5c5a8] px-4 py-2 text-sm font-semibold text-[#2f2719] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : freeLimitReached ? "Free limit reached" : "Generate"}
          </button>
        </div>
        {freeLimitReached ? (
          <p className="mt-2 text-xs text-[#ffcf9d]">You have used today&apos;s free visual limit. Upgrade to continue generating visuals.</p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-[#ffb4ab]">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {VISUAL_TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setVisualType(item.value)}
              className={`rounded-full border px-3 py-1 text-xs ${
                visualType === item.value
                  ? "border-[#d5c5a8]/40 bg-[#2a2520] text-[#fff2de]"
                  : "border-[#353534] bg-[#131313] text-[#b7ada0]"
              }`}
            >
              {item.label} · {item.hint}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-4">
          {activeVisual ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#353534] pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#b7ada0]">{activeTypeLabel}</p>
                  <h2 className="text-2xl font-bold text-[#fff2de]">{activeVisual.topic}</h2>
                  {activeVisual.subject ? <p className="text-xs text-[#d5c5a8]">{activeVisual.subject}</p> : null}
                </div>
                <span className="rounded-full border border-[#353534] bg-[#131313] px-2 py-1 text-xs text-[#b7ada0]">
                  {new Date(activeVisual.created_at).toLocaleString()}
                </span>
              </div>

              <VisualRenderer type={activeVisual.visual_type} data={activeVisual.visual_data} />

              <p className="mt-4 rounded-lg border border-[#353534] bg-[#151515] p-3 text-sm text-[#dcd1c3]">
                {activeVisual.explanation || "No explanation available for this visual yet."}
              </p>
            </>
          ) : (
            <div className="grid min-h-[300px] place-items-center rounded-xl border border-dashed border-[#3e3a34] bg-[#141414] p-8 text-center text-[#b7ada0]">
              <div>
                <Layers className="mx-auto h-10 w-10 text-[#d5c5a8]/60" />
                <p className="mt-3 text-sm">Generate your first visual explanation to begin.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d5c5a8]">Saved Library</h3>
            {libraryLoading ? <span className="text-xs text-[#b7ada0]">Loading...</span> : null}
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {library.length === 0 ? <p className="text-sm text-[#b7ada0]">No saved visuals yet.</p> : null}

            {library.map((item) => (
              <div key={item.id || `${item.topic}-${item.created_at}`} className="rounded-lg border border-[#353534] bg-[#151515] p-3">
                <button
                  type="button"
                  onClick={() => setActiveVisual(item)}
                  className="w-full text-left"
                >
                  <p className="truncate text-sm font-semibold text-[#fff2de]">{item.topic}</p>
                  <p className="text-xs text-[#c8bdae]">{item.visual_type.replace("_", " ")}</p>
                </button>

                {item.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!token) {
                        return;
                      }
                      void deleteVisual(token, item.id).then((ok) => {
                        if (!ok) {
                          return;
                        }
                        setLibrary((prev) => prev.filter((row) => row.id !== item.id));
                        setActiveVisual((current) => (current?.id === item.id ? null : current));
                      });
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#4c463d] px-2 py-1 text-[11px] text-[#b7ada0]"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
