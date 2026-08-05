"""Project persistence service.

Wraps :class:`Project` CRUD and centralized authorization policy. A future
public REST router would delegate here so every entry point enforces the
same owner/admin/team visibility and soft-delete semantics.
"""

from __future__ import annotations

import uuid
from typing import List, Optional, Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cfd_backend.core.exceptions import PermissionError as CFDPermissionError
from cfd_backend.core.logging import get_logger
from cfd_backend.models.project import Project, ProjectStatus
from cfd_backend.models.user import User, UserRole
from cfd_backend.schemas.project import ProjectCreate, ProjectUpdate
from cfd_backend.services.entity.base import BaseService

logger = get_logger(__name__)


class ProjectService(BaseService[Project]):
    """Project CRUD + visibility policy."""

    model = Project
    resource_name = "project"

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    # ── Authorization ────────────────────────────────────────────────────

    @staticmethod
    def can_read(project: Project, user: Optional[User]) -> bool:
        """Read access policy — single source of truth."""
        if user is None or user.role in (UserRole.ADMIN,):
            return True
        if project.owner_id == user.id:
            return True
        if project.is_public and project.status != ProjectStatus.ARCHIVED:
            return True
        return False

    @staticmethod
    def can_write(project: Project, user: Optional[User]) -> bool:
        """Write access policy — owner or admin."""
        if user is None:
            return False
        if user.role == UserRole.ADMIN:
            return True
        return project.owner_id == user.id

    # ── Public API ────────────────────────────────────────────────────────

    async def create(self, data: ProjectCreate, owner: Optional[User]) -> Project:
        """Persist a new project owned by ``owner``."""
        project = Project(
            name=data.name,
            description=data.description,
            simulation_type=data.simulation_type,
            turbulence_model=data.turbulence_model,
            mesh_settings=data.mesh_settings,
            physics_settings=data.physics_settings,
            boundary_conditions=data.boundary_conditions,
            initial_conditions=data.initial_conditions,
            solver_settings=data.solver_settings,
            time_settings=data.time_settings,
            tags=data.tags,
            is_public=data.is_public,
            owner_id=owner.id if owner else None,
            status=ProjectStatus.DRAFT,
        )
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(project)
        logger.info("project.created", project_id=str(project.id), owner_id=str(owner.id) if owner else None)
        return project

    async def list_visible(
        self,
        user: Optional[User],
        *,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Project]:
        """List projects visible to ``user`` (owner/admin or public)."""
        stmt = (
            select(Project)
            .options(selectinload(Project.meshes), selectinload(Project.simulations))
        )
        if user is None or user.role not in (UserRole.ADMIN,):
            visibility_clause = or_(
                Project.is_public.is_(True),
                Project.owner_id == (user.id if user else None),
            )
            stmt = stmt.where(visibility_clause)
        if not include_archived:
            stmt = stmt.where(Project.status != ProjectStatus.ARCHIVED)
        stmt = stmt.order_by(Project.updated_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_for_user(
        self,
        project_id: uuid.UUID,
        user: Optional[User],
        *,
        require_write: bool = False,
    ) -> Project:
        """Fetch + authorize in one call. Raises ``PermissionError`` on denial."""
        project = await self.get(project_id)
        allowed = self.can_write(project, user) if require_write else self.can_read(project, user)
        if not allowed:
            raise CFDPermissionError(
                message=f"Access denied to {self.resource_name} {project_id}",
            )
        return project

    async def update(
        self,
        project_id: uuid.UUID,
        data: ProjectUpdate,
        user: Optional[User],
    ) -> Project:
        """Partial update with authorization."""
        project = await self.get_for_user(project_id, user, require_write=True)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        await self.db.flush()
        await self.db.refresh(project)
        logger.info("project.updated", project_id=str(project_id))
        return project

    async def archive(self, project_id: uuid.UUID, user: Optional[User]) -> Project:
        project = await self.get_for_user(project_id, user, require_write=True)
        project.status = ProjectStatus.ARCHIVED
        await self.db.flush()
        return project

    async def restore(self, project_id: uuid.UUID, user: Optional[User]) -> Project:
        project = await self.get_for_user(project_id, user, require_write=True)
        project.status = ProjectStatus.DRAFT
        await self.db.flush()
        return project

    async def delete_permanent(self, project_id: uuid.UUID, user: Optional[User]) -> None:
        """Hard delete — owner or admin only."""
        project = await self.get_for_user(project_id, user, require_write=True)
        await self.db.delete(project)
        await self.db.flush()
        logger.info("project.deleted", project_id=str(project_id))
