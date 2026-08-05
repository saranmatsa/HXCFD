"""
CFD Backend — FastAPI application for HX CFD local-first engineering.

The backend is a private local service owned by the HX CFD desktop shell
(Tauri). The live API surface is the narrow workflow contract at
``/api/v1/workflow``; the legacy aggregate public REST graph has been
removed (see ``cfd_backend.api.v1._legacy`` for the historical code and the
recovery plan). Any future public web API must be rebuilt deliberately on top
of typed schemas and services aligned with ``cfd_backend.models.*``.

Execution path:

    React frontend → Tauri command → private FastAPI workflow router
                  → LocalWorkflowService → EngineeringOrchestrator
                  → repository adapter → engineering engine (Gmsh/meshio/VTK/...)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Optional

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cfd_backend.core.config import Settings, get_settings
from cfd_backend.core.exceptions import setup_exception_handlers
from cfd_backend.core.logging import configure_logging, get_logger

if TYPE_CHECKING:
    from cfd_backend.core.dependencies import ServiceContainer


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: start and stop the service container."""
    settings = get_settings()
    logger = get_logger(__name__)

    logger.info("cfd_backend.starting", version=settings.app_version, env=settings.environment)

    # ServiceContainer owns the database, engine registry, and workflow service.
    # Import locally so module import does not require all optional scientific
    # deps to be present (⋱ useful for tooling and lightweight checks).
    from cfd_backend.core.dependencies import ServiceContainer

    container = ServiceContainer(settings)
    await container.initialize()
    app.state.service_container = container

    logger.info("cfd_backend.started")
    yield

    logger.info("cfd_backend.stopping")
    await container.shutdown()
    logger.info("cfd_backend.stopped")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="HX CFD backend — local-first engineering workflow service",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global structured exception handlers. Always mounted: desktop mode still
    # benefits from consistent error envelopes.
    setup_exception_handlers(app)

    # Live API surface: the desktop workflow contract. The router self-guards
    # with a per-launch bearer token under CFD_PLATFORM_TAURI=1; outside the
    # managed desktop process the guard is a no-op so dev/test can exercise it.
    from cfd_backend.api.v1.workflow import router as workflow_router

    app.include_router(workflow_router, prefix="/api/v1/workflow", tags=["Desktop Workflow"])

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """Liveness probe."""
        return {"status": "healthy", "version": settings.app_version}

    @app.get("/health/ready", tags=["Health"])
    async def readiness_check(request: Request) -> JSONResponse:
        """Readiness probe — service container fully initialized."""
        container: Optional[ServiceContainer] = getattr(
            request.app.state, "service_container", None
        )
        ready = container is not None and await container.is_ready()
        return JSONResponse(
            status_code=200 if ready else 503,
            content={"status": "ready" if ready else "not ready"},
        )

    return app


# Module-level app for uvicorn: `cfd_backend.main:app`.
app = create_app()


def main() -> None:
    """Production entry point."""
    settings = get_settings()
    uvicorn.run(
        "cfd_backend.main:app",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        log_config=None,  # structlog owns log formatting
        access_log=False,
    )


def dev_main() -> None:
    """Development entry point with auto-reload."""
    settings = get_settings()
    uvicorn.run(
        "cfd_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_config=None,
        access_log=False,
    )


if __name__ == "__main__":
    main()
