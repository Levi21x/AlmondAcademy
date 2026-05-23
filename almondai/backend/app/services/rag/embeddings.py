from __future__ import annotations

import logging
from typing import List

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingManager:
    def __init__(self) -> None:
        settings = get_settings()
        self.model_name = settings.embedding_model
        self._device: str | None = None
        self._model = None

    def _load_model(self) -> None:
        if self._model is not None:
            return

        import torch
        from sentence_transformers import SentenceTransformer

        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Loading embedding model %s on device %s", self.model_name, self._device)
        self._model = SentenceTransformer(self.model_name, device=self._device)

    def embed_text(self, text: str) -> List[float]:
        self._load_model()
        assert self._model is not None
        vector = self._model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        self._load_model()
        assert self._model is not None
        if not texts:
            return []

        vectors: List[List[float]] = []
        batch_size = 32
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            encoded = self._model.encode(batch, normalize_embeddings=True)
            vectors.extend(encoded.tolist())
        return vectors

    def get_model_info(self) -> dict:
        self._load_model()
        assert self._model is not None
        return {
            "model_name": self.model_name,
            "embedding_dimensions": int(self._model.get_sentence_embedding_dimension()),
            "device": self._device,
        }


_embedding_manager: EmbeddingManager | None = None


def get_embedding_manager() -> EmbeddingManager:
    global _embedding_manager
    if _embedding_manager is None:
        _embedding_manager = EmbeddingManager()
    return _embedding_manager
