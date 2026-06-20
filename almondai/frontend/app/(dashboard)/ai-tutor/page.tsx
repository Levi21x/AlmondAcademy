"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Brain, CheckCircle2, ListChecks, Menu, PanelLeft, PenSquare, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ChatMessage } from "@/components/doubt-solver/ChatMessage";
import { Toast, ToastVariant } from "@/components/ui/Toast";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { askQuestion, ConversationTurn, getUsageStatus, TutorAction, UsageStatus } from "@/lib/api/doubt_solver.api";
import { updateTopicProgress } from "@/lib/api/syllabus.api";
import { ChatSession, createSession, deleteSession, getSession, getSessions } from "@/lib/api/chat_history.api";
import { getMemoryInsights } from "@/lib/api/memory.api";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  searchUsed?: boolean;
  syllabusUpdatedTopic?: string;
  actions?: TutorAction[];
}

interface ToastState {
  message: string;
  variant: ToastVariant;
}

function toRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const categoryLabels: Record<string, string> = {
  survivor: "The Survivor",
  sprinter: "The Sprinter",
  anxious_grinder: "The Anxious Grinder",
  passionate: "The Passionate",
  lost: "The Lost",
  strategic_climber: "The Strategic Climber",
};

const starterByCategory: Record<string, string[]> = {
  survivor: [
    "What are the highest yield topics for MBBS finals?",
    "Give me a 3-day study plan for Pathology",
    "Quick MCQ patterns for Pharmacology",
  ],
  sprinter: [
    "Differentiate STEMI vs NSTEMI for MCQs",
    "High yield Biochemistry for exams",
    "Surgery short cases - what to know",
  ],
  anxious_grinder: [
    "Help me understand the coagulation cascade",
    "Am I covering enough for my exam?",
    "Explain Renal Physiology step by step",
  ],
  passionate: [
    "Explain the mechanism of septic shock",
    "How does the renin-angiotensin system work?",
    "Clinical correlation of heart failure",
  ],
  lost: [
    "Start from basics - what is pathology?",
    "Explain hypertension in simple terms",
    "How do I begin studying Medicine?",
  ],
  strategic_climber: [
    "Most tested topics in NEET-PG Medicine",
    "High yield Surgery for PG entrance",
    "Rank-boosting topics in Pharmacology",
  ],
};

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MCQ_INVITATION_PHRASES = [
  "ready to test your knowledge",
  "type 'yes' to practice",
  "type yes to practice",
  "practice mcqs on this topic",
  "want to practice mcqs",
  "ready to practice",
];
const DIRECT_MCQ_REQUESTS = [
  "i want to test",
  "test my knowledge",
  "take me to mcq",
  "take me to practice",
  "redirect me to practice",
  "redirect to mcq",
  "go to practice",
  "go to mcqs",
  "i want to practice mcq",
  "want to practice mcq",
  "let me practice",
  "start practice",
  "open practice",
  "practice now",
  "mcq now",
  "mcqs now",
  "i want mcq",
  "give me mcq",
  "quiz me",
  "test me",
  "test me now",
  "let's practice",
  "lets practice",
  "begin practice",
  "start mcq",
  "start the mcq",
  "take me to the practice",
  "i want to do mcqs",
  "i want to do mcq",
];
const ACCEPTANCE_WORDS = [
  "yes",
  "sure",
  "okay",
  "ok",
  "yeah",
  "yep",
  "ready",
  "lets go",
  "let's go",
  "go",
  "start",
  "begin",
  "alright",
  "sounds good",
  "yup",
  "why not",
  "sure let's go",
  "ok let's go",
  "yess",
  "yes please",
  "ok sure",
];
const SYLLABUS_UPDATE_MARKER_PREFIX = "[SYLLABUS_UPDATED:";

