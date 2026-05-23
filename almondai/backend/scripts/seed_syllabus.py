from __future__ import annotations

from typing import Any, Dict, List

from supabase import create_client

from app.core.config import get_settings


SYLLABUS_DATA: List[Dict[str, Any]] = [
    {
        "name": "Anatomy",
        "year": 1,
        "mode": "both",
        "description": "Foundational gross, neuro, and developmental anatomy.",
        "icon": "bone",
        "sort_order": 10,
        "topics": [
            ("Upper Limb", True, "medium"),
            ("Lower Limb", True, "medium"),
            ("Thorax", True, "medium"),
            ("Abdomen", True, "medium"),
            ("Pelvis and Perineum", True, "hard"),
            ("Head and Neck", True, "hard"),
            ("Neuroanatomy", True, "hard"),
            ("Embryology", True, "hard"),
            ("Histology", False, "easy"),
            ("Osteology", False, "easy"),
        ],
    },
    {
        "name": "Physiology",
        "year": 1,
        "mode": "both",
        "description": "Core body system physiology for MBBS and NEET-PG.",
        "icon": "heart-pulse",
        "sort_order": 20,
        "topics": [
            ("General Physiology", True, "easy"),
            ("Blood", True, "medium"),
            ("Nerve and Muscle", True, "medium"),
            ("Cardiovascular System", True, "hard"),
            ("Respiratory System", True, "medium"),
            ("Gastrointestinal System", False, "medium"),
            ("Renal System", True, "hard"),
            ("Endocrine System", True, "medium"),
            ("Reproductive System", False, "medium"),
            ("Central Nervous System", True, "hard"),
            ("Special Senses", False, "easy"),
        ],
    },
    {
        "name": "Biochemistry",
        "year": 1,
        "mode": "both",
        "description": "Metabolism and molecular basis of disease.",
        "icon": "flask-conical",
        "sort_order": 30,
        "topics": [
            ("Carbohydrate Metabolism", True, "medium"),
            ("Lipid Metabolism", True, "medium"),
            ("Protein Metabolism", True, "medium"),
            ("Nucleic Acid Metabolism", True, "hard"),
            ("Enzymes", True, "easy"),
            ("Vitamins and Minerals", True, "easy"),
            ("Hormonal Biochemistry", True, "medium"),
            ("Molecular Biology", True, "hard"),
            ("Clinical Biochemistry", True, "medium"),
            ("Nutrition", False, "easy"),
        ],
    },
    {
        "name": "Pathology",
        "year": 2,
        "mode": "both",
        "description": "General and systemic pathology essentials.",
        "icon": "microscope",
        "sort_order": 40,
        "topics": [
            ("General Pathology", True, "medium"),
            ("Inflammation", True, "medium"),
            ("Neoplasia", True, "hard"),
            ("Cardiovascular Pathology", True, "hard"),
            ("Respiratory Pathology", True, "medium"),
            ("Gastrointestinal Pathology", True, "medium"),
            ("Hepatobiliary Pathology", True, "medium"),
            ("Renal Pathology", True, "hard"),
            ("Hematology", True, "hard"),
            ("Endocrine Pathology", True, "medium"),
            ("Neuropathology", False, "hard"),
            ("Musculoskeletal Pathology", False, "medium"),
        ],
    },
    {
        "name": "Pharmacology",
        "year": 2,
        "mode": "both",
        "description": "Drug mechanisms, indications, and adverse effects.",
        "icon": "pill",
        "sort_order": 50,
        "topics": [
            ("General Pharmacology", True, "medium"),
            ("Autonomic Nervous System", True, "hard"),
            ("Cardiovascular Drugs", True, "hard"),
            ("Respiratory Drugs", True, "medium"),
            ("GI Pharmacology", False, "medium"),
            ("CNS Drugs", True, "hard"),
            ("Antimicrobials", True, "hard"),
            ("Endocrine Pharmacology", True, "medium"),
            ("Chemotherapy", True, "hard"),
            ("Renal Pharmacology", False, "medium"),
            ("Toxicology", True, "medium"),
        ],
    },
    {
        "name": "Microbiology",
        "year": 2,
        "mode": "both",
        "description": "Microbes, immunity, and clinical infection control.",
        "icon": "bug",
        "sort_order": 60,
        "topics": [
            ("General Microbiology", True, "easy"),
            ("Bacteriology", True, "medium"),
            ("Virology", True, "hard"),
            ("Mycology", False, "medium"),
            ("Parasitology", True, "medium"),
            ("Immunology", True, "hard"),
            ("Clinical Microbiology", True, "medium"),
            ("Sterilization and Disinfection", False, "easy"),
        ],
    },
    {
        "name": "Forensic Medicine",
        "year": 2,
        "mode": "mbbs",
        "description": "Forensic principles and medicolegal essentials.",
        "icon": "scale",
        "sort_order": 70,
        "topics": [
            ("Medical Jurisprudence", True, "medium"),
            ("Thanatology", True, "medium"),
            ("Traumatology", True, "medium"),
            ("Toxicology", True, "hard"),
            ("Sexual Offences", False, "medium"),
            ("Identification", False, "easy"),
        ],
    },
    {
        "name": "Community Medicine",
        "year": 3,
        "mode": "both",
        "description": "Public health, epidemiology, and preventive medicine.",
        "icon": "users",
        "sort_order": 80,
        "topics": [
            ("Epidemiology", True, "hard"),
            ("Biostatistics", True, "hard"),
            ("Communicable Diseases", True, "medium"),
            ("Non-Communicable Diseases", True, "medium"),
            ("Nutrition", False, "easy"),
            ("Environmental Health", False, "easy"),
            ("Health Administration", False, "medium"),
            ("Family Planning", True, "medium"),
            ("Maternal and Child Health", True, "medium"),
            ("Occupational Health", False, "easy"),
        ],
    },
    {
        "name": "ENT",
        "year": 3,
        "mode": "mbbs",
        "description": "Ear, nose, and throat clinical foundations.",
        "icon": "ear",
        "sort_order": 90,
        "topics": [
            ("Anatomy of ENT", False, "easy"),
            ("Diseases of Ear", True, "medium"),
            ("Diseases of Nose and Paranasal Sinuses", True, "medium"),
            ("Diseases of Throat", True, "medium"),
            ("Head and Neck Surgery", False, "hard"),
        ],
    },
    {
        "name": "Ophthalmology",
        "year": 3,
        "mode": "mbbs",
        "description": "Clinical ophthalmology and vision disorders.",
        "icon": "eye",
        "sort_order": 100,
        "topics": [
            ("Anatomy of Eye", False, "easy"),
            ("Diseases of Conjunctiva", False, "medium"),
            ("Diseases of Cornea", True, "medium"),
            ("Diseases of Lens", True, "medium"),
            ("Diseases of Retina", True, "hard"),
            ("Glaucoma", True, "hard"),
            ("Neuro-ophthalmology", False, "hard"),
            ("Refractive Errors", False, "easy"),
        ],
    },
    {
        "name": "Medicine",
        "year": 4,
        "mode": "both",
        "description": "Core internal medicine systems and disorders.",
        "icon": "stethoscope",
        "sort_order": 110,
        "topics": [
            ("Cardiology", True, "hard"),
            ("Pulmonology", True, "hard"),
            ("Gastroenterology", True, "hard"),
            ("Nephrology", True, "hard"),
            ("Neurology", True, "hard"),
            ("Endocrinology", True, "medium"),
            ("Rheumatology", False, "medium"),
            ("Hematology", True, "hard"),
            ("Infectious Diseases", True, "medium"),
            ("Dermatology in Medicine", False, "medium"),
            ("Psychiatry Basics", False, "medium"),
        ],
    },
    {
        "name": "Surgery",
        "year": 4,
        "mode": "both",
        "description": "Surgical principles, emergencies, and system procedures.",
        "icon": "scissors",
        "sort_order": 120,
        "topics": [
            ("Principles of Surgery", True, "medium"),
            ("Trauma", True, "hard"),
            ("Gastrointestinal Surgery", True, "hard"),
            ("Hepatobiliary Surgery", True, "hard"),
            ("Vascular Surgery", False, "hard"),
            ("Urology", True, "medium"),
            ("Orthopedics Overview", False, "medium"),
            ("Neurosurgery", False, "hard"),
            ("Cardiothoracic Surgery", False, "hard"),
            ("Plastic Surgery", False, "medium"),
            ("Oncology", True, "medium"),
        ],
    },
    {
        "name": "Obstetrics and Gynecology",
        "year": 4,
        "mode": "both",
        "description": "Obstetric care and gynecological disorders.",
        "icon": "baby",
        "sort_order": 130,
        "topics": [
            ("Normal Obstetrics", True, "medium"),
            ("Abnormal Obstetrics", True, "hard"),
            ("Medical Disorders in Pregnancy", True, "hard"),
            ("Labor and Delivery", True, "medium"),
            ("Postpartum Care", True, "medium"),
            ("Gynecological Disorders", True, "medium"),
            ("Gynecological Oncology", True, "hard"),
            ("Infertility", False, "medium"),
            ("Family Planning Methods", True, "easy"),
        ],
    },
    {
        "name": "Pediatrics",
        "year": 4,
        "mode": "both",
        "description": "Pediatric growth, disease, and preventive care.",
        "icon": "heart",
        "sort_order": 140,
        "topics": [
            ("Growth and Development", True, "medium"),
            ("Neonatology", True, "hard"),
            ("Pediatric Nutrition", False, "easy"),
            ("Infectious Diseases in Children", True, "medium"),
            ("Respiratory Disorders", True, "medium"),
            ("Cardiovascular Disorders", True, "hard"),
            ("Neurological Disorders", True, "hard"),
            ("Genetic Disorders", False, "medium"),
            ("Immunization", True, "easy"),
        ],
    },
]


