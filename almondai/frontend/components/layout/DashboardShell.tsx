"use client";

import { useEffect, useRef, useState } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toast } from "@/components/ui/Toast";
import { getNewAchievements, type AchievementItem } from "@/lib/api/achievements.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/store/authStore";
import { useSubscription } from "@/lib/hooks/useSubscription";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string;
  collegeName?: string;
  planType?: "Free Plan" | "Premium";
}

export function DashboardShell({ children, userName, collegeName, planType }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<"MBBS" | "NEET-PG">("MBBS");
  const [unlockToast, setUnlockToast] = useState<AchievementItem | null>(null);
  const unlockQueueRef = useRef<AchievementItem[]>([]);
  const token = useAuthStore((state) => state.accessToken);
  const { signOut } = useAuth();
  const { isPremium } = useSubscription();

  const resolvedPlanType = isPremium ? "Premium" : planType || "Free Plan";

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    const storageKey = "aa-achievements-last-seen";
    let lastSeen = window.localStorage.getItem(storageKey);

    if (!lastSeen) {
      const initialSeen = new Date().toISOString();
      window.localStorage.setItem(storageKey, initialSeen);
      lastSeen = initialSeen;
    }

    const showNextToast = () => {
      setUnlockToast((current) => {
        if (current || unlockQueueRef.current.length === 0) {
          return current;
        }
        const next = unlockQueueRef.current.shift() ?? null;
        return next;
      });
    };

    const pollUnlocks = async () => {
      try {
        const payload = await getNewAchievements(token, lastSeen, 12);
        lastSeen = payload.server_time;
        window.localStorage.setItem(storageKey, payload.server_time);

        if (!cancelled && payload.items.length > 0) {
          unlockQueueRef.current.push(...payload.items);
          showNextToast();
        }
      } catch {
        // Unlock polling should never block the dashboard shell.
      }
    };

    void pollUnlocks();
    const pollId = window.setInterval(() => {
      void pollUnlocks();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [token]);

  useEffect(() => {
    if (!unlockToast) {
      if (unlockQueueRef.current.length > 0) {
        const next = unlockQueueRef.current.shift() ?? null;
        if (next) {
          setUnlockToast(next);
        }
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUnlockToast(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [unlockToast]);

  return (
    <div className="min-h-screen bg-[var(--aa-bg)] text-[var(--aa-text-1)]">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={userName}
        collegeName={collegeName}
        planType={resolvedPlanType}
        isPremium={isPremium}
        mode={mode}
        onModeChange={setMode}
        onLogout={() => {
          void signOut();
        }}
      />
      <main className="relative overflow-y-auto bg-[var(--aa-bg)] px-4 pb-8 pt-4 lg:ml-64 lg:px-10 lg:pt-8">
        <div className="mx-auto w-full max-w-[1080px]">{children}</div>
      </main>
      {unlockToast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] w-[min(92vw,360px)]">
          <div className="pointer-events-auto">
            <Toast
              message={`Achievement unlocked: ${unlockToast.badge_name}`}
              variant="success"
              onClose={() => setUnlockToast(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
