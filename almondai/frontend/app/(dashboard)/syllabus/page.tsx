"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Layers,
  Map,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  getProgressSummary,
  getSubjects,
  getSubjectTopics,
  type ProgressSummary,
  type SubjectProgress,
  type SubjectTopic,
  type SubjectWithTopics,
  type TopicStatus,
  updateTopicProgress,
} from "@/lib/api/syllabus.api";
import { useAuthStore } from "@/lib/store/authStore";

type ModeFilter = "all" | "mbbs" | "neet_pg";
type YearFilter = "all" | 1 | 2 | 3 | 4;

const STATUS_ORDER: TopicStatus[] = ["not_started", "in_progress", "completed", "needs_revision"];

function nextStatus(current: TopicStatus): TopicStatus {
  const index = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(index + 1) % STATUS_ORDER.length];
}

function statusLabel(status: TopicStatus): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "needs_revision":
      return "Needs Revision";
    default:
      return "Not Started";
  }
}

function statusIcon(status: TopicStatus) {
  switch (status) {
    case "in_progress":
      return <Clock3 className="h-4 w-4 text-[#d5c5a8]" strokeWidth={2} />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-[#64d37c]" strokeWidth={2} />;
    case "needs_revision":
      return <AlertTriangle className="h-4 w-4 text-[#e6b37a]" strokeWidth={2} />;
    default:
      return <Circle className="h-4 w-4 text-[#8f887e]" strokeWidth={2} />;
  }
}

function difficultyDot(difficulty: string): string {
  if (difficulty === "easy") return "bg-[#64d37c]";
  if (difficulty === "hard") return "bg-[#ff8f8f]";
  return "bg-[#d5c5a8]";
}

export default function SyllabusPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const [selectedSubject, setSelectedSubject] = useState<SubjectProgress | null>(null);
  const [topicDetail, setTopicDetail] = useState<SubjectWithTopics | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicSearch, setTopicSearch] = useState("");

  const loadSubjects = async (activeToken: string, currentMode: ModeFilter) => {
    const mode = currentMode === "all" ? undefined : currentMode;
    const [subjectRows, progressSummary] = await Promise.all([
      getSubjects(activeToken, mode),
      getProgressSummary(activeToken),
    ]);
    setSubjects(subjectRows);
    setSummary(progressSummary);
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    void loadSubjects(token, modeFilter)
      .catch(() => {
        setSubjects([]);
        setSummary(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [modeFilter, token]);

  const filteredSubjects = useMemo(() => {
    if (yearFilter === "all") {
      return subjects;
    }
    return subjects.filter((subject) => subject.year === yearFilter);
  }, [subjects, yearFilter]);

  const notStartedTopics = useMemo(() => {
    if (!summary) {
      return 0;
    }
    return Math.max(
      summary.total_topics - summary.completed_topics - summary.in_progress_topics - summary.needs_revision_topics,
      0,
    );
  }, [summary]);

  const openSubject = async (subject: SubjectProgress) => {
    if (!token) {
      return;
    }

    setSelectedSubject(subject);
    setTopicDetail(null);
    setTopicError(null);
    setTopicLoading(true);

    try {
      const details = await getSubjectTopics(token, subject.id);
      setTopicDetail(details);
    } catch {
      setTopicError("Failed to load topics for this subject.");
    } finally {
      setTopicLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedSubject(null);
    setTopicDetail(null);
    setTopicLoading(false);
    setTopicError(null);
    setTopicSearch("");
  };

  const handleStatusCycle = async (topic: SubjectTopic) => {
    if (!token || !topicDetail) {
      return;
    }

    const optimisticStatus = nextStatus(topic.status);
    const previousTopics = topicDetail.topics;
    const optimisticTopics = previousTopics.map((row) =>
      row.id === topic.id
        ? {
            ...row,
            status: optimisticStatus,
            completed_at: optimisticStatus === "completed" ? new Date().toISOString() : null,
          }
        : row,
    );

    setTopicDetail({ ...topicDetail, topics: optimisticTopics });

    try {
      const updated = await updateTopicProgress(token, topic.id, optimisticStatus);
      setTopicDetail((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          topics: current.topics.map((row) =>
            row.id === topic.id ? { ...row, status: updated.status, completed_at: updated.completed_at } : row,
          ),
        };
      });

      await loadSubjects(token, modeFilter);
    } catch {
      setTopicDetail({ ...topicDetail, topics: previousTopics });
    }
  };

  const subjectCompletion = useMemo(() => {
    if (!topicDetail?.topics.length) {
      return 0;
    }
    const completed = topicDetail.topics.filter((topic) => topic.status === "completed").length;
    return Math.round((completed / topicDetail.topics.length) * 100);
  }, [topicDetail]);

  const filteredTopics = useMemo(() => {
    if (!topicDetail?.topics) return [];
    if (!topicSearch.trim()) return topicDetail.topics;
    const q = topicSearch.toLowerCase();
    return topicDetail.topics.filter((t) => t.name.toLowerCase().includes(q));
  }, [topicDetail, topicSearch]);

  return (
    <div className="aa-anim-fade-up relative space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f1f1f] ring-1 ring-[#353534]">
            <Map className="h-5 w-5 text-[#d5c5a8]" strokeWidth={1.9} />
          </div>
          <h1 className="aa-h1 text-[var(--aa-text-1)]">Syllabus Map</h1>
        </div>
        <p className="text-sm text-[#b7ada0]">Track progress across your full MBBS roadmap topic by topic.</p>
      </section>

      <section className="grid gap-3 rounded-xl border border-[#353534] bg-[#1f1f1f] p-4 md:grid-cols-2">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "ALL" },
            { key: "mbbs", label: "MBBS" },
            { key: "neet_pg", label: "NEET-PG" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setModeFilter(item.key as ModeFilter)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                modeFilter === item.key
                  ? "bg-[#d5c5a8] text-[#2e2618]"
                  : "border border-[#353534] bg-[#131313] text-[#cec5b9]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          {[
            { key: "all", label: "All Years" },
            { key: 1, label: "Year 1" },
            { key: 2, label: "Year 2" },
            { key: 3, label: "Year 3" },
            { key: 4, label: "Final Year" },
          ].map((item) => (
            <button
              key={String(item.key)}
              type="button"
              onClick={() => setYearFilter(item.key as YearFilter)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                yearFilter === item.key
                  ? "bg-[#2a2520] text-[#fff2de] ring-1 ring-[#d5c5a8]/35"
                  : "border border-[#353534] bg-[#131313] text-[#cec5b9]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#b7ada0]">Your Progress</p>
            <p className="mt-1 text-4xl font-bold text-[#d5c5a8]">{summary?.overall_percentage ?? 0}%</p>
          </div>
          <p className="text-sm text-[#cec5b9]">
            {summary?.completed_topics ?? 0} of {summary?.total_topics ?? 0} topics completed
          </p>
        </div>

        <div className="mt-4 h-2 rounded-full bg-[#353534]">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[#d5c5a8] to-[#fff2de] transition-all"
            style={{ width: `${summary?.overall_percentage ?? 0}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#1f3322] px-3 py-1 text-[#8df2a5]">Completed: {summary?.completed_topics ?? 0}</span>
          <span className="rounded-full bg-[#3a321f] px-3 py-1 text-[#f3d48f]">In Progress: {summary?.in_progress_topics ?? 0}</span>
          <span className="rounded-full bg-[#3a2b1f] px-3 py-1 text-[#f3bc8f]">Needs Revision: {summary?.needs_revision_topics ?? 0}</span>
          <span className="rounded-full bg-[#2a2a2a] px-3 py-1 text-[#cec5b9]">Not Started: {notStartedTopics}</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-xl border border-[#353534] bg-[#1f1f1f]" />
            ))
          : filteredSubjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => {
                  void openSubject(subject);
                }}
                className="group rounded-xl border border-[#353534] bg-[#1f1f1f] p-5 text-left transition-all hover:border-[#d5c5a8]/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[#fff2de]">{subject.name}</h3>
                  <span className="rounded-full border border-[#353534] bg-[#131313] px-2 py-0.5 text-[10px] text-[#b7ada0]">
                    Year {subject.year}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#b7ada0]">{subject.total_topics} topics</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-3xl font-bold text-[#d5c5a8]">{subject.completion_percentage}%</p>
                  <span className="rounded-full bg-[#2a2520] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d5c5a8]">
                    High Yield
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#353534]">
                  <div
                    className="h-1.5 rounded-full bg-[#d5c5a8] transition-all"
                    style={{ width: `${subject.completion_percentage}%` }}
                  />
                </div>
              </button>
            ))}
      </section>

      {selectedSubject ? <button type="button" className="fixed inset-0 z-40 bg-black/55" onClick={closePanel} aria-label="Close panel" /> : null}

      <aside
        className={`fixed bottom-0 right-0 top-auto z-50 h-[85vh] w-full max-w-none rounded-t-2xl border border-[#353534] bg-[#1a1a1a] p-5 transition-transform duration-300 md:top-0 md:h-screen md:w-[420px] md:rounded-none md:rounded-l-2xl ${
          selectedSubject ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#353534] pb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#b7ada0]">Subject</p>
            <h2 className="font-headline text-2xl font-bold text-[#fff2de]">{selectedSubject?.name}</h2>
            <p className="mt-1 text-xs text-[#d5c5a8]">{subjectCompletion}% complete</p>
          </div>
          <button type="button" onClick={closePanel} className="rounded-lg border border-[#353534] p-2 text-[#cec5b9]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="secondary"
            className="!rounded-full !px-4 !py-2 !text-xs"
            onClick={() => {
              if (!selectedSubject) {
                return;
              }
              router.push(`/ai-tutor?subject=${encodeURIComponent(selectedSubject.name)}`);
              closePanel();
            }}
          >
            <BookOpen className="h-4 w-4" /> Ask AlmondAI about {selectedSubject?.name}
          </Button>
        </div>

        {/* Topic search filter */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f887e]" strokeWidth={1.9} />
          <input
            type="text"
            value={topicSearch}
            onChange={(e) => setTopicSearch(e.target.value)}
            placeholder="Search topics..."
            className="w-full rounded-xl border border-[#353534] bg-[#131313] py-2 pl-8 pr-3 text-xs text-[#e5e2e1] outline-none placeholder:text-[#8f887e] focus:border-[#d5c5a8]/50"
          />
          {topicSearch ? (
            <button
              type="button"
              onClick={() => setTopicSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8f887e] hover:text-[#cec5b9]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 h-[calc(100%-195px)] overflow-y-auto pr-1">
          {topicLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-[#242424]" />
              ))}
            </div>
          ) : null}

          {topicError ? <p className="rounded-xl bg-[#2a1f1f] p-3 text-sm text-[#ffb4ab]">{topicError}</p> : null}

          {!topicLoading && topicDetail && filteredTopics.length === 0 ? (
            <p className="rounded-xl bg-[#1f1f1f] p-3 text-sm text-[#b7ada0]">No topics match your search.</p>
          ) : null}

          {filteredTopics.map((topic) => (
            <div key={topic.id} className="mb-2 rounded-xl border border-[#353534] bg-[#1f1f1f] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${difficultyDot(topic.difficulty)}`} />
                    <p className="truncate text-sm font-medium text-[#e5e2e1]">{topic.name}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {topic.is_high_yield ? <span className="rounded-full bg-[#3a2b1f] px-2 py-0.5 text-[#f3bc8f]">High Yield</span> : null}
                    {topic.neet_pg_relevant ? <span className="rounded-full bg-[#2b2340] px-2 py-0.5 text-[#cab3ff]">NEET-PG</span> : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleStatusCycle(topic);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#353534] bg-[#131313] px-2.5 py-1 text-[11px] text-[#cec5b9]"
                >
                  {statusIcon(topic.status)}
                  {statusLabel(topic.status)}
                </button>
              </div>

              <div className="mt-3 flex justify-end">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSubject) {
                        return;
                      }
                      router.push(
                        `/visualise?subject=${encodeURIComponent(selectedSubject.name)}&topic=${encodeURIComponent(topic.name)}&type=mind_map`,
                      );
                      closePanel();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#4c463d] bg-[#131313] px-3 py-1 text-[11px] text-[#cec5b9]"
                  >
                    <Layers className="h-3.5 w-3.5" /> Visualise Topic
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSubject) {
                        return;
                      }
                      const prompt = `Explain ${topic.name} for my ${selectedSubject.name} exam`;
                      router.push(
                        `/ai-tutor?subject=${encodeURIComponent(selectedSubject.name)}&topic=${encodeURIComponent(topic.name)}&prompt=${encodeURIComponent(prompt)}`,
                      );
                      closePanel();
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-[#2a2520] px-3 py-1 text-[11px] text-[#d5c5a8]"
                  >
                    <Layers className="h-3.5 w-3.5" /> Ask AlmondAI
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
