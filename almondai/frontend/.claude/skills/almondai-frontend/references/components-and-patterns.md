# Components & Canonical Patterns — copy-paste templates

Every snippet below is adapted from real `almondai/frontend` code. Copy the one that matches your
task. Pair with `SKILL.md` §1 Laws and `design-system.md` for tokens.

---

## Primitive APIs (quick contract)

```tsx
// All from @/components/ui/<Name> — NO barrel, import each by path. cn from @/lib/utils/helpers.
<Button variant="primary|secondary|premium|danger|ghost" size="sm|md|lg" isLoading fullWidth />
//   premium === primary (alias). isLoading → <Spinner/> + disabled. "use client".
<Card hover glow interactive className="…">…</Card>          // base aa-card + p-6. server-safe.
<Input label error success leftIcon rightIcon {...register("x")} />  // forwardRef; label↑ error↓ + pw toggle
<Toast message variant="success|error|info|warning" onClose={fn} />  // presentational; you place + time it
<Spinner className="h-4 w-4" />                              // in-button / in-flow only
<SkeletonLoader className="h-40 w-full" />                   // page/section/list loading
AlmondIcons.crown size={12} / const I = AlmondIcons[name]    // nav/brand icons
```

`AlmondIcons` keys: `dashboard brain map clipboard alert flame trending chart mic settings user crown image calendar logout sparkles` (default `size=18`, `strokeWidth=1.75`, currentColor).

---

## 1. Canonical dashboard page (COPY THIS for a new page)

Model: `app/(dashboard)/progress/page.tsx` + `profile/page.tsx`. NOT `insights/page.tsx`.

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { getThing, type Thing } from "@/lib/api/thing.api";

export default function MyPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<Thing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    getThing(token)
      .then((d) => { if (mounted) setData(d); })
      .catch(() => { if (mounted) setError("Data is temporarily unavailable."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [token]);

  const cardStyle: React.CSSProperties = {
    background: "var(--aa-s2)", border: "1px solid var(--aa-border)",
    borderRadius: 18, padding: "24px",
  };

  return (
    // aa-stagger flex column; NO max-width / page padding — the shell provides them.
    <div className="aa-stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800,
          color: "var(--aa-text-1)", letterSpacing: "-0.028em", marginBottom: 6 }}>Page Title</h1>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)" }}>Short subtitle.</p>
      </div>

      {error && (
        <div style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(228,180,160,0.3)",
          background: "rgba(228,180,160,0.06)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>{error}</div>
      )}

      <div style={cardStyle}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map((k) => <div key={k} className="aa-skeleton" style={{ height: 52, borderRadius: 10 }} />)}
          </div>
        ) : !data ? (
          <p className="aa-body-sm" style={{ color: "var(--aa-text-2)" }}>No data yet.</p>   // empty state
        ) : (
          <div>{/* success UI */}</div>
        )}
      </div>
    </div>
  );
}
```

Notes: heading scale by role — `aa-display` top greeting, `clamp(1.6rem,3vw,2rem)` page h1, `aa-h3`
section header, `aa-h4` card title. Responsive grids: `style={{display:"grid",gap:12,
gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))"}}` (NOT Tailwind breakpoints). Hoist repeated
inline styles into `const …: React.CSSProperties` (or a `SectionCard` in-file component).

**Parallel loads**: `Promise.all([getA(token),getB(token)])` inside the effect with the same `mounted` guard.

---

## 2. Blessed form (react-hook-form + zod) — COPY for any new form

Model: `components/auth/LoginForm.tsx`. NOT `app/(auth)/login/page.tsx`.

```tsx
// lib/validators/foo.validators.ts
import { z } from "zod";
export const fooSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required").min(8, "At least 8 characters"),
});
export type FooValues = z.infer<typeof fooSchema>;

// components/foo/FooForm.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { fooSchema, type FooValues } from "@/lib/validators/foo.validators";

function getMessage(e: unknown) { return e instanceof Error ? e.message : "Something went wrong"; }

export function FooForm() {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FooValues>({ resolver: zodResolver(fooSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FooValues) => {
    setFormError("");
    try { await doThing(values); }
    catch (error: unknown) { setFormError(getMessage(error)); }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? <Toast message={formError} variant="error" /> : null}
      <Input label="Email" type="email" placeholder="you@example.com"
        error={errors.email?.message} {...register("email")} />
      <Input label="Password" type="password" placeholder="••••••••"
        error={errors.password?.message} {...register("password")} />   {/* auto show/hide toggle */}
      <Button type="submit" fullWidth isLoading={isSubmitting}>Submit</Button>
    </form>
  );
}
```

