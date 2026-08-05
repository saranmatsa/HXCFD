"""Pytest fixtures for the HX CFD backend test suite.

This conftest cooperates with the existing unittest-based tests in this
directory — it only adds pytest-managed fixtures; it does not alter unittest
discovery. Tests written with pytest can use these fixtures; tests written
as unittest.TestCase continue to work unchanged.

Fixtures provided
----------------
- ``settings``      — an isolated Settings with temp dirs/lite database URL
- ``temp_db_engine``— an async SQLAlchemy engine over a private SQLite file
- ``db_session``    — an AsyncSession against that engine, with all tables
                      created up-front and dropped at teardown
- ``app``           — a constructed FastAPI app (no lifespan side effects)
- ``client``        — a FastAPI TestClient against the live app, with the
                      ServiceContainer lifespan triggered so /health works
- ``admin_user``    — an admins-equivalent :class:`User` row persisted in the
                      session for authorization-path tests
- ``desktop_token`` — a deterministic token for the CFD_PLATFORM_TAURI guard
                      when tests need to exercise the workflow router

The settings fixture overrides the cached lru_cache ``get_settings`` so every
test runs in an isolated directory tree and never touches the user's real
project/cache/data directories.
"""

from __future__ import annotations

import os
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Iterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure the backend src/ is importable when pytest runs from anywhere.
_BACKEND_SRC = Path(__file__).resolve().parent.parent / "src"
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))


@pytest.fixture()
def settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Override the cached Settings with fully isolated paths."""
    # Stop the desktop token guard from rejecting test requests — we explicitly
    # OPT OUT of the Tauri mode for tests so the workflow router accepts calls.
    monkeypatch.delenv("CFD_PLATFORM_TAURI", raising=False)
    monkeypatch.delenv("CFD_PLATFORM_TAURI_TOKEN", raising=False)

    data_dir = tmp_path / "data"
    logs_dir = tmp_path / "logs"
    projects_dir = tmp_path / "projects"
    temp_dir = tmp_path / "tmp"
    cache_dir = tmp_path / "cache"

    for d in (data_dir, logs_dir, projects_dir, temp_dir, cache_dir):
        d.mkdir(parents=True, exist_ok=True)

    db_path = data_dir / "cfd_test.db"
    monkeypatch.setenv("DATA_DIR", str(data_dir))
    monkeypatch.setenv("LOGS_DIR", str(logs_dir))
    monkeypatch.setenv("PROJECTS_DIR", str(projects_dir))
    monkeypatch.setenv("TEMP_DIR", str(temp_dir))
    monkeypatch.setenv("CACHE_DIR", str(cache_dir))
    monkeypatch.setenv(
        "DATABASE_URL", f"sqlite+aiosqlite:///{db_path.as_posix()}"
    )
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv("LOG_FORMAT", "console")

    # Refresh the lru_cache so get_settings returns the env-overridden config.
    from cfd_backend.core.config import get_settings

    get_settings.cache_clear()
    s = get_settings()
    yield s
    get_settings.cache_clear()


@pytest_asyncio.fixture()
async def temp_db_engine(settings) -> Iterator:
    """Async engine over an isolated SQLite file with all tables created."""
    # Import every model module so create_all sees all tables.
    import cfd_backend.models.project  # noqa: F401
    import cfd_backend.models.simulation  # noqa: F401
    import cfd_backend.models.mesh  # noqa: F401
    import cfd_backend.models.optimization  # noqa: F401
    import cfd_backend.models.user  # noqa: F401
    import cfd_backend.models.solver  # noqa: F401
    import cfd_backend.models.simulation_result  # noqa: F401

    from cfd_backend.models.base import Base

    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture()
async def db_session(temp_db_engine) -> AsyncSession:
    """Async session with auto-commit-on-success / rollback-on-error."""
    Session = async_sessionmaker(
        temp_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with Session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest.fixture()
def app(settings):
    """Construct the FastAPI app for tests. Lifespan is not run here — the
    tests that need the full ServiceContainer should use the ``client`` fixture
    instead, which triggers the lifespan via TestClient context-manager."""
    from cfd_backend.main import create_app

    return create_app()


@pytest.fixture()
def client(app):
    """TestClient against the live app, with lifespan side effects (database
    tables, engine inventory) initialized and torn down per test."""
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest_asyncio.fixture()
async def admin_user(db_session) -> "object":
    """Persist an admin-equivalent User row for authorization-path tests."""
    from cfd_backend.models.user import User, UserRole, UserStatus

    user = User(
        username=f"admin_{uuid.uuid4().hex[:8]}",
        hashed_password="x-not-a-real-hash",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest.fixture()
def desktop_token(monkeypatch: pytest.MonkeyPatch) -> str:
    """Configure the desktop token guard and return the test token.

    Tests that need to exercise the authenticated workflow routes under the
    managed-desktop path should set this fixture so the bearer token guard
    accepts their requests.
    """
    token = f"test-token-{uuid.uuid4().hex}"
    monkeypatch.setenv("CFD_PLATFORM_TAURI", "1")
    monkeypatch.setenv("CFD_PLATFORM_TAURI_TOKEN", token)
    return token
