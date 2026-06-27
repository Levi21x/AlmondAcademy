# Crisis Mode, Reconceived — "Co-Work for Surviving a Medical Exam"

**An ideation, not a build plan. Thinking only.** The question this document answers: *can Crisis Mode become, at minimum, everything Claude's Co-Work is — an orchestrator that delegates a goal to a team of specialist sub-agents and deep agents working in parallel while you sleep — but pointed at a terrified MBBS student 4 days out from a prof exam? And what is the "Almond Jar" that feeds it?*

Date: 27 June 2026. Companion to `AlmondAI_Deep_Ideation.md` (the *why*) and the live code in `backend/app/services/crisis/` (the *what exists*). Where this disagrees with the current implementation, this document is the target and the current code is the thing being replaced.

---

## 0. The one sentence this defends

> **Today's Crisis Mode is a vending machine: you put coins in (exam, date, hours), it drops a static plan out, and then it goes quiet. Co-Work's whole insight is the opposite — you hand over a *goal* and a *team forms around it*, works in parallel on your actual material, reports back, and keeps working between your sessions. Crisis Mode should not be a better vending machine. It should be a war-room of agents that runs your last 96 hours of preparation *for* you — and the thing that makes it un-copyable is not the agents (anyone can wire up agents) but the Almond Jar: the place you dump your entire chaotic world so the team has something real to work on.**

The Deep Ideation already proved the strategy (Phase 5: "Crisis Mode is the agentic workspace running at maximum intensity on a 48-hour horizon… build the engine once; expose it as modes"). This document makes that concrete: the agent org chart, the Almond Jar mechanics, the deterministic-vs-agentic split, the review UX, and an honest verdict on the Co-Work comparison.

---

## 1. Why the current Crisis Mode is "not good enough" — named precisely

Reading `crisis_generator.py` and `crisis.py`, the present design is a competent *one-shot generator*. Its limitations are not bugs; they are the wrong **form factor**:

1. **It is single-agent and single-shot.** `generate_war_room_strategy` + `generate_crisis_plan` fire two LLM calls at activation, produce a frozen JSON blob, and store it. There is no team, no parallel specialization, no division of labour. It is the "student asks → AI answers → done" loop the Deep Ideation says is the failure of the whole category.
2. **It is stateless after activation.** Once the plan is generated it never re-thinks on its own. `recalibrate` exists but is *student-pulled* (the student must ask). Co-Work's defining property — *work happens between your sessions, you wake up to "here's your day"* — is entirely absent.
3. **It has no eyes on the student's actual material.** The plan is built from `syllabus_topics` + `student_topic_progress` (internal curriculum state). It cannot see the topper's PDF, last year's question paper, the lecturer's slides, or the graded answer script. It plans in the abstract. **This is the biggest miss:** the single most valuable input (Phase 4, category I — the graded script) is invisible to it.
4. **It is reactive, not proactive.** "If I Were You" (`/ask`) is a chat box the student must open. Nothing reaches *out* — no "you said 3 topics by midnight and it's 11pm," no "you've not opened pharmacology in 30 hours and it's 28% of marks."
5. **It conflates the deterministic and the generative.** Readiness and panic are deterministic (good — matches the never-do list). But the *plan itself* is one big LLM hallucination of a timetable, with a post-hoc "normalize to N days" patch. There's no machine doing the marks-math; the LLM is asked to *imagine* `estimated_marks_coverage: 78`. That number should be *computed*, then *narrated* by an agent.
6. **It produces a document, not a workspace.** The output is a plan to *read*. Co-Work produces *worked artifacts* — a built deck, a finished analysis. Crisis Mode should produce *built study objects*: a generated mock paper, a deck of recall cards from your own notes, a one-page "what to write" cheat sheet, an audio revision file — not just a schedule telling you to go make them yourself.

The reframe: **stop generating a plan. Form a team, give it the goal and the Almond Jar, and let it do the work the plan currently only describes.**

---

## 2. What Co-Work actually is (so the mapping is honest)

From Anthropic's own model, Co-Work / multi-agent orchestration is five properties:

- **Delegation of a goal, not steps.** You state intent; the orchestrator decomposes.
- **Specialist sub-agents with isolated context and their own tools.** Each runs its own thread, own conversation history, own scope — so they don't pollute each other and each is sharp at one job.
- **Parallel fan-out + synthesis.** Independent subtasks run simultaneously; the coordinator merges results. (Constraint: one level of delegation depth; up to ~20 named agents, multiple copies allowed.)
- **A shared workspace.** All agents share the same filesystem/sandbox/credentials — a common substrate they read and write.
- **Review-and-steer.** You don't watch every keystroke; you review outputs (like reviewing a diff) and redirect.

