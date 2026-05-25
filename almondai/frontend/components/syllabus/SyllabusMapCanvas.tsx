"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, ReactFlowProvider,
  type Edge, type Node, type NodeTypes,
  useEdgesState, useNodesState, useReactFlow,
  MarkerType, BackgroundVariant,
} from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { SubjectMapNode } from "./SubjectMapNode";
import { TopicMapNode } from "./TopicMapNode";
import { TopicDetailDrawer } from "./TopicDetailDrawer";
import {
  getSubjects,
  getSubjectTopics,
  updateTopicProgress,
  type SubjectProgress,
  type SubjectTopic,
  type TopicStatus,
} from "@/lib/api/syllabus.api";
import { useAuthStore } from "@/lib/store/authStore";

const nodeTypes: NodeTypes = {
  subjectMap: SubjectMapNode,
  topicMap: TopicMapNode,
};

// Grid layout: 4 subjects per row, generous spacing
const COLS = 4;
const SX = 210;
const SY = 220;

function subjectGridPos(idx: number) {
  return { x: (idx % COLS) * SX + 55, y: Math.floor(idx / COLS) * SY + 55 };
}

// Radial topic positions around the subject center
function radialTopicPositions(cx: number, cy: number, count: number) {
  const radius = Math.max(185, count * 11 + 120);
  return Array.from({ length: count }, (_, i) => ({
    x: cx + radius * Math.cos((2 * Math.PI * i) / count - Math.PI / 2) - 65,
    y: cy + radius * Math.sin((2 * Math.PI * i) / count - Math.PI / 2) - 26,
  }));
}

// Subject node center (node is 96×96, positioned top-left)
function nodeCenter(pos: { x: number; y: number }) {
  return { x: pos.x + 48, y: pos.y + 48 };
}

type FilterType = "all" | "not_started" | "in_progress" | "completed" | "needs_revision" | "high_yield" | "neet_pg";

const FILTER_OPTIONS: Array<{ key: FilterType; label: string }> = [
  { key: "all",            label: "All" },
  { key: "not_started",    label: "Not Started" },
  { key: "in_progress",    label: "In Progress" },
  { key: "completed",      label: "Completed" },
  { key: "needs_revision", label: "Needs Revision" },
  { key: "high_yield",     label: "High Yield" },
  { key: "neet_pg",        label: "NEET-PG" },
];

interface SyllabusMapInnerProps {
  mode?: "mbbs" | "neet_pg" | "all";
}

