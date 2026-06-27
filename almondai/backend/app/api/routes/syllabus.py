from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.cache import cache_get, cache_set, make_key, syllabus_cache
from app.core.database import get_supabase_admin_client
from app.middleware.auth_middleware import require_auth
from app.services.streak_service import StreakService

router = APIRouter(prefix="/api/v1/syllabus", tags=["syllabus"])
streak_service = StreakService()

ProgressStatus = Literal["not_started", "in_progress", "completed", "needs_revision"]


class UpdateTopicProgressRequest(BaseModel):
    status: ProgressStatus


def _success(data: Any) -> Dict[str, Any]:
    return {"success": True, "data": data}


def _mode_filter(query_mode: Optional[str]) -> Optional[List[str]]:
    if not query_mode:
        return None
    if query_mode == "mbbs":
        return ["mbbs", "both"]
    if query_mode == "neet_pg":
        return ["neet_pg", "both"]
    if query_mode == "both":
        return ["both"]
    raise HTTPException(status_code=400, detail={"error": True, "message": "Invalid mode", "code": "INVALID_MODE"})


@router.get("/subjects")
def get_subjects(
    mode: Optional[str] = Query(default=None),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    client = get_supabase_admin_client()
    modes = _mode_filter(mode)

    subjects_key = make_key("subjects_list", str(modes))
    subjects = cache_get(syllabus_cache, subjects_key)
    if subjects is None:
        subject_query = client.table("syllabus_subjects").select("*").order("sort_order", desc=False)
        if modes:
            subject_query = subject_query.in_("mode", modes)
        subjects = subject_query.execute().data or []
        cache_set(syllabus_cache, subjects_key, subjects)

    if not subjects:
        return _success([])

    subject_ids = [subject["id"] for subject in subjects]

    topics_key = make_key("topics_for_subjects", str(sorted(subject_ids)))
    topics = cache_get(syllabus_cache, topics_key)
    if topics is None:
        topics = (
            client.table("syllabus_topics")
            .select("id,subject_id")
            .in_("subject_id", subject_ids)
            .execute()
            .data or []
        )
        cache_set(syllabus_cache, topics_key, topics)

    topic_ids = [topic["id"] for topic in topics]

    progress_rows: List[Dict[str, Any]] = []
    if topic_ids:
        progress_result = (
            client.table("student_topic_progress")
            .select("topic_id,status")
            .eq("user_id", user["user_id"])
            .in_("topic_id", topic_ids)
            .execute()
        )
        progress_rows = progress_result.data or []

    topic_count_by_subject: Dict[str, int] = {subject_id: 0 for subject_id in subject_ids}
    for topic in topics:
        topic_count_by_subject[topic["subject_id"]] = topic_count_by_subject.get(topic["subject_id"], 0) + 1

    topic_to_subject = {topic["id"]: topic["subject_id"] for topic in topics}
    completed_by_subject: Dict[str, int] = {subject_id: 0 for subject_id in subject_ids}
    for progress in progress_rows:
        if progress.get("status") != "completed":
            continue
        subject_id = topic_to_subject.get(progress.get("topic_id"))
        if subject_id:
            completed_by_subject[subject_id] = completed_by_subject.get(subject_id, 0) + 1

    payload = []
    for subject in subjects:
        total_topics = topic_count_by_subject.get(subject["id"], 0)
        completed_topics = completed_by_subject.get(subject["id"], 0)
        completion_percentage = int(round((completed_topics / total_topics) * 100)) if total_topics else 0

        payload.append(
            {
                "id": subject["id"],
                "name": subject["name"],
                "year": subject["year"],
                "mode": subject["mode"],
                "description": subject.get("description"),
                "icon": subject.get("icon"),
                "sort_order": subject.get("sort_order", 0),
                "total_topics": total_topics,
                "completed_topics": completed_topics,
                "completion_percentage": completion_percentage,
            }
        )

    return _success(payload)


@router.get("/subjects/{subject_id}/topics")
def get_subject_topics(subject_id: str, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    subject_key = make_key("subject_detail", subject_id)
    subject = cache_get(syllabus_cache, subject_key)
    if subject is None:
        subject_result = client.table("syllabus_subjects").select("*").eq("id", subject_id).limit(1).execute()
        if not subject_result.data:
            raise HTTPException(status_code=404, detail={"error": True, "message": "Subject not found", "code": "SUBJECT_NOT_FOUND"})
        subject = subject_result.data[0]
        cache_set(syllabus_cache, subject_key, subject)

    topics_key = make_key("topics_detail", subject_id)
    topics = cache_get(syllabus_cache, topics_key)
    if topics is None:
        topics = (
            client.table("syllabus_topics")
            .select("*")
            .eq("subject_id", subject_id)
            .order("sort_order", desc=False)
            .execute()
            .data or []
        )
        cache_set(syllabus_cache, topics_key, topics)

    topic_ids = [topic["id"] for topic in topics]
    progress_by_topic: Dict[str, Dict[str, Any]] = {}
    if topic_ids:
        progress_result = (
            client.table("student_topic_progress")
            .select("topic_id,status,completed_at")
            .eq("user_id", user["user_id"])
            .in_("topic_id", topic_ids)
            .execute()
        )
        progress_by_topic = {row["topic_id"]: row for row in (progress_result.data or [])}

    topic_payload = []
    for topic in topics:
        progress = progress_by_topic.get(topic["id"], {})
        topic_payload.append(
            {
                "id": topic["id"],
                "name": topic["name"],
                "description": topic.get("description"),
                "difficulty": topic.get("difficulty", "medium"),
                "is_high_yield": bool(topic.get("is_high_yield", False)),
                "neet_pg_relevant": bool(topic.get("neet_pg_relevant", False)),
                "sort_order": topic.get("sort_order", 0),
                "status": progress.get("status", "not_started"),
                "completed_at": progress.get("completed_at"),
            }
        )

    return _success({"subject": subject, "topics": topic_payload})


@router.get("/topics/by-name")
def get_topic_by_name(
    topic: str = Query(..., min_length=1),
    subject: Optional[str] = Query(default=None),
    user=Depends(require_auth),
) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    subject_id: Optional[str] = None
    if subject:
        subject_rows = (
            client.table("syllabus_subjects")
            .select("id,name")
            .ilike("name", subject.strip())
            .limit(1)
            .execute()
            .data
            or []
        )
        if subject_rows:
            subject_id = subject_rows[0]["id"]

    query = client.table("syllabus_topics").select("id,name,subject_id,difficulty,is_high_yield,neet_pg_relevant").ilike("name", topic.strip())
    if subject_id:
        query = query.eq("subject_id", subject_id)

    rows = query.order("sort_order", desc=False).limit(1).execute().data or []
    if not rows:
        raise HTTPException(
            status_code=404,
            detail={"error": True, "message": "Topic not found", "code": "TOPIC_NOT_FOUND"},
        )

    return _success(rows[0])


@router.patch("/topics/{topic_id}/progress")
def update_topic_progress(topic_id: str, payload: UpdateTopicProgressRequest, user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    topic_result = client.table("syllabus_topics").select("id,subject_id,name").eq("id", topic_id).limit(1).execute()
    if not topic_result.data:
        raise HTTPException(status_code=404, detail={"error": True, "message": "Topic not found", "code": "TOPIC_NOT_FOUND"})

    topic = topic_result.data[0]

    subject_result = client.table("syllabus_subjects").select("name").eq("id", topic["subject_id"]).limit(1).execute()
    subject_name = (subject_result.data or [{}])[0].get("name")

    completed_at = datetime.now(timezone.utc).isoformat() if payload.status == "completed" else None

    upsert_result = (
        client.table("student_topic_progress")
        .upsert(
            {
                "user_id": user["user_id"],
                "topic_id": topic_id,
                "status": payload.status,
                "completed_at": completed_at,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id,topic_id",
        )
        .execute()
    )

    if not upsert_result.data:
        raise HTTPException(status_code=500, detail={"error": True, "message": "Failed to update progress", "code": "PROGRESS_UPDATE_FAILED"})

    new_achievements: List[Dict[str, Any]] = []
    if payload.status in {"completed", "in_progress", "needs_revision"}:
        activity_type = {
            "completed": "topic_completed",
            "in_progress": "topic_started",
            "needs_revision": "topic_revision",
        }[payload.status]
        try:
            activity_row = streak_service.log_activity(
                user_id=user["user_id"],
                activity_type=activity_type,
                subject=subject_name,
                topic_name=topic.get("name"),
            )
            new_achievements = list(activity_row.get("new_achievements") or [])
        except Exception:
            # Logging should not block progress updates.
            pass

    row = upsert_result.data[0]
    return _success(
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "topic_id": row["topic_id"],
            "status": row["status"],
            "completed_at": row.get("completed_at"),
            "updated_at": row.get("updated_at"),
            "created_at": row.get("created_at"),
            "new_achievements": new_achievements,
        }
    )


@router.get("/progress/summary")
def get_progress_summary(user=Depends(require_auth)) -> Dict[str, Any]:
    client = get_supabase_admin_client()

    subjects_result = client.table("syllabus_subjects").select("id,name").order("sort_order", desc=False).execute()
    subjects = subjects_result.data or []
    subject_name_by_id = {row["id"]: row["name"] for row in subjects}

    topics_result = client.table("syllabus_topics").select("id,subject_id").execute()
    topics = topics_result.data or []

    total_topics = len(topics)
    topic_ids = [topic["id"] for topic in topics]

    progress_rows: List[Dict[str, Any]] = []
    if topic_ids:
        progress_result = (
            client.table("student_topic_progress")
            .select("topic_id,status")
            .eq("user_id", user["user_id"])
            .in_("topic_id", topic_ids)
            .execute()
        )
        progress_rows = progress_result.data or []

    status_by_topic = {row["topic_id"]: row["status"] for row in progress_rows}

    completed_topics = 0
    in_progress_topics = 0
    needs_revision_topics = 0

    by_subject_counter: Dict[str, Dict[str, int]] = {}
    for topic in topics:
        subject_id = topic["subject_id"]
        if subject_id not in by_subject_counter:
            by_subject_counter[subject_id] = {"total": 0, "completed": 0}

        by_subject_counter[subject_id]["total"] += 1
        status = status_by_topic.get(topic["id"], "not_started")

        if status == "completed":
            completed_topics += 1
            by_subject_counter[subject_id]["completed"] += 1
        elif status == "in_progress":
            in_progress_topics += 1
        elif status == "needs_revision":
            needs_revision_topics += 1

    overall_percentage = int(round((completed_topics / total_topics) * 100)) if total_topics else 0

    by_subject = []
    for subject_id, counts in by_subject_counter.items():
        total = counts["total"]
        completed = counts["completed"]
        percentage = int(round((completed / total) * 100)) if total else 0
        by_subject.append(
            {
                "subject_id": subject_id,
                "subject_name": subject_name_by_id.get(subject_id, "Unknown"),
                "total": total,
                "completed": completed,
                "percentage": percentage,
            }
        )

    by_subject.sort(key=lambda item: item["percentage"])

    return _success(
        {
            "total_topics": total_topics,
            "completed_topics": completed_topics,
            "in_progress_topics": in_progress_topics,
            "needs_revision_topics": needs_revision_topics,
            "overall_percentage": overall_percentage,
            "by_subject": by_subject,
        }
    )
