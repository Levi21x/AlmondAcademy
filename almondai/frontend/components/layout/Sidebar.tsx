"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AlmondIcons, type AlmondIconName } from "@/components/ui/AlmondIcons";
import { getAchievementSummary, type StreakMilestone } from "@/lib/api/achievements.api";
import { getAlmonds, type AlmondStatus } from "@/lib/api/mcq.api";
import { getStreak } from "@/lib/api/progress.api";
import { getQuickSummary } from "@/lib/api/weakness.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import { cn } from "@/lib/utils/helpers";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  planType?: "Free Plan" | "Premium";
  isPremium?: boolean;
  userName?: string;
  collegeName?: string;
  mode?: "MBBS" | "NEET-PG";
  onModeChange?: (mode: "MBBS" | "NEET-PG") => void;
  onLogout?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: AlmondIconName;
  premium?: boolean;
  section: "core" | "tools";
}

const navItems: NavItem[] = [
  { name: "Dashboard",    href: "/dashboard",    icon: "dashboard",  section: "core" },
  { name: "AI Tutor",     href: "/ai-tutor",     icon: "brain",      section: "core" },
  { name: "Practice MCQs",href: "/practice",     icon: "clipboard",  section: "core" },
  { name: "Progress",     href: "/progress",     icon: "trending",   section: "core" },
  { name: "Planner",      href: "/planner",      icon: "calendar",   premium: true,  section: "core" },
  { name: "Insights",     href: "/insights",     icon: "chart",      premium: true,  section: "core" },
  { name: "Voice Agent",  href: "/voice-agent",  icon: "mic",                        section: "core" },
  { name: "Visualise",    href: "/visualise",    icon: "image",      premium: true,  section: "core" },
  { name: "Profile",      href: "/profile",      icon: "user",                       section: "tools" },
  { name: "Settings",     href: "/settings",     icon: "settings",                   section: "tools" },
];

