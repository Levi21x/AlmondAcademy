# AlmondAI Landing Page — Claude Code Prompts
# Run these in order inside your frontend/ directory

---


Important requirement:- ALWAYS USE the frontend-design and web-artifacts-builder skills which is installed with in claude for building all of this.

## PROMPT 1 — Font System: Bricolage Grotesque + Geist

```
You are working inside frontend/ which is a Next.js 14 App Router project with TypeScript and Tailwind CSS.

TASK: Replace the current font stack with Bricolage Grotesque (display) + Geist Sans (body/UI).

Step 1 — frontend/app/layout.tsx
- Remove all existing next/font/google imports (Sora, Plus Jakarta Sans, Inter, Noto Serif)
- Add these two imports:
    import { Bricolage_Grotesque } from 'next/font/google'
    import { Geist } from 'next/font/google'
- Configure Bricolage_Grotesque with:
    subsets: ['latin']
    weight: ['400', '500', '600', '700', '800']
    variable: '--aa-fd'
    display: 'swap'
- Configure Geist with:
    subsets: ['latin']
    weight: ['300', '400', '500', '600']
    variable: '--aa-fb'
    display: 'swap'
- Apply both variables to the <html> element: className={`${bricolage.variable} ${geist.variable}`}
- Keep the Material Symbols Outlined <link> tag in <head> unchanged

Step 2 — frontend/app/globals.css
- In :root, update:
    --aa-fd: var(--bricolage-grotesque), 'Bricolage Grotesque', serif
    --aa-fb: var(--geist), 'Geist', sans-serif
- Remove any hardcoded font-family references to 'Sora', 'Plus Jakarta Sans', 'Inter', 'Noto Serif'
- Keep --aa-fd on: .aa-display, .aa-h1, .aa-h2, .aa-h3, .aa-h4 — these should already use var(--aa-fd), just verify
- Keep --aa-fb on: .aa-body, .aa-body-sm, .aa-body-lg, .aa-caption, .aa-label, .aa-btn, .aa-input
- The .almond-display class: change to font-family: var(--aa-fd); font-style: italic; font-weight: 300; (Bricolage Grotesque italic at light weight replicates the original decorative intent)

Do not change any color tokens, spacing, or other CSS rules. Font variables only.
```

---

## PROMPT 2 — Hero Section with Animated Blob

