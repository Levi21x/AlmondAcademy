# Architecture & Conventions — routing, data, state, a11y, responsive

Companion to `SKILL.md`. Covers how the app is wired so you place files correctly and respect the
shell/auth/data boundaries.

---

## 1. Routing & layouts (Next.js 14 App Router)

```
app/
  layout.tsx                  ROOT (server). <html data-theme="dark" font-vars>, theme-init <script>,
                              Material Symbols <link>, <Providers> (QueryClient only). metadata.
  providers.tsx               "use client". QueryClientProvider via useState(() => new QueryClient()). NO theme/auth ctx.
  error.tsx global-error.tsx loading.tsx not-found.tsx   ROOT boundaries only (no per-route boundaries).
  (auth)/   login/ signup/ reset-password/   public; NO group layout; pages self-style full-bleed.
  onboarding/page.tsx          flat route; no layout; wizard.
  (dashboard)/
    layout.tsx                "use client" AUTH GATE: await useAuth().bootstrapSession(); redirect /login
                             if no session; SkeletonLoader until ready; then <DashboardShell>.
    <route>/page.tsx          authed product pages — all "use client".
```

- **Add a new authed page** under `(dashboard)/<route>/page.tsx` → it inherits the auth gate + shell. Do **not** add a per-page `layout.tsx`.
- **Register nav**: append to the typed `navItems` array in `components/layout/Sidebar.tsx` (`{ name, href, icon: AlmondIconName, premium?, section: "core"|"tools" }`). Active state = `pathname === item.href` (exact match).
- **Auth is two-layer**: cheap cookie-only `middleware.ts` (matcher `/dashboard/:path*`) + the real client-side `bootstrapSession()` check in the dashboard layout.

### The shell contract (DashboardShell.tsx)
```tsx
<div className="min-h-screen bg-[var(--aa-bg)] text-[var(--aa-text-1)]">
  <Navbar onMenuClick={…}/>                       {/* mobile top bar */}
  <Sidebar … />                                   {/* fixed, 256px, lg: */}
  <main className="relative overflow-y-auto bg-[var(--aa-bg)] px-4 pb-8 pt-4 lg:ml-64 lg:px-10 lg:pt-8">
    <div className="mx-auto w-full max-w-[1080px]">{children}</div>   {/* ← your page renders here */}
  </main>
  {/* achievement Toast at fixed bottom-5 right-5 z-[90] */}
</div>
```
So a page provides **only its content stack** — never its own `max-w-*`, page padding, or `lg:ml-64`.
(`practice/page.tsx` intentionally overrides with an inner `maxWidth:760` for a focused single-column
flow — that is the exception, not the template.)

---

## 2. Data layer

- Two HTTP styles: **raw `fetch`** against module-local `const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` (every module **except** `auth.api.ts`), and the shared **axios `apiClient`** (`lib/api/axios.ts`) used **only** by `auth.api.ts`. For new modules, use `fetch`. There is **no** request interceptor that attaches the JWT.
- Every api fn: **token as first arg** → manual `Authorization: Bearer ${token}`.
- Backend envelope `{ success, data }` → declare `interface ApiEnvelope<T>` locally, return `payload.data` (axios callers: `response.data.data`).
- `fetch` resolves on HTTP errors → always `if (!res.ok) throw`. `if (res.status === 404) return null` for optional resources. Mutations extract `payload?.detail?.message ?? payload?.message`.
- DTOs co-located + exported at the top of each `*.api.ts` (interfaces + string-literal `type` unions). No central `types/` dir. `request_id` is never read in the FE.
- Query params: build a `URL`, `url.searchParams.set(k, String(v))`, guard optionals, map camelCase → snake_case manually.
- Supabase: `getSupabaseClient()` (browser singleton, throws on missing env) in `"use client"`; `createSupabaseServerClient()` (cookies, returns null on missing env) in server components/route handlers only. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.

### Page data fetching (the established convention)
- Fetch with raw api fns inside a **token-keyed `useEffect`** into `useState`; `Promise.all` for parallel, a `mounted`/`cancelled` guard in cleanup. **No `useQuery`/`useMutation` in pages.**
- React Query is reserved for the shared hooks: `useProfile`, `useTodayUsage`, `useSubscription`.
- Token: `useAuthStore((s) => s.accessToken)`, gate fetches on it. For actions that may run before hydration, re-read live: `const { data: { session } } = await getSupabaseClient().auth.getSession(); const token = session?.access_token ?? fallbackToken;`.
- QueryClient has **no default options** (`new QueryClient()`) → set `retry`/`enabled` per hook; assume no staleTime/cache defaults.

---

## 3. State management

- **Zustand: one store** — `useAuthStore` (accessToken/userId/email/profile). Bare `create`, no persist/devtools/slices. Read via narrow selector; object-destructure only for actions.
- **Server data → React Query**, never a new Zustand store. Token-gated hook (token in `queryKey`, `enabled: Boolean(token)`, `retry: false`, null-guard in `queryFn`). Invalidate by **base key** (`["subscription"]`), key by `[base, token]`.
- Hook shapes are intentionally non-uniform: thin wrappers return the raw `useQuery` object (`{data,isLoading,refetch}`); facades (`useSubscription`) return a curated object (`{isPremium, plans, refresh, cancelSubscription, cancelling}`). Don't assume `.data` on every hook.
- `state.profile` is dead (use `useProfile()`); no persist (token null until `bootstrapSession()`).
- Local-state async (`useSubjectList`, `useTheme`) = plain `useState`+`useEffect`, returns a small typed object with a `loaded` flag.

