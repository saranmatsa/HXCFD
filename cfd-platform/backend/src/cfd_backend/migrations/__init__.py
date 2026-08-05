"""Migration package for the HX CFD backend.

Revisions live in ``versions/``. There is intentionally no initial migration
yet: the canonical ORM schema has not stabilised (see backend/README.md).
When the model column set is final enough to be a baseline, run:

    backend/.venv/Scripts/python.exe -m alembic -c alembic.ini \
        revision --autogenerate -m "initial schema"

Until then, fresh databases are created via ``Base.metadata.create_all`` at
app startup (managed by ``ServiceContainer.initialize``). Migrations take over
once a first revision exists, and create_all is then retired in favour of
``alembic upgrade head`` to preserve schema history.
"""
