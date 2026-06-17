---
name: almondai-frontend
description: >-
  Use for ALL AlmondAI frontend/UI work — every new or edited page, component, form, modal,
  card, style, icon, animation, data-fetch, or state change in almondai/frontend. Encodes the
  REAL, code-verified design system (dark/amber --aa-* tokens + .aa-* utility classes + custom
  ui/* primitives + Radix), and the project's page/data/state/motion/a11y conventions, so UI
  never drifts off-brand, never breaks the shell, and never reaches for a tool the repo doesn't use.
  Load this BEFORE writing or editing any frontend code. Read the linked reference files for depth.
---

# AlmondAI Frontend Skill — the definitive, code-grounded rulebook

> This skill is reverse-engineered from the actual `almondai/frontend` codebase (Next.js 14 App
> Router, TS strict, Tailwind v3.4, Framer Motion v12, Radix, Zustand v5, React Query v5,
> lucide-react, Supabase). Every rule below traces to real code. When the repo and a generic
> "best practice" disagree, **the repo wins** — match what exists, don't "improve" it unasked.

When you do UI work here, follow this order **every time**:
1. Read **§1 The Laws** (non-negotiable) and **§7 Mistake Zones** (the traps that look correct).
2. Find your task in **§3 Decision Flow** and copy the named canonical template.
3. Style only with tokens/classes from **§4–§5**.
4. Run the **§10 Pre-flight Checklist** before you finish.

Depth references (read when relevant — they are exhaustive):
- [references/design-system.md](references/design-system.md) — every `--aa-*` token + every `.aa-*` class + motion layer + theme.
- [references/components-and-patterns.md](references/components-and-patterns.md) — primitive APIs + copy-paste templates (page, form, modal, fetch, chat, graph, voice).
- [references/architecture.md](references/architecture.md) — file placement, routing, data layer, state, a11y, responsive.
- [references/anti-patterns.md](references/anti-patterns.md) — the full "do NOT do / do NOT copy" catalog with evidence.

---

## 1. The Laws (non-negotiable — break one and the UI is wrong)

1. **There is NO shadcn/ui. Never scaffold it.** `CLAUDE.md` says "Tailwind + shadcn/ui only" — that is **false for the actual code**. There is zero shadcn (no `cva`, no `npx shadcn add`, no `components/ui/dialog.tsx`). Build from the existing `components/ui/*` primitives + the `.aa-*` CSS classes in `globals.css` + **raw Radix** (`@radix-ui/react-dialog`, `@radix-ui/react-tooltip`). This skill overrides CLAUDE.md.

2. **Compose from existing primitives first — do NOT hand-roll `<button>`/card `<div>`/`<input>`.** Use `<Button>`, `<Card>`, `<Input>`, `<Toast>`, `<Spinner>`, `<SkeletonLoader>` from `@/components/ui/*`, and the `.aa-*` classes. (`variant="premium"` is an **alias of `primary`** — same look.) See §5.

3. **Style only with `--aa-*` tokens. NEVER hardcode brand hex.** Use `var(--aa-…)` in inline styles, or Tailwind arbitrary values `bg-[var(--aa-s2)] text-[var(--aa-text-1)] border-[var(--aa-border)]`. Writing `#131313`, `#1f1f1f`, `#d5c5a8`, `#fff2de` literally is off-system (the `insights` page and boundary files do this — they are **anti-examples**, §7). Exception: the sanctioned per-domain accent hexes in §4 (Crisis-red, risk-ramp, NEET-PG purple, `#ffb4ab` field-error).

4. **Tailwind `rounded-*` and `font-*` are BROKEN here — do not use them.** `tailwind.config.ts` overrides `borderRadius` to tiny values (`rounded-full` = 12px, NOT a pill) and sets `fontFamily` to **Inter/Noto Serif which are never loaded**. Use `rounded-[var(--aa-r-*)]` for radius and `var(--aa-fd)`/`var(--aa-fb)` or the `.aa-display/.aa-h1…/.aa-body*` classes for type. `font-headline`/`font-display`/`font-sans` are traps.

5. **`cn()` is a naive join, NOT tailwind-merge.** `@/lib/utils/helpers` `cn` = `classes.filter(Boolean).join(" ")`. It does **not** dedupe conflicting Tailwind classes (even though `tailwind-merge`+`clsx` are installed). You cannot override a base class by appending a conflicting one. Change the property, drop the base, or use the right `.aa-*` class. Always pass `className` **last** to `cn(...)`.

6. **The app is effectively DARK-ONLY.** `<html data-theme="dark">` is the default; a real toggle exists (`useTheme()` in settings) but the dominant `--aa-*` palette is hardcoded dark and never flips. Build for dark. Use the existing `useTheme()` hook if you touch theme — **never** build a ThemeProvider/Context. `Providers` stays QueryClient-only.

7. **Dashboard pages render INSIDE the shell — emit only a content stack.** `DashboardShell` already wraps children in `<main … lg:ml-64 lg:px-10 pt-4 lg:pt-8 pb-8 px-4><div className="mx-auto w-full max-w-[1080px]">`. A page must **not** add its own `max-w-*`, page padding, or sidebar offset (double-pads / shoves under sidebar). A page root is a vertical stack: `<div className="aa-stagger" style={{display:"flex",flexDirection:"column",gap:16}}>`.

8. **Data: raw `lib/api/<domain>.api` fns in a token-keyed `useEffect`+`useState`.** React Query is used **only** for the shared `useProfile`/`useTodayUsage`/`useSubscription` hooks — do NOT add `useQuery`/`useMutation` to a page. Every api fn takes the JWT as its **first arg**; read it with `useAuthStore((s) => s.accessToken)`. There is no axios interceptor that attaches auth. Treat HTTP `404` as "no resource → return null", not an error.

9. **Motion is "balanced premium", CSS-first — not cinematic, not Framer-at-page-level.** Page/section entrances use `aa-stagger` or `className="aa-anim-fade-up"` (or `style={{animation:"aaFadeUp 0.35s ease-out both"}}`). Press feedback = `.aa-press`. Loading = `.aa-skeleton` shimmer (NOT spinners for page/section loads). Reserve Framer Motion for stateful transitions CSS can't do (tab/modal presence, list stagger, value-driven width/stroke). Reuse the house spring values (§6). **Never** add per-component `prefers-reduced-motion` guards — the global reset in `globals.css` already handles it.

10. **Always provide loading + empty + error + success states.** Skeleton for load, inline muted message for empty, coral inline banner for error, `<Toast>` for action results. Never ship only the happy path.

11. **Accessibility: never kill the focus ring.** A global `:focus-visible { outline: 2px solid rgba(213,197,168,.55) }` exists. Don't add `outline-none`/`focus:outline-none` without re-adding the amber ring (`focus-visible:ring-2 focus-visible:ring-[var(--aa-amber-border)]`). Add `.aa-focusable` to custom clickable non-`<button>` surfaces. Keep `aria-label` on icon-only buttons. The Tailwind `shadow-focus` token is **dead** — don't use it. Prefer **Radix Dialog** for new modals (focus-trap/Escape/aria-modal); the inline `aa-overlay`/`aa-modal` div pattern is a11y-incomplete.

12. **`"use client"` only when needed; import via `@/*`.** Add `"use client"` to anything using hooks/state/handlers/browser APIs/Framer. Leave presentational primitives (`Card`, `Spinner`, `SkeletonLoader`, `AlmondIcons`) server-safe. Every `(dashboard)/**/page.tsx` is `"use client"`. Import with the `@/*` alias (→ frontend root); there is **no barrel** in `components/ui` — import each from its own file. Keep the brand emojis (🌰 🔥 ⚡ 🔍) and lucide-react icons — do NOT strip them (overrides generic anti-emoji rules).

---

## 2. Stack reality (verified — don't assume otherwise)

| Concern | Reality |
|---|---|
| Framework | Next.js **14.2** App Router, React 18, **TypeScript strict** |
| Styling | **Tailwind v3.4** (v3 syntax only) + hand-authored `.aa-*` classes in `app/globals.css` |
| Components | Custom `components/ui/*` primitives + **raw Radix** dialog/tooltip. **No shadcn.** |
| Icons | **lucide-react** (default) · **AlmondIcons** (nav/brand, by-name) · `material-symbols-outlined` (legacy: Input/Toast/Navbar only) |
| Fonts | **Bricolage Grotesque** (`--aa-fd`, display) + **DM Sans** (`--aa-fb`, body), loaded via `next/font` in `app/layout.tsx`. (config's Inter/Noto are dead.) |
| Server state | **React Query v5** — but only `useProfile`/`useTodayUsage`/`useSubscription`. Pages fetch manually. |
| Client state | **Zustand v5** — exactly ONE store: `useAuthStore` (the JWT). No persist/devtools/slices. |
| Auth | Supabase (`@supabase/ssr`); JWT lives in `useAuthStore`, sourced by `useAuth()`. |
| Forms | **react-hook-form + zod** (`@hookform/resolvers/zod`) — only in `components/auth/*`. |
| Markdown | `react-markdown` + `remark-gfm` (+ `rehype-raw`), styled by global `.flowing-text`. No typography plugin. |
| Motion | Framer Motion v12, used sparingly; CSS `.aa-*` utilities do most of it. |
| Graphs | `@xyflow/react` + `@dagrejs/dagre`. |

Before importing any new library, **check `package.json`** and prefer what's already there.

---

## 3. Decision Flow — "I need to build X → do this"

- **A new dashboard page** → copy the *Canonical dashboard page* template (§ components-and-patterns "Page skeleton"). Put it at `app/(dashboard)/<route>/page.tsx`, add `"use client"`, fetch via raw api fns in a token-keyed `useEffect`, root in `aa-stagger` flex column, NO max-width wrapper. Add the route to the typed `navItems` array in `Sidebar.tsx`. Model on `progress/page.tsx` + `profile/page.tsx`; **never** copy `insights/page.tsx`.
- **A new form** → copy the *Blessed RHF+zod form* template. Schema+`z.infer` type in `lib/validators/<x>.validators.ts`; `<Input … {...register} error={errors.x?.message}>`; `<Button isLoading={isSubmitting}>`; one `<Toast variant="error">` for the async error. Put the form in `components/<feature>/`, render it from the route page. **Never** copy the `app/(auth)/login|signup/page.tsx` hand-rolled pattern.
- **A multi-step wizard** → copy the *onboarding* pattern (single `answers` object + numeric `step` + derived `canContinue` + localStorage resume + one async persist). NOT react-hook-form.
- **A button / card / input / badge / pill / progress bar** → use the primitive or the `.aa-*` class (§5, §4). Don't restyle from scratch.
- **A modal/dialog** → prefer **Radix Dialog** (`Dialog.Root/Portal/Overlay/Content/Title/Close`) for accessibility. Only use the inline `aa-overlay`/`aa-modal` div pattern to match an adjacent simple confirm in the same file.
- **A toast / transient notice** → render `<Toast message variant onClose />` inline from local `useState`; position with a `fixed` wrapper (shell uses `fixed bottom-5 right-5 z-[90]`). There is **no** `useToast()` / global queue — don't invent or import one.
- **Loading UI** → `<SkeletonLoader className="h-… w-…" />` or inline `<div className="aa-skeleton" style={{height,borderRadius}} />`. `<Spinner>` only for in-button (`isLoading`) or in-flow async (e.g. MCQ generation).
- **Server data the whole app shares (profile/usage/subscription)** → use/extend the React Query hooks in `lib/hooks`. New global server state → a token-gated React Query hook (token in `queryKey`, `enabled: Boolean(token)`, `retry: false`). NOT a new Zustand store.
- **An icon** → `lucide-react` (`size`, `strokeWidth` ~1.8–2). For nav/brand use `AlmondIcons` (by-name). Don't introduce a 4th icon system or use `material-symbols` for new UI.
- **Rendering AI / markdown text** → `<div className="flowing-text"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{cleaned}</ReactMarkdown></div>`. Strip backend markers first (§ patterns).
- **A graph/flow canvas** → `@xyflow/react`; memo'd custom nodes + module-level `nodeTypes`; `proOptions={{hideAttribution:true}}`; Dagre `layoutGraph(...,{direction:"LR"})` for read-only DAGs; hand-positioned + `useNodesState`/refs for interactive maps; wrap hook-using inner comps in `<ReactFlowProvider>`.
- **Realtime voice** → reuse `useVoiceSession` (WS FSM) / `StreamingAudioPlayer`; don't confuse with `useVoiceInput` (dictation) / `useVoiceOutput` (TTS). See architecture ref.

---

## 4. Design tokens — the source of truth (quick reference)

All defined on `:root` in `app/globals.css`. Full catalog: [references/design-system.md](references/design-system.md). **Names lie — trust the value** (`--aa-teal` is cream `#fff2de`; `--aa-purple` is taupe `#cec5b9`; the `--geist` font var is actually DM Sans).

**Surfaces / bg** (elevation ladder): `--aa-bg #131313` (page) · `--aa-s1 #1c1b1b` · `--aa-s2 #1f1f1f` (default card) · `--aa-s3 #2a2520` · `--aa-s4 #353534` · `--aa-input #1a1a1a`
**Text**: `--aa-text-1 #fff2de` (headings/primary) · `--aa-text-2 #cec5b9` (body) · `--aa-text-3 #b7ada0` (muted/labels/captions)
**Accent (amber)**: `--aa-amber #d5c5a8` · `-lt #e6d5b8` · `-bg rgba(213,197,168,.07)` · `-border rgba(213,197,168,.22)` · `-glow rgba(213,197,168,.18)`
**Semantic**: `--aa-green #22c55e` (success) · `--aa-coral #e4b4a0` (danger/error) · `--aa-caution #e6c87a` (warning) · `--aa-red #ef4444`
**Borders**: `--aa-border #353534` · `--aa-border2 #4c463d` (hover/emphasis)
**Radius**: `--aa-r-sm 6` · `--aa-r 10` (inputs) · `--aa-r-md 14` · `--aa-r-lg 18` (cards) · `--aa-r-xl 24` (modals/heroes) · `--aa-r-full 9999` (pills/buttons/bars)
**Shadow**: `--aa-shadow 0 4px 20px rgba(0,0,0,.5)` · `--aa-shadow-lg 0 8px 40px rgba(0,0,0,.65)`
**Fonts**: `--aa-fd` (Bricolage Grotesque, display) · `--aa-fb` (DM Sans, body)
**Easing**: `--aa-ease cubic-bezier(.22,1,.36,1)` · `--aa-ease-spring cubic-bezier(.34,1.56,.64,1)` · `--aa-ease-out cubic-bezier(.16,1,.3,1)`

**Sanctioned per-domain accents (raw hex is OK here — they are meaning-bearing and intentional):**
- Field error: `#ffb4ab` (Input border/text) — the de-facto error color.
- Risk/score ramp: `<30 #e4b4a0` (coral) · `<55 #ffcf9d` (amber) · `<75 #d5c5a8` (gold) · `≥75 #a8c8a5` (green) · completed `#64d37c`.
- Crisis Mode danger family: borders `#5a2f2a`/`#7a3f30`, bg `#2c1d1b`, text `#ffb4ab`, crisis-amber `#ffcf9d`.
- NEET-PG ("PG") badge accent: `#cab3ff` on `rgba(202,179,255,.08)` bg.

Tailwind also exposes these as color utilities (`bg-aa-s2`, `text-aa-text-1`, `border-aa-border`, etc., from `tailwind.config.ts`). Either the Tailwind alias or `var(--aa-…)` is fine; both stay in sync.

---

## 5. The reusable toolkit (primitives + `.aa-*` classes)

**Primitives** (`@/components/ui/<Name>`, no barrel — import each by path):

| Primitive | Key API | Notes |
|---|---|---|
| `Button` | `variant="primary\|secondary\|premium\|danger\|ghost"` `size="sm\|md\|lg"` `isLoading` `fullWidth` | `premium`≡`primary`. `isLoading` swaps in `<Spinner/>` AND disables. `"use client"`. |
| `Card` | `hover` `glow` `interactive` + div attrs | base `aa-card` + `p-6`. `hover`/`interactive` → spring lift. Server-safe. |
| `Input` | `label` `error` `success` `leftIcon` `rightIcon` + input attrs | forwardRef; renders label-above + coral error-below + focus ring + auto password toggle. Feed `{...register} error={errors.x?.message}`. Text inputs only (no checkbox/textarea). |
| `Toast` | `message` `variant="success\|error\|info\|warning"` `onClose?` | presentational, **no provider, no auto-dismiss** — you place + time it. |
| `Spinner` | `className` only | 16px border spinner. For in-button/in-flow async only. |
| `SkeletonLoader` | `className` only | `.aa-skeleton` shimmer; size via `h-/w-`. The blessed page/section loader. |
| `AlmondIcons` | `AlmondIcons[name]` or `AlmondIcons.crown`, `size` (18) `strokeWidth` (1.75) | keys: `dashboard brain map clipboard alert flame trending chart mic settings user crown image calendar logout sparkles`. |
| `PromptInputBox` | `components/ui/ai-prompt-box` | full chat composer (textarea, mode toggles, mic, send/stop, Radix tooltips). |

**`.aa-*` utility classes** (in `globals.css` — full list in design-system ref). Most-used:
`aa-card` `aa-card-interactive` `aa-card-premium` `aa-card-accent[-coral/-teal/-green]` · `aa-btn` + `aa-btn-primary/-secondary/-ghost/-danger/-teal` + `-sm/-xs` · `aa-input` (also styles `select.aa-input`) · `aa-pill[.active]` · `aa-badge aa-badge-amber/-teal/-coral/-green/-gray/-caution` · `aa-chip` · `aa-prog-track`+`aa-prog-fill[-teal/-green]` · `aa-option-btn[.selected/.correct/.incorrect]` (MCQ) · typography `aa-display aa-h1 aa-h2 aa-h3 aa-h4 aa-body[-lg/-sm] aa-caption aa-label` · `aa-overlay`+`aa-modal` · `aa-glass[-amber/-dark]` · `aa-section-tag` `aa-status-dot` `aa-divider` · motion `aa-stagger aa-anim-fade-up aa-anim-bounce-in aa-anim-slide-r aa-press aa-lift aa-hover-glow aa-skeleton aa-bezel aa-focusable aa-typing-dot` · `flowing-text` (markdown) · `no-scrollbar`.

Heading scale by role: `aa-display` (top greeting h1) · `aa-h1` (hero/page title) · `aa-h3` (section header) · `aa-h4` (card title). Classes set font/size/weight/line-height — pair with an inline **color token** (`var(--aa-text-1)` headings, `-2/-3` body/muted).

---

## 6. Motion vocabulary (reuse these exact values)

- **Page/section entrance** → `aa-stagger` (cascades direct children; only DIRECT children stagger) or `aa-anim-fade-up`. Not `<motion.div>`.
- **Press feedback** → `.aa-press` (`scale(.97)`); buttons already have `:active scale(.96)`. Not Framer `whileTap`.
- **Tab/view switch** → `<AnimatePresence mode="wait">` + stable `key`, `initial={{opacity:0,y:6-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6-8}} transition={{duration:0.16-0.18}}`.
- **Modal pop** → `<AnimatePresence>` + plain non-animated `fixed inset-0 z-50 bg-black/70` dim layer + `motion.div` `initial/exit={{opacity:0,scale:0.96}}` `transition={{type:"spring",stiffness:260,damping:24}}`.
- **List/grid stagger** → parent `variants={{hidden:{},visible:{transition:{staggerChildren:0.04-0.06}}}}` + child spring `{stiffness:200,damping:24}`. Don't give children their own `initial/animate`.
- **Value-driven (bars/gauges)** → `motion.div initial={{width:0}} animate={{width:`${pct}%`}}` ease `[0.16,1,0.3,1]` (the `--aa-ease-out` curve). SVG ring: animate `strokeDashoffset`.
- **xyflow nodes** are the ONLY place `whileHover`/`whileTap` is used. `layoutId`/`LayoutGroup` are used nowhere — don't introduce sliding underlines.
- Animate **only `transform`/`opacity`**. No infinite/perpetual ambient loops everywhere (calm study tool).

---

## 7. Mistake Zones (these look right but are wrong here — read before coding)

1. **`cn()` last-wins** — appending `rounded-lg` after a base `rounded-[var(--aa-r-full)]` does NOT override (naive join). Change the property or base class.
2. **`rounded-full` / `rounded-xl`** — overridden to 12px/8px. Use `rounded-[var(--aa-r-full)]` (pill), `-r-lg` (card), `-r-xl` (modal), `-r` (input).
3. **`font-headline`/`font-display`/`font-sans`** — map to unloaded Inter/Noto. Use `var(--aa-fd/fb)` or `aa-*` type classes.
4. **Adding your own `max-w-*`/`px-*`/`lg:ml-64` to a dashboard page** — the shell already does it. Emit only the content stack.
5. **`useQuery`/`useMutation` in a page** — pages fetch manually via raw api fns + `useEffect`/`useState`; React Query is only for the 3 shared hooks.
6. **Reading the token from `supabase.auth.getSession()` everywhere** — read `useAuthStore((s)=>s.accessToken)`; pass it as the api fn's first arg. (For actions that may run pre-hydration, fall back to a fresh session read — see patterns.)
7. **Assuming `fetch` throws on 4xx / treating 404 as error** — `fetch` resolves; check `res.ok`; `if (res.status===404) return null`.
8. **`useAuthStore((s)=>s.profile)`** — `setProfile` is **dead code** (never called); the store profile is always null. Use `useProfile()` (React Query) for profile data.
9. **Building a ThemeProvider / assuming light mode renders** — theme is `data-theme` + `useTheme()`; `--aa-*` is dark-only. Build dark.
10. **`outline-none` on a custom interactive element** — kills keyboard a11y. Re-add the amber ring or use `.aa-focusable`.
11. **Hand-rolling an `aa-overlay` modal for new dialogs** — no focus-trap/Escape/aria. Prefer Radix Dialog.
12. **A global `useToast()`** — doesn't exist. Render `<Toast>` inline with local state.
13. **`material-symbols-outlined` for new UI** — legacy. Use lucide / AlmondIcons.
14. **Stripping brand emojis (🌰🔥⚡) or NEET-PG purple / Crisis-red / risk-ramp colors** — intentional, meaning-bearing. Keep them.
15. **Framer for page entrances / per-token streaming / spinners for page loads** — use `aa-anim-fade-up`/`aa-stagger`, a CSS caret, and `aa-skeleton` respectively.

**Files that are off-system — copy STRUCTURE only, never STYLE:**
- `app/(dashboard)/insights/page.tsx` — built with Tailwind classes + raw hex (`bg-[#1f1f1f]`, `text-[#cec5b9]`, `md:grid-cols-2`). The lone outlier; do not template from it.
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — regress to raw hex + `font-headline`. Copy their boundary *structure*, restyle with tokens.
- `app/(auth)/login|signup/page.tsx` — hand-rolled forms (manual state/validation). Use the `components/auth/*` RHF pattern instead.
- `components/crisis/CrisisContent.tsx` — older near-zero-motion variant; `CrisisWarRoom.tsx` is the motion reference.

---

## 8. File placement & imports

```
app/(dashboard)/<route>/page.tsx   authed page   ("use client"; inherits auth gate + shell)
app/(auth)/<route>/page.tsx        public auth page
app/<boundary>.tsx                 error/global-error/loading/not-found (root only)
components/<feature>/<Name>.tsx    feature components (auth, crisis, clinical, graph, syllabus, doubt-solver, ...)
components/ui/<Name>.tsx           shared primitives (PascalCase, NO barrel — import each by path)
components/layout/*                shell: DashboardShell, Sidebar, Navbar
lib/api/<domain>.api.ts            api functions (token as 1st arg) + co-located DTO types
lib/hooks/use<Name>.ts             hooks (React Query wrappers / facades / local-state)
lib/store/<name>Store.ts           Zustand (only authStore exists)
lib/validators/<x>.validators.ts   zod schemas + z.infer types
lib/utils/helpers.ts               cn() and small helpers
lib/supabase/{client,server}.ts    browser singleton / SSR client
```
- Add new authed pages under `(dashboard)` to inherit `bootstrapSession()` + shell; **do not** add a per-page `layout.tsx`.
- Register nav by appending to the typed `navItems` array in `components/layout/Sidebar.tsx` (exact-match active state).
- Import via `@/*` (e.g. `@/components/ui/Button`, `@/lib/hooks/useProfile`). Never relative `../../`.
- DTO types live at the top of their `*.api.ts` file (exported `interface` + string-literal `type` unions). No central `types/` dir.

---

## 9. Accessibility & responsive (verified rules)

- **Focus**: rely on the global `:focus-visible` amber outline; add `.aa-focusable` to custom clickable non-buttons; never strip an outline without re-adding `focus-visible:ring-2 focus-visible:ring-[var(--aa-amber-border)]`. `shadow-focus` token is dead.
- **Icon-only buttons** must keep an `aria-label` (see Input password toggle, Sidebar scrim).
- **Modals**: prefer Radix Dialog for focus-trap + Escape + `aria-modal`.
- **Reduced motion** is globally handled — don't re-implement; don't fight it with `!important` durations or JS loops.
- **Height**: page/boundary roots use `min-h-screen` (the repo's convention — there is **no** `min-h-[100dvh]` anywhere generally). Full-height scrollable chat/voice panes use `h-[calc(100dvh-<offset>)]` with the scroll child `flex-1 min-h-0 overflow-y-auto`; `h-screen` is only the fixed sidebar. Don't introduce `h-screen` for content.
- **Responsive**: page bodies use CSS Grid **auto-fill** (`gridTemplateColumns:"repeat(auto-fill,minmax(Npx,1fr))"`), not Tailwind `sm/md/lg` breakpoints. Use Grid for structure (`grid grid-cols-1 md:grid-cols-[272px_minmax(0,1fr)]`), not flex %-math. The sidebar shows at `lg:`; mobile gets the `Navbar` + slide-in sidebar.

---

## 10. Pre-flight Checklist (run before finishing any UI change)

- [ ] No hardcoded brand hex — only `--aa-*` tokens / `aa-*` utilities (per-domain accent hexes from §4 excepted).
- [ ] No Tailwind `rounded-*` / `font-*`; radius via `--aa-r-*`, fonts via `--aa-fd/fb` or `aa-*` type classes.
- [ ] Reused `Button`/`Card`/`Input`/`Toast`/`Spinner`/`SkeletonLoader` + `.aa-*` classes — nothing hand-rolled that already exists.
- [ ] `cn()` calls pass `className` last; no override-by-append assumptions.
- [ ] If a dashboard page: rooted in `aa-stagger` flex stack, NO own max-width/page padding; header = `aa-display`/display-font h1 + muted subtitle.
- [ ] Data via raw api fn (token 1st arg from `useAuthStore`) in a token-keyed `useEffect`+`useState`; 404→null; envelope unwrapped to `.data`. (Or one of the 3 React Query hooks.)
- [ ] Loading (skeleton) + empty (muted msg) + error (coral banner) + success states all present.
- [ ] Motion via CSS `aa-*` utilities; Framer only for presence/stagger/value transitions with house spring values; only `transform`/`opacity` animated.
- [ ] Icons from lucide / AlmondIcons; brand emojis kept; no `material-symbols` for new UI.
- [ ] Focus ring intact / `.aa-focusable` on custom clickables; `aria-label` on icon-only buttons; modal uses Radix where accessibility matters.
- [ ] `"use client"` present iff hooks/state/handlers/browser APIs used; imports via `@/*`; correct file location (§8).
- [ ] Built and reasoned for **dark mode**; did not assume light renders.
- [ ] Did not copy from the off-system files in §7.

---

If something isn't covered here, **match the nearest existing, non-anti-pattern file** (e.g. `profile/page.tsx` for pages, `LoginForm.tsx` for forms, `CrisisWarRoom.tsx` for motion, `ChatMessage.tsx` for markdown) rather than inventing a new convention. Consistency with the codebase is the highest-order rule.