Rules: `noValidate` (zod owns validation). Two error channels — field errors via `Input.error`, ONE
async/server error via the top `<Toast variant="error">`. Auth side-effects go through `useAuth()`
(`signIn/signUp/sendResetLink`), never raw Supabase in a reusable form. Cross-field rules
(`password===confirm`, required terms) live in the schema via `.refine({ path:["x"] })`. Checkboxes
are hand-written `<label><input type="checkbox" {...register} /></label>` with a separate `<p>` error
(Input handles text only).

**Multi-step wizard** (onboarding): single `answers` object + numeric `step` + derived `canContinue` +
localStorage resume + one async persist with `saving`/`error` state. NOT react-hook-form.

---

## 3. Modal — prefer Radix Dialog (accessible)

```tsx
"use client";
import * as Dialog from "@radix-ui/react-dialog";
// Pattern used in planner/page.tsx, ai-tutor, dashboard.
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2
      rounded-[var(--aa-r-xl)] border border-[var(--aa-border2)] bg-[var(--aa-s2)] p-8">
      <Dialog.Title className="aa-h3" style={{ color: "var(--aa-text-1)" }}>Title</Dialog.Title>
      {/* … */}
      <Dialog.Close asChild><Button variant="ghost">Close</Button></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Inline modal** (only to match an adjacent simple confirm; a11y-incomplete): `aa-overlay`/`aa-modal`
classes or a `fixed inset-0 z-50 bg-black/70` div with `motion.div` spring inner — stop propagation on
the inner panel, and add Escape/focus handling yourself.

---

## 4. Data-layer (api module) — fetch pattern (the dominant one)

```ts
// lib/api/<domain>.api.ts
const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
interface ApiEnvelope<T> { success: boolean; data: T }

export interface Thing { id: string; name: string }           // DTOs co-located + exported
export type Difficulty = "easy" | "medium" | "hard";

