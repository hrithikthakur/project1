from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RiskSeverity(str, Enum):
    """Risk severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskStatus(str, Enum):
    """Risk status"""
    ACTIVE = "active"
    MITIGATING = "mitigating"  # Risk is being actively mitigated
    MITIGATED = "mitigated"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"


class Risk(BaseModel):
    """Risk model"""
    id: str
    title: str
    description: str
    severity: RiskSeverity
    status: RiskStatus
    probability: float  # 0.0 to 1.0
    impact: dict  # Impact on various metrics
    affected_items: List[str]  # IDs of affected work items/milestones
    detected_at: datetime
    mitigated_at: Optional[datetime] = None
    
    # Acceptance fields (for ACCEPTED status)
    accepted_at: Optional[datetime] = None
    accepted_by: Optional[str] = None  # Actor ID who approved acceptance
    acceptance_boundary: Optional[dict] = None  # Boundary condition (date, threshold, event)
    next_date: Optional[datetime] = None  # Next review date
    
    # Mitigation fields (for MITIGATING status)
    mitigation_started_at: Optional[datetime] = None
    mitigation_decision: Optional[str] = None  # Decision ID
    mitigation_action: Optional[str] = None
    mitigation_due_date: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "risk_001",
                "title": "Key engineer departure",
                "description": "Risk of losing senior engineer",
                "severity": "high",
                "status": "active",
                "probability": 0.3,
                "impact": {"velocity_multiplier": 0.7},
                "affected_items": ["work_item_001", "milestone_001"],
                "detected_at": "2024-01-10T08:00:00Z"
            }
        }

