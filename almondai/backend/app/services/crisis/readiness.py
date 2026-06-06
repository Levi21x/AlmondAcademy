from __future__ import annotations

from typing import Any, Dict, List

HOURS_PER_TOPIC_ESTIMATE = 1.5  # average hours to learn one new topic


def _coverage_pct(subject_progress: List[Dict[str, Any]]) -> float:
    total = sum(max(int(s.get("total_topics", 0)), 0) for s in subject_progress)
    completed = sum(
        max(int(s.get("completed", 0) or s.get("completed_topics", 0)), 0)
        for s in subject_progress
    )
    return round((completed / total) * 100, 1) if total else 0.0


def _time_adequacy(
    days_remaining: int,
    hours_per_day: float,
    total_topics: int,
    completed_topics: int,
) -> float:
    remaining = max(total_topics - completed_topics, 0)
    hours_needed = remaining * HOURS_PER_TOPIC_ESTIMATE
    hours_available = max(days_remaining, 0) * max(hours_per_day, 0)
    if hours_needed == 0:
        return 100.0
    return round(min((hours_available / hours_needed) * 100, 100.0), 1)


def compute_readiness_score(
    subject_progress: List[Dict[str, Any]],
    days_remaining: int,
    hours_per_day: float,
    weakness_readiness: int = 50,
    stress_level: int = 5,
) -> Dict[str, Any]:
    """
    Deterministic 0-100 readiness score.

    Weights:
      40%  syllabus coverage
      30%  time adequacy (hours available vs hours needed)
      20%  weakness-analysis readiness (from prior analysis; defaults 50)
      -10% stress penalty (stress 1→0 pts, stress 10→10 pts deducted)
    """
    total_topics = sum(max(int(s.get("total_topics", 0)), 0) for s in subject_progress)
    completed_topics = sum(
        max(int(s.get("completed", 0) or s.get("completed_topics", 0)), 0)
        for s in subject_progress
    )

    coverage = _coverage_pct(subject_progress)
    time_factor = _time_adequacy(days_remaining, hours_per_day, total_topics, completed_topics)
    wr = max(0, min(100, int(weakness_readiness or 50)))
    stress_penalty = max(0.0, (int(stress_level or 5) - 1) * (10.0 / 9.0))

    raw = 0.40 * coverage + 0.30 * time_factor + 0.20 * float(wr) - stress_penalty
    score = max(0, min(100, round(raw)))

    return {
        "readiness_score": score,
        "coverage_score": coverage,
        "time_factor": time_factor,
        "weakness_score": wr,
        "stress_penalty": round(stress_penalty, 1),
        "total_topics": total_topics,
        "completed_topics": completed_topics,
        "hours_available": round(max(days_remaining, 0) * max(hours_per_day, 0), 1),
        "hours_needed_estimate": round(
            max(total_topics - completed_topics, 0) * HOURS_PER_TOPIC_ESTIMATE, 1
        ),
    }
