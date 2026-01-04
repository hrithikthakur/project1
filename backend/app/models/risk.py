from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any
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
    OPEN = "open"
    ACCEPTED = "accepted"
    MITIGATING = "mitigating"
    MATERIALISED = "materialised"
    CLOSED = "closed"


class Risk(BaseModel):
    """Risk model"""
    id: str
    title: str
    description: str
    severity: RiskSeverity
    status: RiskStatus
    probability: float  # 0.0 to 1.0
    impact: dict  # Impact on various metrics
    milestone_id: Optional[str] = Field(default=None)  # Milestone this risk is associated with
    affected_items: List[str]  # IDs of affected work items
    detected_at: datetime
    mitigated_at: Optional[datetime] = Field(default=None)
    
    # Acceptance fields (for ACCEPTED status)
    accepted_at: Optional[datetime] = Field(default=None)
    accepted_by: Optional[str] = Field(default=None)  # Actor ID who approved acceptance
    acceptance_boundary: Optional[dict] = Field(default=None)  # Boundary condition (date, threshold, event)
    next_date: Optional[datetime] = Field(default=None)  # Next review date
    
    # Mitigation fields (for MITIGATING status)
    mitigation_started_at: Optional[datetime] = Field(default=None)
    mitigation_decision: Optional[str] = Field(default=None)  # Decision ID
    mitigation_action: Optional[str] = Field(default=None)
    mitigation_due_date: Optional[datetime] = Field(default=None)
    
    @model_validator(mode='before')
    @classmethod
    def extract_milestone_id(cls, data: Any) -> Any:
        """Extract milestone_id from impact if it's not present at the top level"""
        if isinstance(data, dict):
            if not data.get('milestone_id') and 'impact' in data:
                impact = data['impact']
                if isinstance(impact, dict):
                    # Check for different ways it might be stored in mock data
                    if 'affected_milestone' in impact:
                        data['milestone_id'] = impact['affected_milestone']
                    elif 'affected_milestones' in impact and isinstance(impact['affected_milestones'], list) and len(impact['affected_milestones']) > 0:
                        data['milestone_id'] = impact['affected_milestones'][0]
        return data

    class Config:
        json_schema_extra = {
            "example": {
                "id": "risk_001",
                "title": "Key engineer departure",
                "description": "Risk of losing senior engineer",
                "severity": "high",
                "status": "open",
                "probability": 0.3,
                "impact": {"velocity_multiplier": 0.7},
                "milestone_id": "milestone_001",
                "affected_items": ["work_item_001"],
                "detected_at": "2024-01-10T08:00:00Z"
            }
        }