```
You are working inside frontend/app/page.tsx in a Next.js 14 App Router project.

TASK: Replace the entire contents of page.tsx with a full landing page component. This file currently doubles as the landing/login page — keep the login/signup toggle functionality intact by moving it to a modal triggered by the "Log in" nav button. Use 'use client' at the top.

DESIGN REFERENCE: Dark luxury feel. Background #131313. Large animated iridescent blob centerpiece. Floating glassmorphism stat cards. Clean minimal nav. Warm amber/cream color palette exclusively — no blue, no purple, no cold tones anywhere.

--- NAV ---
- Fixed top, height 68px, background rgba(19,19,19,0.75), backdrop-filter blur(16px), border-bottom 1px solid rgba(255,255,255,0.04)
- Left: logo "🌰 AlmondAI" — "Almond" in var(--aa-text-1), "AI" in var(--aa-amber). Font: var(--aa-fd), weight 700, font-size 1.15rem
- Center: links — Features, Pricing, Reviews, FAQ — font var(--aa-fb), size 0.875rem, color var(--aa-text-2), hover color var(--aa-text-1), smooth 0.2s transition, no underline
- Right: "Log in" ghost button (border 1px solid var(--aa-border2), color var(--aa-text-2), hover border var(--aa-amber), hover color var(--aa-amber), border-radius 100px, padding 8px 18px) and "Get started free" primary button (background var(--aa-amber) which is #d5c5a8, color #131313, font-weight 700, border-radius 100px, padding 9px 22px, hover background var(--aa-amber-lt) #e6d5b8)

--- HERO ---
- min-height: 100vh, flex column center, position relative, overflow hidden, padding-top 68px
- Background: #131313 with a <canvas id="blobCanvas"> as absolute centerpiece

BLOB CANVAS IMPLEMENTATION (vanilla JS in useEffect with requestAnimationFrame):
- Canvas: position absolute, bottom -60px, left 50%, transform translateX(-50%), width 700px, height 520px, z-index 1, pointer-events none
- Draw a large organic morphing blob using a polar coordinate approach:
    - Center at (350, 300)
    - Base radius: 180px
    - Use 8 control points around the circumference, each offset by sin waves with different frequencies and phases
    - Each frame: increment time by 0.004
    - Point i offset = baseRadius + 55 * sin(time * 1.2 + i * 0.9) + 30 * sin(time * 0.7 + i * 1.6)
    - Connect points with cubic bezier curves (smooth catmull-rom style) to create the organic silhouette
    
- BLOB FILL — Three layered radial gradients to simulate iridescent light refraction using ONLY warm AlmondAI colors:
    Layer 1 (base): radial gradient from rgba(213,197,168, 0.9) at blob center → rgba(42,37,32, 0.95) at edges
    Layer 2 (warm light sweep): radial gradient offset to upper-right (40% 30%) from rgba(230,200,122, 0.6) → transparent — this is the caution/gold highlight
    Layer 3 (coral refraction): radial gradient offset to lower-left (60% 70%) from rgba(228,180,160, 0.45) → transparent — this is the coral warmth
    Layer 4 (cream glow): small radial at center from rgba(255,242,222, 0.3) → transparent
    Composite all layers using ctx.globalCompositeOperation = 'source-over' in order
    
- BLOB SURFACE SHEEN: After fill, draw a highlight arc path at the upper-left quadrant of the blob using a linear gradient from rgba(255,242,222, 0.4) to transparent, stroke width 1.5px — simulates the glass edge catch light
    
- OUTER GLOW: Before drawing blob, use ctx.shadowColor = 'rgba(213,197,168, 0.15)', ctx.shadowBlur = 80

- STARS background: generate 120 star objects in useMemo, each with random x (0-100vw), y (0-100vh), opacity (0.1–0.5), size (1–2px), and a random animation delay. Render as absolutely positioned divs with background rgba(230,213,184, 0.3), border-radius 50%, and CSS animation: twinkle var(--d) var(--delay) infinite ease-in-out. @keyframes twinkle: 0%,100% opacity 0.1, 50% opacity 0.6

--- HERO CONTENT (z-index 2, relative) ---
- Badge pill: "● Now in Beta — Free for NEET-PG 2025" — background rgba(213,197,168,0.08), border 1px solid rgba(213,197,168,0.18), border-radius 100px, padding 6px 16px, font-size 0.75rem, color var(--aa-amber), letter-spacing 0.05em. The dot pulses using @keyframes pulse
- Headline: font-family var(--aa-fd), font-size clamp(3rem, 6vw, 5.5rem), font-weight 800, line-height 1.06, letter-spacing -0.035em, color var(--aa-text-1). Text: "Study smarter,\ncrack NEET-PG\nwith confidence" — wrap "NEET-PG" in <em> styled with font-style italic, color var(--aa-amber)
- Sub: "AlmondAI is your AI-powered study companion built exclusively for Indian medical students — adaptive tutoring, voice agent, MCQ engine, and more." font-family var(--aa-fb), font-size 1.05rem, color var(--aa-text-2), max-width 520px, margin 0 auto, line-height 1.72
- CTA row: "Start studying free →" primary pill button + "Watch demo" ghost pill button. Same styles as nav buttons but larger: padding 14px 32px and 14px 26px respectively, font-size 0.95rem

--- FLOATING STAT CARDS ---
Left card (position absolute, left 7%, top 54%, z-index 10):
- background rgba(28,27,27,0.72), backdrop-filter blur(20px), border 1px solid rgba(213,197,168,0.13), border-radius 16px, padding 14px 18px
- Label: "Daily Streak" — font-size 0.68rem, text-transform uppercase, letter-spacing 0.07em, color var(--aa-text-3)
- Value: "14 🔥" — font-family var(--aa-fd), font-size 1.6rem, font-weight 700, color var(--aa-text-1)
- Sub: "+3 almonds earned" — font-size 0.75rem, color var(--aa-amber)
- CSS animation: floatL 4s ease-in-out infinite — @keyframes floatL: 0%,100% translateY(0), 50% translateY(-10px)

Right card (position absolute, right 7%, top 57%, z-index 10):
- Same glass card styles
- Label: "Accuracy this week"
- Value: "82%" — same font styles
- Progress bar: width 110px, height 4px, background var(--aa-s4), border-radius 2px, overflow hidden. Fill div: width 82%, height 100%, background var(--aa-amber), animation barGrow 1.8s ease forwards 0.6s (starts at width 0)
- CSS animation: floatR 4s ease-in-out infinite 1s
```

