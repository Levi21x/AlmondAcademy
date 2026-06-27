"""
Almond Jar API

Students drop their resources here — notes, PDFs, PYQs, graded scripts.
Agents consume from this jar during War Room activation.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile

from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.crisis.jar_processor import process_jar_item_metadata

logger = logging.getLogger(__name__)

_STORAGE_BUCKET = "almond-jar"
_SUPPORTED_TYPES = {"application/pdf", "text/plain", "image/jpeg", "image/png", "image/gif", "image/webp"}
# Starlette's multipart parser has a 1 MB per-part default in v0.37+.
# We raise it here so large PDFs aren't rejected before reaching our handler.
_MAX_PART_BYTES = 200 * 1024 * 1024  # 200 MB


def _ensure_bucket(client) -> None:
    """Create the almond-jar storage bucket if it doesn't exist yet."""
    try:
        buckets = client.storage.list_buckets()
        existing = {b.name for b in (buckets or [])}
        if _STORAGE_BUCKET not in existing:
            client.storage.create_bucket(
                _STORAGE_BUCKET,
                options={"public": False, "file_size_limit": 209715200},  # 200 MB
            )
            logger.info("Created storage bucket: %s", _STORAGE_BUCKET)
    except Exception as exc:
        logger.warning("Could not ensure storage bucket exists: %s", exc)

router = APIRouter(prefix="/api/v1/crisis/sessions", tags=["almond-jar"])


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _verify_session(client, session_id: str, user_id: str) -> Dict[str, Any]:
    rows = (
        client.table("crisis_sessions")
        .select("id,user_id,is_active")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Session not found", "code": "SESSION_NOT_FOUND"},
        )
    return rows[0]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/{session_id}/jar/items")
def list_jar_items(session_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])
    rows = (
        client.table("almond_jar_items")
        .select("id,item_type,item_category,original_name,is_processed,is_graded_script,trust_flags,created_at")
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return _success(rows)


@router.post("/{session_id}/jar/text")
def add_text_item(
    session_id: str,
    user=Depends(require_auth),
    text: str = Form(..., min_length=10, max_length=50000),
    label: Optional[str] = Form(None, max_length=200),
):
    """Drop a text paste or notes excerpt into the jar (processed immediately)."""
    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])

    metadata = process_jar_item_metadata(raw_text=text, item_type="text_paste", original_name=label)
    inserted = (
        client.table("almond_jar_items")
        .insert({
            "session_id": session_id,
            "user_id": user["user_id"],
            "item_type": "text_paste",
            "original_name": label or "Pasted text",
            "raw_text": text[:50000],
            **metadata,
        })
        .execute()
    )
    if not inserted.data:
        raise HTTPException(500, detail={"error": True, "message": "Failed to add item to jar", "code": "JAR_INSERT_FAILED"})
    return _success(inserted.data[0])


