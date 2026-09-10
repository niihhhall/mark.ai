import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.webhook import router as webhook_router
from app.outbound import router as outbound_router
from app.calcom import router as calcom_router
from app.training_api import router as training_router
from app.dashboard import router as dashboard_router
from app.config import settings
import sentry_sdk
import os

# 1. Initialize Sentry (Operational Excellence)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=settings.ENVIRONMENT
    )

# Configure logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s: %(message)s",
    stream=sys.stdout
)
from app.conversation_library import load_conversation_library
from app.redis_client import redis_client

logger = logging.getLogger(__name__)
logger.info("Application starting...")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    logger.info("Running startup tasks...")
    import asyncio
    from app.conversation_library import load_conversation_library
    from app.redis_client import redis_client
    from app.client_manager import client_manager

    # Wrap Redis initialization in a background task to prevent blocking health checks
    async def init_redis_data():
        try:
            logger.info("[Startup] Loading conversation library into Redis...")
            # Set a 10s timeout to avoid hanging the whole app if Redis is unreachable
            await asyncio.wait_for(load_conversation_library(redis_client.redis), timeout=60.0)
            logger.info("[Startup] OK: Conversation library loaded")
        except asyncio.TimeoutError:
            logger.error("[Startup] ERROR: Redis timeout during conversation library load. Check Security Groups.")
        except Exception as e:
            logger.error(f"[Startup] ERROR: Failed to load library: {e}")

    asyncio.create_task(init_redis_data())

    # Auto-initialize all clients (Module 6)
    asyncio.create_task(client_manager.init_all_clients())
    logger.info("OK: Multi-session client initialization triggered")

    yield

    # SHUTDOWN
    logger.info("Application shutting down.")

app = FastAPI(title="Markeye WhatsApp AI Agent — Mark", version="2.0.0", lifespan=lifespan)

# Enable CORS for local development & production (Fix 1)
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

from app.middleware import TelemetryMiddleware
app.add_middleware(TelemetryMiddleware)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

@app.get("/admin")
async def admin_redirect():
    return RedirectResponse(url="/admin/dashboard/")

# Serve the admin dashboard (Mark frontend). Resolve the built SPA from the
# first candidate path that exists so we support the frontend living either as a
# sibling repo (../mark-agent-front) or inside this repo (./mark-agent-front),
# tolerate the legacy name, and fall back to the bundled simple dashboard.
frontend_candidates = [
    settings.FRONTEND_DIST_PATH,   # explicit override via env (highest priority)
    "../mark-agent-front/dist",    # sibling repo build (default)
    "mark-agent-front/dist",       # in-repo build
    "../after5-agent-front/dist",  # legacy name (backward compat)
    "dashboard",                   # bundled simple dashboard (last resort)
]
dist_path = next((p for p in frontend_candidates if p and os.path.exists(p)), "dashboard")
app.mount("/admin/dashboard", StaticFiles(directory=dist_path, html=True), name="admin")
logger.info(f"[Dashboard] Serving admin UI from: {dist_path}")

app.include_router(webhook_router)
app.include_router(outbound_router)
app.include_router(calcom_router)
app.include_router(training_router)
app.include_router(dashboard_router)

@app.get("/")
async def health():
    return {"status": "Mark AI SDR is running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Global application startTime
import time
start_time_global = time.time()

@app.get("/metrics")
async def get_metrics():
    """Returns real-time operational stats."""
    metrics = await redis_client.get_metrics()
    uptime_seconds = int(time.time() - start_time_global)
    
    return {
        "uptime_seconds": uptime_seconds,
        "total_messages_processed": metrics.get("requests_total", 0),
        "total_llm_calls": metrics.get("total_llm_calls", 0),
        "llm_provider_usage": {
            "groq": metrics.get("llm_provider:groq", 0),
            "gemini": metrics.get("llm_provider:gemini", 0),
            "cerebras": metrics.get("llm_provider:cerebras", 0),
        },
        "llm_provider_fallbacks": {
            "groq": metrics.get("llm_fallback:groq", 0),
            "gemini": metrics.get("llm_fallback:gemini", 0),
            "cerebras": metrics.get("llm_fallback:cerebras", 0),
        },
        "errors_total": metrics.get("errors_http", 0),
        "estimated_token_burn": metrics.get("total_tokens", 0)
    }
