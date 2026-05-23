from __future__ import annotations

import logging
from enum import Enum

logger = logging.getLogger(__name__)


class ModelChoice(str, Enum):
    PREMIUM = "premium"   # openai/gpt-oss-120b:free  — deep reasoning
    DEFAULT = "default"   # qwen/qwen3-next-80b-a3b-instruct:free — standard
    FAST = "fast"         # nvidia/nemotron-nano-9b-v2:free — quick / voice


def route_model(
    question: str,
    mode: str = "auto",
    is_premium: bool = False,
    conversation_length: int = 0,
    student_category: str = "sprinter",
) -> ModelChoice:
    """
    Button-driven routing — model is determined by the UI button the student pressed,
    not by intelligence heuristics on question content.

    Quick button       → quick_mode=True  (handled before this in _get_llm_client_and_tokens)
    Deep Explain btn   → [deep explain] prefix in question → PREMIUM
    Claude Pro btn     → model="claude"                   → PREMIUM
    Search btn         → search_enabled=True + active btn → active model + Tavily (handled in route)
    Default (no btn)   → model="auto"                     → DEFAULT (Qwen, always)
    """
    normalized_mode = (mode or "auto").strip().lower()

    # Explicit UI button → honour directly.
    # Backward-compat aliases map old provider names to tiers.
    if normalized_mode in ("premium", "claude"):
        return ModelChoice.PREMIUM
    if normalized_mode in ("fast", "groq"):
        return ModelChoice.FAST
    if normalized_mode in ("default", "openai", "gemini"):
        return ModelChoice.DEFAULT

    # Deep Explain button prepends [deep explain] to the question text.
    if "[deep explain]" in (question or "").lower():
        return ModelChoice.PREMIUM

    # Default / auto → Nemotron (fast). No content-based escalation.
    return ModelChoice.FAST


def get_llm_client(model_choice: ModelChoice):
    """Return an OpenRouterLLMClient for the given tier."""
    from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS

    return OpenRouterLLMClient(OPENROUTER_MODELS[model_choice.value])


def get_llm_client_with_fallback(model_choice: ModelChoice, log=None):
    """
    Try to instantiate the requested tier.
    Fallback chain: PREMIUM → DEFAULT → FAST.
    Raises ValueError only if every tier fails (OPENROUTER_API_KEY missing).
    """
    _log = log or logger
    from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS

    fallback_chains = {
        ModelChoice.PREMIUM: [ModelChoice.PREMIUM, ModelChoice.DEFAULT, ModelChoice.FAST],
        ModelChoice.DEFAULT: [ModelChoice.DEFAULT, ModelChoice.FAST],
        ModelChoice.FAST: [ModelChoice.FAST],
    }

    for choice in fallback_chains.get(model_choice, [ModelChoice.FAST]):
        try:
            client = OpenRouterLLMClient(OPENROUTER_MODELS[choice.value])
            if choice != model_choice:
                _log.warning(
                    "OpenRouter fallback: %s → %s", model_choice.value, choice.value
                )
            return client
        except ValueError as exc:
            _log.warning("OpenRouter tier %s unavailable: %s", choice.value, exc)

    raise ValueError(
        "All OpenRouter tiers unavailable. Ensure OPENROUTER_API_KEY is set in backend/.env"
    )
