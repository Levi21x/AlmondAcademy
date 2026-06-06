from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.achievements import router as achievements_router
from app.api.routes.doubt_solver import router as doubt_solver_router
from app.api.routes.chat_history import router as chat_history_router
from app.api.routes.syllabus import router as syllabus_router
from app.api.routes.progress import router as progress_router
from app.api.routes.planner import router as planner_router
from app.api.routes.memory import router as memory_router
from app.api.routes.voice import router as voice_router
from app.api.routes.mcq import router as mcq_router
from app.api.routes.crisis import router as crisis_router
from app.api.routes.weakness import router as weakness_router
from app.api.routes.visuals import router as visuals_router
from app.api.routes.payments import router as payments_router
from app.api.routes.peer import router as peer_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.clinical import router as clinical_router
from app.core.config import clear_settings_cache, get_settings
from app.middleware.error_handler import register_error_handlers

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")

dev_origins = ["http://localhost:3000", "http://localhost:3001"]
allowed_origins = list(dict.fromkeys([*settings.cors_origins, *dev_origins]))

# CORS must be the first middleware so preflight and API responses always get CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(auth_router)
app.include_router(achievements_router)
app.include_router(doubt_solver_router)
app.include_router(chat_history_router)
app.include_router(syllabus_router)
app.include_router(progress_router)
app.include_router(planner_router)
app.include_router(memory_router)
app.include_router(voice_router)
app.include_router(mcq_router)
app.include_router(crisis_router)
app.include_router(weakness_router)
app.include_router(visuals_router)
app.include_router(payments_router)
app.include_router(peer_router)
app.include_router(feedback_router)
app.include_router(clinical_router)


@app.on_event("startup")
async def refresh_settings_cache_on_startup() -> None:
    clear_settings_cache()


@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str) -> dict:
    return {}


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "product": "AlmondAI",
    }