export async function getThing(token: string, mode?: string): Promise<Thing | null> {
  const url = new URL(`${apiBase}/api/v1/things`);
  if (mode) url.searchParams.set("mode", mode);                // map camelCase→snake_case manually
  const res = await fetch(url.toString(), { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;                         // 404 = "no resource", not an error
  if (!res.ok) throw new Error("Failed to fetch thing");
  const payload = (await res.json()) as ApiEnvelope<Thing>;
  return payload.data;                                         // unwrap envelope — never return raw
}

export async function submitThing(token: string, body: unknown): Promise<Thing> {
  const res = await fetch(`${apiBase}/api/v1/things`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {                                               // extract backend message for mutations
    let message = "Failed to submit";
    try { const p = await res.json(); message = p?.detail?.message ?? p?.message ?? message; } catch {}
    throw new Error(message);
  }
  return ((await res.json()) as ApiEnvelope<Thing>).data;
}
```

- Every fn: **token is the first arg**, manual `Bearer` header (no interceptor). Use raw `fetch` + module-local `apiBase` (NOT the axios `apiClient`, which only `auth.api.ts` uses).
- Lists return `payload.data ?? []`.
- `ApiEnvelope<T>` is redeclared per file — don't "fix" by centralizing.

**Shared server state → React Query hook** (only for cross-app data like profile/usage/subscription):
```ts
export function useThing() {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["thing", token],                               // token IN the key (per-user cache)
    queryFn: async () => (token ? getThing(token) : null),    // guard even though enabled gates it
    enabled: Boolean(token),
    retry: false,
  });
}
// mutation: useMutation + invalidate by BASE key: queryClient.invalidateQueries({ queryKey: ["thing"] })
```

---

## 5. State

```ts
// Zustand — ONE store only (authStore). Bare create, no persist/devtools/slices.
export const useAuthStore = create<AuthStoreState>((set) => ({
  accessToken: null, userId: null, email: null, profile: null,
  setAuth: ({ accessToken, userId, email }) => set({ accessToken, userId, email }),
  clearAuth: () => set({ accessToken: null, userId: null, email: null, profile: null }),
}));
// READ with a narrow selector: useAuthStore((s) => s.accessToken)
// Only object-destructure for stable actions: const { setAuth, clearAuth } = useAuthStore();
```
- Do NOT add a store for server data → use React Query.
- `state.profile` is **dead** (`setProfile` never called) → use `useProfile()` for profile.
- No persist → on reload the token is null until `bootstrapSession()` re-reads the Supabase cookie. Route protection goes through `bootstrapSession()` in `(dashboard)/layout.tsx`, not the bare token.
- `useAuth()` = imperative async methods (`bootstrapSession/signIn/signUp/sendResetLink/signOut`), returned via `useMemo`; each throws `new Error(msg)` on failure and calls store setters on success.

---

## 6. Chat / streaming markdown

```tsx
// Render assistant prose — the ONLY blessed way:
<div className="flowing-text border-l-2 border-[#d5c5a8]/20 pl-6">
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{cleaned}</ReactMarkdown>
</div>

// Strip backend control markers BEFORE rendering:
const cleaned = raw
  .replace(/\[(general|from general knowledge|rag|MCQ_PROMPT_SENT|MCQ_INVITE_SENT)\]/g, "")
  .replace(/\\n/g, "\n");

// SSE streaming text: accumulate into a live buffer, then commit as a message:
let accumulated = "";
for await (const ev of askQuestion({ /* … */, signal: controller.signal })) {
  if (ev.type === "chunk") { accumulated += ev.data.replace(/\\n/g, "\n"); setStreamingContent(accumulated); }
}
setStreamingContent("");
setMessages((prev) => [...prev, { id, role: "assistant", content: cleaned(accumulated) }]);
```
- Streaming waiting state: `aa-typing-dot` trio; in-progress caret `inline-block h-4 w-0.5 animate-pulse bg-[#d5c5a8]`.
- Empty chat = centered faded lucide `Brain` (strokeWidth .5) + heading + starter prompts.

---

## 7. xyflow graph

```tsx
"use client";
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, ReactFlowProvider } from "@xyflow/react";

const nodeTypes = { phase: PhaseNode, topicTask: TopicTaskNode };   // module-level constant
export const PhaseNode = memo(function PhaseNode({ data }: NodeProps) { /* … */ });

// read-only DAG: positions from the pure helper
const laidOut = layoutGraph(nodes, edges, { direction: "LR" });     // components/graph/useDagreLayout

<ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView
  nodesDraggable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}>
  <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="rgba(213,197,168,0.12)" />
  <Controls showInteractive={false} style={{ background: "#1f1f1f", border: "1px solid #353534", borderRadius: 8 }} />
  <MiniMap maskColor="rgba(13,13,13,0.7)" />
</ReactFlow>
// Components calling useReactFlow()/fitView must be wrapped in <ReactFlowProvider>.
```
Interactive maps (syllabus): hand-compute positions + `useNodesState`/`useEdgesState` + `useRef` caches for expansion. Dagre only for the linear plan graph.

---

## 8. Realtime voice (reuse, don't rebuild)

- `useVoiceSession` — full WS voice agent FSM (6 states: inactive/loading/listening/recording/processing/speaking) + Silero VAD + streaming TTS + barge-in. Drive ALL UI off `state` via switch helpers. Hot-path data in **refs** (mirror state into `stateRef` via a `go(s)` helper); throttle meter updates ~50ms. Dynamic-import `@ricky0123/vad-web`; create AudioContext inside the click handler.
- `StreamingAudioPlayer` — gapless MP3 chunks on the Web Audio clock; `generation` counter for instant stop.
- `useVoiceInput` (browser SpeechRecognition dictation) and `useVoiceOutput` (speechSynthesis TTS) are **separate** — don't confuse with the WS agent.
- Full-height shell: `h-[calc(100dvh-<offset>)]`, scroll child `flex-1 min-h-0 overflow-y-auto`, auto-scroll to a `bottomRef`.

---

## 9. Boundaries (structure to mirror — restyle with tokens, don't copy their hex)

`app/error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx` live at the app root only.
Pattern = centered card + entrance class + `<Button>`. The existing files use raw hex + `font-headline`
(off-system) — copy the **structure**, but style with `--aa-*` tokens and `aa-*` type classes.
`loading.tsx` shows the 🌰 mark pulsing — keep the brand mark.
