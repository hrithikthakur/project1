from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class WorkItemStatus(str, Enum):
    """Work item status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class WorkItem(BaseModel):
    """Work item model"""
    id: str
    title: str
    description: str
    status: WorkItemStatus
    estimated_days: float
    actual_days: Optional[float] = None
    assigned_to: List[str]  # Actor IDs (users or teams)
    dependencies: List[str]  # IDs of dependent work items
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    milestone_id: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "work_item_001",
                "title": "Implement authentication",
                "description": "Add OAuth2 authentication",
                "status": "in_progress",
                "estimated_days": 5.0,
                "assigned_to": ["actor_001", "actor_002"],
                "dependencies": [],
                "milestone_id": "milestone_001"
            }
        }

