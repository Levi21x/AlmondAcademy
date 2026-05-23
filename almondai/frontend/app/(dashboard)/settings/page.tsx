"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getActivityFeed, type Activity } from "@/lib/api/progress.api";
import { submitFeedback, type FeedbackCategory } from "@/lib/api/feedback.api";
import { updateProfile } from "@/lib/api/auth.api";
import { useTheme } from "@/lib/hooks/useTheme";
import { useProfile } from "@/lib/hooks/useProfile";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

const NOTIFICATION_PREFS_KEY = "almond-notification-prefs";

type ActivityRange = "today" | "7d" | "30d";

interface NotificationPrefs {
  studyReminders: boolean;
  peerAlerts: boolean;
  importantUpdates: boolean;
}

const defaultNotificationPrefs: NotificationPrefs = {
  studyReminders: true,
  peerAlerts: true,
  importantUpdates: true,
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(item: Activity): string {
  if (item.activity_type === "question_asked") {
    return item.topic_name ? `Asked about ${item.topic_name}` : "Asked AI Tutor a question";
  }
  if (item.activity_type === "topic_completed") {
    return item.topic_name ? `Completed ${item.topic_name}` : "Completed a topic";
  }
  if (item.activity_type === "topic_started") {
    return item.topic_name ? `Started ${item.topic_name}` : "Started a topic";
  }
  if (item.activity_type === "mcq_attempted") {
    return item.topic_name ? `Practiced MCQs: ${item.topic_name}` : "Attempted MCQs";
  }
  return item.activity_type.replaceAll("_", " ");
}

function activityIcon(type: string): string {
  if (type === "question_asked") return "💬";
  if (type === "topic_completed") return "✅";
  if (type === "topic_started") return "📖";
  if (type === "mcq_attempted") return "🎯";
  return "📌";
}

function getRangeCutoff(range: ActivityRange): number {
  const now = Date.now();
  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  if (range === "7d") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  return now - 30 * 24 * 60 * 60 * 1000;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? "rgba(213,197,168,0.9)" : "rgba(76,70,61,0.5)",
        border: `1px solid ${checked ? "rgba(213,197,168,0.7)" : "rgba(76,70,61,0.6)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
        boxShadow: checked ? "0 0 12px rgba(213,197,168,0.25)" : "none",
      }}
    >
      <div style={{
        position: "absolute",
        top: 2,
        left: checked ? 22 : 2,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: checked ? "#131313" : "rgba(183,173,160,0.6)",
        transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

function SectionCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.45)", borderRadius: 20, padding: "28px 28px 28px", ...style }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(76,70,61,0.5)",
  background: "rgba(14,14,14,0.8)",
  color: "var(--aa-text-1)",
  fontFamily: "var(--aa-fb)",
  fontSize: "0.875rem",
  outline: "none",
  transition: "border-color 0.18s",
  boxSizing: "border-box",
};

export default function SettingsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { theme, setTheme } = useTheme();
  const {
    subscription,
    isPremium,
    cancelSubscription: runCancelSubscription,
    cancelling,
  } = useSubscription();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [currentYear, setCurrentYear] = useState<string>("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);

  const [activityItems, setActivityItems] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityRange, setActivityRange] = useState<ActivityRange>("7d");

  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCollegeName(profile.college_name ?? "");
    setCurrentYear(profile.current_year ? String(profile.current_year) : "");
  }, [profile]);

  useEffect(() => {
    const stored = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as NotificationPrefs;
      setNotificationPrefs({
        studyReminders: Boolean(parsed.studyReminders),
        peerAlerts: Boolean(parsed.peerAlerts),
        importantUpdates: Boolean(parsed.importantUpdates),
      });
    } catch {
      setNotificationPrefs(defaultNotificationPrefs);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadEmail() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) setEmail(user?.email ?? "");
    }
    void loadEmail();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (typeof token !== "string") return;
    const activeToken = token;
    let mounted = true;
    async function loadActivity() {
      setActivityLoading(true);
      try {
        const rows = await getActivityFeed(activeToken, 50);
        if (mounted) setActivityItems(rows);
      } finally {
        if (mounted) setActivityLoading(false);
      }
    }
    void loadActivity();
    return () => { mounted = false; };
  }, [token]);

  const filteredActivity = useMemo(() => {
    const cutoff = getRangeCutoff(activityRange);
    return activityItems.filter((item) => {
      const value = new Date(item.created_at).getTime();
      return !Number.isNaN(value) && value >= cutoff;
    });
  }, [activityItems, activityRange]);

  const planBadge = isPremium ? "Premium" : "Free";
  const billingLabel = subscription?.plan_type?.replaceAll("_", " ") ?? "free";
  const renewsOn = subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : "N/A";

  const handleSaveNotifications = () => {
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(notificationPrefs));
    setNotificationNotice("Notification preferences saved.");
    setTimeout(() => setNotificationNotice(null), 3000);
  };

  const handleSaveAccount = async () => {
    if (!token) { setAccountNotice("You are not signed in."); return; }
    setAccountSaving(true);
    setAccountNotice(null);
    try {
      await updateProfile(token, {
        full_name: fullName.trim(),
        college_name: collegeName.trim() || null,
        current_year: currentYear ? Number(currentYear) : null,
      });
      await refetchProfile();
      setAccountNotice("Account updated successfully.");
    } catch {
      setAccountNotice("Failed to update account details.");
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!token) { setFeedbackNotice("You are not signed in."); return; }
    if (feedbackMessage.trim().length < 5) { setFeedbackNotice("Please enter at least 5 characters."); return; }

    setFeedbackSubmitting(true);
    setFeedbackNotice(null);
    try {
      await submitFeedback(token, feedbackCategory, feedbackMessage.trim());
      setFeedbackMessage("");
      setFeedbackNotice("Feedback sent. Thank you for helping us improve AlmondAI.");
    } catch {
      setFeedbackNotice("Unable to submit feedback right now.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelNotice(null);
    try {
      await runCancelSubscription(undefined);
      setCancelNotice("Your subscription has been cancelled.");
      setCancelModalOpen(false);
    } catch {
      setCancelNotice("Failed to cancel subscription.");
    }
  };

  const labelStyle: React.CSSProperties = { fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 };
  const sectionTitleStyle: React.CSSProperties = { fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 4 };
  const sectionSubStyle: React.CSSProperties = { fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", lineHeight: 1.5, marginBottom: 20 };

  return (
    <div style={{ animation: "aaFadeUp 0.35s ease-out both" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.028em", marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)" }}>
          Manage your preferences, account, and study system behavior.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Appearance */}
        <SectionCard>
          <h2 style={sectionTitleStyle}>Appearance</h2>
          <p style={sectionSubStyle}>Switch between dark and light modes.</p>
          <div style={{ display: "inline-flex", borderRadius: 12, border: "1px solid rgba(76,70,61,0.45)", background: "rgba(14,14,14,0.6)", padding: 4, gap: 4 }}>
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: theme === t ? "rgba(213,197,168,0.12)" : "transparent",
                  color: theme === t ? "var(--aa-amber)" : "var(--aa-text-3)",
                  fontFamily: "var(--aa-fb)",
                  fontSize: "0.875rem",
                  fontWeight: theme === t ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  textTransform: "capitalize",
                  boxShadow: theme === t ? "inset 0 0 0 1px rgba(213,197,168,0.2)" : "none",
                }}
              >
                {t === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard>
          <h2 style={sectionTitleStyle}>Notifications</h2>
          <p style={sectionSubStyle}>Control reminders and important updates.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {([
              { key: "studyReminders", label: "Study reminders", desc: "Daily nudges to keep your streak alive" },
              { key: "peerAlerts", label: "Peer activity alerts", desc: "When your study group reaches milestones" },
              { key: "importantUpdates", label: "Product updates", desc: "New features, improvements, and announcements" },
            ] as const).map((item) => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.35)", background: "rgba(14,14,14,0.4)" }}>
                <div>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)", fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>{item.desc}</p>
                </div>
                <ToggleSwitch
                  checked={notificationPrefs[item.key]}
                  onChange={(v) => setNotificationPrefs((prev) => ({ ...prev, [item.key]: v }))}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <Button variant="secondary" onClick={handleSaveNotifications}>Save preferences</Button>
            {notificationNotice && <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-teal)" }}>{notificationNotice}</p>}
          </div>
        </SectionCard>

        {/* Subscription */}
        <SectionCard>
          <h2 style={sectionTitleStyle}>Subscription</h2>
          <p style={sectionSubStyle}>Your current plan and billing details.</p>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", marginBottom: 20 }}>
            {[
              { label: "Plan", value: planBadge, accent: isPremium ? "#e6c87a" : "var(--aa-text-2)" },
              { label: "Billing", value: billingLabel, accent: "var(--aa-text-2)" },
              { label: "Renews", value: renewsOn, accent: "var(--aa-text-2)" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.35)", background: "rgba(14,14,14,0.4)" }}>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 600, color: item.accent, textTransform: "capitalize" }}>{item.value}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            disabled={!isPremium}
            style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(228,180,160,0.4)", background: "transparent", color: "var(--aa-coral)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 500, cursor: isPremium ? "pointer" : "not-allowed", opacity: isPremium ? 1 : 0.4, transition: "all 0.18s" }}
            onMouseEnter={(e) => { if (isPremium) e.currentTarget.style.background = "rgba(228,180,160,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Cancel Subscription
          </button>
          {cancelNotice && <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)", marginTop: 10 }}>{cancelNotice}</p>}
        </SectionCard>

        {/* Activity */}
        <SectionCard>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div>
              <h2 style={sectionTitleStyle}>Activity Log</h2>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>Recent actions across AI Tutor and practice.</p>
            </div>
            <div style={{ display: "inline-flex", borderRadius: 10, border: "1px solid rgba(76,70,61,0.4)", background: "rgba(14,14,14,0.5)", padding: 3, gap: 2 }}>
              {(["today", "7d", "30d"] as ActivityRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setActivityRange(range)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 7,
                    border: "none",
                    background: activityRange === range ? "rgba(213,197,168,0.12)" : "transparent",
                    color: activityRange === range ? "var(--aa-amber)" : "var(--aa-text-3)",
                    fontFamily: "var(--aa-fb)",
                    fontSize: "0.78rem",
                    fontWeight: activityRange === range ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.18s",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activityLoading && (
              <div style={{ padding: "20px 0", textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
                Loading activity...
              </div>
            )}
            {!activityLoading && filteredActivity.length === 0 && (
              <div style={{ padding: "24px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
                No activity in this time range
              </div>
            )}
            {filteredActivity.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.35)" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{activityIcon(item.activity_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)", fontWeight: 500, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activityLabel(item)}</p>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)" }}>{formatDateTime(item.created_at)} · {item.time_ago}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Feedback */}
        <SectionCard>
          <h2 style={sectionTitleStyle}>Feedback</h2>
          <p style={sectionSubStyle}>Share bugs, ideas, or general product feedback.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value as FeedbackCategory)}
                style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.5)"; }}
              >
                <option value="general">General</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={5}
                placeholder="Tell us what would make your study flow better..."
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.5)"; }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button onClick={() => { void handleSubmitFeedback(); }} isLoading={feedbackSubmitting}>
                Submit Feedback
              </Button>
              {feedbackNotice && <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: feedbackNotice.includes("Thank you") ? "var(--aa-teal)" : "var(--aa-coral)" }}>{feedbackNotice}</p>}
            </div>
          </div>
        </SectionCard>

        {/* Account */}
        <SectionCard>
          <h2 style={sectionTitleStyle}>Account</h2>
          <p style={sectionSubStyle}>Manage your profile details and identity information.</p>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.5)"; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Email (read only)</label>
              <input
                value={email}
                readOnly
                style={{ ...inputStyle, opacity: 0.55, cursor: "default" }}
              />
            </div>
            <div>
              <label style={labelStyle}>College</label>
              <input
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="Your medical college"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.5)"; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Current Year</label>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.5)"; }}
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button onClick={() => { void handleSaveAccount(); }} isLoading={accountSaving}>
              Save Changes
            </Button>
            {accountNotice && (
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: accountNotice.includes("success") ? "var(--aa-teal)" : "var(--aa-coral)" }}>
                {accountNotice}
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Cancel subscription modal */}
      {cancelModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "0 16px" }}>
          <div style={{ width: "100%", maxWidth: 440, background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.55)", borderRadius: 20, padding: "32px", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "aaFadeUp 0.25s ease-out both" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(228,180,160,0.1)", border: "1px solid rgba(228,180,160,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 20 }}>
              ⚠️
            </div>
            <h3 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.3rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 10 }}>
              Cancel subscription?
            </h3>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-2)", lineHeight: 1.55, marginBottom: 28 }}>
              You will lose premium access when the current billing cycle ends. Your progress and history will be preserved.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(76,70,61,0.5)", background: "transparent", color: "var(--aa-text-2)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", cursor: "pointer", transition: "all 0.18s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(76,70,61,0.15)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={() => { void handleCancelSubscription(); }}
                disabled={cancelling}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(228,180,160,0.4)", background: "rgba(228,180,160,0.08)", color: "var(--aa-coral)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, cursor: cancelling ? "not-allowed" : "pointer", opacity: cancelling ? 0.6 : 1, transition: "all 0.18s" }}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
