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
from cfd_backend.services.engine_registry import EngineRegistry
from cfd_backend.services.engineering_orchestrator import EngineeringOrchestrator

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


def run_engine_inventory():
    """CLI command to output engine inventory as JSON."""
    import asyncio
    settings = get_settings()
    engines = EngineRegistry(settings)
    inventory = asyncio.run(engines.inventory(refresh=True))
    import json
    print(json.dumps({"engines": inventory}, indent=2))


def run_workflow_snapshot(project_id: str):
    """CLI command to output workflow snapshot as JSON."""
    import asyncio
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    snapshot = asyncio.run(workflow.snapshot(project_id, refresh_engines=True))
    import json
    print(json.dumps(snapshot, indent=2, default=str))


def run_workflow_config(project_id: str, stage_id: str, recipe_json: str):
    """CLI command to configure a workflow stage."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    recipe = json.loads(recipe_json)
    result = asyncio.run(workflow.configure_stage(project_id, stage_id, recipe))
    print(json.dumps(result, indent=2, default=str))


def run_workflow_execute(project_id: str, stage_id: str, recipe_json: str = None):
    """CLI command to execute a workflow stage."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    recipe = json.loads(recipe_json) if recipe_json else None
    result = asyncio.run(workflow.execute_stage(project_id, stage_id, recipe))
    print(json.dumps(result, indent=2, default=str))


def run_workflow_job_create(project_id: str, stage_id: str, recipe_json: str = None):
    """CLI command to create a workflow job."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    recipe = json.loads(recipe_json) if recipe_json else None
    result = asyncio.run(workflow.create_job(project_id, stage_id, recipe, verify_engines=False))
    print(json.dumps(result, indent=2, default=str))


def run_workflow_job_transition(project_id: str, job_id: str, state: str, payload_json: str = None):
    """CLI command to transition a workflow job state."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    payload = json.loads(payload_json) if payload_json else {}
    error = payload.get("error")
    log_artifact_id = payload.get("log_artifact_id")
    result = asyncio.run(workflow.transition_job(project_id, job_id, state, error=error, log_artifact_id=log_artifact_id))
    print(json.dumps(result, indent=2, default=str))


def run_workflow_artifacts_list(project_id: str, stage_id: str = None):
    """CLI command to list workflow artifacts."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.list_artifacts(project_id, stage_id))
    print(json.dumps({"artifacts": result}, indent=2, default=str))


def run_workflow_artifact_read(project_id: str, artifact_id: str):
    """CLI command to read a workflow artifact."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.read_artifact(project_id, artifact_id))
    print(json.dumps(result, indent=2, default=str))


def run_workflow_artifact_export(project_id: str, artifact_id: str, payload_json: str):
    """CLI command to export a workflow artifact."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    payload = json.loads(payload_json)
    destination = payload.get("destination", "")
    result = asyncio.run(workflow.export_artifact(project_id, artifact_id, destination))
    print(json.dumps(result, indent=2, default=str))


def run_project_create(project_id: str):
    """CLI command to create a local project."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.create_project(project_id))
    print(json.dumps({"project": result}, indent=2, default=str))


def run_project_open(project_id: str):
    """CLI command to open a local project."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.open_project(project_id))
    print(json.dumps({"project": result}, indent=2, default=str))


def run_project_rename(project_id: str, new_project_id: str):
    """CLI command to rename a local project."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.rename_project(project_id, new_project_id))
    print(json.dumps({"project": result}, indent=2, default=str))


def run_project_archive(project_id: str):
    """CLI command to archive a local project."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.archive_project(project_id))
    print(json.dumps({"project": result}, indent=2, default=str))


def run_project_delete(project_id: str):
    """CLI command to delete a local project."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.delete_project(project_id))
    print(json.dumps({"project": result}, indent=2, default=str))


