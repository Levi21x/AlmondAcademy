---
name: almondai-frontend-pwa
description: Build the AlmondAI web app — Next.js App Router PWA with the SSE chat client (tokens, citations, verification badge, probes), offline last-night packs (IndexedDB + service worker), the planner graph view, mastery dashboards, paywall surfaces, and the single shadcn/ui design system. Use for anything frontend - pages, components, streaming UI, offline behavior, installability, push, mobile UX, citation rendering, dark mode, or "make it look good" - and for client halves of voice and clinical UIs.
---

# AlmondAI Frontend PWA (Phase 4+)

MBBS students live on phones with hostel wifi (master plan §3.1). Ship one installable PWA: server components for content-heavy reads, client components for chat/voice; SSE for streaming; offline where it matters (2 a.m. cram packs). React Query (server state) + Zustand (UI state). One design system — shadcn/ui + Tailwind tokens; no second visual language, ever.

## SSE client (`lib/sse.ts`)

- `fetch` + ReadableStream parser (not EventSource — need POST + auth headers). Handle the protocol from IMPLEMENTATION.md §7: `meta`, `token`, `citation`, `verification`, `probe`, `done`, plus `finding_revealed`/`persona_state` (clinical).
- Render rules: tokens append into streaming markdown (sanitize; no raw HTML); `[c:id]` markers resolve to superscript citation chips → tap opens source sheet (book, page, figure image when present); answer shows a subtle "verifying…" shimmer until `verification` → then "✓ verified against textbooks" badge (or degraded notice when `quality_degraded`); `probe` renders as a reply-chip question; `done` shows latency unobtrusively in dev mode only.
- Reconnect: on drop mid-stream, retry once with `Last-Event-ID`; if resume unsupported, show partial + "tap to continue".

## Offline: last-night mode (the product-defining detail)

- Service worker (Workbox): app shell precache; runtime cache for static content.
- Crisis packs: `GET /v1/crisis/pack/:topic` responses stored in IndexedDB (`idb` lib) with a pack manifest (version, exam_id, topics[]); "Download my last-night pack" button grabs all triaged `master`+`skim` topics while online.
- Offline UX: airplane-mode opens pack list → one-screen-per-topic recall cards, micro-MCQs (answers bundled; scored locally, synced when back online via background sync queue), mnemonics. An offline banner states what's available; nothing dark.
- Print/PDF export of the cram sheet (browser print CSS) for zero-connectivity exam centers.

## Surfaces (routes)

`/chat` tutor (default) · `/mcq` due-deck drills · `/plan` planner graph (ReactFlow as a **projection** of `plan_blocks` — server state is truth; drag emits `plan.propose_change` preview → confirm applies) · `/crisis` triage dashboard (buckets with marks-math reasons, war-plan timeline, readiness band, pack download) · `/clinical` case list, interview chat (voice button), case-sheet form (19 sections, autosaved), grade report · `/me/memory` the visible weakness graph ("what AlmondAI knows about you") · `/upgrade` paywall (suppressed entirely in `support_mode` — receive flag from API, render nothing).

## PWA + performance

- Installable (manifest + icons + iOS meta), push-ready (web-push; consent-gated per safety skill), update toast on new SW.
- Budgets: LCP <2.5s on mid-range Android over 3G-fast; route-level code splitting; charts/graph libs lazy-loaded; images via next/image; bundle watch in CI.
- a11y: keyboard nav, focus management in streaming chat, reduced-motion respect, WCAG AA contrast (calm UI is a product value — especially in Crisis).

## Acceptance criteria

- Lighthouse: installable PWA, perf ≥85 mobile on key routes. Airplane-mode e2e (Playwright offline emulation): pack opens, MCQ scores locally, syncs on reconnect. Citation chip resolves to correct page/figure fixture. Probe chip round-trips. Paywall renders nothing under `support_mode` fixture. Plan drag → preview diff → apply → server state matches (no client-only truth). SSE reconnect test passes.

## Anti-patterns

- EventSource for authed POST streams; Redux; a second component library; ReactFlow as source of truth (master plan §3.1 names this exact trap); blocking-render the whole answer until verification (stream + badge instead); shipping urgency/countdown UI anywhere (banned by safety skill); native-app detours.

References: IMPLEMENTATION.md Phase 4–6, §7; master plan §3.1, §9-B.
