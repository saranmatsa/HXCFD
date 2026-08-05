"""Alembic environment for the HX CFD backend.

Reads the live ``DATABASE_URL`` from :func:`cfd_backend.core.config.get_settings`
so the migration path follows the same source of truth as runtime. Async
configurations use the managed path-style settings, but Alembic's standard
runner still uses a synchronous engine internally (via SQLAlchemy's sync URI
form). To bridge:

  * The async URL (``sqlite+aiosqlite:///...``) is converted to a sync form
    (``sqlite:///...``) for the migration engine. SQLAlchemy/Alembic do this
    themselves for the async case in modern versions, but normalizing here
    keeps the offline path simple and stable across driver versions.

Mode behavior:
  * ``offline`` — emit SQL to stdout using ``context.execute()``.
  * ``online``  — connect via the converted sync URL and run migrations.

Migrations are autogenerate-aware: ``target_metadata`` points at the canonical
``Base.metadata`` from :mod:`cfd_backend.models.base`. Autogenerate compares
ORM column definitions against the live database; the legacy ``// TODO: team
membership`` columns in models (e.g. ``ProjectMember``) will surface there the
moment they are added, so model changes piggy-back on this metadata.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the backend package importable. ``prepend_sys_path = src`` in
# alembic.ini should already have put it on sys.path, but adding the absolute
# path defensively keeps migrations robust when alembic is launched from a
# different working directory.
import sys
from pathlib import Path

_BACKEND_SRC = Path(__file__).resolve().parent.parent.parent.parent
if str(_BACKEND_SRC) not in sys.path:
    sys.path.insert(0, str(_BACKEND_SRC))

# Import every ORM model so Base.metadata reflects all tables when autogenerate
# runs. Listing models explicitly (rather than wildcard-importing the package)
# keeps the autogenerate diff traceable.
from cfd_backend.models.base import Base  # noqa: E402
import cfd_backend.models.project  # noqa: E402,F401
import cfd_backend.models.simulation  # noqa: E402,F401
import cfd_backend.models.mesh  # noqa: E402,F401
import cfd_backend.models.optimization  # noqa: E402,F401
import cfd_backend.models.user  # noqa: E402,F401
import cfd_backend.models.solver  # noqa: E402,F401
import cfd_backend.models.simulation_result  # noqa: E402,F401
from cfd_backend.core.config import get_settings  # noqa: E402

# Alembic config object provided by ``alembic.ini``.
config = context.config

# Configure Python logging from the alembic.ini [loggers] section.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The single source of truth for the metadata that autogenerate diffs against.
target_metadata = Base.metadata


def _sync_url() -> str:
    """Convert the async DATABASE_URL to a sync form Alembic can drive.

    Currently the backend only ships SQLite via aiosqlite, so the conversion is
    ``sqlite+aiosqlite://`` -> ``sqlite://``. When PostgreSQL or other async
    drivers are added, extend this mapping here — never override
    ``sqlalchemy.url`` in ``alembic.ini``.
    """
    url = get_settings().database_url
    if "+aiosqlite" in url:
        return url.replace("+aiosqlite", "")
    if "+asyncpg" in url:
        return url.replace("+asyncpg", "+psycopg2")
    return url


def run_migrations_offline() -> None:
    """Offline mode — emit SQL to stdout, no live connection."""
    context.configure(
        url=_sync_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online mode — connect via a sync engine and apply migrations."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = _sync_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
