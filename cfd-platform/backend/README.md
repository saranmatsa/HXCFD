# HX CFD Backend

FastAPI backend for HX CFD — a local-first engineering platform that connects
CAD, meshing, CFD simulation, optimization, AI assistance, and visualization
into one workflow. The backend is owned by the HX CFD desktop shell (Tauri),
which launches it as a private loopback FastAPI process guarded by a per-launch
bearer token.

## Execution path

```
React frontend → Tauri command → /api/v1/workflow/* (FastAPI, loopback-only)
              → LocalWorkflowService → EngineeringOrchestrator
              → repository adapter → engine (Gmsh / meshio / VTK / Nevergrad / ...)
```

The browser preview at `http://127.0.0.1:5173` cannot reach this API directly;
only the trusted Tauri process is given the per-launch token.

## Project structure

```
backend/src/cfd_backend/
├── main.py                       FastAPI app + uvicorn entry points
├── core/
│   ├── config.py                 Pydantic Settings (env-driven, cached)
│   ├── dependencies.py           ServiceContainer — DB/Redis/Celery/engines lifecycle
│   ├── exceptions.py             Domain exception hierarchy + global handlers
│   ├── logging.py                structlog configuration (JSON|console)
│   └── security.py               bcrypt password hashing + JWT encode/decode
├── api/
│   ├── __init__.py               (package marker; no aggregate router)
│   └── v1/
│       ├── __init__.py            get_workflow_router() — the live surface
│       ├── workflow.py            Desktop workflow endpoints (token-guarded)
│       └── _legacy/               QUARANTINED broken legacy REST surface
├── schemas/                       Pydantic request/response models, aligned to ORM
│   ├── common.py                  PaginatedResponse, ErrorResponse, HealthResponse
│   ├── project.py | mesh.py | simulation.py
│   └── optimization.py | user.py
├── models/                        SQLAlchemy 2.0 ORM models (single Base)
│   ├── base.py                    Base, TimestampMixin, UUIDMixin, SoftDeleteMixin
│   └── project.py | simulation.py | mesh.py | optimization.py
│       | solver.py | simulation_result.py | user.py
└── services/
    ├── container.py               Re-exports ServiceContainer
    ├── workflow_service.py         Live CFD workflow orchestration (the kernel)
    ├── engineering_orchestrator.py Real engine execution (Gmsh / cfMesh / VTK)
    ├── engine_registry.py          Detection + versioning of 14 canonical engines
    └── entity/
        ├── base.py                 BaseService[ModelT] — get/list/delete plumbing
        ├── project_service.py      Project CRUD + visibility policy
        ├── mesh_service.py         Mesh CRUD scoped to a project
        └── simulation_service.py   Simulation CRUD scoped to a project
```

## Why the legacy REST surface was quarantined

The previous public REST routers (`api/v1/auth.py`, `projects.py`, `meshes.py`,
`simulations.py`, `users.py`, `solvers.py`, `optimization.py`, `post.py`) were
built before the canonical ORM models stabilised. They declared inline Pydantic
schemas that referenced attributes that did not exist on the eventual models
(`Project.solver`, `Project.reference_velocity`, `Mesh.file_size`,
`Simulation.cpu_hours`, ...). The routes would have raised `AttributeError` at
request time. They were never mounted in the live desktop path (`workflow` only
under `CFD_PLATFORM_TAURI=1`), so quarantining them removed dead code without
regression. Any future public REST API must be rebuilt on the typed schemas in
`cfd_backend.schemas.*` and the typed services in `cfd_backend.services.entity`.

The `_legacy/` directory is kept for reference and recovery: re-align a router's
schemas to the canonical models, hand its persistence to the entity services,
and re-mount deliberately — never silently.

## Configuration

All settings are environment-driven. See `.env.example` for every recognized
key. The `Settings` class (Pydantic v2) caches via `get_settings()`; Tauri
overrides `DATABASE_URL`, `LOGS_DIR`, `PROJECTS_DIR`, `TEMP_DIR`, `CACHE_DIR`,
`PORT`, and the per-launch `CFD_PLATFORM_TAURI_TOKEN` at desktop launch.

## Error contract

Every failure returns a single shape:

```json
{ "error": { "code": "<ERROR_CODE>", "message": "...", "details": {...} } }
```

Implemented in `core/exceptions.py: setup_exception_handlers`.
Both domain errors (`CFDValidationError`, `NotFoundError`, `PermissionError`,
`AuthenticationError`, ...) and `pydantic.ValidationError` are mapped to it.

## Testing

The venv ships `unittest`; pytest is declared in `[dev]` extras but not yet
installed. Use:

```bash
backend/.venv/Scripts/python.exe -m unittest discover -s backend/tests -p 'test_*.py' -q
```

Test layout:

- `test_backend_infra.py` — foundation canary: health, readiness, token guard,
  validation handler, live project round-trip via the workflow router, and an
  isolated-DB service-layer round-trip.
- `test_cfmesh_workflow.py`, `test_gmsh_*.py`, `test_freecad_*.py`,
  `test_optimization_adapter.py`, `test_pdf_report.py`,
  `test_surrogate_artifacts.py`, `test_workflow_artifacts.py` — engineering
  core tests against real Gmsh/meshio/VTK/Nevergrad/PhysicsNeMo.
- `test_desktop_startup.py`, `test_engine_registry.py`,
  `test_openfoam_recipe.py` — desktop env + engine lifecycle assertions.
- `conftest.py` — pytest fixtures (`settings`, `db_session`, `client`,
  `admin_user`, `desktop_token`). Coexists with unittest discovery; it activates
  only when pytest is the runner.

## Development

```bash
backend/.venv/Scripts/python.exe -m cfd_backend.main      # uvicorn, production entry
backend/.venv/Scripts/python.exe -m cfd_backend.dev_main  # uvicorn with --reload
```

Never bypass the desktop token guard with mock fallbacks in production code,
and never fabricate solver / mesh / surrogate output: an unavailable engine
must report an actionable unavailable state, not a fake result.
