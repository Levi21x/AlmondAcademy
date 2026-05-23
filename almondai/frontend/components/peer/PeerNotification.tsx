"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, X } from "lucide-react";
import Link from "next/link";

import { getNotifications, markNotificationRead, type PeerNotification as PeerNotificationItem } from "@/lib/api/peer.api";

interface PeerNotificationProps {
  token?: string | null;
}

export function PeerNotification({ token }: PeerNotificationProps) {
  const [items, setItems] = useState<PeerNotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setItems([]);
        return;
      }
      const rows = await getNotifications(token);
      if (!cancelled) {
        setItems(rows);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const first = useMemo(() => items[0] ?? null, [items]);

  if (!first) {
    return null;
  }

  const dismiss = async () => {
    if (token) {
      await markNotificationRead(token, first.id);
    }
    setItems((prev) => prev.filter((item) => item.id !== first.id));
  };

  const viewHref = first.action_url && first.action_url.trim() ? first.action_url : "/dashboard";

  return (
    <section className="rounded-xl border border-[#d5c5a8]/30 bg-[#2a2520] px-4 py-3">
      <div className="flex items-start gap-3">
        <Brain className="mt-0.5 h-5 w-5 text-[#d5c5a8]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#fff2de]">{first.title}</p>
          <p className="text-sm text-[#cec5b9]">{first.message}</p>
          <Link href={viewHref} className="mt-1 inline-block text-xs text-[#d5c5a8] hover:text-[#fff2de]">
            View
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void dismiss()}
          className="rounded-md p-1 text-[#cec5b9] hover:bg-[#3a342d]"
          aria-label="Dismiss peer notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
