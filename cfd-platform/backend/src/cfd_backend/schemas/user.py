"""User & authentication schemas — aligned with ``cfd_backend.models.user``."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from cfd_backend.models.user import UserRole, UserStatus
from cfd_backend.schemas.common import ORM_CONFIG, TimestampMixinSchema


class UserCreate(BaseModel):
    """User registration request."""

    email: Optional[str] = None
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9]+$")
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=255)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        import re

        if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Invalid email format")
        return v.lower()


class UserUpdate(BaseModel):
    """Partial self-update for a user profile."""

    email: Optional[str] = None
    full_name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=512)
    bio: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    theme: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(None, max_length=10)


class UserResponse(TimestampMixinSchema):
    """Public user response — never includes the password hash."""

    id: UUID
    email: Optional[str]
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    role: UserRole
    status: UserStatus
    preferences: Dict[str, Any]
    theme: str
    language: str
    last_login_at: Optional[datetime]
    email_verified_at: Optional[datetime]


class TokenResponse(BaseModel):
    """JWT token pair returned on login/refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token lifetime seconds


class APIKeyCreate(BaseModel):
    """API key creation request. The plaintext key is returned exactly once."""

    name: str = Field(..., min_length=1, max_length=100)
    scopes: List[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None


class APIKeyResponse(TimestampMixinSchema):
    """API key metadata. The plaintext key is NEVER returned after creation."""

    id: UUID
    user_id: UUID
    name: str
    key_prefix: str
    scopes: List[str]
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    is_active: bool
