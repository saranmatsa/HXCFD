"""Typed service layer for the HX CFD backend.

This module sits *above* the SQLAlchemy ORM and *below* any future REST router.
A router handler does:

    @router.get(\"/projects/{pid}\", response_model=ProjectResponse)
    async def get_project(pid: UUID, db: AsyncSession = Depends(get_db_session)):
        return await ProjectService(db).get(pid)

Responsibilities
----------------
- Convert ORM rows ↔ the Pydantic schemas in ``cfd_backend.schemas.*``
- Wrap DB errors in the domain exceptions from ``cfd_backend.core.exceptions``
- Hold authorization policy (owner/admin/team) in one place
- Stay thin: no business logic beyond persistence + visibility. The live
  engineering workflow (meshing, solving, optimization) is owned by
  ``cfd_backend.services.workflow_service.LocalWorkflowService``.

Why this layer exists: the legacy routers inlined SQL, ``commit``/``refresh``
calls, and bespoke authorization in every handler, which produced drift
between routers and the bug that the schemas layer now structurally prevents.
Centralizing those operations makes future routers trivial and the policy
auditable.
"""

from cfd_backend.services.entity.project_service import ProjectService
from cfd_backend.services.entity.mesh_service import MeshService
from cfd_backend.services.entity.simulation_service import SimulationService

__all__ = [
    "ProjectService",
    "MeshService",
    "SimulationService",
]
