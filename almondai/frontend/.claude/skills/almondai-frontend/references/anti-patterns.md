# Anti-Patterns — the complete "do NOT" catalog (with evidence)

Consolidated from a full read of `almondai/frontend`. Each entry: the wrong move (that looks
right), the correct move, and where the codebase proves it. Skim this before any non-trivial UI edit.

---

## Styling & tokens

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Hardcode brand hex (`#131313`, `#1f1f1f`, `#d5c5a8`, `#fff2de`) in class or style | Use `var(--aa-…)` / `bg-aa-*` tokens | `insights/page.tsx` (off-system) vs `profile/page.tsx:147` |
| `rounded-full` / `rounded-xl` / `rounded-lg` (Tailwind) | `rounded-[var(--aa-r-full)]` pill, `-r-lg` card, `-r-xl` modal, `-r` input | `tailwind.config.ts:103-108` overrides radius |
| `font-headline` / `font-display` / `font-sans` | `var(--aa-fd)`/`var(--aa-fb)` or `aa-display/aa-h1…/aa-body*` | config Inter/Noto never loaded; `layout.tsx:8-20` |
| Append a conflicting Tailwind class expecting last-wins via `cn()` | Change the property / drop the base / use the `.aa-*` class; `className` last | `lib/utils/helpers.ts:1-3` (naive join) |
| Invent a new severity/accent color | Reuse the risk ramp `#e4b4a0/#ffcf9d/#d5c5a8/#a8c8a5`, Crisis-red family, NEET-PG `#cab3ff` | `ReadinessMeter.tsx:21-26`; `TopicMapNode.tsx:93-98` |
| Strip brand emojis (🌰🔥⚡🔍) or flatten Crisis-red / NEET-PG-purple into amber | Keep them — meaning-bearing brand | `Sidebar.tsx:201,254`; `CrisisContent.tsx:326,358` |
| Neon/outer glows, pure `#000`, oversaturated accents | Tinted amber/near-black shadows; off-black `--aa-bg` | `globals.css:52-53,104-107` |

## Components

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Hand-roll `<button>` / card `<div>` / `<input>` | `<Button>`/`<Card>`/`<Input>` + `.aa-*` classes | `components/ui/*`; 36 `<Button>` usages |
| Treat `variant="premium"` as a distinct look | Know it's an alias of `primary`; add extra via `className` | `Button.tsx:20,22` |
| Import `cn` from `clsx`, or add `twMerge` | `import { cn } from "@/lib/utils/helpers"` (naive join) | `helpers.ts:1-3`; both libs installed but unused |
| Build a global `useToast()`/toast store, or import sonner/react-hot-toast | Render `<Toast>` inline from local state; place with a `fixed` wrapper | `Toast.tsx`; `DashboardShell.tsx:121-131`; grep toast libs = 0 |
| `material-symbols-outlined` for new UI; add a 4th icon system | lucide-react (default) / AlmondIcons (nav) | `Input.tsx:59`; `Toast.tsx:46` (legacy only) |
| Add `"use client"` to every primitive (or forget it on stateful ones) | Only on hooks/state/handlers; `Card`/`Spinner`/`SkeletonLoader`/`AlmondIcons` stay server-safe | `Button.tsx:1` vs `Card.tsx` (none) |
| Import primitives from a barrel `@/components/ui` | Import each by path: `@/components/ui/Button` | no `index.ts` in `components/ui` |
| Use `<Input>` for checkbox/textarea | Input is text-only; hand-write `<label><input type=checkbox {...register}/>` + separate `<p>` error | `Input.tsx`; `LoginForm.tsx:74-77` |

## Pages & layout

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Add own `max-w-*`/`px-*`/`lg:ml-64` to a `(dashboard)` page | Emit only the content stack; shell provides container/padding | `DashboardShell.tsx:118-119` |
| Wrap a page entrance in `<motion.div initial animate>` | `aa-stagger` / `className="aa-anim-fade-up"` / `style={{animation:"aaFadeUp …"}}` | `progress/page.tsx:131`; grep page-level Framer = 0 |
| Add a per-page `layout.tsx` | Put authed pages under `(dashboard)` to inherit gate+shell | `(dashboard)/layout.tsx` is the only group layout |
| Use a one-off heading size or `aa-h1` for a card title | Role scale: `aa-display`/page-h1/`aa-h3`/`aa-h4` | `globals.css:319-354` |
| Copy `insights/page.tsx` as a page template | Model on `progress`/`profile` (inline style + tokens) | `insights` is the lone Tailwind+hex outlier |
| Copy boundary files' STYLE | Copy their structure, restyle with tokens (they use hex + dead `font-headline`) | `error.tsx`, `not-found.tsx` |

## Data & state

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| `useQuery`/`useMutation` for page-body data | Raw api fn in token-keyed `useEffect`+`useState` (Promise.all + mounted guard) | grep useQuery in `(dashboard)` = 0; `progress/page.tsx:47-81` |
| Use axios `apiClient` for a new module / add a token interceptor | Raw `fetch` + module-local `apiBase`; token as 1st arg, manual Bearer | only `auth.api.ts` imports `apiClient` |
| Return the raw `{success,data}` envelope | Return `payload.data` (`?? []` for lists) | `syllabus.api.ts:106-107` |
| Assume `fetch` throws on 4xx / treat 404 as error | `if(!res.ok) throw`; `if(res.status===404) return null` | `planner.api.ts:157-172` |
| Read token via `supabase.auth.getSession()` everywhere; store JWT in React Query | `useAuthStore((s)=>s.accessToken)`; React Query = server state only | `useProfile.ts:9`; `useAuth.ts:31-46` |
| `useAuthStore((s)=>s.profile)` for profile data | `useProfile()` — store `profile` is dead (`setProfile` never called) | grep `setProfile` = decl only |
| Add a Zustand store for server data | Token-gated React Query hook | only `authStore` exists |
| Build a ThemeProvider/context; assume light renders | `useTheme()` (data-attr + localStorage); build dark; `Providers` = QueryClient only | `useTheme.ts`; `providers.tsx:7` |
| Centralize `ApiEnvelope<T>` / make a `types/` dir | Redeclare envelope per file; co-locate DTOs in `*.api.ts` | `mcq.api.ts:3-6`; `crisis.api.ts:10-212` |

