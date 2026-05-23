from __future__ import annotations

import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class TavilySearchService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.tavily_api_key:
            self.enabled = False
            return
        try:
            from tavily import TavilyClient
            self.client = TavilyClient(api_key=settings.tavily_api_key)
            self.enabled = True
        except Exception:
            logger.exception("Tavily client init failed")
            self.enabled = False

    def search(self, query: str, max_results: int = 3) -> str:
        if not self.enabled:
            return ""
        try:
            results = self.client.search(
                query=f"medical {query} MBBS NEET",
                search_depth="basic",
                max_results=max_results,
            )
            formatted = []
            for r in results.get("results", []):
                formatted.append(
                    f"Source: {r['url']}\n"
                    f"Title: {r['title']}\n"
                    f"Content: {r['content'][:300]}"
                )
            return "\n\n".join(formatted) if formatted else ""
        except Exception as exc:
            logger.warning("Tavily search failed: %s", exc)
            return ""
