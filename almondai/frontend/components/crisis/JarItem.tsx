"use client";

import { FileText, File, Image, Loader, Trash2 } from "lucide-react";
import type { JarItem } from "@/lib/api/crisis.api";

const categoryLabel: Record<string, string> = {
  pyq_cram: "PYQ",
  own_notes: "Notes",
  lecture: "Lecture",
  graded_feedback: "Graded Script",
  datesheet: "Datesheet",
  canon: "Textbook",
  unknown: "Resource",
};

const categoryColor: Record<string, string> = {
  pyq_cram: "#ffcf9d",
  graded_feedback: "#ffb4ab",
  lecture: "#d5c5a8",
  own_notes: "#a8c8a5",
  datesheet: "#cab3ff",
  canon: "#d5c5a8",
  unknown: "var(--aa-text-3)",
};

function ItemIcon({ type }: { type: JarItem["item_type"] }) {
  const size = 14;
  const stroke = 1.8;
  if (type === "pdf") return <File size={size} strokeWidth={stroke} />;
  if (type === "image") return <Image size={size} strokeWidth={stroke} />;
  return <FileText size={size} strokeWidth={stroke} />;
}

interface Props {
  item: JarItem;
  onRemove: (id: string) => void;
  /** 0–100 while the browser is PUTting the file to Storage; undefined otherwise */
  uploadProgress?: number;
}

export function JarItemCard({ item, onRemove, uploadProgress }: Props) {
  const color = categoryColor[item.item_category] ?? "var(--aa-text-3)";
  const label = categoryLabel[item.item_category] ?? "Resource";

  return (
    <div
      className="aa-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: "var(--aa-r)",
        background: "var(--aa-s3)",
        border: "1px solid var(--aa-border)",
      }}
    >
      <span style={{ color: "var(--aa-text-3)", flexShrink: 0 }}>
        <ItemIcon type={item.item_type} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontFamily: "var(--aa-fb)",
            color: "var(--aa-text-2)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.original_name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--aa-fb)",
              fontWeight: 600,
              color,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </span>
          {item.is_processed ? (
            <span style={{ fontSize: 10, color: "var(--aa-green)", fontFamily: "var(--aa-fb)" }}>
              ✓ processed
            </span>
          ) : uploadProgress !== undefined ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "var(--aa-fb)", color: "#ffcf9d" }}>
              <span style={{
                display: "inline-block",
                width: 40,
                height: 3,
                borderRadius: 99,
                background: "var(--aa-border)",
                overflow: "hidden",
                verticalAlign: "middle",
              }}>
                <span style={{
                  display: "block",
                  height: "100%",
                  width: `${uploadProgress}%`,
                  background: "#ffcf9d",
                  borderRadius: 99,
                  transition: "width 0.2s",
                }} />
              </span>
              {uploadProgress}%
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>
              <Loader size={9} strokeWidth={2} style={{ animation: "aaSpinSlow 1s linear infinite", flexShrink: 0 }} />
              extracting…
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--aa-text-3)",
          padding: 4,
          borderRadius: "var(--aa-r-sm)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          transition: "color 0.15s",
        }}
        aria-label="Remove from jar"
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--aa-coral)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--aa-text-3)")}
      >
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  );
}
