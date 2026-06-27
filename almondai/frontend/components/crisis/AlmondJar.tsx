"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Type } from "lucide-react";
import { JarItemCard } from "./JarItem";
import type { JarItem } from "@/lib/api/crisis.api";
import { addTextToJar, listJarItems, removeJarItem, uploadFileToJar } from "@/lib/api/crisis.api";

interface Props {
  token: string;
  sessionId: string;
  items: JarItem[];
  onItemsChange: (items: JarItem[]) => void;
}

// Placeholder shape used while a file is uploading (before the server responds)
function makePlaceholder(file: File, tempId: string): JarItem {
  return {
    id: tempId,
    item_type: file.type?.includes("pdf") || file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
    item_category: "unknown",
    original_name: file.name,
    is_processed: false,
    is_graded_script: false,
    trust_flags: [],
    created_at: new Date().toISOString(),
  };
}

export function AlmondJar({ token, sessionId, items, onItemsChange }: Props) {
  const [mode, setMode] = useState<"idle" | "text">("idle");
  const [textInput, setTextInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  // id → 0-100 while uploading to FastAPI; cleared once server responds
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // All items the component shows — real items + uploading placeholders
  const [pendingItems, setPendingItems] = useState<JarItem[]>([]);
  const allItems = [...pendingItems, ...items.filter((i) => !pendingItems.find((p) => p.id === i.id))];

  // Poll every 8 s while any real item is still being extracted by the background worker
  const hasUnprocessed = items.some((i) => !i.is_processed);
  useEffect(() => {
    if (!hasUnprocessed) return;
    const timer = setInterval(async () => {
      try {
        const result = await listJarItems(token, sessionId);
        onItemsChange(result);
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(timer);
  }, [hasUnprocessed]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddText() {
    if (!textInput.trim()) return;
    setTextLoading(true);
    try {
      const item = await addTextToJar(token, sessionId, textInput, labelInput || undefined);
      onItemsChange([item, ...items]);
      setTextInput("");
      setLabelInput("");
      setMode("idle");
    } catch { /* silent */ } finally {
      setTextLoading(false);
    }
  }

  async function handleFile(file: File) {
    const tempId = `pending-${Date.now()}`;
    const placeholder = makePlaceholder(file, tempId);

    // Show placeholder card immediately with 0% progress
    setPendingItems((p) => [placeholder, ...p]);
    setUploadProgress((p) => ({ ...p, [tempId]: 0 }));

    try {
      const item = await uploadFileToJar(token, sessionId, file, (pct) =>
        setUploadProgress((p) => ({ ...p, [tempId]: pct })),
      );

      // Replace placeholder with the real item returned by the server
      setPendingItems((p) => p.filter((x) => x.id !== tempId));
      setUploadProgress((p) => { const n = { ...p }; delete n[tempId]; return n; });
      onItemsChange([item, ...items]);
    } catch (err) {
      // Remove placeholder on failure; show nothing (or could show an error badge)
      setPendingItems((p) => p.filter((x) => x.id !== tempId));
      setUploadProgress((p) => { const n = { ...p }; delete n[tempId]; return n; });
    }
  }

  async function handleRemove(id: string) {
    // If it's a pending placeholder, just drop it locally
    if (id.startsWith("pending-")) {
      setPendingItems((p) => p.filter((x) => x.id !== id));
      setUploadProgress((p) => { const n = { ...p }; delete n[id]; return n; });
      return;
    }
    await removeJarItem(token, sessionId, id);
    onItemsChange(items.filter((i) => i.id !== id));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach((f) => handleFile(f));
  }

  const cardStyle = {
    background: "var(--aa-s2)",
    border: "1px solid var(--aa-border)",
    borderRadius: "var(--aa-r-lg)",
    padding: 16,
  };

  const totalCount = items.length + pendingItems.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#ffcf9d", marginBottom: 2 }}>
          🌰 Almond Jar
        </p>
        <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)" }}>
          {totalCount} resource{totalCount !== 1 ? "s" : ""} — agents use these overnight
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          ...cardStyle,
          border: `1px dashed ${dragging ? "#ffcf9d" : "var(--aa-border)"}`,
          background: dragging ? "rgba(255,207,157,0.05)" : "var(--aa-s2)",
          transition: "border-color 0.2s, background 0.2s",
          minHeight: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/*,.txt"
          multiple
          style={{ display: "none" }}
          onChange={(e) => Array.from(e.target.files ?? []).forEach((f) => handleFile(f))}
        />
        <Upload size={16} strokeWidth={1.8} style={{ color: "var(--aa-text-3)", flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-2)" }}>
            Drop PDFs or images — any size
          </p>
          <p style={{ fontSize: 11, fontFamily: "var(--aa-fb)", color: "var(--aa-text-3)", marginTop: 2 }}>
            Multiple files at once supported
          </p>
        </div>
      </div>

      {/* Text paste */}
      {mode === "text" ? (
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Label (optional)"
            style={{ background: "var(--aa-input)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r)", padding: "6px 10px", fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-1)", outline: "none" }}
          />
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste notes, PYQ text, lecture excerpts…"
            rows={5}
            style={{ background: "var(--aa-input)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r)", padding: "8px 10px", fontSize: 12, fontFamily: "var(--aa-fb)", color: "var(--aa-text-1)", outline: "none", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleAddText}
              disabled={textLoading || !textInput.trim()}
              style={{ flex: 1, padding: "7px 0", background: "#ffcf9d22", border: "1px solid #ffcf9d66", borderRadius: "var(--aa-r)", color: "#ffcf9d", fontSize: 12, fontFamily: "var(--aa-fb)", fontWeight: 600, cursor: "pointer", opacity: textLoading || !textInput.trim() ? 0.5 : 1 }}
            >
              {textLoading ? "Adding…" : "Add to Jar"}
            </button>
            <button
              onClick={() => { setMode("idle"); setTextInput(""); setLabelInput(""); }}
              style={{ padding: "7px 14px", background: "none", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r)", color: "var(--aa-text-3)", fontSize: 12, fontFamily: "var(--aa-fb)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setMode("text")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "1px dashed var(--aa-border)", borderRadius: "var(--aa-r)", color: "var(--aa-text-3)", fontSize: 12, fontFamily: "var(--aa-fb)", cursor: "pointer", textAlign: "left" }}
        >
          <Type size={13} strokeWidth={1.8} />
          Paste notes or text
        </button>
      )}

      {/* Items list — pending placeholders first, then real items */}
      {allItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allItems.map((item) => (
            <JarItemCard
              key={item.id}
              item={item}
              uploadProgress={uploadProgress[item.id]}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
