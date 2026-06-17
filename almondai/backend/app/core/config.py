from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE_PATH), env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = "dev-secret"
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"
    environment: str = "development"
    app_name: str = "AlmondAI"
    groq_api_key: str = ""
    admin_key: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    chroma_persist_dir: str = "./data/chromadb"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    groq_model: str = "llama-3.1-70b-versatile"
    max_tokens: int = 8192
    llm_provider: str = "groq"
    chunk_size: int = 512
    chunk_overlap: int = 50
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    tavily_api_key: str = ""
    openrouter_api_key: str = ""
    # Voice mode (STT: Sarvam, LLM: Groq, TTS: Deepgram Aura)
    sarvam_api_key: str = ""
    sarvam_model: str = "saarika:v2.5"
    sarvam_language_code: str = "en-IN"
    deepgram_api_key: str = ""
    deepgram_tts_model: str = "aura-2-orion-en"
    deepgram_sample_rate: int = 44100
    groq_voice_model: str = "llama-3.1-8b-instant"

    @field_validator("allowed_origins")
    @classmethod
    def normalize_origins(cls, value: str) -> str:
        return ",".join([origin.strip() for origin in value.split(",") if origin.strip()])

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