---

## PROMPT 3 — Stats Bar + Features + How It Works

```
You are continuing work on frontend/app/page.tsx. Add the following three sections below the Hero section. All color values must use the CSS custom properties from globals.css — never hardcode hex values except where explicitly noted.

--- STATS BAR ---
- Full-width strip, background var(--aa-s1), border-top 1px solid rgba(255,255,255,0.04), border-bottom same
- padding: 44px 5%, display flex, justify-content center, gap 80px, flex-wrap wrap
- Four stat items, each text-center:
    "12K+" / "Active MBBS students"
    "2.4M" / "MCQs answered"  
    "94%" / "Accuracy improvement"
    "4.9★" / "Student rating"
- Number: font-family var(--aa-fd), font-size 2.2rem, font-weight 700, color var(--aa-amber), letter-spacing -0.035em
- Label: font-family var(--aa-fb), font-size 0.8rem, color var(--aa-text-3), margin-top 4px

--- FEATURES SECTION ---
- section id="features", padding 96px 5%, background var(--aa-bg)
- Section label: "What we offer" — font-size 0.72rem, text-transform uppercase, letter-spacing 0.1em, color var(--aa-amber), font-family var(--aa-fb), margin-bottom 14px
- Section heading: "Everything you need to ace the exam" — split across two lines, "ace the exam" wrapped in <em> italic in var(--aa-amber). Font: var(--aa-fd), font-size clamp(2rem, 4vw, 3rem), weight 700, letter-spacing -0.03em, color var(--aa-text-1), line-height 1.1
- Sub paragraph: "Not just flashcards. A full intelligent study system built around how NEET-PG toppers actually learn." — var(--aa-fb), font-size 1rem, color var(--aa-text-2), max-width 540px, line-height 1.7, margin-top 12px

FEATURES GRID:
- CSS Grid: 3 columns, 1fr each, separated by 1px solid var(--aa-border) gap lines (not margin — use gap:1px and background:var(--aa-border) on the grid container, then each cell gets its own background to "mask" the gap and create the line effect)
- Grid container: margin-top 56px, border-radius 20px, overflow hidden
- Each feature card:
    background var(--aa-s1)
    padding: 36px 30px
    position relative, overflow hidden
    ::before pseudo: position absolute, inset 0, background radial-gradient(ellipse 70% 50% at 50% 0%, rgba(213,197,168,0.07), transparent), opacity 0, transition opacity 0.3s
    :hover background var(--aa-s2)
    :hover ::before opacity 1
    
- Icon container: width 44px, height 44px, background rgba(213,197,168,0.1), border-radius 12px, display flex, align-items center, justify-content center, margin-bottom 18px, font-size 1.25rem
- h3: font-family var(--aa-fd), font-size 1.02rem, font-weight 600, color var(--aa-text-1), margin-bottom 10px, letter-spacing -0.01em
- p: font-family var(--aa-fb), font-size 0.86rem, color var(--aa-text-3), line-height 1.65
- Tag pill: display inline-block, margin-top 14px, font-size 0.68rem, text-transform uppercase, letter-spacing 0.06em, padding 3px 10px, border-radius 100px
    Core features: background rgba(213,197,168,0.1), color var(--aa-amber) — use aa-badge-amber class if it matches, else inline style
    Pro features: background rgba(230,200,122,0.1), color var(--aa-caution) — use aa-badge-caution class

Six features in this order:
1. 🧠 "Adaptive AI Tutor" — "Ask anything — Anatomy, Pharmacology, Pathology. Get Socratic explanations, not just answers. Powered by Llama 3.3 70B." — Core
2. 📋 "Spaced Repetition MCQs" — "Duolingo-style lives system with almonds currency. 5,000+ NEET-PG questions filtered by difficulty and your personal weak zones." — Core
3. 🎙️ "Voice Study Agent" — "Study hands-free. Talk to your AI tutor via Deepgram STT + TTS — perfect for long revision sessions while commuting." — Pro
4. 🗺️ "Syllabus Map" — "Full NEET-PG syllabus as an interactive topic tree. Track completion per subject, see your coverage gaps at a glance." — Core
5. 📊 "Weakness Intelligence" — "Real-time analysis of where you're losing marks. AlmondAI identifies failing topics and auto-adjusts your question bank." — Pro
6. 🧬 "Visual Explainers" — "Complex pathways and drug mechanisms rendered as interactive flowcharts, mind maps, and decision trees — generated on demand." — Pro

--- HOW IT WORKS SECTION ---
- section, padding 96px 5%, background var(--aa-s1)
- Same section label + heading pattern: label "Simple by design", heading "From signup to first revision in minutes" with "first revision" in italic amber
- Heading and label centered (text-align center), sub paragraph centered max-width 500px

STEPS GRID:
- 3 columns, gap 32px, margin-top 56px
- Each step card: background var(--aa-s2), border 1px solid var(--aa-border), border-radius 20px, padding 32px 28px, position relative
- Step number: font-family var(--aa-fd), font-size 3.5rem, font-weight 800, color rgba(213,197,168,0.07), line-height 1, margin-bottom 16px, letter-spacing -0.04em
- h3: var(--aa-fd), font-size 1rem, font-weight 600, color var(--aa-text-1), margin-bottom 8px
- p: var(--aa-fb), font-size 0.86rem, color var(--aa-text-3), line-height 1.65

Connector lines between step 1→2 and 2→3:
- Absolutely positioned on each step card (except last): right -18px, top 50%, width 16px, height 1px, background linear-gradient(to right, var(--aa-border2), transparent), z-index 2

Steps content:
1. "01" / "Set your exam goal" / "Tell AlmondAI your target exam date and weak subjects. It builds a personalised revision plan from day one."
2. "02" / "Study with your AI tutor" / "Ask questions, solve MCQs, use the voice agent. AlmondAI learns your weak spots as you go and adjusts difficulty."
3. "03" / "Track and improve daily" / "Streaks, accuracy trends, peer leaderboards, and AI-generated insights keep momentum building every day."
```