Mapping each to a panicking medical student:

| Co-Work property | Crisis Mode equivalent |
|---|---|
| Goal, not steps | *"Pharma prof Thursday. I've done 40%. Here's my stuff."* |
| Specialist sub-agents | Planner, PYQ/Examiner-Intel, Notes-Auditor, Recall-Forge, Explainer, Mentor/Wellbeing |
| Parallel fan-out + synthesis | All pods work the Almond Jar at once; the Chief Resident merges into *one* voice |
| **Shared workspace** | **The Almond Jar** — the student's dumped material is the shared substrate |
| Review-and-steer | "Here's your next 4 hours" → swipe to accept / "too much" / "I'm panicking" |

The fit is almost suspiciously good. The one place it *cannot* be a literal copy is the never-do list: **no LLM in deterministic paths** (scoring, scheduling, triage math, quotas). So the resolution the Deep Ideation already named applies exactly here: **sell the team, build the machine.** The student *experiences* a crew of specialists; underneath, the numeric spine (marks-math, sacrifice math, the schedule grid, readiness banding) is deterministic code, and only the open-ended jobs (explaining, mentoring, examiner-pattern inference, mock-question writing) are genuinely agentic.

---

## 3. The Almond Jar — the heart of the new feature

### 3.1 What it is, in one line
**The Almond Jar is the single place a student dumps their entire chaotic exam world — notes, PDFs, photos of the board, the topper's scans, last year's paper, lecture audio, the syllabus screenshot, a graded answer sheet — and watches the agent team digest it into fuel.** It is Phase 4's "intake valve of the moat" made into a literal, visible, tactile surface.

