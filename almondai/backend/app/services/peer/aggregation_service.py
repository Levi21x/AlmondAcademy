from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from statistics import mean
from typing import Any, Dict, List

from app.core.database import get_supabase_admin_client


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _percentile(value: float, values: List[float]) -> int:
    if not values:
        return 0
    lte_count = sum(1 for x in values if x <= value)
    return max(0, min(100, int(round((lte_count / len(values)) * 100))))


class AggregationService:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    async def run_full_aggregation(self) -> dict:
        summary = {
            "started_at": _utcnow().isoformat(),
            "struggling_topics_generated": 0,
            "benchmarks_calculated": 0,
            "top_patterns_generated": 0,
            "weekly_trends_generated": 0,
            "notifications_generated": 0,
            "status": "ok",
        }

        summary["struggling_topics_generated"] = await self.aggregate_struggling_topics()
        summary["benchmarks_calculated"] = await self.aggregate_cohort_benchmarks()
        summary["top_patterns_generated"] = await self.aggregate_top_performer_patterns()
        summary["weekly_trends_generated"] = await self.aggregate_weekly_trends()
        summary["notifications_generated"] = await self.generate_peer_notifications()
        summary["completed_at"] = _utcnow().isoformat()
        return summary

    async def aggregate_struggling_topics(self) -> int:
        seven_days_ago = (_utcnow() - timedelta(days=7)).isoformat()

        rows = (
            self.client.table("student_struggle_patterns")
            .select("topic,subject,user_id,mention_count,last_mentioned_at")
            .eq("is_resolved", False)
            .gte("last_mentioned_at", seven_days_ago)
            .execute()
            .data
            or []
        )

        grouped: Dict[tuple[str, str], Dict[str, Any]] = {}
        for row in rows:
            topic = str(row.get("topic") or "").strip()
            if not topic:
                continue
            subject = str(row.get("subject") or "General").strip() or "General"
            key = (topic, subject)
            grouped.setdefault(
                key,
                {
                    "topic": topic,
                    "subject": subject,
                    "user_ids": set(),
                    "mentions": [],
                    "last_seen": [],
                },
            )
            grouped[key]["user_ids"].add(str(row.get("user_id")))
            grouped[key]["mentions"].append(_to_float(row.get("mention_count", 0)))
            grouped[key]["last_seen"].append(str(row.get("last_mentioned_at") or ""))

        active_students = (
            self.client.table("daily_usage")
            .select("user_id")
            .gte("date", (date.today() - timedelta(days=7)).isoformat())
            .execute()
            .data
            or []
        )
        active_count = max(1, len({str(row.get("user_id")) for row in active_students}))

        ranked = sorted(
            grouped.values(),
            key=lambda item: len(item["user_ids"]),
            reverse=True,
        )[:20]

        inserted = 0
        for item in ranked:
            student_count = len(item["user_ids"])
            avg_mentions = round(mean(item["mentions"]) if item["mentions"] else 0.0, 2)

            recent_mentions = sum(1 for row in item["mentions"] if row >= 2)
            trend = "increasing" if recent_mentions >= max(2, student_count // 2) else "stable"
            if student_count <= 2:
                trend = "decreasing"

            affected_pct = round((student_count / active_count) * 100, 2)
            recommended = (
                f"Spend 20 minutes on {item['topic']} with active recall and one visual map before MCQs."
            )

            self.client.table("platform_insights").insert(
                {
                    "insight_type": "struggling_topic",
                    "topic": item["topic"],
                    "subject": item["subject"],
                    "student_count": student_count,
                    "generated_at": _utcnow().isoformat(),
                    "valid_until": (_utcnow() + timedelta(days=7)).isoformat(),
                    "insight_data": {
                        "avg_mentions": avg_mentions,
                        "affected_percentage": affected_pct,
                        "trend": trend,
                        "recommended_action": recommended,
                    },
                }
            ).execute()
            inserted += 1

        return inserted

    async def aggregate_cohort_benchmarks(self) -> int:
        users = self.client.table("users").select("id").execute().data or []
        user_ids = [str(row.get("id")) for row in users if row.get("id")]
        if not user_ids:
            return 0

        q_rows = (
            self.client.table("daily_usage")
            .select("user_id,questions_asked")
            .in_("user_id", user_ids)
            .execute()
            .data
            or []
        )
        questions_by_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
        for row in q_rows:
            uid = str(row.get("user_id"))
            questions_by_user[uid] = questions_by_user.get(uid, 0.0) + _to_float(row.get("questions_asked", 0))

        t_rows = (
            self.client.table("student_topic_progress")
            .select("user_id,status")
            .in_("user_id", user_ids)
            .eq("status", "completed")
            .execute()
            .data
            or []
        )
        topics_by_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
        for row in t_rows:
            uid = str(row.get("user_id"))
            topics_by_user[uid] = topics_by_user.get(uid, 0.0) + 1.0

        s_rows = (
            self.client.table("study_streaks")
            .select("user_id,current_streak")
            .in_("user_id", user_ids)
            .execute()
            .data
            or []
        )
        streak_by_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
        for row in s_rows:
            uid = str(row.get("user_id"))
            streak_by_user[uid] = _to_float(row.get("current_streak", 0))

        m_rows = (
            self.client.table("student_mcq_attempts")
            .select("user_id,is_correct")
            .in_("user_id", user_ids)
            .execute()
            .data
            or []
        )
        mcq_totals: Dict[str, int] = {uid: 0 for uid in user_ids}
        mcq_correct: Dict[str, int] = {uid: 0 for uid in user_ids}
        for row in m_rows:
            uid = str(row.get("user_id"))
            mcq_totals[uid] = mcq_totals.get(uid, 0) + 1
            if bool(row.get("is_correct")):
                mcq_correct[uid] = mcq_correct.get(uid, 0) + 1

        mcq_accuracy_by_user: Dict[str, float] = {}
        for uid in user_ids:
            total = mcq_totals.get(uid, 0)
            acc = (mcq_correct.get(uid, 0) / total) * 100 if total > 0 else 0.0
            mcq_accuracy_by_user[uid] = round(acc, 2)

        q_values = list(questions_by_user.values())
        t_values = list(topics_by_user.values())
        s_values = list(streak_by_user.values())
        m_values = list(mcq_accuracy_by_user.values())

        rows_to_upsert: List[Dict[str, Any]] = []
        now = _utcnow().isoformat()

        for uid in user_ids:
            q_pct = _percentile(questions_by_user.get(uid, 0.0), q_values)
            t_pct = _percentile(topics_by_user.get(uid, 0.0), t_values)
            s_pct = _percentile(streak_by_user.get(uid, 0.0), s_values)
            m_pct = _percentile(mcq_accuracy_by_user.get(uid, 0.0), m_values)
            overall = int(round((q_pct + t_pct + s_pct + m_pct) / 4))

            if overall <= 25:
                cohort = "getting_started"
            elif overall <= 50:
                cohort = "building_momentum"
            elif overall <= 75:
                cohort = "on_track"
            elif overall <= 90:
                cohort = "top_performer"
            else:
                cohort = "elite"

            rows_to_upsert.append(
                {
                    "user_id": uid,
                    "percentile_rank": overall,
                    "cohort_label": cohort,
                    "questions_percentile": q_pct,
                    "completion_percentile": t_pct,
                    "streak_percentile": s_pct,
                    "mcq_accuracy_percentile": m_pct,
                    "last_calculated": now,
                    "updated_at": now,
                }
            )

        if rows_to_upsert:
            self.client.table("student_benchmarks").upsert(rows_to_upsert, on_conflict="user_id").execute()
        return len(rows_to_upsert)

    async def aggregate_top_performer_patterns(self) -> int:
        benchmarks = self.client.table("student_benchmarks").select("user_id,percentile_rank").execute().data or []
        if not benchmarks:
            return 0

        top_ids = [str(r.get("user_id")) for r in benchmarks if _to_int(r.get("percentile_rank")) > 75]
        avg_ids = [str(r.get("user_id")) for r in benchmarks if _to_int(r.get("percentile_rank")) <= 75]
        if not top_ids or not avg_ids:
            return 0

        def avg_questions_per_day(user_ids: List[str]) -> float:
            rows = (
                self.client.table("daily_usage")
                .select("user_id,questions_asked")
                .in_("user_id", user_ids)
                .gte("date", (date.today() - timedelta(days=14)).isoformat())
                .execute()
                .data
                or []
            )
            per_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
            for row in rows:
                uid = str(row.get("user_id"))
                per_user[uid] = per_user.get(uid, 0.0) + _to_float(row.get("questions_asked", 0))
            vals = [v / 14 for v in per_user.values()]
            return round(mean(vals), 2) if vals else 0.0

        def avg_topics_per_week(user_ids: List[str]) -> float:
            rows = (
                self.client.table("student_topic_progress")
                .select("user_id")
                .in_("user_id", user_ids)
                .eq("status", "completed")
                .gte("completed_at", (_utcnow() - timedelta(days=28)).isoformat())
                .execute()
                .data
                or []
            )
            per_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
            for row in rows:
                uid = str(row.get("user_id"))
                per_user[uid] = per_user.get(uid, 0.0) + 1.0
            vals = [v / 4 for v in per_user.values()]
            return round(mean(vals), 2) if vals else 0.0

        def avg_streak(user_ids: List[str]) -> float:
            rows = (
                self.client.table("study_streaks")
                .select("user_id,current_streak")
                .in_("user_id", user_ids)
                .execute()
                .data
                or []
            )
            by_user: Dict[str, float] = {uid: 0.0 for uid in user_ids}
            for row in rows:
                by_user[str(row.get("user_id"))] = _to_float(row.get("current_streak", 0))
            vals = list(by_user.values())
            return round(mean(vals), 2) if vals else 0.0

        top_q = avg_questions_per_day(top_ids)
        avg_q = max(avg_questions_per_day(avg_ids), 0.01)
        top_t = avg_topics_per_week(top_ids)
        avg_t = max(avg_topics_per_week(avg_ids), 0.01)
        top_s = avg_streak(top_ids)
        avg_s = max(avg_streak(avg_ids), 0.01)

        q_ratio = round(top_q / avg_q, 2)
        t_ratio = round(top_t / avg_t, 2)
        s_ratio = round(top_s / avg_s, 2)

        insight_lines = [
            f"Top performers ask {q_ratio}x more questions per day.",
            f"Top performers complete {t_ratio}x more topics per week.",
            f"Top performers maintain {s_ratio}x longer study streaks.",
        ]

        self.client.table("platform_insights").insert(
            {
                "insight_type": "top_performer_pattern",
                "subject": None,
                "topic": None,
                "student_count": len(top_ids),
                "generated_at": _utcnow().isoformat(),
                "valid_until": (_utcnow() + timedelta(days=7)).isoformat(),
                "insight_data": {
                    "insights": insight_lines,
                    "top_questions_per_day": top_q,
                    "avg_questions_per_day": round(avg_q, 2),
                    "top_topics_per_week": top_t,
                    "avg_topics_per_week": round(avg_t, 2),
                    "top_streak": top_s,
                    "avg_streak": round(avg_s, 2),
                },
            }
        ).execute()

        return 1

    async def aggregate_weekly_trends(self) -> int:
        now = _utcnow()
        this_week_start = datetime.combine((date.today() - timedelta(days=6)), time.min, tzinfo=timezone.utc)
        prev_week_start = this_week_start - timedelta(days=7)
        prev_week_end = this_week_start

        this_usage = (
            self.client.table("daily_usage")
            .select("questions_asked")
            .gte("date", this_week_start.date().isoformat())
            .execute()
            .data
            or []
        )
        prev_usage = (
            self.client.table("daily_usage")
            .select("questions_asked")
            .gte("date", prev_week_start.date().isoformat())
            .lt("date", prev_week_end.date().isoformat())
            .execute()
            .data
            or []
        )

        this_questions = sum(_to_int(r.get("questions_asked", 0)) for r in this_usage)
        prev_questions = sum(_to_int(r.get("questions_asked", 0)) for r in prev_usage)

        this_topics = (
            self.client.table("student_topic_progress")
            .select("id")
            .eq("status", "completed")
            .gte("completed_at", this_week_start.isoformat())
            .execute()
            .data
            or []
        )
        prev_topics = (
            self.client.table("student_topic_progress")
            .select("id")
            .eq("status", "completed")
            .gte("completed_at", prev_week_start.isoformat())
            .lt("completed_at", prev_week_end.isoformat())
            .execute()
            .data
            or []
        )

        this_topics_count = len(this_topics)
        prev_topics_count = len(prev_topics)

        this_mcq_subjects = (
            self.client.table("student_mcq_attempts")
            .select("subject")
            .gte("attempted_at", this_week_start.isoformat())
            .execute()
            .data
            or []
        )
        subject_counts: Dict[str, int] = {}
        for row in this_mcq_subjects:
            sub = str(row.get("subject") or "General")
            subject_counts[sub] = subject_counts.get(sub, 0) + 1
        hot_subject = max(subject_counts.items(), key=lambda x: x[1])[0] if subject_counts else "General"

        this_new_users = (
            self.client.table("users").select("id").gte("created_at", this_week_start.isoformat()).execute().data or []
        )
        prev_new_users = (
            self.client.table("users")
            .select("id")
            .gte("created_at", prev_week_start.isoformat())
            .lt("created_at", prev_week_end.isoformat())
            .execute()
            .data
            or []
        )

        def _pct_change(curr: int, prev: int) -> float:
            if prev <= 0:
                return 100.0 if curr > 0 else 0.0
            return round(((curr - prev) / prev) * 100, 2)

        self.client.table("platform_insights").insert(
            {
                "insight_type": "weekly_trend",
                "subject": hot_subject,
                "topic": None,
                "student_count": len(this_new_users),
                "generated_at": now.isoformat(),
                "valid_until": (now + timedelta(days=7)).isoformat(),
                "insight_data": {
                    "this_week_questions": this_questions,
                    "last_week_questions": prev_questions,
                    "questions_change_pct": _pct_change(this_questions, prev_questions),
                    "this_week_topics_completed": this_topics_count,
                    "last_week_topics_completed": prev_topics_count,
                    "topics_change_pct": _pct_change(this_topics_count, prev_topics_count),
                    "hot_subject": hot_subject,
                    "new_students_this_week": len(this_new_users),
                    "new_students_last_week": len(prev_new_users),
                    "new_students_change_pct": _pct_change(len(this_new_users), len(prev_new_users)),
                    "reason": "Most studied subject this week across all students preparing for finals",
                },
            }
        ).execute()

        return 1

    async def get_or_recalculate_benchmark(self, user_id: str) -> Dict[str, Any] | None:
        row = (
            self.client.table("student_benchmarks")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        benchmark = row[0] if row else None

        should_recalculate = True
        if benchmark and benchmark.get("last_calculated"):
            try:
                dt = datetime.fromisoformat(str(benchmark["last_calculated"]).replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                should_recalculate = (_utcnow() - dt) > timedelta(hours=24)
            except Exception:
                should_recalculate = True

        if benchmark and not should_recalculate:
            return benchmark

        await self.aggregate_cohort_benchmarks()
        row = (
            self.client.table("student_benchmarks")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        return row[0] if row else None

    async def generate_peer_notifications(self) -> int:
        users = self.client.table("users").select("id").execute().data or []
        generated = 0
        for user in users:
            uid = str(user.get("id"))
            if not uid:
                continue
            generated += await self.generate_notifications_for_user(uid)
        return generated

    async def generate_notifications_for_user(self, user_id: str) -> int:
        benchmark = await self.get_or_recalculate_benchmark(user_id)
        if not benchmark:
            return 0

        inserted = 0
        now = _utcnow()

        existing_unread = (
            self.client.table("peer_notifications")
            .select("notification_type")
            .eq("user_id", user_id)
            .eq("is_read", False)
            .gte("created_at", (now - timedelta(days=3)).isoformat())
            .execute()
            .data
            or []
        )
        existing_types = {str(row.get("notification_type")) for row in existing_unread}

        if _to_int(benchmark.get("questions_percentile", 0)) < 40 and "cohort_gap" not in existing_types:
            self.client.table("peer_notifications").insert(
                {
                    "user_id": user_id,
                    "notification_type": "cohort_gap",
                    "title": "You are behind your cohort today",
                    "message": "Students at your level are asking more questions today. A 15-minute tutor sprint can close the gap.",
                    "action_url": "/ai-tutor",
                }
            ).execute()
            inserted += 1

        top_struggles = (
            self.client.table("platform_insights")
            .select("topic,subject,student_count")
            .eq("insight_type", "struggling_topic")
            .order("generated_at", desc=True)
            .limit(10)
            .execute()
            .data
            or []
        )
        user_struggles = (
            self.client.table("student_struggle_patterns")
            .select("topic")
            .eq("user_id", user_id)
            .eq("is_resolved", False)
            .execute()
            .data
            or []
        )
        user_topics = {str(row.get("topic", "")).lower() for row in user_struggles}
        matched = next((row for row in top_struggles if str(row.get("topic", "")).lower() in user_topics), None)
        if matched and "shared_struggle" not in existing_types:
            self.client.table("peer_notifications").insert(
                {
                    "user_id": user_id,
                    "notification_type": "shared_struggle",
                    "title": "Your weak topic is trending",
                    "message": f"{matched.get('student_count', 0)} students are struggling with {matched.get('topic')} right now.",
                    "action_url": "/insights",
                }
            ).execute()
            inserted += 1

        rank = _to_int(benchmark.get("percentile_rank", 0))
        near_boundary = rank in {24, 49, 74, 89}
        if near_boundary and "rank_up" not in existing_types:
            self.client.table("peer_notifications").insert(
                {
                    "user_id": user_id,
                    "notification_type": "rank_up",
                    "title": "You are close to the next rank",
                    "message": "One focused study session could push you into the next percentile band.",
                    "action_url": "/dashboard",
                }
            ).execute()
            inserted += 1

        recent_usage = (
            self.client.table("daily_usage")
            .select("date,questions_asked")
            .eq("user_id", user_id)
            .gte("date", (date.today() - timedelta(days=2)).isoformat())
            .order("date", desc=True)
            .execute()
            .data
            or []
        )
        activity = sum(_to_int(row.get("questions_asked", 0)) for row in recent_usage)
        if activity == 0 and "inactive_nudge" not in existing_types:
            self.client.table("peer_notifications").insert(
                {
                    "user_id": user_id,
                    "notification_type": "inactive_nudge",
                    "title": "Come back strong",
                    "message": "Students at your level are actively revising this week. A quick comeback session now can protect your rank.",
                    "action_url": "/dashboard",
                }
            ).execute()
            inserted += 1

        return inserted