---

## PROMPT 4 — Pricing Section

```
You are continuing work on frontend/app/page.tsx. Add the Pricing section below the How It Works section.

--- PRICING SECTION ---
- section id="pricing", padding 96px 5%, background var(--aa-bg)
- Section label: "Simple pricing", heading: "No surprises, just results" with "just results" italic amber
- Both centered

PRICING GRID:
- max-width 920px, margin 64px auto 0, display grid, grid-template-columns repeat(3, 1fr), gap 20px

FREE CARD (column 1):
- background var(--aa-s1), border 1px solid var(--aa-border), border-radius 20px, padding 32px 26px
- Plan label: "Free" — font-size 0.72rem, text-transform uppercase, letter-spacing 0.1em, color var(--aa-text-3), var(--aa-fb)
- Amount: "₹0" — font-family var(--aa-fd), font-size 2.5rem, font-weight 700, color var(--aa-text-1), letter-spacing -0.04em
- "/month" suffix: font-size 1rem, font-weight 400, color var(--aa-text-3), margin-left 2px
- Description: "Everything you need to get started." — var(--aa-fb), 0.84rem, var(--aa-text-3), margin 10px 0 24px, line-height 1.55
- Feature list: <ul> with list-style none. Each <li>: display flex, align-items flex-start, gap 10px, font-size 0.85rem, color var(--aa-text-2), var(--aa-fb), margin-bottom 10px
    Bullet: a <span> containing "✦" — color var(--aa-amber), font-size 0.58rem, margin-top 5px, flex-shrink 0 — NOT a standard ::before pseudo or list marker
    Items: "AI Tutor (20 questions/day)", "5 MCQs daily (almonds system)", "Syllabus Map access", "Basic progress tracking", "Peer leaderboard"
- margin-bottom 28px on the list
- CTA button: full width, padding 12px, border-radius 100px, font-family var(--aa-fb), font-size 0.88rem, font-weight 600, cursor pointer, transition all 0.2s
    Style: background transparent, border 1px solid var(--aa-border2), color var(--aa-text-2)
    Hover: border-color var(--aa-amber), color var(--aa-amber)
    Text: "Get started free"

PRO CARD (column 2, FEATURED):
- position relative (needed for the badge)
- background var(--aa-s3) which is #2a2520, border 2px solid rgba(213,197,168,0.35), border-radius 20px, padding 32px 26px
- "Most Popular" badge: position absolute, top -13px, left 50%, transform translateX(-50%), background var(--aa-amber) #d5c5a8, color #131313, font-size 0.7rem, font-weight 700, padding 4px 16px, border-radius 100px, letter-spacing 0.05em, text-transform uppercase, white-space nowrap, font-family var(--aa-fb)
- Same structure as Free card but:
    Amount: "₹499"
    Description: "Serious about NEET-PG? This is what toppers use."
    Items: "Unlimited AI Tutor sessions", "Unlimited daily MCQs", "Voice Study Agent", "Weakness intelligence engine", "Visual explainers (flowcharts, maps)", "AI Study Planner", "Crisis revision mode"
- CTA button: background var(--aa-amber), border none, color #131313, font-weight 700
    Hover: background var(--aa-amber-lt)
    Text: "Start Pro trial"

ANNUAL CARD (column 3):
- Same as Free card styles
- Amount: "₹349", suffix "/month"
- Add a small "Save 30%" pill below the amount: display inline-block, background rgba(34,197,94,0.1), color var(--aa-green), font-size 0.72rem, padding 2px 10px, border-radius 100px, font-family var(--aa-fb), margin-bottom 4px
- Description: "Billed annually at ₹4,188/year."
- Items: "Everything in Pro", "Priority support", "Early access to new features", "Downloadable study reports"
- CTA button same ghost style as Free, text: "Get annual plan"
```

