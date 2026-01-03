from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class RoleName(str, Enum):
    """Standard role names"""
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"
    APPROVER = "APPROVER"


class ScopeType(str, Enum):
    """Scope types for role assignments"""
    GLOBAL = "GLOBAL"
    MILESTONE = "MILESTONE"
    TEAM = "TEAM"


class Role(BaseModel):
    """
    Role represents a permission level.
    Do not put access level on Owner or Actor - that becomes messy.
    Instead, use roles to express permissions.
    """
    id: str
    name: RoleName
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "role_001",
                "name": "ADMIN",
                "description": "Can do everything",
                "created_at": "2024-01-01T10:00:00Z"
            }
        }


class ActorRole(BaseModel):
    """
    ActorRole links an Actor to a Role with an optional scope.
    This lets you express:
    - "Alice can approve changes for Milestone A"
    - "Platform team is editor for Platform objects"
    - "Everyone is viewer globally"
    """
    actor_id: str  # FK → Actor
    role_id: str  # FK → Role
    scope_type: ScopeType = ScopeType.GLOBAL
    scope_id: Optional[str] = None  # milestone_id or team_id if scoped
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "actor_id": "actor_001",
                "role_id": "role_001",
                "scope_type": "MILESTONE",
                "scope_id": "milestone_001",
                "created_at": "2024-01-01T10:00:00Z"
            }
        }

