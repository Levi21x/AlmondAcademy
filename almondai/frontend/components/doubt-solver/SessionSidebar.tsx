"use client";

interface SessionItem {
  id: string;
  title: string;
  subject?: string | null;
  last_message_at: string;
}

interface SessionSidebarProps {
  sessions: SessionItem[];
  activeSessionId: string | null;
  loading?: boolean;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onNewConversation: () => void;
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

export function SessionSidebar({ sessions, activeSessionId, loading = false, onSelect, onDelete, onNewConversation }: SessionSidebarProps) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-[#353534] bg-[#1f1f1f] p-4 lg:w-80">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#fff2de]">Conversations</h3>
        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-lg border border-[#4c463d] bg-transparent px-2 py-1 text-xs text-[#cec5b9] transition-all duration-200 ease-in-out hover:text-[#fff2de]"
        >
          New conversation
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <>
            <div className="h-14 animate-pulse rounded-xl bg-[linear-gradient(90deg,#1f1f1f_0%,#2a2a2a_50%,#1f1f1f_100%)]" />
            <div className="h-14 animate-pulse rounded-xl bg-[linear-gradient(90deg,#1f1f1f_0%,#2a2a2a_50%,#1f1f1f_100%)]" />
            <div className="h-14 animate-pulse rounded-xl bg-[linear-gradient(90deg,#1f1f1f_0%,#2a2a2a_50%,#1f1f1f_100%)]" />
          </>
        ) : null}

        {!loading && sessions.length === 0 ? <p className="rounded-xl border border-[#353534] bg-[#1a1a1a] p-3 text-sm text-[#cec5b9]">No conversations yet</p> : null}

        {!loading
          ? sessions.map((session) => {
              const active = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`group rounded-xl border p-3 transition ${
                    active
                      ? "border-[#d5c5a8]/45 bg-[#201f1f]"
                      : "border-[#353534] bg-[#1a1a1a] hover:bg-[#201f1f]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-[#fff2de]">{session.title || "New Conversation"}</p>
                      <p className="mt-1 text-xs text-[#b7ada0]">{toRelativeTime(session.last_message_at)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(session.id)}
                      className="opacity-0 transition group-hover:opacity-100"
                      aria-label="Delete conversation"
                    >
                      <span className="material-symbols-outlined text-base text-[#b7ada0] transition-all duration-200 ease-in-out hover:text-[#e4b4a0]">delete</span>
                    </button>
                  </div>
                  {session.subject ? <span className="mt-2 inline-block rounded-full bg-[#2a2520] px-2 py-0.5 text-xs text-[#d5c5a8]">{session.subject}</span> : null}
                </div>
              );
            })
          : null}
      </div>

    </aside>
  );
}
