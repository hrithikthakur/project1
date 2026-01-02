from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DecisionType(str, Enum):
    """Types of decisions that can be made"""
    HIRE = "hire"
    FIRE = "fire"
    DELAY = "delay"
    ACCELERATE = "accelerate"
    CHANGE_SCOPE = "change_scope"
    ADD_RESOURCE = "add_resource"
    REMOVE_RESOURCE = "remove_resource"


class Decision(BaseModel):
    """Decision model"""
    id: str
    decision_type: DecisionType
    target_id: str  # ID of work item, milestone, or resource affected
    description: str
    timestamp: datetime
    effects: Optional[dict] = None  # Custom effects dictionary
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "dec_001",
                "decision_type": "hire",
                "target_id": "team_eng",
                "description": "Hire 2 senior engineers",
                "timestamp": "2024-01-15T10:00:00Z",
                "effects": {"velocity_multiplier": 1.3}
            }
        }

