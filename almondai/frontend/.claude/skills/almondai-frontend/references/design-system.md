# AlmondAI Design System — full reference

Source of truth: `app/globals.css` (≈1389 lines). Everything is token-driven on `:root`. This file
catalogs every token, every `.aa-*` class, the motion layer, the theme mechanics, and the
markdown/prose styling. **Trust values, not names** (`--aa-teal` is cream; `--aa-purple` is taupe;
the `--geist` var loads DM Sans).

---

## 1. Tokens (`:root`, globals.css:6–64)

### Surfaces / backgrounds (elevation ladder, deepest → raised)
| Token | Value | Use |
|---|---|---|
| `--aa-bg` | `#131313` | Page background (`DashboardShell` main). Never `#000`. |
| `--aa-bg-2` | `#141414` | Alt page bg |
| `--aa-s1` | `#1c1b1b` | Deepest panel / sidebar bg |
| `--aa-s2` | `#1f1f1f` | **Default card/section surface** (`aa-card`, cardStyle) |
| `--aa-s3` | `#2a2520` | Secondary surface / `aa-btn-secondary` / input/label bg |
| `--aa-s4` | `#353534` | Tertiary surface / progress track |
| `--aa-input` | `#1a1a1a` | Form field background |

### Text
| `--aa-text-1` | `#fff2de` | Primary text + all headings |
| `--aa-text-2` | `#cec5b9` | Body text |
| `--aa-text-3` | `#b7ada0` | Muted: subtitles, labels, captions, placeholders, empty-state |

### Amber accent (primary brand)
| `--aa-amber` | `#d5c5a8` | Primary accent: active states, links, primary button bg |
| `--aa-amber-lt` | `#e6d5b8` | Lighter amber (hover, gradients) |
| `--aa-amber-glow` | `rgba(213,197,168,0.18)` | Tinted glow shadow |
| `--aa-amber-bg` | `rgba(213,197,168,0.07)` | Tint background (active pills, focus ring) |
| `--aa-amber-border` | `rgba(213,197,168,0.22)` | Accent border + focus ring color |

### Other palettes
| `--aa-teal` `#fff2de` (cream, = text-1) · `-lt #fff8ef` · `-glow` · `-bg rgba(255,242,222,.05)` · `-border rgba(255,242,222,.18)` |
| `--aa-purple` `#cec5b9` (taupe, = text-2) · `-bg rgba(206,197,185,.08)` |
| `--aa-coral` `#e4b4a0` (danger/error) · `-bg rgba(228,180,160,.08)` · `-border rgba(228,180,160,.25)` |
| `--aa-caution` `#e6c87a` (warning) · `-bg` · `-border rgba(230,200,122,.25)` |
| `--aa-green` `#22c55e` (success) · `-bg rgba(34,197,94,.08)` · `-border rgba(34,197,94,.28)` |
| `--aa-red` `#ef4444` (hard error, rare) |

### Borders / shadows / radius
| `--aa-border` `#353534` · `--aa-border2` `#4c463d` (hover/emphasis) · `--aa-borderB` `rgba(76,70,61,.6)` |
| `--aa-shadow` `0 4px 20px rgba(0,0,0,.5)` · `--aa-shadow-lg` `0 8px 40px rgba(0,0,0,.65)` |
| `--aa-r-sm` 6px · `--aa-r` 10px (inputs) · `--aa-r-md` 14px (icon tiles) · `--aa-r-lg` 18px (cards) · `--aa-r-xl` 24px (modals/heroes) · `--aa-r-full` 9999px (pills/buttons/bars) |

### Fonts (loaded in `app/layout.tsx` via `next/font/google`)
| `--aa-fd` | `var(--bricolage-grotesque), 'Bricolage Grotesque', serif` | **Display** — all headings, big numbers |
| `--aa-fb` | `var(--geist), 'DM Sans', sans-serif` | **Body** — paragraphs, labels, buttons, inputs |

> `tailwind.config.ts` declares `fontFamily.sans=Inter`, `headline/display=Noto Serif`. These are
> **never loaded** — `font-sans`/`font-headline`/`font-display` fall back to system fonts. Do not use them.