---

## 4. Forms & validation

- react-hook-form + `zodResolver` — schemas + `z.infer` types in `lib/validators/*.validators.ts`. The blessed pattern lives in `components/auth/*`; the `app/(auth)/login|signup/page.tsx` pages are a divergent hand-rolled variant — **don't copy them**.
- `<Input>` owns label(above)/error(below)/focus-ring/password-toggle. Two error channels: field (`Input.error`) vs one async (`<Toast variant="error">`). `noValidate` on `<form>`. `<Button isLoading={isSubmitting}>`.
- zod: message-first (`.min(1,"required").min(8,"…")`), cross-field via `.refine({path:[…]})`, checkbox via `.refine(v=>v===true)`. Normalize caught errors with a `getMessage(e: unknown)` helper. Auth side-effects via `useAuth()`.

---

## 5. Icons (three systems — don't add a fourth)

1. **lucide-react** — default for all new UI. `size={16|18|20}`, `strokeWidth` ~1.8–2, `text-current`/token color.
2. **AlmondIcons** (`@/components/ui/AlmondIcons`) — sidebar/dashboard nav + brand; supports dynamic `AlmondIcons[name]` (typed `AlmondIconName`). 24×24 viewBox, currentColor.
3. **material-symbols-outlined** (icon font) — **legacy**, only inside Input/Toast/Navbar. Don't use for new UI.

Brand **emojis** 🌰 (mascot) 🔥 (streak) ⚡ (crisis/high-yield) 🔍 (web search) are intentional — keep them.

---

## 6. Accessibility

- Global `:focus-visible` amber outline is the backbone. Never `outline-none`/`focus:outline-none` without re-adding `focus-visible:ring-2 focus-visible:ring-[var(--aa-amber-border)]`. Add `.aa-focusable` to custom clickable non-buttons.
- `aria-label` on icon-only buttons (mirror Input password toggle, Sidebar scrim "Close sidebar").
- Prefer **Radix Dialog** for modals → free focus-trap, Escape, `aria-modal`. The inline `aa-overlay`/`aa-modal` div pattern provides none of these.
- `prefers-reduced-motion` is globally enforced — inherit it; don't bypass with `!important` durations or unguarded JS loops.
- The Tailwind `shadow-focus` token is **dead** (zero usages) — don't reach for it.
- Skeletons carry `aria-hidden`; Toast has `role="status"`.

---

## 7. Responsive & layout

- Page bodies achieve responsiveness with **CSS Grid auto-fill**: `style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fill,minmax(<160–280>px,1fr))"}}` — not Tailwind `sm/md/lg`. Fixed-column grids only on the dashboard.
- Structural multi-column → CSS Grid with named tracks: `grid grid-cols-1 md:grid-cols-[272px_minmax(0,1fr)]`; wide tiles `lg:col-span-2`. Avoid flex-percentage math.
- **Heights**: page/boundary roots = `min-h-screen` (repo convention; there is **no** `min-h-[100dvh]`). Full-height chat/voice panes = `h-[calc(100dvh-<offset>)]` with scroll child `flex-1 min-h-0 overflow-y-auto`. `h-screen` only on the fixed sidebar. Don't introduce `h-screen` for content.
- Sidebar at `lg:` (256px, `lg:ml-64` offset on main); mobile = `Navbar` + slide-in sidebar with scrim.
- `next.config.js` sets cross-origin-isolation (COOP/COEP `require-corp`) headers — any new external `<img>`/`<iframe>` needs CORP/CORS headers or it is blocked app-wide.

---

## 8. `"use client"` boundaries

- Add `"use client"` to: every `(dashboard)/**/page.tsx`, anything using hooks/state/handlers, browser APIs (WebSocket/AudioContext/SpeechRecognition/getUserMedia/localStorage), Framer Motion, or Radix interactive primitives.
- Leave OFF: presentational primitives (`Card`, `Spinner`, `SkeletonLoader`, `AlmondIcons`), the root `layout.tsx` (server), pure server components.
- Guard `window`/`navigator` with `typeof window === "undefined"` in shared code.
- Import via the `@/*` alias (→ frontend root). No `../../`. No barrel in `components/ui` — import each primitive by its own path.

---

## 9. Known inconsistencies the repo lives with (don't "fix" unasked; don't copy the bad side)

- CLAUDE.md says "Tailwind + shadcn/ui only" → **false**; there is no shadcn. Follow the code.
- `tailwind.config.ts` `fontFamily` Inter/Noto + `borderRadius` overrides are stale/broken → use tokens.
- Two HTTP clients (axios for auth, fetch for everything) and `ApiEnvelope<T>` redeclared per file.
- `aa-overlay`/`aa-modal` AND Radix Dialog both used for modals (sometimes same file) → prefer Radix for new.
- `insights/page.tsx` (Tailwind+hex), boundary files (hex+`font-headline`), `(auth)/login|signup` pages (hand-rolled forms), `CrisisContent.tsx` (low-motion) are **off-system** — copy structure only, restyle with tokens, and use the blessed counterparts (`profile`/`progress`, `LoginForm`, `CrisisWarRoom`) as templates.
- Card border appears as both `var(--aa-border)` and literal `rgba(76,70,61,0.4)` — prefer the token.
- Field-error color varies (`#ffb4ab` in Input vs `#DD5533` vs `var(--aa-coral)`) — the de-facto standard is `#ffb4ab`.
