from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import chromadb
import fitz

from app.core.config import get_settings
from app.services.rag.embeddings import EmbeddingManager, get_embedding_manager

try:
    import pdfplumber
except Exception:  # pragma: no cover - optional dependency at runtime
    pdfplumber = None

try:
    import tiktoken
except Exception:  # pragma: no cover - optional dependency at runtime
    tiktoken = None


class DocumentIngester:
    def __init__(self, embedding_manager: Optional[EmbeddingManager] = None) -> None:
        settings = get_settings()
        self.embedding_manager = embedding_manager or get_embedding_manager()
        self.client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self.chunk_size = 500
        self.chunk_overlap = 75
        self.encoder = tiktoken.get_encoding("cl100k_base") if tiktoken else None

    @staticmethod
    def _normalize_folder_type(value: str) -> str:
        cleaned = re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
        if "exam" in cleaned:
            return "exam_oriented"
        if "reference" in cleaned:
            return "reference"
        if "practical" in cleaned or "dissection" in cleaned:
            return "practical"
        return cleaned or "general"

    @staticmethod
    def _clean_book_name(file_name: str) -> str:
        stem = Path(file_name).stem
        stem = re.sub(r"[_\-]+", " ", stem)
        stem = re.sub(r"\s+", " ", stem)
        return stem.strip()

    def _token_count(self, text: str) -> int:
        if self.encoder:
            return len(self.encoder.encode(text))
        return max(1, int(len(text.split()) * 1.3))

    def _detect_heading(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.splitlines()[:8] if line.strip()]
        for line in lines:
            if len(line) > 60:
                continue
            if line.isupper():
                return line
            if re.match(r"^(chapter|unit|section)\b", line, flags=re.IGNORECASE):
                return line
        return None

    def _extract_folder_type(self, relative_parts: List[str]) -> str:
        # Evaluate deepest folders first because they usually encode exam/reference/practical intent.
        for part in reversed(relative_parts):
            normalized = self._normalize_folder_type(part)
            if normalized in {"exam_oriented", "reference", "practical"}:
                return normalized
        return "general"

    def find_all_pdfs(self, root_folder: str) -> List[Dict[str, str]]:
        root = Path(root_folder).resolve()
        results: List[Dict[str, str]] = []

        for candidate in root.rglob("*"):
            if not candidate.is_file() or candidate.suffix.lower() != ".pdf":
                continue

            relative_path = candidate.relative_to(root)
            folder_parts = list(relative_path.parts[:-1])
            subject = folder_parts[0] if folder_parts else "General"
            folder_type = self._extract_folder_type(folder_parts)

            results.append(
                {
                    "absolute_path": str(candidate.resolve()),
                    "relative_path": relative_path.as_posix(),
                    "source_file": candidate.name,
                    "subject": subject,
                    "folder_type": folder_type,
                    "book_name": self._clean_book_name(candidate.name),
                }
            )

        return sorted(results, key=lambda item: item["relative_path"].lower())

    def extract_text_from_pdf(self, pdf_path: str) -> List[Dict[str, Any]]:
        pages: List[Dict[str, Any]] = []

        if pdfplumber is not None:
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    for page_number, page in enumerate(pdf.pages, start=1):
                        text = (page.extract_text() or "").strip()
                        if len(text) < 50:
                            continue
                        pages.append(
                            {
                                "text": text,
                                "page_number": page_number,
                                "possible_chapter": self._detect_heading(text),
                            }
                        )
                if pages:
                    return pages
            except Exception as exc:
                print(f"[ingestion_warn] pdfplumber failed for {pdf_path}: {exc}")
                pages = []

        try:
            with fitz.open(pdf_path) as document:
                for page_number, page in enumerate(document, start=1):
                    text = (page.get_text("text") or "").strip()
                    if len(text) < 50:
                        continue
                    pages.append(
                        {
                            "text": text,
                            "page_number": page_number,
                            "possible_chapter": self._detect_heading(text),
                        }
                    )
        except Exception as exc:
            raise RuntimeError(f"PyMuPDF fallback failed for {pdf_path}: {exc}") from exc

        return pages

    def _split_to_sentences(self, text: str) -> List[str]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        return sentences or [text.strip()]

    def _split_long_segment(self, text: str) -> List[str]:
        text = text.strip()
        if not text:
            return []
        if self._token_count(text) <= self.chunk_size:
            return [text]

        line_units = [line.strip() for line in text.split("\n") if line.strip()]
        if len(line_units) > 1:
            split_units: List[str] = []
            for line in line_units:
                if self._token_count(line) <= self.chunk_size:
                    split_units.append(line)
                else:
                    split_units.extend(self._split_to_sentences(line))
            return split_units

        return self._split_to_sentences(text)

    def _collect_overlap(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        overlap_segments: List[Dict[str, Any]] = []
        overlap_tokens = 0
        for segment in reversed(segments):
            segment_tokens = self._token_count(segment["text"])
            if overlap_tokens + segment_tokens > self.chunk_overlap:
                break
            overlap_segments.insert(0, segment)
            overlap_tokens += segment_tokens
        return overlap_segments

    def chunk_text(self, pages: List[Dict[str, Any]], metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        segments: List[Dict[str, Any]] = []
        for page in pages:
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", page["text"]) if p.strip()]
            for paragraph in paragraphs:
                for segment_text in self._split_long_segment(paragraph):
                    cleaned_segment = segment_text.strip()
                    if not cleaned_segment:
                        continue
                    segments.append(
                        {
                            "text": cleaned_segment,
                            "page_number": page["page_number"],
                            "possible_chapter": page.get("possible_chapter"),
                        }
                    )

        chunks: List[Dict[str, Any]] = []
        current_segments: List[Dict[str, Any]] = []
        current_tokens = 0
        chunk_index = 0

        def flush_chunk() -> None:
            nonlocal current_segments, current_tokens, chunk_index
            if not current_segments:
                return

            chunk_text_value = "\n\n".join(segment["text"] for segment in current_segments).strip()
            if not chunk_text_value:
                return

            page_numbers = [segment["page_number"] for segment in current_segments if segment.get("page_number")]
            chapter_candidates = [
                segment.get("possible_chapter")
                for segment in current_segments
                if segment.get("possible_chapter")
            ]

            chunk_metadata = dict(metadata)
            chunk_metadata["chunk_id"] = str(uuid4())
            chunk_metadata["chunk_index"] = chunk_index
            if page_numbers:
                chunk_metadata["page_number"] = min(page_numbers)
                chunk_metadata["page_start"] = min(page_numbers)
                chunk_metadata["page_end"] = max(page_numbers)
            if chapter_candidates:
                chunk_metadata["chapter"] = chapter_candidates[-1]

            detected_heading = self._detect_heading(chunk_text_value)
            if detected_heading:
                chunk_metadata["heading"] = detected_heading

            chunks.append({"text": chunk_text_value, "metadata": chunk_metadata})
            current_segments = []
            current_tokens = 0
            chunk_index += 1

        for segment in segments:
            segment_tokens = self._token_count(segment["text"])
            if current_segments and current_tokens + segment_tokens > self.chunk_size:
                previous_segments = list(current_segments)
                flush_chunk()
                current_segments = self._collect_overlap(previous_segments)
                current_tokens = sum(self._token_count(item["text"]) for item in current_segments)

            current_segments.append(segment)
            current_tokens += segment_tokens

        flush_chunk()
        return chunks

    def ingest_documents(
        self,
        documents: List[Dict[str, str]],
        collection_name: str = "almond_medical_docs",
        force_reingest: bool = False,
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        total_chunks = 0
        processed_pdfs = 0
        per_subject: Dict[str, Dict[str, Any]] = {}

        for pdf in documents:
            subject = pdf.get("subject") or "General"
            per_subject.setdefault(subject, {"pdfs": 0, "chunks": 0, "status": "ok"})
            per_subject[subject]["pdfs"] += 1

            try:
                if not force_reingest:
                    existing = collection.get(where={"source_file": pdf["source_file"]}, include=[])
                    if existing.get("ids"):
                        print(f"Skipped (already ingested): {pdf['book_name']}")
                        continue

                pages = self.extract_text_from_pdf(pdf["absolute_path"])
                if not pages:
                    print(f"Skipped (no extractable text): {pdf['book_name']}")
                    continue

                chunks = self.chunk_text(
                    pages,
                    metadata={
                        "source_file": pdf["source_file"],
                        "subject": pdf["subject"],
                        "folder_type": pdf["folder_type"],
                        "book_name": pdf["book_name"],
                        "relative_path": pdf["relative_path"],
                    },
                )
                if not chunks:
                    print(f"Skipped (chunking produced no content): {pdf['book_name']}")
                    continue

                if dry_run:
                    print(f"[dry-run] {pdf['book_name']} - {len(chunks)} chunks")
                    per_subject[subject]["chunks"] += len(chunks)
                    total_chunks += len(chunks)
                    processed_pdfs += 1
                    continue

                docs = [chunk["text"] for chunk in chunks]
                metadatas = [chunk["metadata"] for chunk in chunks]
                ids = [chunk["metadata"]["chunk_id"] for chunk in chunks]
                embeddings = self.embedding_manager.embed_batch(docs)
                collection.add(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings)

                per_subject[subject]["chunks"] += len(chunks)
                processed_pdfs += 1
                total_chunks += len(chunks)
                print(f"Ingested: {pdf['book_name']} - {len(chunks)} chunks")
            except Exception as exc:
                per_subject[subject]["status"] = "error"
                print(f"Failed: {pdf.get('book_name', pdf.get('source_file', 'unknown'))} ({exc})")
                continue

        print(f"Total PDFs: {len(documents)} | Total chunks: {total_chunks} | Collection: {collection_name}")
        return {
            "total_pdfs": len(documents),
            "processed_pdfs": processed_pdfs,
            "total_chunks": total_chunks,
            "collection_name": collection_name,
            "per_subject": per_subject,
        }

    def ingest_folder(
        self,
        folder_path: str,
        collection_name: str = "almond_medical_docs",
        force_reingest: bool = False,
    ) -> Dict[str, Any]:
        documents = self.find_all_pdfs(folder_path)
        return self.ingest_documents(
            documents=documents,
            collection_name=collection_name,
            force_reingest=force_reingest,
            dry_run=False,
        )


DocumentIngestionPipeline = DocumentIngester
