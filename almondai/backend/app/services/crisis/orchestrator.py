"""
War Room Orchestrator

Dispatches all Pod agents concurrently via asyncio.gather(),
then assembles the results into a unified WarRoomState dict.
One delegation level: orchestrator → pods → agents (no sub-sub-agents).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date
from typing import Any

from .agents import (
    ExaminerIntelAgent,
    MentorAgent,
    NotesAuditorAgent,
    PlannerAgent,
    RecallForgeAgent,
    SacrificeAgent,
    WellbeingAgent,
    AgentResult,
)

logger = logging.getLogger(__name__)


def _build_crisis_plan(
    planner: AgentResult,
    sacrifice: AgentResult,
    examiner: AgentResult,
) -> dict[str, Any]:
    p = planner.output
    s = sacrifice.output
    e = examiner.output

    sacrificed_names = {item.get("topic") for item in s.get("sacrifice_list", [])}

    must_know = list(dict.fromkeys(
        [t.get("topic", "") for t in s.get("retain_list", [])[:8]]
        + e.get("high_freq_topics", [])[:5]
    ))
    what_to_skip = [t.get("topic", "") for t in s.get("sacrifice_list", [])[:10]]

    return {
        "crisis_summary": p.get("crisis_summary", ""),
        "survival_strategy": p.get("survival_strategy", ""),
        "what_to_skip": what_to_skip,
        "must_know": must_know,
        "days": p.get("days", []),
        "emergency_tips": p.get("emergency_tips", []),
    }


def _build_strategy(
    sacrifice: AgentResult,
    examiner: AgentResult,
    notes_auditor: AgentResult,
    recall_forge: AgentResult,
    mentor: AgentResult,
    wellbeing: AgentResult,
    readiness_result: dict,
    panic_result: dict,
) -> dict[str, Any]:
    return {
        "sacrifice": sacrifice.output if sacrifice.success else {},
        "examiner_intel": examiner.output if examiner.success else {},
        "notes_audit": notes_auditor.output if notes_auditor.success else {},
        "recall_deck": recall_forge.output.get("cards", []) if recall_forge.success else [],
        "mentor": mentor.output if mentor.success else {},
        "wellbeing": wellbeing.output if wellbeing.success else {},
        "readiness": readiness_result,
        "panic": panic_result,
        "agent_timings": {},  # populated below
    }


async def activate_war_room(
    exam_name: str,
    exam_date: date,
    days_remaining: int,
    hours_per_day: float,
    subjects: list[str],
    preparation_level: str,
    student_category: str,
    topic_data: list[dict],
    subject_progress: list[dict],
    readiness_result: dict,
    panic_result: dict,
    jar_items: list[dict],
    stress_level: int,
    user_id: str,
    session_id: str,
) -> dict[str, Any]:
    """
    Runs all agents concurrently.
    Returns a dict with `crisis_plan`, `strategy`, `agent_results`.
    Guaranteed to succeed (all agents have graceful fallbacks).
    """
    state: dict[str, Any] = {
        "exam_name": exam_name,
        "exam_date": exam_date,
        "days_remaining": days_remaining,
        "hours_per_day": hours_per_day,
        "subjects": subjects,
        "preparation_level": preparation_level,
        "student_category": student_category,
        "topic_data": topic_data,
        "subject_progress": subject_progress,
        "readiness_result": readiness_result,
        "panic_result": panic_result,
        "jar_items": jar_items,
        "stress_level": stress_level,
        "user_id": user_id,
        "session_id": session_id,
        "schedule_topic_names": [],  # populated after planner runs
    }

    # ── Pod A: Strategy (plan + sacrifice + intel) ────────────────────────────
    planner_agent = PlannerAgent()
    sacrifice_agent = SacrificeAgent()
    examiner_agent = ExaminerIntelAgent()

    pod_a_results: list[AgentResult] = list(await asyncio.gather(
        planner_agent.run(state),
        sacrifice_agent.run(state),
        examiner_agent.run(state),
    ))

    planner_r, sacrifice_r, examiner_r = pod_a_results

    # Feed schedule topics into state for Pod B
    state["schedule_topic_names"] = planner_r.output.get("studied_topic_names", [])

    # ── Pod B: Notes + Recall (needs schedule topics from Pod A) ─────────────
    notes_agent = NotesAuditorAgent()
    recall_agent = RecallForgeAgent()

    pod_b_results: list[AgentResult] = list(await asyncio.gather(
        notes_agent.run(state),
        recall_agent.run(state),
    ))
    notes_r, recall_r = pod_b_results

    # ── Pod C: Wellbeing + Mentor (can run parallel to Pod B) ────────────────
    wellbeing_agent = WellbeingAgent()
    mentor_agent = MentorAgent()

    pod_c_results: list[AgentResult] = list(await asyncio.gather(
        wellbeing_agent.run(state),
        mentor_agent.run(state),
    ))
    wellbeing_r, mentor_r = pod_c_results

    all_results = pod_a_results + pod_b_results + pod_c_results
    timings = {r.agent: r.duration_ms for r in all_results}

    failed = [r.agent for r in all_results if not r.success]
    if failed:
        logger.warning("War Room agents with fallbacks: %s", failed)

    crisis_plan = _build_crisis_plan(planner_r, sacrifice_r, examiner_r)

    strategy = _build_strategy(
        sacrifice=sacrifice_r,
        examiner=examiner_r,
        notes_auditor=notes_r,
        recall_forge=recall_r,
        mentor=mentor_r,
        wellbeing=wellbeing_r,
        readiness_result=readiness_result,
        panic_result=panic_result,
    )
    strategy["agent_timings"] = timings

    return {
        "crisis_plan": crisis_plan,
        "strategy": strategy,
        "agent_results": [
            {"agent": r.agent, "success": r.success, "duration_ms": r.duration_ms}
            for r in all_results
        ],
    }