### Easing (globals.css:1302–1306)
| `--aa-ease` | `cubic-bezier(0.22,1,0.36,1)` | default smooth ease-out (CSS transitions) |
| `--aa-ease-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | gentle overshoot (modals, score/progress) |
| `--aa-ease-out` | `cubic-bezier(0.16,1,0.3,1)` | the Framer array `[0.16,1,0.3,1]` for value reveals |

### Sanctioned raw-hex accents (intentional, keep them)
- Field error: `#ffb4ab` (Input border/text).
- Risk/score ramp: `<30 #e4b4a0` · `<55 #ffcf9d` · `<75 #d5c5a8` · `≥75 #a8c8a5` · completed `#64d37c`.
- Crisis Mode: borders `#5a2f2a`/`#7a3f30`, bg `#2c1d1b`, text `#ffb4ab`, crisis-amber `#ffcf9d`.
- NEET-PG badge: `#cab3ff` on `rgba(202,179,255,0.08)`.

---

## 2. Component / utility classes (`.aa-*`)

**Cards**: `aa-card` (s2 + 1px border + r-lg + hover lift) · `aa-card-interactive` (cursor + spring lift `translateY(-4px)`) · `aa-card-premium` (gradient border) · `aa-card-accent` / `-coral` / `-teal` / `-green` (2px top accent) · `card-glow` (amber border glow on hover).

**Buttons**: `aa-btn` (pill, `--aa-fb`, 600, `:active scale(.96)`) + variant `aa-btn-primary` (amber bg, dark text, hover shine) · `aa-btn-secondary` (s3) · `aa-btn-ghost` (transparent) · `aa-btn-danger` (coral) · `aa-btn-teal`. Sizes `aa-btn-sm`, `aa-btn-xs`. `:disabled` → opacity .4.

**Inputs**: `aa-input` (input bg, r=10, focus → amber border + `0 0 0 3px amber-bg` ring); also styles `select.aa-input` (custom chevron).

**Pills/badges/chips**: `aa-pill` (`.active` amber, `.active-teal`) · `aa-badge` + `aa-badge-amber/-teal/-coral/-green/-gray/-caution` (uppercase status) · `aa-chip` (dot chip) · `aa-section-tag` (uppercase eyebrow) · `aa-level` (level pill).

**Progress**: `aa-prog-track` + `aa-prog-fill` (amber gradient, spring width transition) / `-teal` / `-green`. `aa-score-ring` (SVG stroke draw). `aa-ring-label`.

**MCQ**: `aa-option-btn` + `.selected` / `.correct` / `.incorrect`.

**Typography**: `aa-display` 2.6rem · `aa-h1` 2rem · `aa-h2` 1.5rem · `aa-h3` 1.2rem · `aa-h4` 1rem (all `--aa-fd`); `aa-body` .875rem · `aa-body-lg` 1rem · `aa-body-sm` .8125rem · `aa-caption` .75rem · `aa-label` .68rem uppercase. **Pair with an inline color token.**

**Surfaces/effects**: `aa-glass` / `-amber` / `-dark` (frosted) · `aa-dot-grid` · `aa-grain` (noise overlay, fixed/pointer-none) · `aa-gradient-text` / `-amber` · `aa-glow-amber` / `-coral` · `aa-feat-icon` (icon tile) · `aa-status-dot` (pulsing green) · `aa-divider` · `aa-step-num` (giant ghost number).

**Modal (inline pattern)**: `aa-overlay` (fixed, blur, z-100) + `aa-modal` (s2, r-xl, scale-in). *(Prefer Radix Dialog for new accessible modals — this pair has no focus-trap/Escape.)*

**Nav**: `aa-nav-item` (`.active` left bar) · `sidebar-nav-active`.

**Layout helpers**: `aa-flex-between` `aa-flex-row` `aa-gap-2/3/4` · `no-scrollbar` / `no-scroll` (hide scrollbar).

---

## 3. Motion layer (BALANCED-PREMIUM v3, globals.css:1297–1389)

Reusable, CSS-only, reduced-motion-safe. Prefer these over Framer for entrances/feedback.

