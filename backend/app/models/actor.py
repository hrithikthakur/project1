from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class ActorType(str, Enum):
    """Actor type - either a user or a team"""
    USER = "USER"
    TEAM = "TEAM"


class Actor(BaseModel):
    """
    Actor represents a person or a team.
    This is the identity model - who the person/team is.
    Owners are just Actors.
    """
    id: str
    type: ActorType
    display_name: str
    title: Optional[str] = None  # Optional for USER, e.g. "Engineering Manager"
    email: Optional[str] = None
    external_ref: Optional[str] = None  # Jira user id, ServiceNow sys_id, etc.
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "actor_001",
                "type": "USER",
                "display_name": "Alice Smith",
                "title": "Engineering Manager",
                "email": "alice@example.com",
                "external_ref": "jira_user_12345",
                "is_active": True,
                "created_at": "2024-01-01T10:00:00Z",
                "updated_at": "2024-01-01T10:00:00Z"
            }
        }