@router.post("/{session_id}/jar/upload")
async def upload_file_item(
    request: Request,
    session_id: str,
    user=Depends(require_auth),
):
    """
    Upload a PDF or image to the Almond Jar (up to 200 MB).

    Flow:
      1. Receive file bytes (multipart, 200 MB cap via max_part_size)
      2. Upload raw bytes to Supabase Storage (background thread)
      3. Insert jar item row with is_processed=False — return immediately
      4. Background worker later downloads from Storage, extracts text, flips is_processed=True
    """
    # max_part_size overrides Starlette 0.37+'s 1 MB per-part default
    form = await request.form(max_part_size=_MAX_PART_BYTES)
    file: UploadFile = form.get("file")  # type: ignore[assignment]
    label: Optional[str] = form.get("label")  # type: ignore[assignment]

    if file is None:
        raise HTTPException(422, detail={"error": True, "message": "No file provided", "code": "JAR_NO_FILE"})

    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])

    filename = file.filename or "upload"
    content_type = file.content_type or ""
    is_pdf = "pdf" in content_type or filename.lower().endswith(".pdf")
    is_image = content_type.startswith("image/")

    if not is_pdf and not is_image and content_type not in _SUPPORTED_TYPES:
        raise HTTPException(400, detail={"error": True, "message": "Unsupported file type (PDF or image only)", "code": "JAR_UNSUPPORTED_TYPE"})

    file_bytes = await file.read()
    if len(file_bytes) > _MAX_PART_BYTES:
        raise HTTPException(413, detail={"error": True, "message": "File too large (max 200 MB)", "code": "JAR_FILE_TOO_LARGE"})
    if len(file_bytes) == 0:
        raise HTTPException(400, detail={"error": True, "message": "Empty file", "code": "JAR_EMPTY_FILE"})

    item_type = "pdf" if is_pdf else "image"
    original_name = label or filename
    storage_path = f"{user['user_id']}/{session_id}/{int(time.time())}_{filename}"
    effective_ct = content_type or ("application/pdf" if is_pdf else "application/octet-stream")

    # Ensure bucket exists (no-op if already there)
    _ensure_bucket(client)

    try:
        # storage3 pops "content-type" (hyphen) internally — pass it that way
        _bytes = file_bytes  # local ref so lambda captures by value
        _path = storage_path
        _ct = effective_ct
        result = await asyncio.to_thread(
            lambda: client.storage.from_(_STORAGE_BUCKET).upload(
                path=_path,
                file=_bytes,
                file_options={"content-type": _ct, "upsert": False},
            )
        )
        logger.info("Stored %s (%d bytes) → %s", filename, len(file_bytes), storage_path)
    except Exception as exc:
        logger.error("Storage upload failed for %s: %s", storage_path, exc, exc_info=True)
        raise HTTPException(500, detail={"error": True, "message": f"Storage upload failed: {exc}", "code": "JAR_STORAGE_FAILED"})

    inserted = (
        client.table("almond_jar_items")
        .insert({
            "session_id": session_id,
            "user_id": user["user_id"],
            "item_type": item_type,
            "original_name": original_name,
            "storage_path": storage_path,
            "is_processed": False,
            "item_category": "unknown",
            "trust_flags": [],
            "agent_tags": {},
        })
        .execute()
    )
    if not inserted.data:
        raise HTTPException(500, detail={"error": True, "message": "Failed to create jar item", "code": "JAR_INSERT_FAILED"})

    return _success(inserted.data[0])


@router.delete("/{session_id}/jar/items/{item_id}")
def remove_jar_item(session_id: str, item_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])
    deleted = (
        client.table("almond_jar_items")
        .delete()
        .eq("id", item_id)
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not deleted.data:
        raise HTTPException(404, detail={"error": True, "message": "Item not found", "code": "JAR_ITEM_NOT_FOUND"})
    return _success({"deleted": True, "id": item_id})


@router.get("/{session_id}/artifacts")
def list_artifacts(session_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])
    rows = (
        client.table("almond_jar_artifacts")
        .select("id,artifact_type,title,subtitle,is_read,created_at,content")
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return _success(rows)


@router.patch("/{session_id}/artifacts/{artifact_id}/read")
def mark_artifact_read(session_id: str, artifact_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    updated = (
        client.table("almond_jar_artifacts")
        .update({"is_read": True})
        .eq("id", artifact_id)
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .execute()
    )
    if not updated.data:
        raise HTTPException(404, detail={"error": True, "message": "Artifact not found", "code": "ARTIFACT_NOT_FOUND"})
    return _success({"read": True})


@router.get("/{session_id}/jobs")
def list_jobs(session_id: str, user=Depends(require_auth)):
    client = get_supabase_admin_client()
    _verify_session(client, session_id, user["user_id"])
    rows = (
        client.table("almond_jar_jobs")
        .select("id,job_type,status,attempts,scheduled_for,completed_at,error_message")
        .eq("session_id", session_id)
        .eq("user_id", user["user_id"])
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )
    return _success(rows)
