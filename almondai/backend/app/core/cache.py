from __future__ import annotations

import hashlib
import threading
from typing import Any, Optional

from cachetools import TTLCache

_LOCK = threading.Lock()

# Static syllabus data (subjects + topics) — changes only on DB seed
syllabus_cache: TTLCache = TTLCache(maxsize=128, ttl=3600)  # 1 hour

# RAG vector search — expensive embedding + ChromaDB query
rag_cache: TTLCache = TTLCache(maxsize=512, ttl=600)  # 10 minutes

# Per-user lightweight data (achievements, progress summaries)
user_cache: TTLCache = TTLCache(maxsize=2000, ttl=300)  # 5 minutes


def make_key(*parts: Any) -> str:
    raw = "|".join(str(p) for p in parts)
    return hashlib.md5(raw.encode()).hexdigest()


def cache_get(cache: TTLCache, key: str) -> Optional[Any]:
    with _LOCK:
        return cache.get(key)


def cache_set(cache: TTLCache, key: str, value: Any) -> None:
    with _LOCK:
        try:
            cache[key] = value
        except ValueError:
            pass  # cache full — eviction will happen on next access


def cache_delete(cache: TTLCache, key: str) -> None:
    with _LOCK:
        cache.pop(key, None)


def invalidate_user(user_id: str) -> None:
    """Drop all cached entries for a specific user (call after writes)."""
    prefix = make_key("user", user_id)
    with _LOCK:
        keys_to_drop = [k for k in list(user_cache.keys()) if str(k).startswith(prefix[:8])]
        for k in keys_to_drop:
            user_cache.pop(k, None)
