from __future__ import annotations

from typing import Any, Dict, List

_PANIC_PHRASES = [
    "haven't studied",
    "have not studied",
    "haven't started",
    "going to fail",
    "i'm going to fail",
    "im going to fail",
    "haven't studied anything",
    "zero preparation",
    "no preparation",
    "completely unprepared",
    "totally lost",
    "can't pass",
    "cannot pass",
    "no hope",
    "hopeless",
    "i am doomed",
    "never gonna pass",
    "i'll fail",
    "i will fail",
]


def detect_panic(
    stress_level: int,
    readiness_score: int,
    days_remaining: int,
    message: str = "",
) -> Dict[str, Any]:
    """
    Detects panic from input signals and returns softening instructions.

    Two or more signals → panic detected.
    Panic language or critical_timeline alone → panic detected immediately.
    """
    signals: List[str] = []

    if int(stress_level or 5) >= 8:
        signals.append("high_stress")

    if int(readiness_score or 50) < 25:
        signals.append("low_readiness")

    if int(days_remaining or 99) <= 1:
        signals.append("critical_timeline")

    msg_lower = (message or "").lower()
    if any(phrase in msg_lower for phrase in _PANIC_PHRASES):
        signals.append("panic_language")

    detected = (
        len(signals) >= 2
        or "panic_language" in signals
        or "critical_timeline" in signals
    )

    severity = "none"
    softening_factor = 1.0
    anchor_message = ""

    if detected:
        if len(signals) >= 3 or "critical_timeline" in signals:
            severity = "severe"
            softening_factor = 0.6
            anchor_message = (
                "You still have time to cover the highest-yield topics. "
                "Your plan focuses only on what will actually appear in the exam — "
                "if you follow it, passing is realistic."
            )
        else:
            severity = "moderate"
            softening_factor = 0.8
            anchor_message = (
                "Many students feel overwhelmed before exams. "
                "Your personalized plan focuses on what you CAN cover, not what you can't. "
                "Trust the process."
            )

    return {
        "detected": detected,
        "severity": severity,
        "signals": signals,
        "softening_factor": softening_factor,
        "anchor_message": anchor_message,
    }
