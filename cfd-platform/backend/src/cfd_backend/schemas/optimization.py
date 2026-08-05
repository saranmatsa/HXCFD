"""Optimization & surrogate schemas — aligned with ``cfd_backend.models.optimization``."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from cfd_backend.models.optimization import (
    StudyStatus,
    StudyType,
    SurrogateType,
    TrialStatus,
)
from cfd_backend.models.project import OptimizationAlgorithm, OptimizationStatus
from cfd_backend.schemas.common import ORM_CONFIG, TimestampMixinSchema


class OptimizationStudyCreate(BaseModel):
    """Optimization study creation request."""

    project_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    study_type: StudyType

    parameters: Dict[str, Any] = Field(default_factory=dict)
    objectives: Dict[str, Any] = Field(default_factory=dict)
    constraints: Dict[str, Any] = Field(default_factory=dict)

    algorithm: OptimizationAlgorithm
    max_iterations: int = Field(100, ge=1)
    population_size: Optional[int] = Field(None, ge=1)


class OptimizationStudyUpdate(BaseModel):
    """Partial update — e.g. cancel, annotate, evolve parameters."""

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StudyStatus] = None
    max_iterations: Optional[int] = Field(None, ge=1)


class OptimizationStudyResponse(TimestampMixinSchema):
    """Optimization study response."""

    id: UUID
    project_id: UUID
    name: str
    description: Optional[str]
    study_type: StudyType
    status: StudyStatus
    algorithm: OptimizationAlgorithm

    parameters: Dict[str, Any]
    objectives: Dict[str, Any]
    constraints: Dict[str, Any]

    max_iterations: int
    current_iteration: int
    population_size: Optional[int]

    best_parameters: Optional[Dict[str, Any]]
    best_objectives: Optional[Dict[str, Any]]
    pareto_front: Optional[List[Dict[str, Any]]]
    history: List[Dict[str, Any]]

    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_time_seconds: Optional[float]
    error_message: Optional[str]


class OptimizationTrialResponse(TimestampMixinSchema):
    """Single optimization trial (one evaluation of the objective)."""

    id: UUID
    study_id: UUID
    trial_number: int
    status: TrialStatus
    parameters: Dict[str, Any]
    objectives: Optional[Dict[str, Any]]
    simulation_id: Optional[UUID]
    duration_seconds: Optional[float]
    error_message: Optional[str]


class SurrogateModelResponse(TimestampMixinSchema):
    """Trained surrogate model artifact metadata."""

    id: UUID
    project_id: UUID
    name: str
    surrogate_type: SurrogateType
    input_parameters: List[str]
    output_targets: List[str]
    model_path: Optional[str]
    metrics: Dict[str, Any]
    is_active: bool