| Class | Effect |
|---|---|
| `aa-stagger` | Cascades **direct children** in on mount (nth-child delays .04s→.52s, capped n+13). Page-entrance default. |
| `aa-anim-fade-up` | One-shot `aaFadeUp` (translateY 14px→0, opacity), 0.4s ease-out both. Section/page root entrance. |
| `aa-anim-bounce-in` / `aa-anim-slide-r` | Bounce-in / slide-from-right entrances. |
| `aa-press` | `:active scale(0.97)` — tactile feedback for clickable non-`<button>` surfaces. |
| `aa-lift` | hover `translateY(-3px)` + shadow; `:active translateY(-1px)`. |
| `aa-hover-glow` | hover amber box-shadow + border. |
| `aa-skeleton` | shimmer sheen sweep (amber, GPU `transform` only). The loading affordance. |
| `aa-bezel` | 6px double-bezel wrapper (nests child radius). |
| `aa-focusable` | opt-in `:focus-visible` amber outline for custom clickables. |
| `aa-typing-dot` | 3 staggered dots (typing/loading indicator). |

Keyframes available: `aaFadeUp aaSlideR aaScaleIn aaBounceIn aaShake aaFlicker aaStreakGlow aaConfettiDrop aaDotPulse aaSpinSlow aaMicPulse aaShimmer aaPulse aaStaggerUp aaBtnShine aaScoreDraw aaBorderPulse` (+ legacy `fadeUp slideIn voiceWave`).

Global `@media (prefers-reduced-motion: reduce)` (globals.css:938–947) zeroes all animation/transition
durations site-wide — **new motion inherits this; never add per-component guards.** (Caveat: JS
`setInterval` step tickers are NOT covered by the media query.)

---

## 4. Theme mechanics

- Root: `<html lang="en" data-theme="dark" className="{bricolage.variable} {geist.variable}">` (app/layout.tsx).
- An inline `themeInitScript` in `<head>` reads `localStorage["almond-theme"]` pre-paint (no FOUC), sets `data-theme` + `.light` class; default **dark**.
- Two token systems coexist:
  1. `--aa-*` (globals.css:6–64) — **always dark**, the dominant brand palette. Does NOT flip with theme.
  2. Material `--background/--surface*/--primary*/--on-surface/--error*` — light default in bare `:root` (line 606), dark override in `:root[data-theme="dark"]` (line 629). `body` + Tailwind `bg-background`/`text-on-surface` bind to these.
- `useTheme()` (`lib/hooks/useTheme.ts`) toggles `data-theme` + `.light` + persists `almond-theme`; returns `{theme,setTheme,isDark}`. Only consumed in `settings/page.tsx`.
- **Net effect**: toggling to light only changes the Material body layer; every `aa-card`/`aa-btn`/page stays dark → **the app is effectively dark-only.** Build for dark; don't assume light renders correctly; reuse `useTheme()` rather than reinventing.

---

## 5. Markdown / prose: `.flowing-text` (globals.css:740–902)

The single blessed prose style for `react-markdown` output (there is **no** `@tailwindcss/typography`).
Provides: h1–h3 in `--aa-fd` cream, custom amber bullet/ordered markers, code/pre on `#1c1b1b`,
tables, blockquotes, `hr`, `strong`/`em` coloring, and the inline `.from-general-knowledge` tag.
Always wrap rendered markdown in `<div className="flowing-text">…</div>`.

---

## 6. Global resets / scrollbar / focus

- `body`: `background var(--background)`, `color var(--on-surface)`, `font-family var(--aa-fb)`, antialiased, `min-height:100vh`.
- Scrollbar: thin, `rgba(76,70,61,.45)` thumb on transparent, 5px (globals.css:1112–1125). `.no-scrollbar`/`.no-scroll` to hide.
- `:focus-visible` global: `outline: 2px solid rgba(213,197,168,.55); outline-offset:3px` (globals.css:1128). This is the a11y backbone — don't remove outlines without replacing.
- Material Symbols icon font loaded via a Google Fonts `<link>` in layout (legacy; used by Input/Toast/Navbar only).
