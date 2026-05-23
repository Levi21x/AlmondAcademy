from __future__ import annotations

import re
from typing import Dict, List, Optional

from app.services.rag.vector_store import ChromaVectorStore


class RAGRetriever:
    def __init__(self, vector_store: Optional[ChromaVectorStore] = None) -> None:
        self.vector_store = vector_store or ChromaVectorStore()

    def retrieve(self, query: str, subject_filter: str | None = None, n_results: int = 5) -> List[Dict]:
        return self.vector_store.search(query=query, n_results=n_results, subject_filter=subject_filter)

    @staticmethod
    def _clean_text(value: str) -> str:
        text = str(value or "")
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    @staticmethod
    def _format_folder_label(folder_type: str) -> str:
        normalized = str(folder_type or "").strip().lower()
        if normalized == "exam_oriented":
            return "Exam-Oriented"
        if normalized == "reference":
            return "Reference"
        if normalized == "practical":
            return "Practical"
        if not normalized:
            return "General"
        return normalized.replace("_", " ").title()

    @staticmethod
    def _score_with_preference(item: Dict, preferred_folder: str) -> float:
        metadata = item.get("metadata") or {}
        folder_type = str(metadata.get("folder_type") or "").lower().strip()
        base_distance = float(item.get("distance", 1.0))

        boost = 0.0
        if folder_type == preferred_folder:
            boost = 0.15
        elif preferred_folder == "exam_oriented" and "exam" in folder_type:
            boost = 0.1

        return base_distance - boost

    def retrieve_with_context(
        self,
        query: str,
        conversation_history: List[Dict] = [],
        subject_filter: str | None = None,
        folder_type_preference: str | None = None,
        n_results: int = 5,
    ) -> str:
        history_tail = (conversation_history or [])[-3:]
        history_text = " ".join(
            turn.get("content")
            or turn.get("question")
            or turn.get("answer")
            or ""
            for turn in history_tail
        )
        contextual_query = f"{history_text}\n{query}".strip()

        fetch_size = max(n_results * 3, 12)
        matches = self.retrieve(
            query=contextual_query,
            subject_filter=subject_filter,
            n_results=fetch_size,
        )

        if subject_filter and len(matches) < 3:
            matches = self.retrieve(
                query=contextual_query,
                subject_filter=None,
                n_results=fetch_size,
            )

        preferred_folder = (folder_type_preference or "exam_oriented").lower().strip()
        if preferred_folder:
            matches = sorted(matches, key=lambda item: self._score_with_preference(item, preferred_folder))

        matches = matches[:n_results]
        if not matches:
            return "No relevant retrieved medical context found in indexed documents."

        parts: List[str] = []
        for item in matches:
            metadata = item.get("metadata") or {}
            source = metadata.get("book_name") or metadata.get("source_file") or "Unknown source"
            source = self._clean_text(source)
            subject = self._clean_text(metadata.get("subject", "Unknown"))
            folder_type = str(metadata.get("folder_type") or "").strip().lower()
            page_number = metadata.get("page_number") or metadata.get("page_start") or "?"
            folder_label = self._format_folder_label(folder_type)
            chunk_text = self._clean_text(item.get("text", ""))
            if not chunk_text:
                continue

            parts.append(
                f"[Source: {source} | Subject: {subject} | Folder: {folder_label} | Page: {page_number}]\n"
                f"{chunk_text}"
            )

        if not parts:
            return "No relevant retrieved medical context found in indexed documents."

        body = "\n\n".join(parts)
        return (
            "RETRIEVED TEXTBOOK CONTENT - USE THIS AS YOUR PRIMARY SOURCE:\n"
            "================================================================\n\n"
            f"{body}\n\n"
            "================================================================"
        )
