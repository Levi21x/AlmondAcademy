from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional

import chromadb

from app.core.config import get_settings
from app.services.rag.embeddings import EmbeddingManager, get_embedding_manager


logger = logging.getLogger(__name__)


class ChromaVectorStore:
    def __init__(self, embedding_manager: Optional[EmbeddingManager] = None) -> None:
        settings = get_settings()
        self.collection_name = "almond_medical_docs"
        self.embedding_manager = embedding_manager or get_embedding_manager()
        self.client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(self, chunks: List[Dict[str, Any]]) -> None:
        if not chunks:
            return

        documents = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        ids = [chunk["metadata"].get("chunk_id") for chunk in chunks]
        embeddings = self.embedding_manager.embed_batch(documents)

        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def search(
        self,
        query: str,
        n_results: int = 5,
        subject_filter: Optional[str] = None,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        effective_where = where
        if effective_where is None and subject_filter:
            effective_where = {"subject": subject_filter}

        query_embedding = self.embedding_manager.embed_text(query)

        response = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=effective_where,
        )

        documents = response.get("documents", [[]])[0]
        metadatas = response.get("metadatas", [[]])[0]
        distances = response.get("distances", [[]])[0]

        results: List[Dict[str, Any]] = []
        for text, metadata, distance in zip(documents, metadatas, distances):
            results.append(
                {
                    "text": text,
                    "metadata": metadata,
                    "distance": float(distance),
                }
            )
        return results

    def get_collection_stats(self) -> Dict[str, Any]:
        return {
            "total_documents": self.collection.count(),
            "collection_name": self.collection_name,
        }

    def delete_collection(self) -> None:
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def get_or_create_student_collection(self, user_id: str):
        collection_name = f"student_memory_{user_id[:8]}"
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_interaction_memory(
        self,
        user_id: str,
        interaction_id: str,
        question: str,
        answer: str,
        subject: str = None,
        topics_mentioned: list[str] = None,
    ) -> None:
        try:
            collection = self.get_or_create_student_collection(user_id)
            document = f"Q: {question}\nA: {answer[:500]}"
            embedding = self.embedding_manager.embed_text(document)
            metadata = {
                "interaction_id": interaction_id,
                "subject": subject or "unknown",
                "topics_mentioned": json.dumps(topics_mentioned or []),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id,
            }
            collection.add(
                ids=[interaction_id],
                documents=[document],
                metadatas=[metadata],
                embeddings=[embedding],
            )
        except Exception:
            logger.exception("Failed to add interaction memory for user %s", user_id)

    def search_student_memory(self, user_id: str, query: str, n_results: int = 3) -> list[dict]:
        collection_name = f"student_memory_{user_id[:8]}"
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception:
            return []

        try:
            query_embedding = self.embedding_manager.embed_text(query)
            response = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
            )

            documents = response.get("documents", [[]])[0]
            metadatas = response.get("metadatas", [[]])[0]
            distances = response.get("distances", [[]])[0]

            results: list[dict] = []
            for document, metadata, distance in zip(documents, metadatas, distances):
                question = ""
                answer = ""
                if isinstance(document, str):
                    lines = document.split("\n")
                    if lines:
                        question = lines[0].replace("Q:", "").strip()
                    if len(lines) > 1:
                        answer = "\n".join(lines[1:]).replace("A:", "", 1).strip()

                topics_raw = (metadata or {}).get("topics_mentioned", "[]")
                try:
                    topics = json.loads(topics_raw) if isinstance(topics_raw, str) else []
                except Exception:
                    topics = []

                results.append(
                    {
                        "question": question,
                        "answer": answer,
                        "interaction_id": (metadata or {}).get("interaction_id"),
                        "subject": (metadata or {}).get("subject"),
                        "topics_mentioned": topics,
                        "timestamp": (metadata or {}).get("timestamp"),
                        "distance": float(distance),
                    }
                )

            return results
        except Exception:
            logger.exception("Failed to search student memory for user %s", user_id)
            return []

    def get_student_memory_stats(self, user_id: str) -> dict:
        collection_name = f"student_memory_{user_id[:8]}"
        try:
            collection = self.client.get_collection(name=collection_name)
        except Exception:
            return {
                "total_interactions": 0,
                "subjects_covered": [],
                "collection_exists": False,
            }

        try:
            count = int(collection.count() or 0)
            metadatas = collection.get(include=["metadatas"]).get("metadatas", [])
            subjects = sorted(
                {
                    str(metadata.get("subject"))
                    for metadata in metadatas
                    if isinstance(metadata, dict) and metadata.get("subject") and metadata.get("subject") != "unknown"
                }
            )
            return {
                "total_interactions": count,
                "subjects_covered": subjects,
                "collection_exists": True,
            }
        except Exception:
            logger.exception("Failed to fetch student memory stats for user %s", user_id)
            return {
                "total_interactions": 0,
                "subjects_covered": [],
                "collection_exists": True,
            }
