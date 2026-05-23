from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.rag.ingestion import DocumentIngester


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest PDF documents into AlmondAI ChromaDB")
    parser.add_argument("--folder", type=str, default=None, help="Student learning resources folder path")
    parser.add_argument("--force", action="store_true", help="Reingest even if PDF appears already ingested")
    parser.add_argument("--subject", type=str, default=None, help="Only ingest one subject folder")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be ingested without writing")
    return parser.parse_args()


def _is_learning_resource_folder(name: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", " ", name.lower())
    return "student" in normalized and "learning" in normalized and "resource" in normalized


def detect_default_folder() -> Path | None:
    candidates: list[Path] = []
    search_roots = [PROJECT_ROOT, ROOT.parent, ROOT]

    for search_root in search_roots:
        if not search_root.exists():
            continue
        for current, dirs, _ in os.walk(search_root):
            for directory in dirs:
                if _is_learning_resource_folder(directory):
                    candidates.append((Path(current) / directory).resolve())

    if not candidates:
        return None

    unique_candidates = sorted({str(path): path for path in candidates}.values(), key=lambda item: len(item.parts))
    return unique_candidates[0]


def main() -> None:
    args = parse_args()
    folder = Path(args.folder).resolve() if args.folder else detect_default_folder()
    if not folder:
        print("Could not auto-detect student learning resources folder. Pass --folder explicitly.")
        return
    if not folder.exists():
        print(f"Folder does not exist: {folder}")
        return

    print(f"Using folder: {folder}")
    ingester = DocumentIngester()
    all_pdfs = ingester.find_all_pdfs(str(folder))
    if args.subject:
        all_pdfs = [pdf for pdf in all_pdfs if pdf["subject"].lower() == args.subject.lower()]

    if not all_pdfs:
        print("No PDFs found for ingestion.")
        return

    print(f"Discovered {len(all_pdfs)} PDFs")
    summary = ingester.ingest_documents(
        documents=all_pdfs,
        collection_name="almond_medical_docs",
        force_reingest=args.force,
        dry_run=args.dry_run,
    )

    print("\nSummary")
    print("Subject | PDFs | Chunks | Status")
    print("---------------------------------")
    for subject, stats in sorted(summary["per_subject"].items()):
        status = "✓" if stats["status"] == "ok" else "!"
        if args.dry_run and status == "✓":
            status = "~"
        print(f"{subject} | {stats['pdfs']} | {stats['chunks']} | {status}")
    print(
        f"\nTotal PDFs: {summary['total_pdfs']} | "
        f"Processed: {summary['processed_pdfs']} | "
        f"Chunks: {summary['total_chunks']}"
    )


if __name__ == "__main__":
    main()