---

## PROMPT 5 — Testimonials, FAQ, CTA, Footer

```
You are continuing work on frontend/app/page.tsx. Add the final four sections.

--- TESTIMONIALS ---
- section id="testimonials", padding 96px 5%, background var(--aa-s1)
- Label: "Student stories", heading: "Real results from real MBBS students" with "real MBBS students" italic amber, centered

TESTIMONIALS GRID:
- 3 columns, gap 20px, margin-top 56px
- Each card: background var(--aa-s2), border 1px solid var(--aa-border), border-radius 16px, padding 28px 24px

Star row: 5× "★" characters in spans, color var(--aa-caution) #e6c87a, font-size 0.78rem, display flex, gap 3px, margin-bottom 14px

Quote: font-family var(--aa-fb), font-size 0.9rem, color var(--aa-text-2), line-height 1.72, font-style italic, margin-bottom 20px
Opening quote mark "❝": position it as a separate <span> before the quote text — font-family var(--aa-fd), font-size 2rem, color var(--aa-amber), opacity 0.35, line-height 0, vertical-align -14px, margin-right 3px

Author row: display flex, align-items center, gap 12px
Avatar: width 36px, height 36px, border-radius 50%, background var(--aa-s3), border 1px solid var(--aa-border2), display flex, align-items center, justify-content center, font-family var(--aa-fd), font-size 0.82rem, font-weight 700, color var(--aa-amber), flex-shrink 0
Name: var(--aa-fd), 0.86rem, weight 600, color var(--aa-text-1)
Role: var(--aa-fb), 0.75rem, color var(--aa-text-3), margin-top 2px

Three testimonials:
1. Avatar "RK", Name "Rahul K.", Role "MBBS Final Year, AIIMS Hyderabad"
   Quote: "The weakness tracker found I was consistently failing Pharmacology at the mechanism level, not just recall. It completely changed how I study."

2. Avatar "SP", Name "Sneha P.", Role "Intern Doctor, KMC Manipal"
   Quote: "AlmondAI's voice agent during my commute replaced both PrepLadder and Marrow for concept revision. It's like having a tutor on call 24/7."

3. Avatar "AM", Name "Arjun M.", Role "PG Aspirant, JIPMER"
   Quote: "The visual explainers for drug mechanisms are something PrepLadder never had. A flowchart for beta-blocker MOA just sticks differently."

--- FAQ ---
- section id="faq", padding 96px 5%, background var(--aa-bg)
- Label: "Questions answered", heading: "Everything you want to know" with "want to know" italic amber, centered
- FAQ list: max-width 720px, margin 56px auto 0, display flex, flex-direction column, gap 3px

Use React useState: const [openFaq, setOpenFaq] = useState<number | null>(0) — first item open by default

Each FAQ item:
- Outer div: background var(--aa-s1), border-radius 12px, overflow hidden
- border: 1px solid transparent — when index === openFaq, border-color var(--aa-border2)
- transition border-color 0.2s

Question button: width 100%, background transparent, border none, padding 20px 22px, display flex, justify-content space-between, align-items center, cursor pointer, font-family var(--aa-fb), font-size 0.93rem, font-weight 500, color var(--aa-text-1), text-align left, gap 16px
- onClick: setOpenFaq(index === openFaq ? null : index)

Toggle icon: a <span> containing "+" — font-size 1.3rem, color var(--aa-text-3), transition transform 0.25s, flex-shrink 0
- When open: transform rotate(45deg), color var(--aa-amber)

Answer area: max-height 0 when closed, max-height 300px when open, overflow hidden, transition max-height 0.35s ease
Answer inner: padding 0 22px 20px, font-family var(--aa-fb), font-size 0.875rem, color var(--aa-text-3), line-height 1.72

Five FAQ items:
Q1: "Is AlmondAI only for NEET-PG or can USMLE students use it too?"
A1: "Currently AlmondAI is optimised for the Indian MBBS and NEET-PG curriculum. USMLE and FMGE support is on our roadmap for late 2025. The AI tutor itself handles any medical topic — it's not exam-restricted."

Q2: "How is this different from PrepLadder or Marrow?"
A2: "PrepLadder and Marrow are video lecture platforms. AlmondAI is an interactive AI study system — it adapts to your weaknesses in real time, explains concepts conversationally, and generates visual aids on demand. It works best alongside your existing resources."

Q3: "What are almonds and how does the MCQ currency work?"
A3: "Almonds (🌰) are AlmondAI's daily practice currency. Free users get 5 per day — each MCQ attempt costs one. Correct answers can earn bonus almonds. Pro users get unlimited almonds with no daily cap. It's designed to build a daily study habit."

Q4: "Is my study data private and secure?"
A4: "Yes. Your chat history, performance data, and profile are stored via Supabase with row-level security. We never sell your data. Conversations with the AI tutor are private to you."

Q5: "Can I cancel my Pro subscription anytime?"
A5: "Absolutely. Cancel anytime from your account settings — no questions asked, no penalty. Access continues until the end of the billing period. Payments are processed via Razorpay."

--- CTA SECTION ---
- section, padding 112px 5%, background var(--aa-bg), text-align center, position relative, overflow hidden
- Background glow: position absolute, top 50%, left 50%, transform translate(-50%,-50%), width 700px, height 320px, background radial-gradient(ellipse, rgba(213,197,168,0.055) 0%, transparent 68%), pointer-events none, z-index 0
- All content: position relative, z-index 1
- Label: "Get started today" — same label style as other sections
- Heading: "Your NEET-PG rank starts right here" — "right here" italic amber. Font: var(--aa-fd), font-size clamp(2.2rem, 5vw, 4rem), weight 800, letter-spacing -0.035em, line-height 1.1, margin-bottom 18px
- Sub: "Join 12,000+ MBBS students already studying smarter. Free forever, upgrade when you're ready." — var(--aa-fb), 1rem, var(--aa-text-2), max-width 460px, margin 0 auto 36px, line-height 1.7
- CTA button: same as hero primary button, text "Start studying free →"
- Note below button: margin-top 14px, font-size 0.76rem, color var(--aa-text-3), var(--aa-fb): "No credit card required · Cancel Pro anytime · Built for Indian medical students"

--- FOOTER ---
- <footer>, background var(--aa-s1), border-top 1px solid var(--aa-border), padding 44px 5%
- display flex, justify-content space-between, align-items center, flex-wrap wrap, gap 20px
- Left: logo "🌰 AlmondAI" same style as nav logo
- Center: <nav> with links — Privacy, Terms, Contact, Blog — display flex, gap 28px, font-size 0.82rem, color var(--aa-text-3), text-decoration none, hover color var(--aa-amber), transition 0.2s, var(--aa-fb)
- Right: "© 2025 AlmondAI. Made for MBBS India." — font-size 0.78rem, color var(--aa-text-3), var(--aa-fb)
```

