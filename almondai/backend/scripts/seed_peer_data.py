from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.core.database import get_supabase_admin_client


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def seed_platform_insights() -> None:
    client = get_supabase_admin_client()
    now = _utcnow()
    valid_until = (now + timedelta(days=14)).isoformat()

    struggling_topics = [
        ("Brachial Plexus", "Anatomy", 47),
        ("Krebs Cycle", "Biochemistry", 89),
        ("Coagulation Cascade", "Pathology", 134),
        ("Autonomic Pharmacology", "Pharmacology", 76),
        ("Biostatistics", "Community Medicine", 112),
        ("Cardiac Cycle", "Physiology", 58),
        ("Renal Physiology", "Physiology", 94),
        ("Immunology", "Microbiology", 67),
        ("Drug Interactions", "Pharmacology", 83),
        ("Hepatitis Pathology", "Pathology", 71),
    ]

    for topic, subject, student_count in struggling_topics:
        client.table("platform_insights").insert(
            {
                "insight_type": "struggling_topic",
                "topic": topic,
                "subject": subject,
                "student_count": student_count,
                "generated_at": now.isoformat(),
                "valid_until": valid_until,
                "insight_data": {
                    "avg_mentions": 2.3,
                    "affected_percentage": round(student_count / 600 * 100, 2),
                    "trend": "increasing",
                    "recommended_action": f"Review {topic} with one visual map and 15 rapid-recall MCQs.",
                },
            }
        ).execute()

    top_patterns = [
        "Top performers ask 3x more questions per day and complete 2x more topics per week",
        "Students scoring above 80% in MCQs spend significantly more time on clinical subjects",
    ]

    client.table("platform_insights").insert(
        {
            "insight_type": "top_performer_pattern",
            "topic": None,
            "subject": None,
            "student_count": 150,
            "generated_at": now.isoformat(),
            "valid_until": valid_until,
            "insight_data": {
                "insights": top_patterns,
            },
        }
    ).execute()

    client.table("platform_insights").insert(
        {
            "insight_type": "weekly_trend",
            "topic": None,
            "subject": "Pharmacology",
            "student_count": 0,
            "generated_at": now.isoformat(),
            "valid_until": valid_until,
            "insight_data": {
                "hot_subject": "Pharmacology",
                "reason": "Most studied subject this week across all students preparing for finals",
            },
        }
    ).execute()

    print("Seeded peer intelligence data successfully")


if __name__ == "__main__":
    seed_platform_insights()
