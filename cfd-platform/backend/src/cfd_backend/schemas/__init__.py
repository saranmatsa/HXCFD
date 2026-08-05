"""Pydantic schemas for the HX CFD backend.

This package is the *single source of truth* for the wire-level shape of every
API request and response. Schemas mirror the canonical ORM models in
``cfd_backend.models.*`` and use ``model_config = ConfigDict(from_attributes=True)``
so an ORM instance can be returned directly without manual reshuffling.

Conventions
-----------
- ``*Create``  → request body for POST (insert). Optional id/server-defaults.
- ``*Update``  → request body for PATCH (partial update; every field Optional).
- ``*Response``→ response body. UUID/datetimes serialized as ISO strings.
- Enums are re-exported from the models so the wire form and DB form cannot drift.

The legacy REST routers (now under ``cfd_backend.api.v1._legacy``) declared
inline Pydantic models that referenced ORM attributes which do not exist on the
canonical models (e.g. ``Project.solver``, ``Project.reference_velocity``).
Those queries would raise ``AttributeError`` at request time. The schemas below
are aligned with the real column set and exist precisely to prevent that class
of bug from recurring.
"""

from cfd_backend.schemas.common import (
    PaginatedResponse,
    PaginationParams,
    HealthResponse,
    ErrorResponse,
    ErrorDetail,
    TimestampMixinSchema,
)
from cfd_backend.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStatsResponse,
)
from cfd_backend.schemas.mesh import (
    MeshCreate,
    MeshUpdate,
    MeshResponse,
    MeshListResponse,
    MeshQualityResponse,
)
from cfd_backend.schemas.simulation import (
    SimulationCreate,
    SimulationUpdate,
    SimulationResponse,
    SimulationListResponse,
    SimulationProgressResponse,
)
from cfd_backend.schemas.optimization import (
    OptimizationStudyCreate,
    OptimizationStudyUpdate,
    OptimizationStudyResponse,
    OptimizationTrialResponse,
    SurrogateModelResponse,
)
from cfd_backend.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    TokenResponse,
    APIKeyCreate,
    APIKeyResponse,
)

__all__ = [
    # common
    "PaginatedResponse",
    "PaginationParams",
    "HealthResponse",
    "ErrorResponse",
    "ErrorDetail",
    "TimestampMixinSchema",
    # project
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    "ProjectStatsResponse",
    # mesh
    "MeshCreate",
    "MeshUpdate",
    "MeshResponse",
    "MeshListResponse",
    "MeshQualityResponse",
    # simulation
    "SimulationCreate",
    "SimulationUpdate",
    "SimulationResponse",
    "SimulationListResponse",
    "SimulationProgressResponse",
    # optimization
    "OptimizationStudyCreate",
    "OptimizationStudyUpdate",
    "OptimizationStudyResponse",
    "OptimizationTrialResponse",
    "SurrogateModelResponse",
    # user
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "TokenResponse",
    "APIKeyCreate",
    "APIKeyResponse",
]
