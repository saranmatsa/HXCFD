"""Simulation schemas — aligned with ``cfd_backend.models.simulation.Simulation``."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from cfd_backend.models.simulation import SimulationStatus, SolverType
from cfd_backend.schemas.common import ORM_CONFIG, TimestampMixinSchema


class SimulationCreate(BaseModel):
    """Request body for launching a simulation."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    solver_type: SolverType = SolverType.OPENFOAM
    solver_config: Dict[str, Any] = Field(default_factory=dict)

    mesh_id: Optional[UUID] = None

    boundary_conditions: List[Dict[str, Any]] = Field(default_factory=list)
    initial_conditions: Dict[str, Any] = Field(default_factory=dict)
    solver_settings: Dict[str, Any] = Field(default_factory=dict)

    max_runtime_hours: int = Field(24, ge=1, le=720)
    priority: int = Field(0, ge=-10, le=10)
    max_iterations: int = Field(1000, ge=1)

    cpu_cores: int = Field(1, ge=1, le=256)
    memory_gb: Optional[float] = Field(None, ge=0)
    gpu_enabled: bool = False


class SimulationUpdate(BaseModel):
    """Partial update for a simulation (e.g. cancel, reprioritize, annotate)."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    status: Optional[SimulationStatus] = None
    priority: Optional[int] = Field(None, ge=-10, le=10)
    solver_settings: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class SimulationResponse(TimestampMixinSchema):
    """Simulation response — mirrors real Simulation ORM columns."""

    id: UUID
    project_id: UUID
    name: str
    description: Optional[str]
    status: SimulationStatus

    solver_type: SolverType
    solver_config: Dict[str, Any]

    mesh_id: Optional[UUID]

    boundary_conditions: List[Dict[str, Any]]
    initial_conditions: Dict[str, Any]
    solver_settings: Dict[str, Any]

    max_runtime_hours: int
    priority: int
    progress: float
    current_iteration: int
    max_iterations: int

    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]

    cpu_cores: int
    memory_gb: Optional[float]
    gpu_enabled: bool
    cpu_hours: Optional[float]
    memory_peak_mb: Optional[int]

    disk_usage_bytes: Optional[int]
    result_size: Optional[int]
    results_path: Optional[str]
    log_path: Optional[str]
    error_message: Optional[str]

    convergence_data: Dict[str, Any]
    performance_metrics: Dict[str, Any]


class SimulationProgressResponse(BaseModel):
    """Live progress snapshot for a running simulation."""

    simulation_id: UUID
    status: SimulationStatus
    progress: float
    current_iteration: int
    max_iterations: int
    started_at: Optional[datetime]
    estimated_completion_at: Optional[datetime] = None


class SimulationListResponse(BaseModel):
    """Paginated simulation list envelope."""

    items: list[SimulationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
