from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator, Dict
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routers import (
    accounts_router,
    analytics_router,
    auth_router,
    categories_router,
    transactions_router,
)
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine, init_db
from app.core.jalali import get_current_jalali_period

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("finflow")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager handling database initialization and resource cleanup.
    """
    logger.info("Starting up %s...", settings.PROJECT_NAME)
    try:
        await init_db()
        logger.info("Database schemas and seed data ready.")
    except Exception as e:
        logger.error("Failed to initialize database: %s", e)
        # We don't crash here to allow health check diagnostics
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    await engine.dispose()
    logger.info("Database connection engine disposed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Self-hosted personal finance PWA backend with Persian Jalali calendar support and k-Toman currency scaling.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(accounts_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")


@app.get(
    "/api/health",
    tags=["System"],
    summary="Health check",
    description="Validates API runtime status and PostgreSQL database connectivity.",
)
async def health_check() -> Dict[str, str]:
    db_status = "healthy"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Database health check probe failed: %s", exc)
        db_status = f"unreachable ({type(exc).__name__})"

    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "database": db_status,
        "jalali_period": get_current_jalali_period(),
        "currency_unit": settings.DEFAULT_CURRENCY_SYMBOL,
    }


@app.get(
    "/",
    tags=["System"],
    summary="Root entry",
)
async def root_entry() -> Dict[str, str]:
    return {
        "name": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "current_jalali_period": get_current_jalali_period(),
    }
