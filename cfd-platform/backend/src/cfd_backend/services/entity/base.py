"""Base CRUD service shared by all entity services.

When the schema layer is expanded further (e.g. optimization, surrogate,
user), each new entity service should subclass ``BaseService`` and add its
own query/authorization specifics rather than re-implementing the
session/error plumbing here.
"""

from __future__ import annotations

from typing import Any, Generic, Optional, Sequence, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from cfd_backend.core.exceptions import NotFoundError
from cfd_backend.core.logging import get_logger

logger = get_logger(__name__)

# ORM model class bound to this service.
ModelT = TypeVar("ModelT", bound=DeclarativeBase)


class BaseService(Generic[ModelT]):
    """Common select/get/error plumbing for entity services.

    Subclasses set ``model`` and may override ``resource_name`` (used in
    ``NotFoundError`` messages). Subclasses implement authorization in
    their specific methods — there is no single ``visible`` predicate that
    fits every entity, so we don't pretend there is one.
    """

    model: Type[ModelT]
    resource_name: str = "resource"

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, entity_id: Any) -> ModelT:
        """Fetch by primary key or raise ``NotFoundError``."""
        obj = await self.db.get(self.model, entity_id)
        if obj is None:
            raise NotFoundError(
                message=f"{self.resource_name.capitalize()} not found",
                resource_type=self.resource_name,
                resource_id=str(entity_id),
            )
        return obj

    async def get_optional(self, entity_id: Any) -> Optional[ModelT]:
        """Fetch by primary key, return ``None`` if absent (no raise)."""
        return await self.db.get(self.model, entity_id)

    async def list_by(
        self,
        *filters: Any,
        order_by: Optional[Any] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Sequence[ModelT]:
        """List rows matching ``filters`` with optional ordering and paging."""
        stmt = select(self.model)
        for f in filters:
            stmt = stmt.where(f)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        if limit is not None:
            stmt = stmt.limit(limit)
        if offset is not None:
            stmt = stmt.offset(offset)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete(self, entity_id: Any) -> None:
        """Delete by primary key or raise ``NotFoundError``."""
        obj = await self.get(entity_id)
        await self.db.delete(obj)
        await self.db.flush()