def main() -> None:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    print("Seeding syllabus subjects...")
    subject_rows = [
        {
            "name": subject["name"],
            "year": subject["year"],
            "mode": subject["mode"],
            "description": subject["description"],
            "icon": subject["icon"],
            "sort_order": subject["sort_order"],
        }
        for subject in SYLLABUS_DATA
    ]

    client.table("syllabus_subjects").upsert(subject_rows, on_conflict="name").execute()

    subject_lookup_resp = client.table("syllabus_subjects").select("id,name,mode").execute()
    subject_lookup = {row["name"]: row for row in (subject_lookup_resp.data or [])}

    topic_rows: List[Dict[str, Any]] = []
    for subject in SYLLABUS_DATA:
        subject_row = subject_lookup.get(subject["name"])
        if not subject_row:
            print(f"Skipping topics for {subject['name']} (subject missing)")
            continue

        print(f"Seeding topics for {subject['name']}...")
        for idx, (topic_name, is_high_yield, difficulty) in enumerate(subject["topics"], start=1):
            topic_rows.append(
                {
                    "subject_id": subject_row["id"],
                    "name": topic_name,
                    "description": f"{topic_name} essentials for {subject['name']}.",
                    "difficulty": difficulty,
                    "is_high_yield": bool(is_high_yield),
                    "neet_pg_relevant": subject_row["mode"] == "both",
                    "sort_order": idx,
                }
            )

    if topic_rows:
        client.table("syllabus_topics").upsert(topic_rows, on_conflict="subject_id,name").execute()

    final_subject_count = client.table("syllabus_subjects").select("id", count="exact").execute().count or 0
    final_topic_count = client.table("syllabus_topics").select("id", count="exact").execute().count or 0

    print("Syllabus seed completed.")
    print(f"Total subjects: {final_subject_count}")
    print(f"Total topics: {final_topic_count}")


if __name__ == "__main__":
    main()
