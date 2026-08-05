"""Simulation persistence service.

Wraps :class:`Simulation` CRUD scoped to a project. Real solver execution is
owned by the engineering orchestrator and surfaced through the workflow
service; this service owns only the row-level lifecycle a future REST API
would need (create a queued row, list runs, patch status, fetch progress).
"""

from __future__ import annotations

import uuid
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cfd_backend.models.project import Project, ProjectStatus
from cfd_backend.models.simulation import Simulation, SimulationStatus
from cfd_backend.models.user import User
from cfd_backend.schemas.simulation import SimulationCreate, SimulationUpdate
from cfd_backend.services.entity.base import BaseService
from cfd_backend.services.entity.project_service import ProjectService


class SimulationService(BaseService[Simulation]):
    """Simulation CRUD scoped to a project."""

    model = Simulation
    resource_name = "simulation"

    def __init__(self, db: AsyncSession) -> None:
        super().__init__(db)

    async def list_for_project(
        self,
        project_id: uuid.UUID,
        *,
        user: Optional[User] = None,
        status: Optional[SimulationStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Sequence[Simulation]:
        await ProjectService(self.db).get_for_user(project_id, user)
        stmt = select(Simulation).where(Simulation.project_id == project_id)
        if status is not None:
            stmt = stmt.where(Simulation.status == status)
        stmt = stmt.order_by(Simulation.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_for_project(
        self,
        project_id: uuid.UUID,
        data: SimulationCreate,
        user: Optional[User],
    ) -> Simulation:
        project = await ProjectService(self.db).get_for_user(
            project_id, user, require_write=True
        )
        simulation = Simulation(
            project_id=project.id,
            name=data.name,
            description=data.description,
            solver_type=data.solver_type,
            solver_config=data.solver_config,
            mesh_id=data.mesh_id,
            boundary_conditions=data.boundary_conditions,
            initial_conditions=data.initial_conditions,
            solver_settings=data.solver_settings,
            max_runtime_hours=data.max_runtime_hours,
            priority=data.priority,
            max_iterations=data.max_iterations,
            cpu_cores=data.cpu_cores,
            memory_gb=data.memory_gb,
            gpu_enabled=data.gpu_enabled,
            status=SimulationStatus.PENDING,
        )
        self.db.add(simulation)
        await self.db.flush()
        await self.db.refresh(simulation)
        return simulation

    async def update(
        self,
        simulation_id: uuid.UUID,
        data: SimulationUpdate,
        user: Optional[User],
    ) -> Simulation:
        sim = await self.get(simulation_id)
        await ProjectService(self.db).get_for_user(
            sim.project_id, user, require_write=True
        )
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sim, field, value)
        await self.db.flush()
        await self.db.refresh(sim)
        return sim

    async def transition_status(
        self,
        simulation_id: uuid.UUID,
        new_status: SimulationStatus,
        *,
        progress: Optional[float] = None,
        current_iteration: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Simulation:
        """Record a status transition (used by the orchestrator/worker)."""
        sim = await self.get(simulation_id)
        sim.status = new_status
        if progress is not None:
            sim.progress = progress
        if current_iteration is not None:
            sim.current_iteration = current_iteration
        if error_message is not None:
            sim.error_message = error_message
        await self.db.flush()
        await self.db.refresh(sim)
        return sim
