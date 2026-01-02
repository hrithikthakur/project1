from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class Milestone(BaseModel):
    """Milestone model"""
    id: str
    name: str
    description: str
    target_date: datetime
    work_items: List[str]  # IDs of work items in this milestone
    status: str = "pending"  # pending, at_risk, achieved, missed
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "milestone_001",
                "name": "MVP Launch",
                "description": "Minimum viable product release",
                "target_date": "2024-03-01T00:00:00Z",
                "work_items": ["work_item_001", "work_item_002"],
                "status": "pending"
            }
        }

