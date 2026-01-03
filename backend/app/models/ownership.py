from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class ObjectType(str, Enum):
    """Types of objects that can have ownership"""
    RISK = "risk"
    ISSUE = "issue"
    DECISION = "decision"
    CHANGE = "change"
    MILESTONE = "milestone"
    WORK_ITEM = "work_item"


class Ownership(BaseModel):
    """
    Ownership represents accountability - who is accountable for this object right now.
    This is NOT a user profile. It's a link that answers:
    "Who is accountable for this object right now?"
    
    Important: Enforce exactly one active owner per object.
    Use ended_at to track ownership history while maintaining the "one owner" rule.
    """
    id: str
    object_type: ObjectType
    object_id: str  # ID of the risk, issue, decision, etc.
    owner_actor_id: str  # FK → Actor
    assigned_at: datetime = Field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None  # NULL means this is the active ownership
    assigned_by_actor_id: Optional[str] = None  # Who assigned this ownership
    reason: Optional[str] = None  # Optional reason for assignment

    @model_validator(mode='after')
    def validate_ended_at(self):
        """Ensure ended_at is after assigned_at if both are set"""
        if self.ended_at and self.assigned_at:
            if self.ended_at < self.assigned_at:
                raise ValueError("ended_at must be after assigned_at")
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "id": "ownership_001",
                "object_type": "risk",
                "object_id": "risk_001",
                "owner_actor_id": "actor_001",
                "assigned_at": "2024-01-01T10:00:00Z",
                "ended_at": None,
                "assigned_by_actor_id": "actor_002",
                "reason": "Default assignment from milestone owner"
            }
        }