function SyllabusMapInner({ mode = "all" }: SyllabusMapInnerProps) {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTopic, setSelectedTopic] = useState<SubjectTopic | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showFilter, setShowFilter] = useState(false);

  // Refs — avoids stale closure issues in callbacks
  const subjectPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const topicsCache = useRef<Record<string, SubjectTopic[]>>({});
  const expandedRef = useRef<Set<string>>(new Set());

  // ── Load subjects ──────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void getSubjects(token, mode === "all" ? undefined : mode)
      .then((rows) => {
        setSubjects(rows);
        const subjectNodes: Node[] = rows.map((s, idx) => {
          const pos = subjectGridPos(idx);
          subjectPosRef.current[s.id] = pos;
          const completedTopics = Math.round((s.completion_percentage / 100) * s.total_topics);
          return {
            id: `subject-${s.id}`,
            type: "subjectMap",
            position: pos,
            data: {
              label: s.name,
              year: s.year,
              totalTopics: s.total_topics,
              completedTopics,
              completionPct: s.completion_percentage,
              isExpanded: false,
              isLoading: false,
              isDimmed: false,
              isHighlighted: false,
              mountIndex: idx,
              subjectId: s.id,
            },
          };
        });
        setNodes(subjectNodes);
        setTimeout(() => void fitView({ padding: 0.18, duration: 600 }), 120);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode]);

  // ── Apply search/filter dim+highlight ─────────────────────────
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    setNodes((prev) =>
      prev.map((node) => {
        if (node.type === "subjectMap") {
          const hit = q ? (node.data.label as string).toLowerCase().includes(q) : true;
          return { ...node, data: { ...node.data, isDimmed: !hit && q !== "", isHighlighted: hit && q !== "" } };
        }
        if (node.type === "topicMap") {
          const label = (node.data.label as string).toLowerCase();
          const status = node.data.status as TopicStatus;
          const hy = node.data.isHighYield as boolean;
          const pg = node.data.isNeetPg as boolean;
          let hit = true;
          if (q) {
            hit = label.includes(q);
          } else if (filterType !== "all") {
            if (filterType === "high_yield") hit = hy;
            else if (filterType === "neet_pg") hit = pg;
            else hit = status === filterType;
          }
          return { ...node, data: { ...node.data, isDimmed: !hit, isHighlighted: hit && (q !== "" || filterType !== "all") } };
        }
        return node;
      }),
    );
  }, [searchQuery, filterType, setNodes]);

  // ── Subject click: expand / collapse ──────────────────────────
  const handleSubjectClick = useCallback(async (subjectId: string) => {
    if (!token) return;
    const nodeId = `subject-${subjectId}`;
    const isExpanded = expandedRef.current.has(subjectId);

    if (isExpanded) {
      expandedRef.current.delete(subjectId);
      setNodes((prev) => [
        ...prev
          .filter((n) => !n.id.startsWith(`topic-${subjectId}-`))
          .map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isExpanded: false } } : n),
      ]);
      setEdges((prev) => prev.filter((e) => !e.source.startsWith(nodeId)));
      return;
    }

    // Set loading spinner on subject node
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isLoading: true } } : n));

    try {
      let topics: SubjectTopic[];
      if (topicsCache.current[subjectId]) {
        topics = topicsCache.current[subjectId];
      } else {
        const res = await getSubjectTopics(token, subjectId);
        topics = res.topics;
        topicsCache.current[subjectId] = topics;
      }

      const pos = subjectPosRef.current[subjectId];
      if (!pos) return;
      const center = nodeCenter(pos);
      const positions = radialTopicPositions(center.x, center.y, topics.length);

      const topicNodes: Node[] = topics.map((t, i) => ({
        id: `topic-${subjectId}-${t.id}`,
        type: "topicMap",
        position: positions[i],
        data: {
          label: t.name,
          status: t.status,
          isHighYield: t.is_high_yield,
          isNeetPg: t.neet_pg_relevant,
          difficulty: t.difficulty,
          isDimmed: false,
          isHighlighted: false,
          animationDelay: i * 0.038,
          topicId: t.id,
          subjectId,
        },
      }));

      const topicEdges: Edge[] = topics.map((t) => ({
        id: `edge-${subjectId}-${t.id}`,
        source: nodeId,
        target: `topic-${subjectId}-${t.id}`,
        style: { stroke: "rgba(213,197,168,0.1)", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.Arrow, color: "rgba(213,197,168,0.1)", width: 8, height: 8 },
      }));

      expandedRef.current.add(subjectId);
      setNodes((prev) => [
        ...prev
          .filter((n) => !n.id.startsWith(`topic-${subjectId}-`))
          .map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isExpanded: true, isLoading: false } } : n),
        ...topicNodes,
      ]);
      setEdges((prev) => [...prev.filter((e) => !e.id.startsWith(`edge-${subjectId}-`)), ...topicEdges]);
    } catch {
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isLoading: false } } : n));
    }
  }, [token, setNodes, setEdges]);

  // ── Topic click: open drawer ───────────────────────────────────
  const handleTopicClick = useCallback((topicId: string, subjectId: string) => {
    const topics = topicsCache.current[subjectId];
    if (!topics) return;
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;
    const subject = subjects.find((s) => s.id === subjectId);
    setSelectedTopic(topic);
    setSelectedSubjectName(subject?.name ?? "");
  }, [subjects]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "subjectMap") void handleSubjectClick(node.data.subjectId as string);
    else if (node.type === "topicMap") handleTopicClick(node.data.topicId as string, node.data.subjectId as string);
  }, [handleSubjectClick, handleTopicClick]);

  // ── Topic status cycle ─────────────────────────────────────────
  const handleStatusChange = useCallback((topic: SubjectTopic) => {
    if (!token) return;
    const ORDER: TopicStatus[] = ["not_started", "in_progress", "completed", "needs_revision"];
    const next = ORDER[(ORDER.indexOf(topic.status) + 1) % ORDER.length];

    // Find subjectId from node
    let foundSubjectId = "";
    for (const sid of Object.keys(topicsCache.current)) {
      if (topicsCache.current[sid]?.some((t) => t.id === topic.id)) {
        foundSubjectId = sid;
        break;
      }
    }
    if (foundSubjectId && topicsCache.current[foundSubjectId]) {
      topicsCache.current[foundSubjectId] = topicsCache.current[foundSubjectId].map((t) =>
        t.id === topic.id ? { ...t, status: next } : t,
      );
    }

    setNodes((prev) =>
      prev.map((n) => {
        if (n.type === "topicMap" && (n.data.topicId as string) === topic.id) {
          return { ...n, data: { ...n.data, status: next } };
        }
        return n;
      }),
    );
    setSelectedTopic((prev) => prev?.id === topic.id ? { ...prev, status: next } : prev);
    void updateTopicProgress(token, topic.id, next).catch(() => {
      // revert on failure
      setSelectedTopic((prev) => prev?.id === topic.id ? { ...prev, status: topic.status } : prev);
    });
  // suppress topicNodeId warning — it's intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, setNodes]);

  if (loading) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid rgba(213,197,168,0.12)", borderTopColor: "var(--aa-amber)" }}
        />
        <p style={{ fontSize: "0.75rem", color: "var(--aa-text-3)" }}>Loading syllabus map...</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
        borderBottom: "1px solid rgba(53,53,52,0.7)",
        background: "rgba(15,15,15,0.96)",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 300 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "var(--aa-text-3)", pointerEvents: "none" }} strokeWidth={1.9} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics..."
            style={{
              width: "100%", padding: "6px 28px 6px 28px",
              borderRadius: 100, border: "1px solid rgba(53,53,52,0.8)",
              background: "rgba(0,0,0,0.3)", color: "var(--aa-text-1)",
              fontSize: "0.72rem", outline: "none", transition: "border-color 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.32)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(53,53,52,0.8)"; }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery("")} style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", cursor: "pointer", color: "var(--aa-text-3)", lineHeight: 0,
            }}>
              <X style={{ width: 10, height: 10 }} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilter((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 100,
            border: `1px solid ${showFilter ? "rgba(213,197,168,0.32)" : "rgba(53,53,52,0.8)"}`,
            background: showFilter ? "rgba(213,197,168,0.07)" : "rgba(0,0,0,0.3)",
            cursor: "pointer",
            color: showFilter ? "var(--aa-amber)" : "var(--aa-text-3)",
            fontSize: "0.7rem", fontWeight: 600, transition: "all 0.2s",
          }}
        >
          <Filter style={{ width: 11, height: 11 }} strokeWidth={2} />
          Filter
          {filterType !== "all" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--aa-amber)", marginLeft: 1 }} />}
        </button>

        <p style={{ fontSize: "0.62rem", color: "var(--aa-text-3)", marginLeft: "auto", flexShrink: 0 }}>
          Click subject bubbles to expand
        </p>
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ overflow: "hidden", background: "rgba(15,15,15,0.96)", borderBottom: "1px solid rgba(53,53,52,0.7)", flexShrink: 0 }}
          >
            <div style={{ padding: "8px 14px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {FILTER_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterType(item.key)}
                  style={{
                    padding: "4px 11px", borderRadius: 100, fontSize: "0.67rem", fontWeight: 600,
                    border: `1px solid ${filterType === item.key ? "rgba(213,197,168,0.32)" : "rgba(53,53,52,0.8)"}`,
                    background: filterType === item.key ? "rgba(213,197,168,0.09)" : "transparent",
                    color: filterType === item.key ? "var(--aa-amber)" : "var(--aa-text-3)",
                    cursor: "pointer", transition: "all 0.18s",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Graph canvas ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.15}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
          nodesDraggable
          elementsSelectable
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="rgba(213,197,168,0.04)"
            gap={30}
            size={1.5}
          />
          <Controls
            style={{
              background: "rgba(28,27,25,0.92)",
              border: "1px solid rgba(53,53,52,0.9)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          />
          <MiniMap
            style={{
              background: "rgba(15,15,14,0.92)",
              border: "1px solid rgba(53,53,52,0.9)",
              borderRadius: 10,
            }}
            nodeStrokeColor="rgba(213,197,168,0.15)"
            nodeColor={(n) => {
              if (n.type === "subjectMap") return "rgba(213,197,168,0.14)";
              const st = n.data.status as string;
              if (st === "completed") return "#64d37c28";
              if (st === "in_progress") return "#d5c5a820";
              return "#1d1c1b";
            }}
            maskColor="rgba(0,0,0,0.62)"
          />
        </ReactFlow>

        {/* Drawer (absolutely inside canvas container) */}
        <TopicDetailDrawer
          topic={selectedTopic}
          subjectName={selectedSubjectName}
          onClose={() => setSelectedTopic(null)}
          onStatusChange={handleStatusChange}
          onAskTutor={(topic, subject) =>
            router.push(`/ai-tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic.name)}&prompt=${encodeURIComponent(`Explain ${topic.name} for my ${subject} exam`)}`)
          }
          onVisualize={(topic, subject) =>
            router.push(`/visualise?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic.name)}&type=mind_map`)
          }
        />
      </div>
    </div>
  );
}

export function SyllabusMapCanvas(props: { mode?: "mbbs" | "neet_pg" | "all" }) {
  return (
    <ReactFlowProvider>
      <SyllabusMapInner {...props} />
    </ReactFlowProvider>
  );
}
