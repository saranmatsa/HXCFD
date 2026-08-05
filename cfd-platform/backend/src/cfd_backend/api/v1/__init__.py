"""API v1 router construction.

The live HX CFD backend is a private local-first workflow surface owned by the
Tauri desktop shell. The legacy aggregate public REST graph was removed from
the default include path; see `_legacy/` for its (broken) historical contents.

Construct only the workflow router explicitly — see `main.py`.
"""

from fastapi import APIRouter

__all__ = ["workflow_router"]


def get_workflow_router() -> APIRouter:
    """Return the desktop workflow router. Deferred import keeps the package
    importable even when the local service graph has not been initialized."""
    from cfd_backend.api.v1.workflow import router as workflow_router

    return workflow_router


# Back-compat shim removed. Callers expecting `api_router` should switch to
# `get_workflow_router()` or build a new public REST graph deliberately.