function extractTopicFromMessage(message: string): string | null {
  const trimmed = message.trim();
  const explainMatch = trimmed.match(/(?:explain|teach|revise)\s+(.+?)(?:\s+for\s+my|\?|$)/i);
  if (explainMatch?.[1]) {
    return explainMatch[1].trim();
  }
  if (trimmed.length > 0 && trimmed.length <= 90) {
    return trimmed;
  }
  return null;
}

export default function AITutorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((state) => state.accessToken);
  const { data: profile } = useProfile();
  const { subjects: subjectList, loaded: subjectsLoaded } = useSubjectList();

  const [subject, setSubject] = useState("Cardiology");
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [doneActionKeys, setDoneActionKeys] = useState<Set<string>>(() => new Set());
  const [draftMessage, setDraftMessage] = useState("");
  const [hasPersonalizationMemory, setHasPersonalizationMemory] = useState(false);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [lastTopicDiscussed, setLastTopicDiscussed] = useState("");
  const [showHighYieldBanner, setShowHighYieldBanner] = useState(false);
  const [isAutoSendingPrefill, setIsAutoSendingPrefill] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const autoSentRef = useRef(false);
  const prefillAutoSentRef = useRef(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const voiceInput = useVoiceInput();
  const {
    isListening: voiceListening,
    transcript: voiceTranscript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: voiceSupported,
    error: voiceError,
  } = voiceInput;

  const querySubject = (searchParams.get("subject") || "").trim();
  const queryTopic = (searchParams.get("topic") || "").trim();
  const queryPrompt = (searchParams.get("prompt") || "").trim();

  const modeParam = (searchParams.get("mode") || "").trim().toLowerCase();
  const sourceParam = (searchParams.get("source") || "").trim().toLowerCase();
  const prefillParam = (searchParams.get("prefill") || "").trim();
  const autosendParam = (searchParams.get("autosend") || "").trim().toLowerCase();

  const decodedPrefill = useMemo(() => {
    if (!prefillParam) {
      return "";
    }
    try {
      return decodeURIComponent(prefillParam);
    } catch {
      return prefillParam;
    }
  }, [prefillParam]);

  const deepLinkPrompt = queryPrompt || (querySubject && queryTopic ? `Explain ${queryTopic} for my ${querySubject} exam` : "");

  const refreshUsage = useCallback(async (activeToken: string) => {
    const usageState = await getUsageStatus(activeToken);
    setUsage(usageState);
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshUsage(token).catch(() => {});
  }, [refreshUsage, token]);

  const loadSessions = useCallback(async (activeToken: string) => {
    setSessionsLoading(true);
    try {
      const all = await getSessions(activeToken);
      setSessions(all);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadSessions(token).catch(() => {});
  }, [loadSessions, token]);

  useEffect(() => {
    if (!token) return;
    void getMemoryInsights(token)
      .then((data) => {
        setHasPersonalizationMemory((data.memory_stats?.total_interactions ?? 0) > 5);
      })
      .catch(() => {
        setHasPersonalizationMemory(false);
      });
  }, [token]);

  useEffect(() => {
    if (!subjectsLoaded || subjectList.length === 0) return;
    if (!subjectList.includes(subject)) {
      setSubject(subjectList[0]);
    }
  }, [subjectsLoaded, subjectList]);

  useEffect(() => {
    if (!querySubject || !subjectsLoaded) {
      return;
    }
    if (subjectList.includes(querySubject)) {
      setSubject(querySubject);
    } else if (subjectList.length > 0) {
      setSubject(subjectList[0]);
    }
  }, [querySubject, subjectsLoaded, subjectList]);

  useEffect(() => {
    if (modeParam === "high_yield") {
      setShowHighYieldBanner(true);
    }
  }, [modeParam]);

  useEffect(() => {
    if (!deepLinkPrompt) {
      return;
    }
    setDraftMessage(deepLinkPrompt);
    const inferred = queryTopic || extractTopicFromMessage(deepLinkPrompt);
    if (inferred) {
      setLastTopicDiscussed(inferred);
    }
  }, [deepLinkPrompt]);

  const usageUnlimited = Boolean(usage?.unlimited);
  const limitReached = Boolean(
    usage && !usage.is_premium && !usageUnlimited && usage.questions_remaining !== null && usage.questions_remaining <= 0,
  );
  const nearLimit = Boolean(
    usage && !usage.is_premium && !usageUnlimited && usage.questions_remaining !== null && usage.questions_remaining <= 3,
  );
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const activeToken = session?.access_token ?? token;
      if (!activeToken) return;
      const selected = await getSession(activeToken, sessionId);
      setActiveSessionId(sessionId);
      setMessages(
        (selected.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      );
      setStreamingContent("");
      setIsStreaming(false);
      if (selected.subject) setSubject(selected.subject);
      setMobileSidebarOpen(false);
    },
    [token],
  );

  const handleNewConversation = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    setMobileSidebarOpen(false);
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const activeToken = session?.access_token ?? token;
      if (!activeToken) return;
      await deleteSession(activeToken, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    },
    [activeSessionId, token],
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const handleSendMessage = useCallback(
    async (question: string) => {
      if (isStreaming) return;

      // ─── MCQ REDIRECT DETECTION ───────────────
      const lastAssistantMsg = messages
        .filter((msg) => msg.role === "assistant")
        .slice(-1)[0]?.content?.toLowerCase() ?? "";
      const hasMCQInvitation = MCQ_INVITATION_PHRASES.some((phrase) => lastAssistantMsg.includes(phrase));
      const cleanUserMessage = question
        .replace(/\[deep explain\]/gi, "")
        .replace(/\[search\]/gi, "")
        .replace(/\[visualise\]/gi, "")
        .trim()
        .toLowerCase();

      const isDirectMCQRequest = DIRECT_MCQ_REQUESTS.some((phrase) => cleanUserMessage.includes(phrase));

      const isAcceptingAfterInvite =
        hasMCQInvitation &&
        ACCEPTANCE_WORDS.some(
          (word) =>
            cleanUserMessage === word ||
            cleanUserMessage.startsWith(`${word} `) ||
            cleanUserMessage.endsWith(` ${word}`),
        );

      if (isDirectMCQRequest || isAcceptingAfterInvite) {
        const encodedSubject = encodeURIComponent(subject || "General");
        const topicParam = lastTopicDiscussed ? `&topic=${encodeURIComponent(lastTopicDiscussed)}&generate=true` : "&generate=true";
        router.push(`/practice?subject=${encodedSubject}&mode=tutor_flow${topicParam}`);
        return;
      }
      // ─── END MCQ REDIRECT DETECTION ──────────

      const visualPrefixPattern = /^\[Visualise\]\s*/i;
      if (visualPrefixPattern.test(question)) {
        const visualTopic = question.replace(visualPrefixPattern, "").trim() || "Medical concept";
        const visualSubject = subject.trim();
        router.push(
          `/visualise?topic=${encodeURIComponent(visualTopic)}&subject=${encodeURIComponent(visualSubject)}&type=flowchart`,
        );
        return;
      }

      const inferredTopic = extractTopicFromMessage(question);
      if (inferredTopic) {
        setLastTopicDiscussed(inferredTopic);
      }

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const activeToken = session?.access_token ?? token;

      if (!activeToken) {
        setToast({ message: "Please sign in again to continue.", variant: "error" });
        return;
      }
      if (limitReached) {
        setToast({ message: "Daily limit reached. Upgrade for unlimited questions.", variant: "warning" });
        return;
      }

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const created = await createSession(activeToken, subject, profile?.mode ?? undefined);
        currentSessionId = created.id;
        setActiveSessionId(created.id);
      }

      const userMessage: Message = { id: createId(), role: "user", content: question };
      const assistantMessageId = createId();
      const searchWasActive = isSearchMode;

      setMessages((prev) => [...prev, userMessage]);
      setStreamingContent("");
      setIsStreaming(true);

      const history: ConversationTurn[] = messages
        .slice(-10)
        .map((msg) => ({ role: msg.role, content: msg.content }))
        .filter((turn) => turn.content.trim().length > 0);

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        let accumulatedContent = "";
        let syllabusUpdatedTopic = "";
        const collectedActions: TutorAction[] = [];

        for await (const ev of askQuestion({
          question,
          subject,
          sessionId: currentSessionId,
          conversationHistory: history,
          stream: true,
          token: activeToken,
          signal: controller.signal,
          searchEnabled: searchWasActive,
        })) {
          if (ev.type === "session") {
            setActiveSessionId(ev.data);
            continue;
          }
          if (ev.type === "action") {
            collectedActions.push(ev.action);
            continue;
          }
          if (ev.type === "chunk") {
            if (ev.data.startsWith(SYLLABUS_UPDATE_MARKER_PREFIX) && ev.data.endsWith("]")) {
              syllabusUpdatedTopic = ev.data.slice(SYLLABUS_UPDATE_MARKER_PREFIX.length, -1).trim();
              continue;
            }
            const processedChunk = ev.data.replace(/\\n/g, "\n");
            accumulatedContent = `${accumulatedContent}${processedChunk}`;
            setStreamingContent(accumulatedContent);
          }
        }

        setStreamingContent("");
        const cleanedAssistant = accumulatedContent
          .replace(/\*?\[general\]\*?/gi, "")
          .replace(/\*?\[from general knowledge\]\*?/gi, "")
          .replace(/\*?\[rag\]\*?/gi, "")
          .replace(/\[MCQ_PROMPT_SENT\]/g, "")
          .replace(/\[MCQ_INVITE_SENT\]/g, "")
          .trim();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: cleanedAssistant,
            searchUsed: searchWasActive,
            syllabusUpdatedTopic: syllabusUpdatedTopic || undefined,
            actions: collectedActions.length ? collectedActions : undefined,
          },
        ]);

        await refreshUsage(activeToken);
        await loadSessions(activeToken);
      } catch (error: unknown) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (aborted) return;

        const message = error instanceof Error ? error.message : "Failed to get AI response.";

        setStreamingContent("");
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: message || "AlmondAI could not process this question right now.",
          },
        ]);
        setToast({ message, variant: "error" });
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [activeSessionId, isSearchMode, isStreaming, lastTopicDiscussed, limitReached, loadSessions, messages, profile?.mode, refreshUsage, router, sourceParam, subject, token],
  );

  const handleTutorAction = useCallback(
    async (action: TutorAction, key: string) => {
      if (action.type === "replan") {
        router.push("/planner");
        return;
      }
      if (action.type === "mcq") {
        const topicParam = lastTopicDiscussed ? `&topic=${encodeURIComponent(lastTopicDiscussed)}&generate=true` : "&generate=true";
        router.push(`/practice?subject=${encodeURIComponent(action.subject)}&mode=tutor_flow${topicParam}`);
        return;
      }
      if (action.type === "visual") {
        const params = new URLSearchParams({ topic: action.topic, type: action.visual_type });
        if (subject) params.set("subject", subject);
        router.push(`/visualise?${params.toString()}`);
        return;
      }
      if (action.type === "mark_done") {
        if (!token || !action.topic_id) {
          return;
        }
        try {
          await updateTopicProgress(token, action.topic_id, "completed");
          setDoneActionKeys((prev) => new Set(prev).add(key));
          setToast({ message: `Marked "${action.topic}" as complete`, variant: "success" });
        } catch {
          setToast({ message: "Could not update progress. Please try again.", variant: "error" });
        }
      }
    },
    [lastTopicDiscussed, router, subject, token],
  );

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages, streamingContent]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!token || !deepLinkPrompt || !querySubject || !queryTopic || autoSentRef.current) {
      return;
    }
    autoSentRef.current = true;
    handleNewConversation();
    void handleSendMessage(deepLinkPrompt);
  }, [deepLinkPrompt, handleNewConversation, handleSendMessage, querySubject, queryTopic, token]);

  useEffect(() => {
    if (!decodedPrefill) {
      return;
    }

    const inferred = extractTopicFromMessage(decodedPrefill);
    if (inferred) {
      setLastTopicDiscussed(inferred);
    }

    if (autosendParam === "true") {
      if (!token || prefillAutoSentRef.current) {
        return;
      }

      prefillAutoSentRef.current = true;
      setIsAutoSendingPrefill(true);
      handleNewConversation();

      const timeoutId = window.setTimeout(() => {
        void handleSendMessage(decodedPrefill).finally(() => {
          setIsAutoSendingPrefill(false);
        });
      }, 500);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    setDraftMessage(decodedPrefill);
  }, [autosendParam, decodedPrefill, handleNewConversation, handleSendMessage, token]);

  useEffect(() => {
    if (voiceListening) {
      return;
    }
    const normalized = voiceTranscript.trim();
    if (!normalized || normalized === lastVoiceTranscript) {
      return;
    }

    setDraftMessage(normalized);
    setLastVoiceTranscript(normalized);
    resetTranscript();
  }, [lastVoiceTranscript, resetTranscript, voiceListening, voiceTranscript]);

  useEffect(() => {
    if (!voiceError) {
      return;
    }
    setToast({ message: voiceError, variant: "warning" });
  }, [voiceError]);

  const handleMicToggle = useCallback(() => {
    if (!voiceSupported) {
      setToast({ message: "Voice input requires Chrome or Edge.", variant: "warning" });
      return;
    }

    if (voiceListening) {
      stopListening();
      return;
    }

    startListening();
  }, [startListening, stopListening, voiceListening, voiceSupported]);

  const usageText = useMemo(() => {
    if (!usage || usageUnlimited || usage.is_premium) return null;
    return `${usage.questions_asked_today}/${usage.daily_limit} used · ${usage.questions_remaining} remaining`;
  }, [usage, usageUnlimited]);

  const studentCategory = profile?.student_category ?? "sprinter";
  const studentCategoryLabel = categoryLabels[studentCategory] ?? "The Sprinter";
  const starters = starterByCategory[studentCategory] ?? starterByCategory.sprinter;
  const displayStreamingContent = streamingContent
    .replace(/\*?\[general\]\*?/gi, "")
    .replace(/\*?\[from general knowledge\]\*?/gi, "")
    .replace(/\*?\[rag\]\*?/gi, "")
    .replace(/\[MCQ_PROMPT_SENT\]/gi, "")
    .replace(/\[MCQ_INVITE_SENT\]/gi, "")
    .trim();

  const SidebarContent = (
    <div className="flex h-full min-h-0 w-full flex-col rounded-none border-r border-[#353534] bg-[#1c1c1b] md:rounded-2xl md:border md:border-[#353534] md:bg-[#1c1c1b]">
      <div className="flex items-center justify-between border-b border-[#353534] p-4">
        <h2 className="text-sm font-semibold text-[#fff2de]">Conversations</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4c463d] bg-transparent px-2.5 py-1.5 text-xs text-[#cec5b9] transition-colors hover:text-[#fff2de]"
          >
            <PenSquare className="h-3.5 w-3.5" strokeWidth={1.9} />
            <span>New</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="hidden md:inline-flex items-center justify-center h-7 w-7 rounded-lg border border-[#4c463d] bg-transparent text-[#8f887e] transition-colors hover:text-[#e5e2e1]"
            aria-label="Collapse sidebar"
          >
            <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <label htmlFor="subject" className="mb-1 block text-xs uppercase tracking-wide text-[#d5c5a8]">
          Subject
        </label>
        <select
          id="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-xl border border-[#4c463d] bg-[#1a1a1a] px-3 py-2 text-sm text-[#e5e2e1] outline-none transition-all duration-200 ease-in-out focus:border-[#d5c5a8]"
        >
          {subjectList.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto px-3 pb-3">
        {sessionsLoading
          ? [1, 2, 3].map((key) => (
              <div key={key} className="aa-skeleton h-16 rounded-xl" />
            ))
          : null}

        {!sessionsLoading && sessions.length === 0 ? (
          <p className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-3 text-sm text-[#cec5b9]">No conversations yet</p>
        ) : null}

        {!sessionsLoading
          ? sessions.map((session) => {
              const active = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`group rounded-xl border p-3 transition ${
                    active ? "border-[#d5c5a8]/45 bg-[#201f1f]" : "border-[#353534] bg-[#1a1a1a] hover:bg-[#201f1f]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => void handleSelectSession(session.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold text-[#fff2de]">{session.title || "New Conversation"}</p>
                      <p className="mt-1 text-xs text-[#b7ada0]">{toRelativeTime(session.last_message_at)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleDeleteSession(session.id); }}
                      className="opacity-0 transition group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4 text-[#b7ada0] transition-all duration-200 ease-in-out hover:text-[#e4b4a0]" strokeWidth={1.8} />
                    </button>
                  </div>
                  {session.subject ? (
                    <span className="mt-2 inline-block rounded-full bg-[#2a2520] px-2 py-0.5 text-xs text-[#d5c5a8]">
                      {session.subject}
                    </span>
                  ) : null}
                </div>
              );
            })
          : null}
      </div>

      <div className="border-t border-[#353534] p-4">
        <span className="inline-flex rounded-full border border-[#d5c5a8]/35 bg-[#2a2520] px-3 py-1 text-xs text-[#d5c5a8]">∞ Unlimited</span>
      </div>
    </div>
  );

  const isEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className="relative h-[calc(100dvh-6.5rem)] overflow-hidden rounded-2xl border border-[#353534] bg-[#131313] lg:h-[calc(100dvh-4rem)]">
      <div className={`grid h-full min-h-0 grid-cols-1 transition-[grid-template-columns] duration-200 ${sidebarCollapsed ? "" : "md:grid-cols-[272px_minmax(0,1fr)]"}`}>
        <div className={`hidden h-full min-h-0 md:block ${sidebarCollapsed ? "md:hidden" : ""}`}>{SidebarContent}</div>

        <div className="relative flex h-full min-h-0 flex-col">
          {/* Desktop top bar — sidebar toggle + new chat when sidebar is collapsed */}
          <div className={`hidden md:flex flex-shrink-0 items-center gap-2 px-4 pt-3 pb-0 ${sidebarCollapsed ? "" : "absolute top-0 left-0 z-10 pointer-events-none opacity-0"}`}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#4c463d] bg-[#1f1f1f] text-[#8f887e] transition-colors hover:text-[#e5e2e1]"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.9} />
            </button>
            <button
              type="button"
              onClick={handleNewConversation}
              className="pointer-events-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#4c463d] bg-[#1f1f1f] px-2.5 text-xs text-[#cec5b9] transition-colors hover:text-[#fff2de]"
            >
              <PenSquare className="h-3.5 w-3.5" strokeWidth={1.9} />
              New chat
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#353534] px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]"
              aria-label="Open conversations"
            >
              <Menu className="h-4 w-4" strokeWidth={1.9} />
            </button>
            <h1 className="text-sm font-semibold text-[#fff2de]">AI Tutor</h1>
            <div className="w-9" />
          </div>

          <div ref={messagesScrollRef} className={`flex-1 min-h-0 overflow-y-auto px-4 pb-4 md:px-8 ${sidebarCollapsed ? "pt-3" : "pt-6"}`}>
            {showHighYieldBanner ? (
              <div style={{ maxWidth: 896, width: "100%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 12, border: "1px solid rgba(230,200,122,0.25)", background: "linear-gradient(90deg,rgba(42,37,26,0.9),rgba(38,34,22,0.8))", padding: "10px 16px" }}>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "#e6c87a", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚡</span>
                  <span><strong>High-Yield Mode</strong> — AlmondAI is explaining with clinical reasoning and exam focus</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowHighYieldBanner(false)}
                  style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", color: "#e6c87a", cursor: "pointer", opacity: 0.7, flexShrink: 0 }}
                  aria-label="Dismiss high-yield banner"
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(230,200,122,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ) : null}

            {sourceParam === "dashboard" ? (
              <div className="mx-auto mb-4 w-full max-w-4xl rounded-xl border border-[#4c463d] bg-[#1f1f1f] px-4 py-3 text-sm text-[#d5c5a8]">
                Your high-yield study session has started. Ask AlmondAI anything — what topic would you like to master today?
              </div>
            ) : null}

            {isAutoSendingPrefill ? (
              <div className="mx-auto mb-4 w-full max-w-4xl animate-pulse rounded-xl border border-[#353534] bg-[#1f1f1f] px-4 py-3 text-sm text-[#cec5b9]">
                Loading your study session...
              </div>
            ) : null}

            {isEmptyState ? (
              <div className="relative mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-4 pb-6">
                {/* Ambient amber radial glow */}
                <div style={{ position: "absolute", top: "42%", left: "50%", transform: "translate(-50%, -50%)", width: "min(700px, 100vw)", height: 420, background: "radial-gradient(ellipse at center, rgba(213,197,168,0.07) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

                <div className="relative z-10 w-full text-center">
                  <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.9rem, 4.8vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--aa-text-1)", marginBottom: 4 }}>
                    Hi {profile?.full_name?.split(" ")[0] ?? "there"},
                  </h1>
                  <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.9rem, 4.8vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: "rgba(229,226,225,0.28)", marginBottom: 28 }}>
                    what&apos;s on your mind?
                  </h1>

                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", fontWeight: 600, color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 100, padding: "5px 16px" }}>
                      {studentCategoryLabel}
                    </span>
                  </div>

                  {/* Chip-style suggestion starters */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640, margin: "0 auto" }}>
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => { void handleSendMessage(starter); }}
                        style={{ borderRadius: 100, border: "1px solid rgba(76,70,61,0.65)", background: "rgba(28,28,27,0.8)", padding: "10px 20px", fontFamily: "var(--aa-fb)", fontSize: "0.83rem", color: "#cec5b9", cursor: "pointer", transition: "border-color 0.15s, color 0.15s, background 0.15s", whiteSpace: "nowrap" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.45)"; e.currentTarget.style.color = "#fff2de"; e.currentTarget.style.background = "rgba(42,37,32,0.7)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.65)"; e.currentTarget.style.color = "#cec5b9"; e.currentTarget.style.background = "rgba(28,28,27,0.8)"; }}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-5">
                {messages.map((message) => {
                  const cleanedMessageContent =
                    message.role === "assistant"
                      ? message.content
                          .replace(/\[MCQ_PROMPT_SENT\]/g, "")
                          .replace(/\[MCQ_INVITE_SENT\]/g, "")
                          .trim()
                      : message.content;

                  return (
                    <div key={message.id}>
                      {message.role === "assistant" && message.searchUsed ? (
                        <div className="mb-1.5 flex">
                          <span className="rounded-full bg-[#2a2520] px-2.5 py-0.5 text-[10px] text-[#d5c5a8]">
                            🔍 Web search included
                          </span>
                        </div>
                      ) : null}
                      <ChatMessage
                        role={message.role}
                        content={cleanedMessageContent}
                        isStreaming={false}
                        personalized={message.role === "assistant" && hasPersonalizationMemory}
                      />
                      {message.role === "assistant" && message.syllabusUpdatedTopic ? (
                        <div className="mt-2 rounded-xl border border-[#4c463d] bg-[#1c1b1b] px-3 py-2 text-xs text-[#d5c5a8]">
                          Progress updated: marked <span className="font-semibold">{message.syllabusUpdatedTopic}</span> as in progress.
                        </div>
                      ) : null}
                      {message.role === "assistant" && message.actions?.length ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {message.actions.map((action, actionIndex) => {
                            const actionKey = `${message.id}:${actionIndex}`;
                            const isDone = doneActionKeys.has(actionKey);
                            const Icon =
                              action.type === "replan"
                                ? RefreshCw
                                : action.type === "mcq"
                                  ? ListChecks
                                  : action.type === "visual"
                                    ? Sparkles
                                    : CheckCircle2;
                            return (
                              <button
                                key={actionKey}
                                type="button"
                                disabled={isDone}
                                onClick={() => void handleTutorAction(action, actionKey)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:translate-y-px ${
                                  isDone
                                    ? "cursor-default border-[#2f4a35] bg-[#16271b] text-[#69db8b]"
                                    : "border-[#d5c5a8]/30 bg-[#d5c5a8]/8 text-[#e9dcc2] hover:border-[#d5c5a8]/60 hover:bg-[#d5c5a8]/14"
                                }`}
                              >
                                {isDone ? <CheckCircle2 size={13} strokeWidth={2} /> : <Icon size={13} strokeWidth={2} />}
                                {isDone ? "Done" : action.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {isStreaming && streamingContent.length > 0 ? (
                  <div className="mb-8 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs text-[#d5c5a8]">
                      <div className="flex h-6 w-6 items-center justify-center rounded bg-[#d5c5a8]/10">
                        <Brain size={14} className="text-[#d5c5a8]" strokeWidth={1.8} />
                      </div>
                      <span className="uppercase tracking-widest">AlmondAI</span>
                      <span className="ml-1 inline-flex items-center gap-1">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "0ms" }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "150ms" }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-[#d5c5a8]" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                    <div className="flowing-text border-l-2 border-[#d5c5a8]/20 pl-6">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {displayStreamingContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {nearLimit ? (
              <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-[#d5c5a8]/35 bg-[#2a2520] px-3 py-2 text-sm text-[#d5c5a8]">
                You are close to your daily free limit. Upgrade to AlmondAI Premium for unlimited questions.
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="pointer-events-none relative h-0 flex-shrink-0">
            <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-[#131313] to-transparent" />
          </div>
          <div className={`flex-shrink-0 bg-[#131313] px-4 pb-4 pt-3 md:px-8 ${isEmptyState ? "" : "border-t border-[#353534]"}`}>
            <div className="mx-auto w-full max-w-4xl">
              {isSearchMode ? (
                <div className="mb-2 flex justify-end">
                  <span className="rounded-full border border-[#d5c5a8]/30 bg-[#2a2520] px-2.5 py-1 text-[10px] text-[#d5c5a8]">
                    🔍 Web search on
                  </span>
                </div>
              ) : null}
              <PromptInputBox
                onSend={(message) => {
                  if (message.trim()) {
                    void handleSendMessage(message);
                  }
                }}
                isLoading={isStreaming}
                onStop={stopStreaming}
                disabled={limitReached}
                draftMessage={draftMessage}
                onDraftConsumed={() => setDraftMessage("")}
                placeholder="Ask AlmondAI anything about medicine..."
                isListening={voiceListening}
                interimTranscript={interimTranscript}
                onMicClick={handleMicToggle}
                speechSupported={voiceSupported}
                onModeChange={(m) => {
                  setIsSearchMode(m === "search");
                }}
                acceptAttachments
              />
              <p className="mt-2 text-center text-xs text-[#b7ada0]">
                AlmondAI can make mistakes. Verify important medical information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => { setToast(null); }}
        />
      ) : null}

      <Dialog.Root open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] md:hidden">
            <div className="absolute right-3 top-3 z-10">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#4c463d] bg-[#1f1f1f] text-[#e5e2e1]"
                  aria-label="Close conversations"
                >
                  <X className="h-4 w-4" strokeWidth={1.9} />
                </button>
              </Dialog.Close>
            </div>
            {SidebarContent}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {usageText && !usageUnlimited ? (
        <p className="absolute right-4 top-4 text-xs text-[#b7ada0]">{usageText}</p>
      ) : null}
    </div>
  );
}