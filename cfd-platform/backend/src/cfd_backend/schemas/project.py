"""Project schemas — aligned with the canonical Project ORM model.

Fields mirror ``cfd_backend.models.project.Project`` exactly. The legacy
router referenced columns that did not exist (``solver``, ``reference_velocity``,
``visibility``); these schemas intentionally expose only the real model's
column set so an ``AttributeError`` like the legacy bug is structurally
impossible.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from cfd_backend.models.project import (
    ProjectStatus,
    ProjectVisibility,
    SimulationType,
    TurbulenceModel,
)
from cfd_backend.schemas.common import ORM_CONFIG, TimestampMixinSchema


class ProjectCreate(BaseModel):
    """Request body for creating a project.

    Only columns that exist on ``Project`` are exposed. Physics/mesh/solver
    settings are nested JSON blobs the workflow service interprets stage-by-stage.
    """

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    simulation_type: SimulationType = SimulationType.INCOMPRESSIBLE
    turbulence_model: TurbulenceModel = TurbulenceModel.K_OMEGA_SST

    # Nested configuration payloads (the workflow service consumes these per-stage).
    mesh_settings: Dict[str, Any] = Field(default_factory=dict)
    physics_settings: Dict[str, Any] = Field(default_factory=dict)
    boundary_conditions: Dict[str, Any] = Field(default_factory=dict)
    initial_conditions: Dict[str, Any] = Field(default_factory=dict)
    solver_settings: Dict[str, Any] = Field(default_factory=dict)
    time_settings: Dict[str, Any] = Field(default_factory=dict)

    tags: List[str] = Field(default_factory=list)
    is_public: bool = False


class ProjectUpdate(BaseModel):
    """Partial update for an existing project. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    status: Optional[ProjectStatus] = None
    simulation_type: Optional[SimulationType] = None
    turbulence_model: Optional[TurbulenceModel] = None

    mesh_settings: Optional[Dict[str, Any]] = None
    physics_settings: Optional[Dict[str, Any]] = None
    boundary_conditions: Optional[Dict[str, Any]] = None
    initial_conditions: Optional[Dict[str, Any]] = None
    solver_settings: Optional[Dict[str, Any]] = None
    time_settings: Optional[Dict[str, Any]] = None

    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class ProjectResponse(TimestampMixinSchema):
    """Project response — mirrors real ORM columns only."""

    id: UUID
    name: str
    description: Optional[str]
    status: ProjectStatus
    simulation_type: SimulationType
    turbulence_model: TurbulenceModel

    geometry_file: Optional[str]
    geometry_hash: Optional[str]
    mesh_file: Optional[str]
    mesh_settings: Dict[str, Any]
    physics_settings: Dict[str, Any]
    boundary_conditions: Dict[str, Any]
    initial_conditions: Dict[str, Any]
    solver_settings: Dict[str, Any]
    time_settings: Dict[str, Any]

    results_path: Optional[str]
    last_simulation_id: Optional[UUID]
    tags: List[str]

    owner_id: Optional[UUID]
    is_public: bool

    # Derived counts (filled by the service, not the ORM column).
    mesh_count: int = 0
    simulation_count: int = 0


class ProjectListResponse(BaseModel):
    """Paginated project list envelope."""

    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProjectStatsResponse(BaseModel):
    """Aggregate statistics for a project."""

    total_meshes: int
    total_simulations: int
    completed_simulations: int
    failed_simulations: int
    running_simulations: int
    total_cpu_hours: float
    total_storage_bytes: int
