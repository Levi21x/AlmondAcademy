"use client";

import { useState } from "react";
import { AlertTriangle, Flame } from "lucide-react";
import type { ActivateCrisisPayload, PreparationLevel } from "@/lib/api/crisis.api";

const SUBJECTS = [
  "Anatomy", "Physiology", "Biochemistry", "Pathology",
  "Pharmacology", "Microbiology", "Forensic Medicine",
  "Community Medicine", "Medicine", "Surgery",
  "Obstetrics & Gynaecology", "Pediatrics",
  "Orthopaedics", "ENT", "Ophthalmology", "Psychiatry",
];

const PREP_LEVELS: { value: PreparationLevel; label: string; desc: string }[] = [
  { value: "zero",     label: "Zero",     desc: "Haven't started anything" },
  { value: "little",   label: "Little",   desc: "Touched a few topics" },
  { value: "moderate", label: "Moderate", desc: "50-70% coverage" },
  { value: "good",     label: "Good",     desc: "Need final revision" },
];

interface Props {
  onActivate: (payload: ActivateCrisisPayload) => void;
  loading?: boolean;
  error?: string | null;
}

export function CrisisSetupForm({ onActivate, loading = false, error }: Props) {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [prepLevel, setPrepLevel] = useState<PreparationLevel>("moderate");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [stressLevel, setStressLevel] = useState(6);
  const [message, setMessage] = useState("");

  const canSubmit = examName.trim() && examDate && subjects.length > 0 && !loading;

  function toggleSubject(s: string) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onActivate({
      exam_name: examName,
      exam_date: examDate,
      subjects,
      preparation_level: prepLevel,
      available_hours_per_day: hoursPerDay,
      stress_level: stressLevel,
      message,
    });
  }

  const cardStyle = {
    background: "var(--aa-s2)",
    border: "1px solid var(--aa-border)",
    borderRadius: "var(--aa-r-lg)",
    padding: 20,
  };

  const labelStyle = {
    fontSize: 11,
    fontFamily: "var(--aa-fb)",
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase" as const,
    color: "var(--aa-text-3)",
    marginBottom: 8,
    display: "block",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--aa-input)",
    border: "1px solid var(--aa-border)",
    borderRadius: "var(--aa-r)",
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "var(--aa-fb)",
    color: "var(--aa-text-1)",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(90,47,42,0.15)",
          border: "1px solid #5a2f2a",
          borderRadius: "var(--aa-r-lg)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Flame size={18} strokeWidth={1.8} style={{ color: "#ffb4ab", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, fontFamily: "var(--aa-fd)", fontWeight: 700, color: "#ffb4ab" }}>
            Crisis Mode — War Room
          </p>
          <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 2 }}>
            Your team of 7 specialist agents will build your exam plan in under 15 seconds.
          </p>
        </div>
      </div>

      {/* Exam details */}
      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Exam name</label>
            <input
              style={inputStyle}
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. MBBS Final Prof"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Exam date</label>
            <input
              type="date"
              style={inputStyle}
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div style={cardStyle}>
        <label style={labelStyle}>Subjects ({subjects.length} selected)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              style={{
                padding: "5px 11px",
                borderRadius: "var(--aa-r-full)",
                border: `1px solid ${subjects.includes(s) ? "#ffcf9d66" : "var(--aa-border)"}`,
                background: subjects.includes(s) ? "#ffcf9d11" : "none",
                color: subjects.includes(s) ? "#ffcf9d" : "var(--aa-text-3)",
                fontSize: 11,
                fontFamily: "var(--aa-fb)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Prep level */}
      <div style={cardStyle}>
        <label style={labelStyle}>Preparation level</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {PREP_LEVELS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPrepLevel(p.value)}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--aa-r)",
                border: `1px solid ${prepLevel === p.value ? "#ffcf9d66" : "var(--aa-border)"}`,
                background: prepLevel === p.value ? "#ffcf9d0d" : "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", fontWeight: 600, color: prepLevel === p.value ? "#ffcf9d" : "var(--aa-text-2)" }}>
                {p.label}
              </p>
              <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 1 }}>
                {p.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Hours + stress */}
      <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={labelStyle}>Hours / day — {hoursPerDay}h</label>
          <input
            type="range"
            min={2}
            max={16}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#ffcf9d" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>2h</span>
            <span style={{ fontSize: 10, color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>16h</span>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Stress level — {stressLevel}/10</label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={stressLevel}
            onChange={(e) => setStressLevel(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: stressLevel >= 8 ? "#ffb4ab" : "#ffcf9d" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>calm</span>
            <span style={{ fontSize: 10, color: stressLevel >= 8 ? "#ffb4ab" : "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>panic</span>
          </div>
        </div>
      </div>

      {/* Optional message */}
      <div style={cardStyle}>
        <label style={labelStyle}>Anything to tell your team? (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I'm completely blanking on Pharmacology, heart is pounding..."
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 6 }}>
          Helps the team calibrate tone and detect distress signals.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 14px",
            background: "rgba(228,180,160,0.08)",
            border: "1px solid rgba(228,180,160,0.3)",
            borderRadius: "var(--aa-r)",
          }}
        >
          <AlertTriangle size={14} strokeWidth={1.8} style={{ color: "var(--aa-coral)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-coral)" }}>{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="aa-press"
        style={{
          padding: "14px 0",
          background: canSubmit ? "linear-gradient(135deg, #7a3f30, #5a2f2a)" : "var(--aa-s3)",
          border: `1px solid ${canSubmit ? "#7a3f30" : "var(--aa-border)"}`,
          borderRadius: "var(--aa-r-full)",
          color: canSubmit ? "#ffb4ab" : "var(--aa-text-3)",
          fontSize: 14,
          fontFamily: "var(--aa-fb)",
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "not-allowed",
          transition: "all 0.2s",
          letterSpacing: "0.02em",
        }}
      >
        {loading ? "Assembling your team…" : "🔥 Activate War Room"}
      </button>
    </form>
  );
}
