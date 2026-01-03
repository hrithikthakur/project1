from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IssueType(str, Enum):
    """Issue types"""
    DEPENDENCY_BLOCKED = "dependency_blocked"
    RESOURCE_CONSTRAINT = "resource_constraint"
    TECHNICAL_BLOCKER = "technical_blocker"
    EXTERNAL_DEPENDENCY = "external_dependency"
    SCOPE_UNCLEAR = "scope_unclear"
    OTHER = "other"


class IssueStatus(str, Enum):
    """Issue status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IssuePriority(str, Enum):
    """Issue priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Issue(BaseModel):
    """Issue model"""
    id: str
    title: str
    description: str
    type: IssueType
    status: IssueStatus = IssueStatus.OPEN
    priority: IssuePriority = IssuePriority.MEDIUM
    
    # Related entities
    dependency_id: Optional[str] = None  # If related to a dependency
    work_item_id: Optional[str] = None   # If related to a work item
    risk_id: Optional[str] = None        # If escalated to a risk
    
    # Tracking
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    # Owner (tracked via Ownership model)
    # Use owner_actor_id from Ownership table
    
    # Additional context
    impact_description: Optional[str] = None
    resolution_notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "issue_001",
                "title": "Dependency blocked: Payment API integration",
                "description": "Work item auth_003 is blocked waiting for payment_api_001 to complete",
                "type": "dependency_blocked",
                "status": "open",
                "priority": "high",
                "dependency_id": "dep_001",
                "work_item_id": "auth_003",
                "created_at": "2026-01-03T10:00:00Z",
                "impact_description": "Blocks 3 downstream work items, potential 7-day delay"
            }
        }