## Forms

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Copy `app/(auth)/login\|signup/page.tsx` (manual state/validation/inline styles) | Copy `components/auth/LoginForm.tsx` (RHF + zod + Input/Button/Toast) | `LoginForm.tsx:34-62` |
| Re-implement validation in `onSubmit` | Put it in the zod schema; component renders `errors.x?.message` | `auth.validators.ts:13-27` |
| Put server errors in field state / invent error UI | One `formError` state → `<Toast variant="error">` at top; reset at submit start | `LoginForm.tsx:44,60,66` |
| Wire your own spinner / `disabled={isSubmitting}` | `<Button isLoading={isSubmitting}>` (auto Spinner + disabled) | `Button.tsx:52-55` |
| Add a custom password show/hide | `<Input type="password">` auto-renders it | `Input.tsx:28-30,52-61` |
| react-hook-form for a wizard | onboarding pattern: `answers` obj + `step` + localStorage resume | `onboarding/page.tsx:160-202` |
| Call raw Supabase in a reusable form | Go through `useAuth()` | `useAuth.ts:36-77` |

## Motion

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Framer `whileTap`/`whileHover` for press/hover | `.aa-press` (scale .97) | `globals.css:1339`; whileHover/Tap in 2 graph files only |
| Invent spring values / long cinematic tweens | House values: modal 260/24, nodes 300/25, list 200/24, tabs dur .16–.18, bars ease `[0.16,1,0.3,1]` | `CrisisWarRoom.tsx:1036`; `ReadinessMeter.tsx:95` |
| Build a sliding `layoutId` tab underline | Inline 2px bottom border + color/weight swap | grep `layoutId` = 0 |
| Animate `top/left/width/height` (except value-driven width/stroke) | Animate `transform`/`opacity`; reduced-motion is global | `globals.css:938-947` |
| Per-component `prefers-reduced-motion` guard | Inherit the global block | `globals.css:1389` |
| Inline `nodeTypes` / unmemoized xyflow nodes | `memo(...)` + module-level `nodeTypes` | `PlanGraph.tsx:21`; `SubjectMapNode.tsx:24` |
| Spinner for page/section load; Framer for streaming text | `aa-skeleton`; CSS caret + `aa-typing-dot` | `layout.tsx:28-38`; `ClinicalMode.tsx:1195` |

## Accessibility

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| `outline-none`/`focus:outline-none` on a custom interactive el | Keep global `:focus-visible`; add `.aa-focusable`; or re-add `focus-visible:ring-2 ring-[var(--aa-amber-border)]` | `globals.css:1128`; `Button.tsx:46` |
| Reach for the `shadow-focus` Tailwind token | It's dead (0 usages) — use the outline/ring | `tailwind.config.ts:112` |
| Hand-roll an `aa-overlay` modal for new dialogs | Radix Dialog (focus-trap/Escape/aria-modal) | `planner/page.tsx:630` |
| Drop `aria-label` on icon-only buttons | Keep it | `Input.tsx:57`; `Sidebar.tsx:187` |

## Realtime / voice

| ❌ Don't | ✅ Do | Evidence |
|---|---|---|
| Read the `state` closure in VAD/WS callbacks | Read `stateRef.current`; write via `go()` | `useVoiceSession.ts:101-105` |
| Top-level `import … from "@ricky0123/vad-web"` / onnx at module scope | `await import(...)` inside the client hook | `useVoiceSession.ts:329` |
| Create AudioContext at module load / outside the click | `new StreamingAudioPlayer()` in `startSession`, `await init()` | `useVoiceSession.ts:300-310` |
| Render markdown via custom HTML / typography plugin / `dangerouslySetInnerHTML` | `<ReactMarkdown remarkGfm rehypeRaw>` in `.flowing-text` | `ChatMessage.tsx:67-71` |
| Show raw stream with backend markers (`[general]`, `[rag]`, literal `\n`) | Strip markers + `\\n`→`\n` before render | `ChatMessage.tsx:19-27` |
| `h-screen` for a chat/voice shell; scroll child without `min-h-0` | `h-[calc(100dvh-<offset>)]` + `flex-1 min-h-0 overflow-y-auto` | `voice-agent/page.tsx:192` |
| Confuse the 3 voice systems | `useVoiceSession` (WS agent) ≠ `useVoiceInput` (dictation) ≠ `useVoiceOutput` (TTS) | the three hook files |

---

## Off-system files — use the blessed counterpart instead

| Off-system (copy structure only, never style) | Blessed template |
|---|---|
| `app/(dashboard)/insights/page.tsx` (Tailwind + raw hex) | `progress/page.tsx`, `profile/page.tsx` |
| `app/error.tsx` / `global-error.tsx` / `not-found.tsx` (hex + `font-headline`) | their structure, restyled with tokens |
| `app/(auth)/login/page.tsx` / `signup/page.tsx` (hand-rolled forms) | `components/auth/LoginForm.tsx` |
| `components/crisis/CrisisContent.tsx` (low-motion) | `components/crisis/CrisisWarRoom.tsx` |
