"""
Almond Jar Processor

Handles intake of dropped resources:
- Text pastes / notes → store raw
- PDFs → extract text via pdfplumber
- Auto-categorise via heuristic keyword scan
- Mark as processed and update session state
"""
from __future__ import annotations

import asyncio
import io
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# ── Category detection heuristics ─────────────────────────────────────────────

_PYQ_PATTERNS = [
    r"\b(20\d{2}|19\d{2})\s*(exam|paper|question|q\.?\s*\d)",
    r"\bprevious\s+year\b",
    r"\bpyq\b",
    r"\bpast\s+paper\b",
    r"\bmodel\s+paper\b",
]

_DATESHEET_PATTERNS = [
    r"\bdate\s*sheet\b",
    r"\bexam\s+schedule\b",
    r"\btimetable\b",
    r"\bexamination\s+dates?\b",
]

_GRADED_PATTERNS = [
    r"\bmarks?\s+obtained\b",
    r"\btotal\s*:\s*\d+/\d+",
    r"\bgrade[d]?\b",
    r"\bfeedback.*answer\b",
    r"\bexaminer\s+comment\b",
]

_LECTURE_PATTERNS = [
    r"\blecture\s+\d+\b",
    r"\blecture\s+notes?\b",
    r"\bslide\s+\d+\b",
    r"\bppt\b",
    r"\bpowerpoint\b",
]


def _detect_category(text: str, filename: str | None = None) -> str:
    t = text.lower()
    fn = (filename or "").lower()

    if any(re.search(p, t, re.I) for p in _GRADED_PATTERNS):
        return "graded_feedback"
    if any(re.search(p, t, re.I) for p in _PYQ_PATTERNS):
        return "pyq_cram"
    if any(re.search(p, t, re.I) for p in _DATESHEET_PATTERNS):
        return "datesheet"
    if any(re.search(p, t, re.I) for p in _LECTURE_PATTERNS):
        return "lecture"
    if "pyq" in fn or "previous" in fn or "past" in fn:
        return "pyq_cram"
    if "lecture" in fn or "slide" in fn:
        return "lecture"
    if "date" in fn or "schedule" in fn:
        return "datesheet"
    if any(kw in t[:500] for kw in ("my notes", "i wrote", "from class", "textbook")):
        return "own_notes"
    return "own_notes"


def _is_graded_script(text: str) -> bool:
    return any(re.search(p, text, re.I) for p in _GRADED_PATTERNS)


def _build_trust_flags(text: str, category: str) -> list[str]:
    flags: list[str] = []
    if category == "pyq_cram":
        flags.append("high_relevance")
    if category == "graded_feedback":
        flags.append("personal_performance_data")
        flags.append("high_relevance")
    if len(text) < 100:
        flags.append("very_short")
    if len(text) > 10000:
        flags.append("long_document")
    return flags


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract full text from a PDF using pdfplumber."""
    import asyncio
    import pdfplumber

    def _extract_sync(data: bytes) -> str:
        texts: list[str] = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages[:40]:  # cap at 40 pages
                t = page.extract_text()
                if t:
                    texts.append(t.strip())
        return "\n\n".join(texts)

    return await asyncio.to_thread(_extract_sync, pdf_bytes)


async def download_from_storage(storage_path: str) -> bytes:
    """Download raw bytes from Supabase Storage (almond-jar bucket)."""
    from app.core.database import get_supabase_admin_client
    sb = get_supabase_admin_client()
    return await asyncio.to_thread(
        lambda: sb.storage.from_("almond-jar").download(storage_path)
    )


async def process_jar_item_background(item: dict) -> dict:
    """
    Called by the background worker for uploaded files (PDF/image).
    Downloads from Storage, extracts text, returns metadata dict
    ready to be written back to almond_jar_items.
    """
    storage_path: str = item.get("storage_path", "")
    original_name: str = item.get("original_name", "")
    item_type: str = item.get("item_type", "pdf")

    extracted_text = ""
    if item_type == "pdf" or storage_path.lower().endswith(".pdf"):
        try:
            file_bytes = await download_from_storage(storage_path)
            extracted_text = await extract_text_from_pdf(file_bytes)
        except Exception as exc:
            logger.warning("Text extraction failed for %s: %s", storage_path, exc)

    return process_jar_item_metadata(
        raw_text=extracted_text,
        item_type=item_type,
        original_name=original_name,
    )


def process_jar_item_metadata(
    raw_text: str,
    item_type: str,
    original_name: str | None = None,
) -> dict[str, Any]:
    """
    Returns the fields to write back to almond_jar_items after intake.
    Does NOT write to DB — caller handles persistence.
    """
    extracted = raw_text.strip() if raw_text else ""
    category = _detect_category(extracted, original_name)
    is_graded = _is_graded_script(extracted)
    trust_flags = _build_trust_flags(extracted, category)

    return {
        "extracted_text": extracted[:50000],  # hard cap 50k chars
        "item_category": category,
        "is_graded_script": is_graded,
        "trust_flags": trust_flags,
        "is_processed": True,
    }
