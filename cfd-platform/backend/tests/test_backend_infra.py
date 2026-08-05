"""Infrastructure test for the cleaned-up HX CFD backend.

Verifies, with plain unittest (the runner the venv ships), that:
- the FastAPI app boots and GET /health returns 200 + healthy + version
- /health/ready reports ready after lifespan completes
- the desktop token guard rejects unauthenticated workflow requests (401)
- the guard accepts a correctly matched bearer
- the validation handler dispatches pydantic errors (no crash on exc.errors())
- a project created via the live workflow router is visible in the project list

This is the canary for regressions in the foundation pass.

Author: Hermes Agent
"""

from __future__ import annotations

import asyncio
import os
import unittest
import uuid


def _clear_desktop_env(monkey_env: dict[str, str]) -> None:
    """Remove Tauri-related env vars from a copy of os.environ (in-test mode)."""
    for key in ("CFD_PLATFORM_TAURI", "CFD_PLATFORM_TAURI_TOKEN"):
        monkey_env.pop(key, None)


class BackendInfraTests(unittest.IsolatedAsyncioTestCase):
    """Async unittest cases against the live FastAPI app via TestClient."""

    def _make_app(self, *, tauri_token: str | None = None):
        """Construct the app under controlled env. ``tauri_token`` places the
        app under the managed-desktop token guard; the supplied token is set
        as the expected bearer."""
        # Refresh the lru_cache so get_settings re-reads monkey-patched env.
        from cfd_backend.core.config import get_settings

        get_settings.cache_clear()
        # Set env BEFORE constructing the app — caching is module-global.
        if tauri_token is not None:
            os.environ["CFD_PLATFORM_TAURI"] = "1"
            os.environ["CFD_PLATFORM_TAURI_TOKEN"] = tauri_token
        else:
            os.environ.pop("CFD_PLATFORM_TAURI", None)
            os.environ.pop("CFD_PLATFORM_TAURI_TOKEN", None)

        from cfd_backend.main import create_app

        return create_app()

    def test_health_endpoint_returns_healthy(self):
        from fastapi.testclient import TestClient

        app = self._make_app()
        with TestClient(app) as c:
            r = c.get("/health")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["status"], "healthy")
        self.assertIn("version", body)

    def test_readiness_endpoint_reports_ready_after_lifespan(self):
        from fastapi.testclient import TestClient

        app = self._make_app()
        with TestClient(app) as c:
            r = c.get("/health/ready")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ready")

    def test_desktop_token_guard_rejects_unauthenticated_requests(self):
        from fastapi.testclient import TestClient

        app = self._make_app(tauri_token="the-real-secret")
        with TestClient(app) as c:
            r = c.get("/api/v1/workflow/projects")  # No Authorization header
        self.assertEqual(r.status_code, 401)
        self.assertIn("token", r.json()["detail"].lower())

    def test_desktop_token_guard_accepts_correct_bearer(self):
        from fastapi.testclient import TestClient

        app = self._make_app(tauri_token="good-token-12345")
        with TestClient(app) as c:
            r = c.get(
                "/api/v1/workflow/projects",
                headers={"Authorization": "Bearer good-token-12345"},
            )
        self.assertEqual(r.status_code, 200)

    def test_validation_handler_dispatches_without_crash(self):
        """Previously the legacy validation handler called exc.errors() on a
        custom exception that did not implement it - it crashed. Confirm the
        cleaned-up handler does not crash on a method-not-allowed request."""
        from fastapi.testclient import TestClient

        app = self._make_app()
        with TestClient(app) as c:
            # /health is GET-only - POST must produce 405, not a 500 crash
            r = c.post("/health")
        self.assertEqual(r.status_code, 405)

    def test_project_round_trip_via_workflow_router(self):
        from fastapi.testclient import TestClient

        project_id = f"infra-test-{uuid.uuid4().hex[:8]}"
        app = self._make_app()
        with TestClient(app) as c:
            r = c.post("/api/v1/workflow/projects", json={"project_id": project_id})
            self.assertEqual(r.status_code, 201, r.text)
            self.assertEqual(r.json()["project"]["project_id"], project_id)

            r = c.get("/api/v1/workflow/projects")
            self.assertEqual(r.status_code, 200)
            listed = {p["project_id"] for p in r.json()["projects"]}
            self.assertIn(project_id, listed)

            self.assertEqual(c.get("/health").status_code, 200)


class ProjectServiceRoundTripTests(unittest.IsolatedAsyncioTestCase):
    """Proves the typed service layer persists and surfaces projects
    end-to-end against an isolated SQLite database, validating the package
    works under asyncio without any web layer abstractions."""

    async def test_service_layer_persists_project_and_serializes(self):
        import tempfile
        import uuid

        from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

        # Import all model modules so Base.metadata sees every table.
        import cfd_backend.models.mesh  # noqa: F401
        import cfd_backend.models.optimization  # noqa: F401
        import cfd_backend.models.project  # noqa: F401
        import cfd_backend.models.simulation  # noqa: F401
        import cfd_backend.models.simulation_result  # noqa: F401
        import cfd_backend.models.solver  # noqa: F401
        import cfd_backend.models.user  # noqa: F401
        from cfd_backend.models.base import Base
        from cfd_backend.models.project import ProjectStatus
        from cfd_backend.models.user import User, UserRole, UserStatus
        from cfd_backend.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
        from cfd_backend.services.entity.project_service import ProjectService

        db_path = os.path.join(
            tempfile.mkdtemp(prefix="hx-cfd-svc-"), "svc.db"
        )
        engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", echo=False)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            Session = async_sessionmaker(
                engine, class_=AsyncSession, expire_on_commit=False
            )
            async with Session() as session:
                user = User(
                    username=f"alice_{uuid.uuid4().hex[:6]}",
                    hashed_password="x",
                    role=UserRole.ADMIN,
                    status=UserStatus.ACTIVE,
                )
                session.add(user)
                await session.flush()
                svc = ProjectService(session)
                p = await svc.create(
                    ProjectCreate(
                        name="Wing-2D", description="airfoil", tags=["external"]
                    ),
                    user,
                )
                self.assertEqual(p.status, ProjectStatus.DRAFT)

                rows = await svc.list_visible(user)
                self.assertEqual([r.name for r in rows], ["Wing-2D"])

                p = await svc.update(
                    p.id, ProjectUpdate(description="NACA0012"), user
                )
                self.assertEqual(p.description, "NACA0012")

                p = await svc.archive(p.id, user)
                self.assertEqual(p.status, ProjectStatus.ARCHIVED)

                # Excluding archived: empty. Including archived: present.
                self.assertEqual(
                    [r.name for r in await svc.list_visible(user)], []
                )
                self.assertEqual(
                    [r.name for r in await svc.list_visible(user, include_archived=True)],
                    ["Wing-2D"],
                )

                # ORM -> Pydantic schema round-trip with from_attributes.
                resp = ProjectResponse.model_validate(p)
                self.assertEqual(resp.name, "Wing-2D")
                self.assertFalse(resp.is_public)
                self.assertEqual(resp.tags, ["external"])

                await svc.delete_permanent(p.id, user)
                self.assertEqual(
                    [r.name for r in await svc.list_visible(user, include_archived=True)],
                    [],
                )
                await session.commit()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    unittest.main(verbosity=2)