---

## PROMPT 6 — Scroll Reveal + Page Polish

```
You are finalising frontend/app/page.tsx. Add scroll reveal animations and polish the entire page.

--- SCROLL REVEAL ---
Add this useEffect at the top of the component (after font/state declarations):

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
  return () => observer.disconnect()
}, [])

Add to globals.css (do not duplicate if already present):
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

Apply className="reveal" to these elements:
- The stats bar div
- Each section's label + heading + sub paragraph (wrap in a div with reveal if needed)
- The features grid container
- The steps grid container  
- The pricing grid container
- The testimonials grid container
- The FAQ list container
- The CTA heading, sub, and button wrapper

For grid children (features, steps, pricing, testimonials), add staggered delay:
- Apply inline style={{ transitionDelay: `${index * 0.08}s` }} to each grid child
- This creates a left-to-right cascade effect

--- MOBILE RESPONSIVENESS ---
Add these breakpoints in globals.css or as Tailwind responsive classes:

At max-width 768px:
- Nav center links: display none
- Hero h1: font-size 2.4rem
- Float cards: display none (they overlap badly on mobile)
- Features grid: grid-template-columns 1fr (single column)
- Steps grid: grid-template-columns 1fr
- Pricing grid: grid-template-columns 1fr
- Testimonials grid: grid-template-columns 1fr
- Stats bar: gap 40px
- Step connector lines: display none

At max-width 480px:
- Hero h1: font-size 2rem
- Section headings: font-size 1.8rem
- Pricing card: padding 24px 20px

--- FINAL POLISH ---
1. Ensure the page.tsx file has 'use client' at the very top
2. All imports at the top: React, useState, useEffect, useRef, useMemo
3. The canvas blob animation cleanup: return () => cancelAnimationFrame(animFrameRef.current) in the useEffect cleanup
4. The IntersectionObserver cleanup: return () => observer.disconnect()
5. Verify no TypeScript errors: canvas ref typed as useRef<HTMLCanvasElement>(null), animFrame ref as useRef<number>(0)
6. Remove any leftover JSX from the original page.tsx that is not part of the new landing page structure
7. The login/signup modal: trigger it from the "Log in" nav button using useState<boolean> showAuthModal. Render the existing LoginForm component from components/auth/LoginForm inside a modal overlay. The overlay: position fixed, inset 0, background rgba(6,6,10,0.85), backdrop-filter blur(8px), z-index 200, display flex, align-items center, justify-content center. Close on backdrop click. Keep all existing auth logic intact — do not modify LoginForm.tsx.
```