def run_project_list(include_archived: bool = False):
    """CLI command to list local projects."""
    import asyncio
    import json
    settings = get_settings()
    engines = EngineRegistry(settings)
    from cfd_backend.services.workflow_service import LocalWorkflowService
    workflow = LocalWorkflowService(settings, engines)
    result = asyncio.run(workflow.list_projects(include_archived))
    print(json.dumps({"projects": result}, indent=2, default=str))


def run_cli():
    """CLI entry point for Tauri local contract."""
    import sys
    if len(sys.argv) < 2:
        print("Usage: hxcfd_backend --engine-inventory | --workflow-snapshot <project_id> | --workflow-config <project_id> <stage_id> <recipe_json> | --workflow-execute <project_id> <stage_id> [<recipe_json>] | --workflow-job-create <project_id> <stage_id> [<recipe_json>] | --workflow-job-transition <project_id> <job_id> <state> [<payload_json>] | --workflow-artifacts-list <project_id> [<stage_id>] | --workflow-artifact-read <project_id> <artifact_id> | --workflow-artifact-export <project_id> <artifact_id> <payload_json> | --project-create <project_id> | --project-open <project_id> | --project-rename <project_id> <new_project_id> | --project-archive <project_id> | --project-delete <project_id> | --project-list [--include-archived]")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "--engine-inventory":
        run_engine_inventory()
    elif cmd == "--workflow-snapshot":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        run_workflow_snapshot(sys.argv[2])
    elif cmd == "--workflow-config":
        if len(sys.argv) < 5:
            print("Missing project_id, stage_id, or recipe_json")
            sys.exit(1)
        run_workflow_config(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "--workflow-execute":
        if len(sys.argv) < 4:
            print("Missing project_id or stage_id")
            sys.exit(1)
        recipe = sys.argv[4] if len(sys.argv) > 4 else None
        run_workflow_execute(sys.argv[2], sys.argv[3], recipe)
    elif cmd == "--workflow-job-create":
        if len(sys.argv) < 4:
            print("Missing project_id or stage_id")
            sys.exit(1)
        recipe = sys.argv[4] if len(sys.argv) > 4 else None
        run_workflow_job_create(sys.argv[2], sys.argv[3], recipe)
    elif cmd == "--workflow-job-transition":
        if len(sys.argv) < 5:
            print("Missing project_id, job_id, or state")
            sys.exit(1)
        payload = sys.argv[5] if len(sys.argv) > 5 else None
        run_workflow_job_transition(sys.argv[2], sys.argv[3], sys.argv[4], payload)
    elif cmd == "--workflow-artifacts-list":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        stage_id = sys.argv[3] if len(sys.argv) > 3 else None
        run_workflow_artifacts_list(sys.argv[2], stage_id)
    elif cmd == "--workflow-artifact-read":
        if len(sys.argv) < 4:
            print("Missing project_id or artifact_id")
            sys.exit(1)
        run_workflow_artifact_read(sys.argv[2], sys.argv[3])
    elif cmd == "--workflow-artifact-export":
        if len(sys.argv) < 5:
            print("Missing project_id, artifact_id, or payload_json")
            sys.exit(1)
        run_workflow_artifact_export(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "--project-create":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        run_project_create(sys.argv[2])
    elif cmd == "--project-open":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        run_project_open(sys.argv[2])
    elif cmd == "--project-rename":
        if len(sys.argv) < 4:
            print("Missing project_id or new_project_id")
            sys.exit(1)
        run_project_rename(sys.argv[2], sys.argv[3])
    elif cmd == "--project-archive":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        run_project_archive(sys.argv[2])
    elif cmd == "--project-delete":
        if len(sys.argv) < 3:
            print("Missing project_id")
            sys.exit(1)
        run_project_delete(sys.argv[2])
    elif cmd == "--project-list":
        include_archived = "--include-archived" in sys.argv
        run_project_list(include_archived)
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)


if __name__ == "__main__":
    # Check if running as CLI
    if len(sys.argv) > 1 and sys.argv[1].startswith("--"):
        run_cli()
    else:
        main()
