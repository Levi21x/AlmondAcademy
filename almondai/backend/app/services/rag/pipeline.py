from __future__ import annotations

import asyncio
import logging
import re
from uuid import uuid4
from typing import AsyncGenerator, Dict, List, Optional

from app.services.llm.category_prompts import build_system_prompt
from app.services.llm.model_router import (
    ModelChoice,
    get_llm_client_with_fallback,
    route_model,
)
from app.services.memory.memory_service import MemoryService
from app.services.rag.retriever import RAGRetriever

logger = logging.getLogger(__name__)

MARKDOWN_RESPONSE_INSTRUCTIONS = (
    "\n\nFormatting guidance:"
    "\n- Keep language natural and conversational"
    "\n- Use **bold** for key terms"
    "\n- Use bullet points only for genuine lists"
    "\n- Keep short paragraphs with blank lines between ideas"
    "\n- Use ## headings only for long comprehensive explanations"
    "\n- Avoid rigid template sections and repetitive checklist endings"
)

VOICE_RESPONSE_INSTRUCTIONS = (
    "\n\nIMPORTANT: This response will be read aloud by a text-to-speech engine. "
    "Use only plain conversational text. No markdown, no bullet points, no special characters. "
    "Write as if you are speaking directly to the student."
)

QUICK_MODE_RESPONSE_INSTRUCTIONS = (
    "\n\nQUICK MODE ACTIVE: Respond in exactly 3 sentences or fewer. "
    "No headers. No bullet points. No lists. No elaboration. "
    "Start directly with the answer. Complete every sentence fully. "
    "Stop after 3 sentences even if there is more to say."
)

MCQ_INVITATION_TEXT = (
    "\n\n---\n"
    "💡 Ready to test your knowledge? "
    "Type **yes** to practice MCQs on this topic."
)
MCQ_PROMPT_MARKER = "[MCQ_PROMPT_SENT]"

SOURCE_HEADER_PATTERN = re.compile(r"^\[\d+\]\s+Source:\s.*$", re.IGNORECASE | re.MULTILINE)
SOURCE_TAG_PATTERN = re.compile(r"\*?\[(?:general|from general knowledge|rag)\]\*?", re.IGNORECASE)
MODE_TAG_PATTERN = re.compile(r"\[(?:deep explain|search|visualise)\]", re.IGNORECASE)
LEGACY_RESPONSE_PATTERNS = (
    re.compile(r"i\s*remember\s+that\s+you(?:'ve)?\s+been\s+struggling", re.IGNORECASE),
    re.compile(r"don['']t\s+worry,?\s+it['']s\s+completely\s+normal", re.IGNORECASE),
    re.compile(r"let['']?s\s+take\s+it\s+one\s+step\s+at\s+a\s+time", re.IGNORECASE),
    re.compile(r"given\s+your\s+previous\s+requests", re.IGNORECASE),
)


_RAG_EMPTY_SENTINEL = "No relevant retrieved medical context found in indexed documents."


def _rag_decision(model_tier: ModelChoice, subject_filter: str | None) -> str:
    """
    Returns one of three strings — no keyword lists, no hardcoding:

    'skip'   FAST tier + no subject → bypass ChromaDB entirely (quick facts, LLM suffices)
    'always' PREMIUM tier or subject_filter set → retrieve and always inject context
    'check'  DEFAULT tier + no subject → retrieve, inject only if the vector search
             returned real content (not the empty-sentinel string)
    """
    if subject_filter:
        return "always"
    if model_tier == ModelChoice.PREMIUM:
        return "always"
    if model_tier == ModelChoice.FAST:
        return "skip"
    return "check"


def _build_direct_prompt(
    question: str,
    conversation_history: List[Dict],
    subject: str | None = None,
) -> str:
    """Lean prompt used when RAG context is skipped or empty — no misleading context block."""
    history = _format_recent_history(conversation_history)
    subject_line = subject or "Not specified"
    return (
        "RECENT CONVERSATION:\n"
        f"{history}\n\n"
        "SUBJECT:\n"
        f"{subject_line}\n\n"
        "STUDENT QUESTION:\n"
        f"{question}\n\n"
        "Answer from your own knowledge. Be warm, conversational, and direct."
    )