export function Sidebar({ mobileOpen, onClose, isPremium = false, userName = "New Student", collegeName = "Your College", mode = "MBBS", onModeChange, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const fallbackToken = useAuthStore((state) => state.accessToken);
  const [almonds, setAlmonds] = useState<AlmondStatus | null>(null);
  const [criticalWeaknessCount, setCriticalWeaknessCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [nextStreakMilestone, setNextStreakMilestone] = useState<StreakMilestone | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDailyStatus() {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? fallbackToken;
      if (!token) return;

      try {
        const almondState = await getAlmonds(token);
        if (!cancelled) setAlmonds(almondState);
      } catch { if (!cancelled) setAlmonds(null); }

      try {
        const summary = await getQuickSummary(token);
        if (!cancelled) setCriticalWeaknessCount(summary.critical_count || 0);
      } catch { if (!cancelled) setCriticalWeaknessCount(0); }

      try {
        const streak = await getStreak(token);
        if (!cancelled) setStreakCount(streak.current_streak ?? 0);
      } catch { if (!cancelled) setStreakCount(0); }

      try {
        const summary = await getAchievementSummary(token);
        if (!cancelled) setNextStreakMilestone(summary.next_streak_milestone ?? null);
      } catch { if (!cancelled) setNextStreakMilestone(null); }
    }

    void loadDailyStatus();

    const onAlmondsUpdated = (event: Event) => {
      const custom = event as CustomEvent<AlmondStatus>;
      if (custom.detail && !cancelled) setAlmonds(custom.detail);
    };
    window.addEventListener("almonds-updated", onAlmondsUpdated as EventListener);
    const pollId = window.setInterval(() => void loadDailyStatus(), 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("almonds-updated", onAlmondsUpdated as EventListener);
      window.clearInterval(pollId);
    };
  }, [fallbackToken]);

  const groupedCore  = navItems.filter((item) => item.section === "core");
  const groupedTools = navItems.filter((item) => item.section === "tools");

  const navLink = (item: NavItem) => {
    const active = pathname === item.href;
    const Icon = AlmondIcons[item.icon];

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 10,
          fontSize: "0.82rem",
          fontWeight: active ? 600 : 500,
          textDecoration: "none",
          transition: "all 0.16s ease",
          position: "relative",
          color: active ? "var(--aa-amber)" : "var(--aa-text-3)",
          background: active ? "rgba(213,197,168,0.08)" : "transparent",
          boxShadow: active ? "inset 3px 0 0 var(--aa-amber)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = "rgba(213,197,168,0.05)";
            e.currentTarget.style.color = "var(--aa-text-2)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--aa-text-3)";
          }
        }}
      >
        <Icon
          size={16}
          style={{ flexShrink: 0, color: active ? "var(--aa-amber)" : undefined }}
        />
        <span style={{ flex: 1 }}>{item.name}</span>

        {/* Almonds display on Practice MCQs */}
        {item.name === "Practice MCQs" && almonds ? (
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem", color: "var(--aa-amber)", flexShrink: 0 }}>
            {"🌰".repeat(Math.max(0, almonds.almonds_count))}
            {!almonds.is_full && almonds.minutes_until_reset !== null
              ? <span style={{ color: "var(--aa-text-3)", marginLeft: 2 }}>{almonds.minutes_until_reset}m</span>
              : null}
          </span>
        ) : null}

        {/* Critical weakness badge */}
        {item.name === "Insights" && criticalWeaknessCount > 0 ? (
          <span style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: 100, background: "rgba(228,180,160,0.1)", border: "1px solid rgba(228,180,160,0.25)", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--aa-coral)", flexShrink: 0 }}>
            {criticalWeaknessCount}
          </span>
        ) : null}

        {/* Pro badge */}
        {item.premium && !isPremium ? (
          <span style={{ marginLeft: "auto", padding: "2px 7px", borderRadius: 100, background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.2)", fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", color: "var(--aa-amber)", flexShrink: 0, letterSpacing: "0.05em" }}>
            PRO
          </span>
        ) : null}
      </Link>
    );
  };

  const milestoneProgress = nextStreakMilestone
    ? Math.min(((nextStreakMilestone.current_streak || 0) / Math.max(nextStreakMilestone.target_streak || 1, 1)) * 100, 100)
    : 0;

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", border: "none", cursor: "pointer" }}
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )} style={{ width: 256, background: "var(--aa-s1)", borderColor: "rgba(53,53,52,0.8)" }}>

        {/* ── Logo & mode toggle ── */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(53,53,52,0.8)" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.07))", border: "1px solid rgba(213,197,168,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 0 16px rgba(213,197,168,0.2)", flexShrink: 0 }}>
              🌰
            </div>
            <div>
              <div style={{ fontFamily: "var(--aa-fd)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.025em", color: "var(--aa-text-1)", lineHeight: 1.15 }}>
                AlmondAI
              </div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,242,222,0.35)", lineHeight: 1 }}>
                Medical Intelligence
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#131313", border: "1px solid rgba(53,53,52,0.9)", borderRadius: 100, padding: "3px" }}>
            {(["MBBS", "NEET-PG"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange?.(m)}
                style={{ flex: 1, padding: "6px 8px", borderRadius: 100, fontSize: "0.72rem", fontWeight: 700, border: "none", cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.02em",
                  background: mode === m ? "rgba(213,197,168,0.1)" : "transparent",
                  color: mode === m ? "var(--aa-amber)" : "var(--aa-text-3)",
                  boxShadow: mode === m ? "inset 0 0 0 1px rgba(213,197,168,0.22)" : "none",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(143,136,126,0.7)", padding: "8px 10px 6px" }}>
            Core
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {groupedCore.map(navLink)}
          </div>

          <div style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(143,136,126,0.7)", padding: "16px 10px 6px" }}>
            Tools
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {groupedTools.map(navLink)}
          </div>
        </nav>

        {/* ── Bottom section ── */}
        <div style={{ borderTop: "1px solid rgba(53,53,52,0.8)", padding: "14px 12px 16px" }}>
          {/* Streak & almonds card */}
          <div style={{ background: "linear-gradient(135deg,rgba(213,197,168,0.07),rgba(213,197,168,0.03))", border: "1px solid rgba(213,197,168,0.12)", borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: nextStreakMilestone ? 10 : 0 }}>
              <span style={{ fontSize: 22, animation: "aaFlicker 2s ease-in-out infinite", flexShrink: 0 }}>🔥</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--aa-fd)", fontSize: "0.95rem", fontWeight: 800, color: "var(--aa-amber)", lineHeight: 1.1 }}>
                  {streakCount} day streak
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--aa-text-3)", marginTop: 2 }}>
                  {streakCount > 0 ? "You're on fire 🎯" : "Start your streak!"}
                </div>
              </div>
              {/* Almonds */}
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                {Array.from({ length: almonds?.max_almonds ?? 5 }).map((_, index) => {
                  const filled = index < (almonds?.almonds_count ?? 0);
                  return (
                    <span key={index} style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${filled ? "rgba(213,197,168,0.3)" : "rgba(53,53,52,0.8)"}`, background: filled ? "rgba(213,197,168,0.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, transition: "all 0.3s" }}>
                      {filled ? "🌰" : "·"}
                    </span>
                  );
                })}
              </div>
            </div>

            {nextStreakMilestone && nextStreakMilestone.remaining_days > 0 ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: "0.65rem", color: "var(--aa-text-3)" }}>
                    {nextStreakMilestone.remaining_days}d to {nextStreakMilestone.badge_name ?? "next badge"}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--aa-amber)" }}>{Math.round(milestoneProgress)}%</span>
                </div>
                <div style={{ height: 4, background: "rgba(53,53,52,0.8)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${milestoneProgress}%`, background: "linear-gradient(90deg,var(--aa-amber),var(--aa-amber-lt))", borderRadius: 2, transition: "width 0.8s ease" }} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Upgrade button */}
          <Link
            href="/upgrade"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "10px 0", borderRadius: 100, background: "var(--aa-amber)", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", marginBottom: 10, transition: "all 0.2s", boxShadow: "0 2px 12px rgba(213,197,168,0.18)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(213,197,168,0.28)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(213,197,168,0.18)"; }}
          >
            {isPremium ? "Manage Subscription" : "✦ Upgrade to Premium"}
          </Link>

          {/* User profile */}
          <Link
            href="/profile"
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", transition: "all 0.18s", marginBottom: 2 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(213,197,168,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,rgba(53,53,52,0.9),rgba(42,37,32,0.8))", border: "1.5px solid rgba(213,197,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--aa-fd)", fontSize: "0.85rem", fontWeight: 800, color: "var(--aa-amber)", flexShrink: 0 }}>
              {userName?.[0]?.toUpperCase() ?? "S"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", fontWeight: 600, color: "var(--aa-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--aa-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {collegeName}
              </div>
            </div>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: isPremium ? "var(--aa-amber)" : "var(--aa-text-3)", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
              {isPremium ? <>{<AlmondIcons.crown size={11} />} Pro</> : "Free"}
            </span>
          </Link>

          <button
            type="button"
            onClick={onLogout}
            style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", transition: "all 0.18s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(228,180,160,0.06)"; e.currentTarget.style.color = "var(--aa-coral)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--aa-text-3)"; }}
          >
            <AlmondIcons.logout size={15} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
