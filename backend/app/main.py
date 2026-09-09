"""
Smart School Transportation Management System — FastAPI Application
Main entry point with CORS, exception handlers, and router mounting.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import create_tables
from app.api.routes import auth, schools, buses, dashboard, tracking, users, drivers, students, routes, parents, driver_routes, notifications, reports, settings as admin_settings

settings = get_settings()

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting YellowBird API...")
    await create_tables()
    logger.info("✅ Database tables created / verified")

    # Seed demo data on first run
    from app.seed import seed_demo_data
    await seed_demo_data()

    yield
    logger.info("🛑 Shutting down YellowBird API")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-Time School Bus Tracking & Fleet Management Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=".*", # Allow absolutely ALL origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Mount API Routes
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(schools.router, prefix=settings.API_PREFIX)
app.include_router(buses.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(tracking.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(drivers.router, prefix=settings.API_PREFIX)
app.include_router(students.router, prefix=settings.API_PREFIX)
app.include_router(routes.router, prefix=settings.API_PREFIX)
app.include_router(parents.router, prefix=settings.API_PREFIX)
app.include_router(driver_routes.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(admin_settings.router, prefix=settings.API_PREFIX)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
