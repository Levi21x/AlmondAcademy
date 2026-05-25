export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--aa-bg)] px-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--aa-amber-border)] bg-[var(--aa-amber-bg)] text-2xl"
        style={{ animation: "aaPulse 1.6s ease-in-out infinite", boxShadow: "0 0 32px rgba(213,197,168,0.12)" }}
        aria-hidden="true"
      >
        🌰
      </div>
      <p className="text-sm font-medium text-[var(--aa-text-3)]">Loading AlmondAI…</p>
    </main>
  );
}
