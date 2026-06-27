"""
Background Worker — Postgres-backed deep-agent job queue

Started at app startup via FastAPI lifespan.
Polls almond_jar_jobs every 30s for pending jobs,
runs the appropriate deep agent, writes the artifact, and
pushes an SSE nudge event.

On process restart, picks up any orphaned `running` jobs
(sets them back to `pending` with incremented attempts).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_RUNNING = False
_POLL_INTERVAL_S = 30
_MAX_ATTEMPTS = 3


def _get_supabase():
    from app.core.database import get_supabase_admin_client
    return get_supabase_admin_client()


async def _fetch_unprocessed_jar_item() -> dict[str, Any] | None:
    """Grab one uploaded file that still needs text extraction."""
    sb = _get_supabase()
    try:
        result = await asyncio.to_thread(
            lambda: sb.table("almond_jar_items")
            .select("id,item_type,original_name,storage_path,session_id,user_id")
            .eq("is_processed", False)
            .not_.is_("storage_path", "null")
            .order("created_at")
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    except Exception as exc:
        logger.warning("Could not fetch unprocessed jar item: %s", exc)
        return None


async def _process_jar_item(item: dict[str, Any]) -> None:
    """Extract text from a stored file and update the DB row."""
    from .jar_processor import process_jar_item_background
    item_id = item["id"]
    logger.info("Extracting text for jar item %s (%s)", item_id, item.get("original_name"))
    try:
        metadata = await process_jar_item_background(item)
        sb = _get_supabase()
        await asyncio.to_thread(
            lambda: sb.table("almond_jar_items")
            .update({
                "extracted_text": metadata.get("extracted_text", ""),
                "raw_text": metadata.get("extracted_text", ""),
                "item_category": metadata.get("item_category", "unknown"),
                "is_graded_script": metadata.get("is_graded_script", False),
                "trust_flags": metadata.get("trust_flags", []),
                "is_processed": True,
            })
            .eq("id", item_id)
            .execute()
        )
        logger.info("Jar item %s extraction complete", item_id)
    except Exception as exc:
        logger.warning("Jar item %s extraction failed: %s", item_id, exc)
        sb = _get_supabase()
        try:
            await asyncio.to_thread(
                lambda: sb.table("almond_jar_items")
                .update({"is_processed": True, "item_category": "unknown"})
                .eq("id", item_id)
                .execute()
            )
        except Exception:
            pass


async def _rescue_orphaned_jobs() -> None:
    """On startup, reset any jobs stuck in 'running' state."""
    sb = _get_supabase()
    try:
        await asyncio.to_thread(
            lambda: sb.table("almond_jar_jobs")
            .update({"status": "pending", "started_at": None})
            .eq("status", "running")
            .lt("attempts", _MAX_ATTEMPTS)
            .execute()
        )
    except Exception as exc:
        logger.warning("Could not rescue orphaned jobs: %s", exc)


async def _fetch_pending_job() -> dict[str, Any] | None:
    sb = _get_supabase()
    try:
        result = await asyncio.to_thread(
            lambda: sb.table("almond_jar_jobs")
            .select("*")
            .eq("status", "pending")
            .lte("scheduled_for", datetime.now(timezone.utc).isoformat())
            .lt("attempts", _MAX_ATTEMPTS)
            .order("scheduled_for")
            .limit(1)
            .execute()
        )
        rows = result.data or []
        return rows[0] if rows else None
    except Exception as exc:
        logger.warning("Could not fetch pending job: %s", exc)
        return None


async def _mark_running(job_id: str, current_attempts: int) -> bool:
    sb = _get_supabase()
    try:
        await asyncio.to_thread(
            lambda: sb.table("almond_jar_jobs")
            .update({
                "status": "running",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "attempts": current_attempts + 1,
            })
            .eq("id", job_id)
            .eq("status", "pending")
            .execute()
        )
        return True
    except Exception as exc:
        logger.warning("Could not mark job %s as running: %s", job_id, exc)
        return False


async def _update_job_status(job_id: str, status: str, result: dict | None = None, error: str | None = None) -> None:
    sb = _get_supabase()
    update: dict[str, Any] = {
        "status": status,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    if result is not None:
        update["result"] = result
    if error is not None:
        update["error_message"] = error
    try:
        await asyncio.to_thread(
            lambda: sb.table("almond_jar_jobs").update(update).eq("id", job_id).execute()
        )
    except Exception as exc:
        logger.warning("Could not update job %s: %s", job_id, exc)


async def _write_artifact(job: dict[str, Any], artifact_content: dict[str, Any]) -> None:
    sb = _get_supabase()
    job_type = job["job_type"]
    title_map = {
        "mock_paper": "Mock Paper",
        "cheat_sheet": "Cheat Sheet",
        "recall_deck": "Full Recall Deck",
        "knowing_vs_scoring": "Knowing vs Scoring Analysis",
        "examiner_pattern": "Examiner Pattern Report",
    }
    subtitle_map = {
        "mock_paper": "Full exam with MCQs and short answers",
        "cheat_sheet": "One-page bento visual summary",
        "recall_deck": "Q&A flash cards for active recall",
        "knowing_vs_scoring": "Gap analysis between your knowledge and exam marks",
        "examiner_pattern": "PYQ pattern breakdown",
    }
    try:
        await asyncio.to_thread(
            lambda: sb.table("almond_jar_artifacts").insert({
                "session_id": job["session_id"],
                "user_id": job["user_id"],
                "job_id": job["id"],
                "artifact_type": job_type,
                "title": title_map.get(job_type, job_type),
                "subtitle": subtitle_map.get(job_type, ""),
                "content": artifact_content,
                "is_read": False,
            }).execute()
        )
    except Exception as exc:
        logger.warning("Could not write artifact for job %s: %s", job["id"], exc)


async def _run_job(job: dict[str, Any]) -> None:
    job_type = job["job_type"]
    payload = dict(job.get("payload", {}))  # copy so we can mutate
    await _mark_running(job["id"], job.get("attempts", 0))

    # Enrich payload with session strategy data
    try:
        sb = _get_supabase()
        session_result = await asyncio.to_thread(
            lambda: sb.table("crisis_sessions")
            .select("strategy, crisis_plan")
            .eq("id", job["session_id"])
            .single()
            .execute()
        )
        session = session_result.data or {}
        strategy = session.get("strategy") or {}
        crisis_plan = session.get("crisis_plan") or {}

        payload.setdefault("must_know", crisis_plan.get("must_know", []))
        payload.setdefault("high_freq_topics", strategy.get("examiner_intel", {}).get("high_freq_topics", []))
        payload.setdefault("notes_audit", strategy.get("notes_audit", {}))
        payload.setdefault("readiness_score", strategy.get("readiness", {}).get("readiness_score", 50))
        payload.setdefault("sacrifice_list", strategy.get("sacrifice", {}).get("sacrifice_list", []))
    except Exception as exc:
        logger.warning("Could not enrich payload for job %s: %s", job["id"], exc)

    try:
        if job_type == "mock_paper":
            from .deep_agents.mock_paper import generate_mock_paper
            result = await generate_mock_paper(payload)
        elif job_type == "cheat_sheet":
            from .deep_agents.cheat_sheet import generate_cheat_sheet
            result = await generate_cheat_sheet(payload)
        elif job_type == "knowing_vs_scoring":
            from .deep_agents.knowing_vs_scoring import generate_knowing_vs_scoring
            result = await generate_knowing_vs_scoring(payload)
        else:
            result = {"error": f"Unknown job type: {job_type}"}

        has_error = "error" in result
        await _write_artifact(job, result)
        await _update_job_status(job["id"], "failed" if has_error else "completed", result=result)

    except Exception as exc:
        logger.exception("Job %s (%s) failed: %s", job["id"], job_type, exc)
        await _update_job_status(job["id"], "failed", error=str(exc))


async def _worker_loop() -> None:
    global _RUNNING
    logger.info("Background worker started — polling every %ds", _POLL_INTERVAL_S)
    await _rescue_orphaned_jobs()

    while _RUNNING:
        try:
            # Jar item extraction takes priority — drain all pending extractions first
            jar_item = await _fetch_unprocessed_jar_item()
            if jar_item:
                await _process_jar_item(jar_item)
                continue  # immediately check for more before sleeping

            job = await _fetch_pending_job()
            if job:
                logger.info("Processing job %s type=%s", job["id"], job["job_type"])
                await _run_job(job)
            else:
                await asyncio.sleep(_POLL_INTERVAL_S)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.exception("Worker loop error: %s", exc)
            await asyncio.sleep(_POLL_INTERVAL_S)

    logger.info("Background worker stopped")


def start_background_worker() -> asyncio.Task:
    global _RUNNING
    _RUNNING = True
    return asyncio.create_task(_worker_loop())


def stop_background_worker() -> None:
    global _RUNNING
    _RUNNING = False
