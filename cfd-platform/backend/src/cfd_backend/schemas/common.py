"""Shared schema primitives used across all resource schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# Schemas read directly from ORM instances — never rebuild dicts by hand.
ORM_CONFIG = ConfigDict(from_attributes=True)


class TimestampMixinSchema(BaseModel):
    """Created/updated timestamps, serialized as ISO strings."""

    model_config = ORM_CONFIG

    created_at: datetime
    updated_at: datetime


class PaginationParams(BaseModel):
    """Standard pagination query parameters."""

    page: int = Field(1, ge=1, description="Page number, 1-indexed")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated envelope."""

    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class HealthResponse(BaseModel):
    """Health probe response."""

    status: str
    version: str


class ErrorDetail(BaseModel):
    """Structured error detail for the standard error envelope."""

    code: str
    message: str
    details: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Standard error envelope returned by all exception handlers.

    Matches the shape produced by ``cfd_backend.core.exceptions.setup_exception_handlers``.
    Every API failure returns ``{"error": {ErrorDetail}}`` — clients parse one shape.
    """

    error: ErrorDetail
