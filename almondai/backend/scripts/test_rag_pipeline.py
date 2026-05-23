from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.services.llm.prompt_builder import build_system_prompt
from app.services.rag.embeddings import get_embedding_manager
from app.services.rag.ingestion import DocumentIngestionPipeline
from app.services.rag.pipeline import AlmondRAGPipeline
from app.services.rag.retriever import RAGRetriever
from app.services.rag.vector_store import ChromaVectorStore


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


async def run() -> None:
    settings = get_settings()
    vector_store = ChromaVectorStore()

    print("TEST 1 - ChromaDB setup")
    stats = vector_store.get_collection_stats()
    assert_true(stats["collection_name"] == "almond_medical", "Unexpected collection name")
    assert_true(Path(settings.chroma_persist_dir).exists(), "Chroma persist directory missing")
    print("  passed")

    print("TEST 2 - Embedding pipeline")
    embedding_manager = get_embedding_manager()
    info = embedding_manager.get_model_info()
    vec = embedding_manager.embed_text("cardiac muscle contracts rhythmically")
    batch = embedding_manager.embed_batch([f"text {i}" for i in range(10)])
    assert_true(len(vec) == info["embedding_dimensions"], "Embedding dimension mismatch")
    assert_true(len(batch) == 10, "Batch embedding size mismatch")
    print(f"  passed (device={info['device']}, dims={info['embedding_dimensions']})")

    print("TEST 3 - Ingestion and retrieval")
    sample_file = Path(__file__).resolve().parents[1] / "data" / "raw" / "textbooks" / "sample_cardiology.txt"
    assert_true(sample_file.exists(), "Sample cardiology file is missing")

    ingestion = DocumentIngestionPipeline(vector_store=vector_store)
    ingest_result = ingestion.ingest_text_file(str(sample_file), subject="cardiology", topic="fundamentals")
    assert_true(ingest_result["chunks_stored"] > 0, "No chunks stored")

    search_results = vector_store.search("cardiac muscle", n_results=3)
    assert_true(len(search_results) > 0, "No search results returned")
    assert_true("metadata" in search_results[0], "Search metadata missing")
    print("  passed")

    print("TEST 4 - Groq connectivity")
    if not settings.groq_api_key or settings.groq_api_key == "your_groq_api_key_here":
        print("  skipped (missing GROQ_API_KEY)")
    else:
        from app.services.llm.groq_client import GroqLLMClient

        client = GroqLLMClient()
        response = await client.generate_sync("What is myocardial infarction?", build_system_prompt("sprinter", "concise"))
        assert_true(bool(response.strip()), "Groq response was empty")
        print("  passed")

    print("TEST 5 - RAG pipeline")
    if not settings.groq_api_key or settings.groq_api_key == "your_groq_api_key_here":
        print("  skipped (missing GROQ_API_KEY)")
    else:
        pipeline = AlmondRAGPipeline(retriever=RAGRetriever(vector_store=vector_store))
        answer = await pipeline.process_question_sync(
            user_id="test-user",
            question="Explain the cardiac cycle",
            student_category="sprinter",
            teaching_style="concise",
            conversation_history=[],
            subject_filter="cardiology",
        )
        assert_true(bool(answer.strip()), "RAG answer was empty")
        print("  passed")

    print("All available RAG tests passed.")


if __name__ == "__main__":
    asyncio.run(run())