It is deliberately *not* "upload your documents to ask questions" (that's NotebookLM, the job students value least). It is **"throw your mess into the jar and the team turns it into a plan, a paper, a deck, and a verdict."** The student never has to ask a question. The jar is the difference between an agent team that plans *in the abstract* (today) and one that plans *against your reality* (the target).

### 3.2 Why "jar" is the right metaphor (and good for the UX)
- A jar is **dump-first, sort-later.** No folders, no taxonomy work demanded of a stressed student at 1am. Throw it in; the agents sort it. This directly answers the survey's "scattered across six apps" pain (Phase 4-B) and the "least-wanted feature is upload" problem — because here upload is *one gesture*, not a chore.
- A jar is **visibly filling and visibly being consumed.** Perfect for the taste-skill's perpetual-motion philosophy: items drop in, get "digested" (a living processing animation), and emerge tagged and worked. The jar *feels alive* — agents are eating from it.
- "Almond Jar" is **on-brand, warm, and ownable** — it is not "war room" (the Deep Ideation Phase 9 explicitly rejects manufacturing-anxiety framings; "Almond Jar" is calm, almost playful, which is the right counter-tone for a panicking student).

### 3.3 What goes in (the dump taxonomy, mapped to Phase 4)
Everything in the Phase-4 "Uploadable Resource Universe," but the jar's job is to make dumping *effortless* and the sorting *invisible*:

- **One gesture intake:** drag-drop, paste a link (Telegram/Drive/YouTube), snap a photo (bad SCANS, board photos — Phase 4-K), forward via a share-target, record a voice memo, or paste raw text.
- **Auto-classification on ingest** (deterministic + light model): canon (textbook) · own notes · lecture/slides · cram/PYQ · images/spotters · graded feedback · syllabus/life (datesheet). The student sees a tag appear; they can correct it with a tap, but never have to assign it.
- **The crown-jewel item, surfaced specially:** a **graded answer script**. When the jar detects one (a marked paper, examiner ticks/crosses), it lights up — because this is the one upload NotebookLM structurally cannot use and the highest-value fuel in the entire system (knowing-vs-scoring gap). The jar should *ask for this by name*: "Got a marked paper from last time? That's the most useful thing you can give me."

### 3.4 What the jar *does* with each item (the part that isn't NotebookLM)
The jar is not storage; it is a **conveyor into the agent team**. On ingest, each item triggers fan-out:

- A topper's PDF → Notes-Auditor reconciles it against the verified corpus, flags wrong-but-viral claims (Phase 4-H trust triage), Recall-Forge mints active-recall cards from it.
- Last year's paper → Examiner-Intel extracts the *realized* question pattern for *this* college, feeds the per-college examiner moat, biases the whole plan toward what actually gets asked.
- Lecture audio → transcribed, the lecturer's *emphasis* extracted (a predictor of what they'll set), reconciled against the textbook, compressed to a 5-minute recall set.
- A graded script → the knowing-vs-scoring gap is computed and becomes a *"what to write, what to omit"* coach (the survey's exact Q4 pain).
- The datesheet → drives the deterministic schedule grid and the multi-exam crunch optimizer.

### 3.5 Architecture constraints the jar must respect (from CLAUDE.md)
- **No per-student vector DB / no ChromaDB.** The jar ingests through the *existing* RAG pipeline into the **one multi-tenant pgvector plane**, every row carrying `student_id` + Postgres RLS. The "jar" is a *view and a workflow*, not a new datastore.
- **Consent & DPDP are features, not afterthoughts.** Patient-adjacent uploads (case sheets — Phase 4-F) demand de-identification and a consent ledger entry. The jar must show *visible memory* (what it kept, why) and one-tap erasure. For minors this is non-negotiable.
- **Agent writes only through validating tools (MCP).** The jar's classification and the agents' artifacts are written by tools that validate; no raw agent writes.
- **Trust triage is a feature, not a side effect.** The jar's "this note is confidently wrong" flag is the empathy-and-locality moat (Phase 4-K) and the answer to the survey's #1 anxiety ("whether it's giving true information").

### 3.6 The jar after the crisis ends (why it's a moat, not a feature)
Crisis is the *intensity*; the jar *persists* into the student graph. What the team learned from your dumped material — what you had, what you got wrong, what you kept abandoning — becomes the longitudinal model (Deep Ideation moat #1). **The jar is the sensor that turns one panicked exam into permanent knowledge of one student's mind.** This is the line between "a cool crisis feature" and "the thing the company is actually accumulating."

---

## 4. The agent org chart — orchestrator, sub-agents, deep agents

Three tiers, matching Co-Work's depth-1 constraint (orchestrator delegates to sub-agents; "deep agents" are sub-agents permitted longer autonomous runs that may themselves fan out a *bounded* internal crew for one heavy artifact).

### Tier 0 — The Orchestrator: **"The Chief Resident"**
The single voice the student talks to. Owns the goal, holds the Almond Jar context, decomposes the 96 hours, dispatches the pods, resolves conflicts ("Recall-Forge wants another hour of drilling; Mentor says sleep"), and synthesizes everything into **one calm instruction at a time**. The student must feel they have *one brilliant senior*, never a swarm. This is mostly orchestration logic + a thin generative layer for voice; the *decisions with numbers in them* are computed deterministically and handed to it.

### Tier 1 — The Sub-agent pods (parallel fan-out from the Almond Jar)

**Pod A — Triage & Plan (mostly deterministic, narrated by agents)**
- **Planner** — converts goal + datesheet + computed mastery into a concrete *now* and a living grid. The *grid* is deterministic (no LLM imagining timetables); the *rationale* is narrated.
- **Examiner-Intel** — reads PYQs/important-question dumps from the jar; infers per-college realized patterns; biases everything toward marks. Genuinely agentic (pattern inference over messy uploads).
- **Sacrifice Engine** — the "Anti-Syllabus": computes (deterministically) what to *drop* with marks-math, then has an agent deliver the *permission to sacrifice* (kills guilt-paralysis — Deep Ideation idea #16).

**Pod B — Make the material stick (agentic generation over the jar)**
- **Notes-Auditor** — reads the student's own dumped notes/PDFs as a *diagnostic*; corrects misconceptions in their own words; flags confidently-wrong material.
- **Recall-Forge** — manufactures active-recall: cards, image-occlusion from their atlas photos, one-liners, a predicted-question gauntlet — overnight, from *their* material and *their* mistakes.
- **Explainer** — the commoditized retrieve→rerank→generate→verify→cite tutor (the NotebookLM-equivalent, demoted to one worker). Teaches the topic the lecture failed to.

**Pod C — Keep the human going (the un-copyable pod)**
- **Mentor** — the senior-doctor presence; reassurance with a plan; "you're okay, here's the next 90 minutes."
- **Wellbeing/Safety** — always-on, watches for distress, can **override the whole team** to say "stop and sleep," routes genuine crises to humans, and *suppresses all upsell* in detected-distress sessions (never-do law).

### Tier 2 — Deep agents (long-running, produce one heavy artifact each)
These are the Co-Work "works while you sleep" surface — dispatched at activation, run in the background, deliver a *finished object* the student wakes up to:

- **Mock-Paper Architect** — from the jar's PYQs + examiner patterns + the student's weak topics, *writes a full predicted paper* with a marking scheme. (Internally fans out: question-writer + difficulty-calibrator + rubric-grader.) The single most "Co-Work-like" deliverable: you sleep, you wake to a tailored mock.
- **Cheat-Sheet Compiler** — a one-page, exam-morning, highest-yield + highest-anxiety pack built from everything in the jar.
- **Audio-Revision Producer** — turns your weak topics into a commute/overnight audio file in your own deck's words.
- **Knowing-vs-Scoring Coach** — if a graded script is in the jar, produces the "what to write, what to omit, how to structure the answer they actually mark" guide.

### The deterministic / agentic split (the discipline that keeps COGS and trust sane)
| Must stay deterministic (never-do law) | Genuinely agentic (earns the LLM) |
|---|---|
| Readiness banding, panic detection | Mentor dialogue, distress sensing |
| The schedule grid (hours × days) | Examiner-pattern inference over messy PYQs |
| Sacrifice marks-math, coverage % | Notes-Auditor misconception correction |
| Quotas, entitlements, paywalls | Mock-question writing & rubric drafting |
| Jar classification thresholds | The Chief Resident's synthesized voice |

**Sell the team. Build the machine.** The student sees specialists collaborating; the numbers are computed, the prose is generated, and the two are never confused.

---

## 5. The four properties that make it Co-Work and not a chatbot

Lifted from Deep Ideation Phase 5, made concrete for crisis:

1. **Continuity (works between sessions).** Overnight, the Mock-Paper Architect builds tomorrow's paper from today's errors; Recall-Forge rebuilds the morning deck; the Planner re-lays the day around your real sleep. You wake to *"here's your day and the mock I built you,"* not a blank box. *(This is the single biggest gap vs. today's frozen plan.)*
2. **Proactivity (it reaches out).** "It's 11pm, you said 3 topics — want the 20-minute version of the last one or should we call it?" "Micro is 28% of marks and untouched for 30h — 15 min now?" The initiative leaves the overwhelmed student and moves to the team.
3. **Autonomy with a leash.** The team *decides* what to drill, skip, push, rest — and *acts* (builds the deck, drafts the paper) — but correctness-critical and consequential actions are deterministic and/or student-approved. You review like a diff: accept / "too much" / "I'm panicking."
4. **Accountability to the goal.** The team is measured against *"are you on track to pass?"* (banded, never a false-precise score), not "did it answer." The outcome loop closes after the exam and makes the next cycle smarter.

---

## 6. The interaction & UX model (grounded in the taste-skill + dark/amber theme)

Per memory: **read `frontend/.claude/skills/almondai-frontend/SKILL.md` before any UI work; keep the dark/amber theme.** The taste-skill adds: ban AI-purple (amber is the single accent — perfect), neutral zinc/charcoal base, no pure black, Geist/Satoshi + mono for numbers, perpetual micro-motion, bento over 3-card rows, isolated client components for animation, `min-h-[100dvh]`.

The surface is **a calm command deck, not a war room.** Three zones:

- **The Almond Jar (the intake organ).** A persistent, tactile vessel — bottom-docked or a corner well — that you throw things into. Items drop with spring physics, show a "digesting" shimmer while agents consume them, then settle as tagged chips. A subtle fill-level conveys "the team has a lot to work with." Empty state: *"Throw your mess in. Notes, photos, last year's paper, anything. I'll sort it."* The crown-jewel prompt for a graded script lives here.
- **The Chief Resident (the one voice).** A single focused stream: *one instruction at a time*, with a breathing status dot showing the team is alive behind it. Not a chat log to scroll — a calm "do this next." Beneath it, an unobtrusive "what the team is doing" tray (the sub-agents' live activity), expandable for the curious, ignorable for the panicked.
- **The worked artifacts (what you wake up to).** A bento of finished objects — the mock paper, the morning deck, the cheat sheet, the audio file — each a card you can open, not a to-do telling you to make it yourself. Perpetual-motion "live" cards (Intelligent List re-sorting priorities; Command-input typewriter; breathing status) per the taste-skill's 5-card archetypes.

Motion intensity is deliberately *lower* in detected-distress states (the Wellbeing agent can dial the whole UI calmer — fewer animations, warmer copy, a single next step). The interface *de-escalates*.

Review gesture: every proactive instruction is a swipe — **accept · "too much, cut it" · "I'm panicking."** The last one is a first-class control, not buried.

---

## 7. Can it be "at least 100% like Co-Work, for medical students"? — honest verdict

**Yes — and crisis is arguably the *best possible* first home for the form factor, for three reasons, with three caveats.**

**Why yes:**
1. **The form factor fits better here than almost anywhere.** Co-Work needs a *legible, finite goal* to decompose well. "Pass pharma in 4 days" is more legible than most knowledge-work goals. The "codebase" the agents navigate (your mind + the curriculum + the exam + your dumped material) is bounded and knowable — which is exactly what makes agent autonomy *safe and useful* rather than flailing (Deep Ideation Phase 5).
2. **The Almond Jar gives the team real work to do** — the missing ingredient that separates "agents as theatre" from "agents that produce artifacts." Co-Work without a shared workspace is a parlour trick; with the jar, the team has your actual reality to chew on, and produces a mock paper / deck / cheat-sheet you couldn't get from any chatbot.
3. **It is the same engine the whole company needs.** Build the orchestrator + pods + jar once for crisis (max intensity), and the *trough* mode (consistency), the *clinical* mode (judgment), and the *lifelong* mode are the same machine at different intensities. Crisis isn't a feature you throw away after launch — it's the **forcing function that builds the company's spine.** That's the Co-Work-scale bet.

**The three honest caveats (where it must differ from a literal copy):**
1. **Most "agents" must be deterministic underneath.** The never-do list forbids LLMs in scoring/scheduling/triage. So this is Co-Work *as UX and metaphor*, with a deterministic engine — not 20 free-roaming LLM agents. That's a *feature* (trust, COGS, correctness), but it means the "agentic-ness" is partly performed. Be deliberate about it; don't agent-wash the math.
2. **Latency and COGS fight the panic.** A student at 1am wants the *next instruction* instantly, even while deep agents grind in the background. The architecture must be **fast foreground (deterministic + cached), slow background (deep agents)** — the foreground can never wait on the swarm. Co-Work users tolerate minutes; a panicking student tolerates seconds.
3. **The agents are not the moat — the jar's accumulation is.** Anyone can wire up an orchestrator and sub-agents in a quarter (it's on the Deep Ideation "not a moat" list). What compounds is the Almond Jar flowing into the student graph + outcome loop. **Build the agents as the spearhead; treat the jar→graph→outcome pipe as the actual company.** If the team's best year goes into a prettier agent swarm and the jar stays a thin uploader, this becomes a worse-funded Co-Work with a medical skin — the exact disqualifying mistake Phase 8 names.

**Verdict:** Not only *can* it be as big as Co-Work — **crisis + Almond Jar is the most natural, most defensible, highest-willingness-to-pay place in the entire product to *introduce* the Co-Work form factor.** It is the door. The bigness comes from refusing to let it be a one-off feature and instead making it the **engine and the sensor** the whole "Personal Medical Mentor" company is built on.

---

## 8. What I'd want decided before building (open questions for you)

1. **Scope of v1 agents:** ship the full org chart (3 pods + deep agents) or start with the spine (Chief Resident + Planner + Examiner-Intel + Mentor/Wellbeing + the Mock-Paper deep agent) and grow? My lean: the spine, because it proves continuity + the jar + one wow-artifact (the mock paper) without boiling the ocean.
2. **Almond Jar persistence:** crisis-scoped jar that graduates into the permanent student graph, or one lifelong jar from day one? (Affects DPDP/consent surface and the data model.)
3. **The graded-script crown jewel:** is OCR + knowing-vs-scoring in v1, or a fast-follow? It's the single most differentiating input but the heaviest to do well.
4. **Foreground/background contract:** confirm the "fast deterministic foreground, slow deep-agent background" rule as a hard architectural law before any agent is wired.
5. **Reuse vs. rebuild:** keep `readiness.py` / `panic.py` / the deterministic core and rebuild only the generation + orchestration + jar layers, or rework the whole module? My lean: keep the deterministic spine, replace the single-shot generators with the orchestrated team.

---

## 9. The closing one-liner

> **Don't ship a smarter plan. Ship a team that forms around a student's panic, eats the chaos they throw in the Almond Jar, and works through the night to hand them — at 7am, the morning of the exam — a tailored mock, a deck in their own words, and a single calm voice saying "here's your day, you're going to be okay." That is Co-Work. For a doctor. At the moment it matters most.**

---

*Sources for the Co-Work mechanics referenced in §2: [Multiagent sessions — Claude Platform Docs](https://platform.claude.com/docs/en/managed-agents/multi-agent), [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams), [Claude Cowork Multi-Agent Orchestration guide (Fastio)](https://fast.io/resources/claude-cowork-multi-agent-orchestration/). Strategic spine: `AlmondAI_Deep_Ideation.md`. Current implementation: `backend/app/services/crisis/`. UI law: the frontend taste-skill + the project's dark/amber theme.*
