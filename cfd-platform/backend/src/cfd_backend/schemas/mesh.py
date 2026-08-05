"""Mesh schemas — aligned with ``cfd_backend.models.project.Mesh``."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from cfd_backend.models.project import MeshStatus, MeshType
from cfd_backend.schemas.common import ORM_CONFIG, TimestampMixinSchema


class MeshCreate(BaseModel):
    """Mesh generation request."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=10000)
    mesh_type: MeshType = MeshType.UNSTRUCTURED
    file_format: str = Field("msh", max_length=50)

    # The workflow service interprets these per meshing route (tetrahedral,
    # cfmesh_cartesian, ...). Kept as a typed dict so the wire contract is stable
    # while the service owns the semantics.
    generation_settings: Dict[str, Any] = Field(default_factory=dict)


class MeshUpdate(BaseModel):
    """Partial update for a mesh record."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MeshStatus] = None
    generation_settings: Optional[Dict[str, Any]] = None


class MeshResponse(TimestampMixinSchema):
    """Mesh response — mirrors real Mesh ORM columns."""

    id: UUID
    project_id: UUID
    name: str
    description: Optional[str]
    mesh_type: MeshType
    status: MeshStatus

    file_path: Optional[str]
    file_format: str
    file_size_bytes: Optional[int]

    num_cells: Optional[int]
    num_faces: Optional[int]
    num_nodes: Optional[int]
    min_orthogonality: Optional[float]
    max_aspect_ratio: Optional[float]
    max_skewness: Optional[float]

    generation_settings: Dict[str, Any]
    generation_log: Optional[str]
    generation_time_seconds: Optional[float]

    quality_metrics: Dict[str, Any]


class MeshQualityResponse(BaseModel):
    """Standalone mesh quality report (returned by the quality endpoint)."""

    mesh_id: UUID
    num_cells: Optional[int]
    num_faces: Optional[int]
    num_nodes: Optional[int]
    min_orthogonality: Optional[float]
    max_aspect_ratio: Optional[float]
    max_skewness: Optional[float]
    quality_metrics: Dict[str, Any]


class MeshListResponse(BaseModel):
    """Paginated mesh list envelope."""

    items: list[MeshResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