def _extract_rag_sources(context: str) -> List[str]:
    return re.findall(r"^\[?\s*Source:\s*(.+?)\s*\]?$", context, flags=re.MULTILINE)


def clean_chunk(text: str) -> str:
    text = re.sub(r"\*?\[general\]\*?", "", str(text or ""), flags=re.IGNORECASE)
    text = re.sub(r"\*?\[from general knowledge\]\*?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\*?\[rag\]\*?", "", text, flags=re.IGNORECASE)
    return text.strip()


def _sanitize_retrieved_context(context: str) -> str:
    cleaned = str(context or "")
    cleaned = SOURCE_HEADER_PATTERN.sub("", cleaned)

    chunks = re.split(r"\n\s*\n", cleaned)
    cleaned_chunks = [clean_chunk(chunk) for chunk in chunks]
    cleaned = "\n\n".join(chunk for chunk in cleaned_chunks if chunk)

    cleaned = SOURCE_TAG_PATTERN.sub("", cleaned)
    for pattern in LEGACY_RESPONSE_PATTERNS:
        cleaned = pattern.sub("", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or "No relevant retrieved medical context found in indexed documents."


def _strip_mode_tags(text: str) -> str:
    return MODE_TAG_PATTERN.sub("", str(text or "")).strip()


def _format_recent_history(conversation_history: List[Dict]) -> str:
    if not conversation_history:
        return "No prior conversation."

    tail = conversation_history[-3:]
    rows: List[str] = []
    for turn in tail:
        role = turn.get("role", "student")
        content = turn.get("content") or turn.get("question") or turn.get("answer") or ""
        rows.append(f"{str(role).title()}: {_strip_mode_tags(str(content))}")
    return "\n".join(rows)


def _build_user_prompt(
    question: str,
    context: str,
    conversation_history: List[Dict],
    subject: str | None = None,
) -> str:
    history = _format_recent_history(conversation_history)
    subject_line = subject or "Not specified"

    return (
        "MEDICAL KNOWLEDGE CONTEXT:\n"
        f"{context}\n\n"
        "RECENT CONVERSATION:\n"
        f"{history}\n\n"
        "SUBJECT:\n"
        f"{subject_line}\n\n"
        "STUDENT QUESTION:\n"
        f"{question}\n\n"
        "CRITICAL INSTRUCTIONS FOR USING THE CONTEXT:\n\n"
        "1. The MEDICAL KNOWLEDGE CONTEXT above contains text extracted directly from the "
        "student's textbooks - BD Chaurasia, standard physiology and biochemistry texts. "
        "This is your PRIMARY source. Use it as the foundation of your answer.\n\n"
        "2. When the context contains relevant information about the question - quote specific "
        "details, facts, and explanations from it. Do not paraphrase into generic statements "
        "when the context has specific content.\n\n"
        "3. Naturally mention the source when using textbook content. For example:\n"
        "'As BD Chaurasia describes...' or\n"
        "'According to your anatomy textbook...' or\n"
        "'Your biochemistry text explains this as...'\n"
        "Do this naturally - not on every sentence, but when introducing a key fact from the text.\n\n"
        "4. If the context contains content from an exam-oriented source - flag that information "
        "as exam-relevant naturally:\n"
        "'This is covered in your exam-oriented notes as a high yield topic...'\n\n"
        "5. Only use your general medical knowledge to:\n"
        "- Fill gaps where context has no information\n"
        "- Add clinical correlations not in the text\n"
        "- Connect concepts across topics\n"
        "Always prioritise the retrieved textbook content over general knowledge.\n\n"
        "6. If the retrieved context is genuinely empty or irrelevant to the question - then answer "
        "from general knowledge and do not pretend to have textbook context."
    )


def _has_mcq_invite(history: List[Dict]) -> bool:
    for turn in history:
        content = str(turn.get("content") or "")
        if "Ready to test your knowledge" in content or MCQ_PROMPT_MARKER in content:
            return True
    return False


def _should_offer_mcq(
    conversation_history: List[Dict],
    subject_filter: str | None,
    current_question: str,
) -> bool:
    if _has_mcq_invite(conversation_history):
        return False

    user_messages = [
        str(turn.get("content") or "")
        for turn in conversation_history
        if str(turn.get("role") or "") == "user"
    ]
    user_messages.append(current_question)

    if subject_filter:
        subject_lower = subject_filter.lower()
        related_count = sum(
            1
            for msg in user_messages
            if subject_lower in msg.lower() or len(msg.strip()) > 0
        )
        return related_count >= 3

    return len([msg for msg in user_messages if msg.strip()]) >= 3


def _get_llm_client_and_tokens(
    quick_mode: bool,
    question: str,
    model: str,
    is_premium: bool,
    conversation_history: List[Dict],
    student_category: str,
    instance_client: object | None,
):
    """
    Single source of truth for model selection.
    Returns (llm_client, max_tokens, model_label).
    """
    # Deep Explain always overrides quick mode
    if "[deep explain]" in question.lower():
        quick_mode = False

    if quick_mode:
        from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS
        return OpenRouterLLMClient(OPENROUTER_MODELS["fast"]), 300, "FAST/quick", False

    model_choice: ModelChoice = route_model(
        question=question,
        mode=model if model else "auto",
        is_premium=is_premium,
        conversation_length=len(conversation_history),
        student_category=student_category,
    )
    llm_client = instance_client or get_llm_client_with_fallback(model_choice, logger)
    return llm_client, 1500, model_choice, False


class AlmondRAGPipeline:
    def __init__(
        self,
        retriever: Optional[RAGRetriever] = None,
        llm_client: Optional[object] = None,
        memory_service: Optional[MemoryService] = None,
    ) -> None:
        self.retriever = retriever or RAGRetriever()
        self.llm_client = llm_client
        self.memory_service = memory_service or MemoryService()

    async def process_question(
        self,
        user_id: str,
        question: str,
        student_category: str,
        teaching_style: str,
        conversation_history: List[Dict],
        subject_filter: str | None = None,
        stream: bool = True,
        voice_optimized: bool = False,
        model: str = "auto",
        is_premium: bool = False,
        memory_context: str = "",
        web_search_context: str = "",
        quick_mode: bool = False,
    ) -> AsyncGenerator[str, None]:
        effective_quick = quick_mode and "[deep explain]" not in question.lower()

        # Resolve model tier first (pure logic, no API call) so RAG gate can use it.
        pre_tier = ModelChoice.FAST if effective_quick else route_model(
            question=question,
            mode=model if model else "auto",
            is_premium=is_premium,
            conversation_length=len(conversation_history),
            student_category=student_category,
        )

        # --- RAG gate (Option 3) ---
        rag_used = False
        rag_context: str = ""

        rag_mode = _rag_decision(pre_tier, subject_filter)

        if rag_mode == "skip":
            print(f"[rag_debug] Skipped — tier={pre_tier.value}, no subject filter")
        else:
            folder_preference = "exam_oriented" if any(
                token in question.lower() for token in ("exam", "high yield", "important", "mcq")
            ) else None
            raw_context = self.retriever.retrieve_with_context(
                query=question,
                conversation_history=conversation_history,
                subject_filter=subject_filter,
                folder_type_preference=folder_preference,
                n_results=5,
            )
            sources = _extract_rag_sources(raw_context)
            print(f"[rag_debug] Retrieved {len(sources)} chunks for query: {question[:50]}...")
            print(f"[rag_debug] Sources: {sources}")
            sanitized = _sanitize_retrieved_context(raw_context)

            if rag_mode == "always" or sanitized != _RAG_EMPTY_SENTINEL:
                rag_used = True
                rag_context = sanitized
            else:
                print(f"[rag_debug] Vector search returned no relevant content — skipping injection")

        question_for_prompt = _strip_mode_tags(question)

        resolved_memory_context = memory_context or ""
        if not resolved_memory_context.strip():
            try:
                resolved_memory_context = self.memory_service.get_memory_context(
                    user_id=user_id,
                    current_question=question,
                    subject=subject_filter,
                )
            except Exception:
                resolved_memory_context = ""

        llm_client, max_tokens, model_label, _ = _get_llm_client_and_tokens(
            quick_mode=quick_mode,
            question=question,
            model=model,
            is_premium=is_premium,
            conversation_history=conversation_history,
            student_category=student_category,
            instance_client=self.llm_client,
        )

        print(
            f"[pipeline_debug] "
            f"provider=openrouter | "
            f"quick_mode={effective_quick} | "
            f"rag={rag_used} | "
            f"max_tokens={max_tokens} | "
            f"model={model_label}"
        )

        full_system_prompt = build_system_prompt(
            student_category=student_category,
            question=question,
            memory_context=resolved_memory_context,
            subject=subject_filter or "",
            quick_mode=effective_quick,
        )

        if rag_used:
            user_prompt = _build_user_prompt(
                question=question_for_prompt,
                context=rag_context,
                conversation_history=conversation_history,
                subject=subject_filter,
            )
        else:
            user_prompt = _build_direct_prompt(
                question=question_for_prompt,
                conversation_history=conversation_history,
                subject=subject_filter,
            )

        if web_search_context:
            web_prefix = (
                "WEB SEARCH RESULTS (use these to enhance your answer with current information):\n"
                f"{web_search_context}\n\n"
                "Note: Cite web sources when using this information.\n\n"
            )
            user_prompt = f"{web_prefix}{user_prompt}"

        # Choose response instruction suffix
        if voice_optimized:
            prompt_suffix = VOICE_RESPONSE_INSTRUCTIONS
        elif effective_quick:
            prompt_suffix = QUICK_MODE_RESPONSE_INSTRUCTIONS
        else:
            prompt_suffix = MARKDOWN_RESPONSE_INSTRUCTIONS

        user_prompt = f"{user_prompt}{prompt_suffix}"

        # Do not offer MCQ in quick mode
        should_offer_mcq = (not effective_quick) and _should_offer_mcq(
            conversation_history=conversation_history,
            subject_filter=subject_filter,
            current_question=question,
        )

        full_response = ""
        try:
            async for chunk in llm_client.generate(
                prompt=user_prompt,
                system_prompt=full_system_prompt,
                stream=stream,
                max_tokens=max_tokens,
            ):
                full_response += str(chunk)
                yield chunk
        except TypeError:
            async for chunk in llm_client.generate(
                prompt=user_prompt,
                system_prompt=full_system_prompt,
                stream=stream,
            ):
                full_response += str(chunk)
                yield chunk
        except ValueError as exc:
            logger.warning(
                "Primary LLM rate-limited at runtime (%s). Retrying with OpenRouter FAST.", exc
            )
            from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS
            fallback_client = OpenRouterLLMClient(OPENROUTER_MODELS["fast"])
            try:
                async for chunk in fallback_client.generate(
                    prompt=user_prompt,
                    system_prompt=full_system_prompt,
                    stream=stream,
                    max_tokens=max_tokens,
                ):
                    full_response += str(chunk)
                    yield chunk
            except ValueError:
                logger.warning("FAST fallback also rate-limited — yielding user message.")
                msg = "AlmondAI is experiencing high demand right now. Please try again in a moment."
                full_response += msg
                yield msg

        if should_offer_mcq:
            invite = f"{MCQ_INVITATION_TEXT}\n{MCQ_PROMPT_MARKER}"
            full_response += invite
            yield invite

        try:
            asyncio.create_task(
                self.memory_service.store_interaction(
                    user_id=user_id,
                    interaction_id=str(uuid4()),
                    question=question,
                    answer=full_response,
                    subject=subject_filter,
                )
            )
        except Exception:
            pass

    async def process_question_sync(
        self,
        user_id: str,
        question: str,
        student_category: str,
        teaching_style: str,
        conversation_history: List[Dict],
        subject_filter: str | None = None,
        voice_optimized: bool = False,
        model: str = "auto",
        is_premium: bool = False,
        memory_context: str = "",
        web_search_context: str = "",
        quick_mode: bool = False,
    ) -> str:
        effective_quick = quick_mode and "[deep explain]" not in question.lower()

        pre_tier = ModelChoice.FAST if effective_quick else route_model(
            question=question,
            mode=model if model else "auto",
            is_premium=is_premium,
            conversation_length=len(conversation_history),
            student_category=student_category,
        )

        rag_used = False
        rag_context: str = ""

        rag_mode = _rag_decision(pre_tier, subject_filter)

        if rag_mode == "skip":
            print(f"[rag_debug] Skipped — tier={pre_tier.value}, no subject filter")
        else:
            folder_preference = "exam_oriented" if any(
                token in question.lower() for token in ("exam", "high yield", "important", "mcq")
            ) else None
            raw_context = self.retriever.retrieve_with_context(
                query=question,
                conversation_history=conversation_history,
                subject_filter=subject_filter,
                folder_type_preference=folder_preference,
                n_results=5,
            )
            sources = _extract_rag_sources(raw_context)
            print(f"[rag_debug] Retrieved {len(sources)} chunks for query: {question[:50]}...")
            print(f"[rag_debug] Sources: {sources}")
            sanitized = _sanitize_retrieved_context(raw_context)

            if rag_mode == "always" or sanitized != _RAG_EMPTY_SENTINEL:
                rag_used = True
                rag_context = sanitized
            else:
                print(f"[rag_debug] Vector search returned no relevant content — skipping injection")

        question_for_prompt = _strip_mode_tags(question)

        resolved_memory_context = memory_context or ""
        if not resolved_memory_context.strip():
            try:
                resolved_memory_context = self.memory_service.get_memory_context(
                    user_id=user_id,
                    current_question=question,
                    subject=subject_filter,
                )
            except Exception:
                resolved_memory_context = ""

        llm_client, max_tokens, model_label, _ = _get_llm_client_and_tokens(
            quick_mode=quick_mode,
            question=question,
            model=model,
            is_premium=is_premium,
            conversation_history=conversation_history,
            student_category=student_category,
            instance_client=self.llm_client,
        )

        print(
            f"[pipeline_debug] "
            f"provider=openrouter | "
            f"quick_mode={effective_quick} | "
            f"rag={rag_used} | "
            f"max_tokens={max_tokens} | "
            f"model={model_label}"
        )

        full_system_prompt = build_system_prompt(
            student_category=student_category,
            question=question,
            memory_context=resolved_memory_context,
            subject=subject_filter or "",
            quick_mode=effective_quick,
        )

        if rag_used:
            user_prompt = _build_user_prompt(
                question=question_for_prompt,
                context=rag_context,
                conversation_history=conversation_history,
                subject=subject_filter,
            )
        else:
            user_prompt = _build_direct_prompt(
                question=question_for_prompt,
                conversation_history=conversation_history,
                subject=subject_filter,
            )

        if web_search_context:
            web_prefix = (
                "WEB SEARCH RESULTS (use these to enhance your answer with current information):\n"
                f"{web_search_context}\n\n"
                "Note: Cite web sources when using this information.\n\n"
            )
            user_prompt = f"{web_prefix}{user_prompt}"

        if voice_optimized:
            prompt_suffix = VOICE_RESPONSE_INSTRUCTIONS
        elif effective_quick:
            prompt_suffix = QUICK_MODE_RESPONSE_INSTRUCTIONS
        else:
            prompt_suffix = MARKDOWN_RESPONSE_INSTRUCTIONS

        user_prompt = f"{user_prompt}{prompt_suffix}"

        should_offer_mcq = (not effective_quick) and _should_offer_mcq(
            conversation_history=conversation_history,
            subject_filter=subject_filter,
            current_question=question,
        )

        try:
            response = await llm_client.generate_sync(
                prompt=user_prompt,
                system_prompt=full_system_prompt,
                max_tokens=max_tokens,
            )
        except TypeError:
            response = await llm_client.generate_sync(
                prompt=user_prompt,
                system_prompt=full_system_prompt,
            )
        except ValueError as exc:
            logger.warning(
                "Primary LLM rate-limited at runtime (%s). Retrying sync with OpenRouter FAST.", exc
            )
            from app.services.llm.openrouter_client import OpenRouterLLMClient, OPENROUTER_MODELS
            fallback_client = OpenRouterLLMClient(OPENROUTER_MODELS["fast"])
            try:
                response = await fallback_client.generate_sync(
                    prompt=user_prompt,
                    system_prompt=full_system_prompt,
                    max_tokens=max_tokens,
                )
            except ValueError:
                logger.warning("FAST fallback also rate-limited — returning user message.")
                response = "AlmondAI is experiencing high demand right now. Please try again in a moment."

        if should_offer_mcq:
            response = f"{response}{MCQ_INVITATION_TEXT}\n{MCQ_PROMPT_MARKER}"

        try:
            asyncio.create_task(
                self.memory_service.store_interaction(
                    user_id=user_id,
                    interaction_id=str(uuid4()),
                    question=question,
                    answer=response,
                    subject=subject_filter,
                )
            )
        except Exception:
            pass

        return response