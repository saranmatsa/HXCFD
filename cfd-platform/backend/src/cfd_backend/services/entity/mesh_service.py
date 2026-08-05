"""Mesh persistence service.

Wraps :class:`Mesh` CRUD against a project. Mesh *generation* (the real Gmsh /
cfMesh / meshio pipeline) is owned by
:class:`cfd_backend.services.engineering_orchestrator.EngineeringOrchestrator`;
this service owns only the DB-tier lifecycle of the row that records the
mesh's existence and quality.
"""

from __future__ import annotations

import uuid
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cfd_backend.core.exceptions import NotFoundError, PermissionError as CFDPermissionError
from cfd_backend.models.project import Mesh, MeshStatus
from cfd_backend.models.user import User
from cfd_backend.schemas.mesh import MeshCreate, MeshUpdate
from cfd_backend.services.entity.base import BaseService
from cfd_backend.services.entity.project_service import ProjectService


class MeshService(BaseService[Mesh]):
    """Mesh CRUD scoped to a project."""

    model = Mesh
    resource_name = "mesh"

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_for_project(
        self,
        project_id: uuid.UUID,
        *,
        user: Optional[User] = None,
        include_archived: bool = False,
    ) -> Sequence[Mesh]:
        """List meshes under a project, with project-read authorization."""
        project = await ProjectService(self.db).get_for_user(project_id, user)
        stmt = select(Mesh).where(Mesh.project_id == project.id)
        if not include_archived:
            stmt = stmt.where(Mesh.status != MeshStatus.FAILED)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_for_project(
        self,
        project_id: uuid.UUID,
        data: MeshCreate,
        user: Optional[User],
    ) -> Mesh:
        """Record a new mesh row. Generation is performed elsewhere."""
        project = await ProjectService(self.db).get_for_user(
            project_id, user, require_write=True
        )
        mesh = Mesh(
            project_id=project.id,
            name=data.name,
            description=data.description,
            mesh_type=data.mesh_type,
            file_format=data.file_format,
            generation_settings=data.generation_settings,
            status=MeshStatus.PENDING,
        )
        self.db.add(mesh)
        await self.db.flush()
        await self.db.refresh(mesh)
        return mesh

    async def update(
        self,
        mesh_id: uuid.UUID,
        data: MeshUpdate,
        user: Optional[User],
    ) -> Mesh:
        mesh = await self.get(mesh_id)
        # Reuse the project write policy.
        await ProjectService(self.db).get_for_user(
            mesh.project_id, user, require_write=True
        )
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(mesh, field, value)
        await self.db.flush()
        await self.db.refresh(mesh)
        return mesh

    async def record_quality(
        self,
        mesh_id: uuid.UUID,
        *,
        num_cells: Optional[int] = None,
        num_faces: Optional[int] = None,
        num_nodes: Optional[int] = None,
        min_orthogonality: Optional[float] = None,
        max_aspect_ratio: Optional[float] = None,
        max_skewness: Optional[float] = None,
        quality_metrics: Optional[dict] = None,
        file_path: Optional[str] = None,
        file_size_bytes: Optional[int] = None,
        generation_log: Optional[str] = None,
        generation_time_seconds: Optional[float] = None,
        status: Optional[MeshStatus] = None,
    ) -> Mesh:
        """Persist the quality verdict + file location returned by the orchestrator."""
        mesh = await self.get(mesh_id)
        if num_cells is not None: mesh.num_cells = num_cells
        if num_faces is not None: mesh.num_faces = num_faces
        if num_nodes is not None: mesh.num_nodes = num_nodes
        if min_orthogonality is not None: mesh.min_orthogonality = min_orthogonality
        if max_aspect_ratio is not None: mesh.max_aspect_ratio = max_aspect_ratio
        if max_skewness is not None: mesh.max_skewness = max_skewness
        if quality_metrics is not None: mesh.quality_metrics = quality_metrics
        if file_path is not None: mesh.file_path = file_path
        if file_size_bytes is not None: mesh.file_size_bytes = file_size_bytes
        if generation_log is not None: mesh.generation_log = generation_log
        if generation_time_seconds is not None:
            mesh.generation_time_seconds = generation_time_seconds
        if status is not None:
            mesh.status = status
        await self.db.flush()
        await self.db.refresh(mesh)
        return mesh
