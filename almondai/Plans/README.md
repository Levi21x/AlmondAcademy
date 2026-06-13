# AlmondAI Build Kit

Everything Claude Code needs to build the AlmondAI production system from the master plan.

## Contents

- `IMPLEMENTATION.md` — the master build document: locked decisions, repo layout, 9 phases with exit gates, API/real-time contracts, quality gates, never-do list.
- `CLAUDE.md` — Claude Code project memory: conventions, commands, skill index.
- `skills/` — 19 task skills (one per build task). Each contains contracts, build steps, acceptance criteria, and anti-patterns for its task.

## Install (one minute)

1. Create your project repo (e.g., `almondai/`) and copy `IMPLEMENTATION.md` + `CLAUDE.md` into its root.
2. Install the skills where Claude Code looks for them:

```bash
mkdir -p .claude/skills && cp -r path/to/almondai-build/skills/* .claude/skills/
```

3. Open the repo in Claude Code and start with:

> "Read IMPLEMENTATION.md and begin Phase 0. Use the almondai-foundations skill."

## How to drive the build

- Go phase by phase (0→8). Don't advance past a phase until its **exit gate** passes — gates are listed per phase in IMPLEMENTATION.md §5.
- For each task, tell Claude Code the task and it will load the matching skill (or name the skill explicitly).
- The never-do list (IMPLEMENTATION.md §10) prevents the architecture regressions the master plan paid for: re-check it at every review.

Pair this kit with the original `AlmondAI_Master_Plan.md` in the repo root for strategic context — skills cite its sections (§) throughout.
