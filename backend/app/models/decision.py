from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Literal
from datetime import datetime, date
from enum import Enum


# ============================================================================
# Decision Type Enum
# ============================================================================

class DecisionType(str, Enum):
    """Top-level decision types"""
    CHANGE_SCOPE = "change_scope"
    CHANGE_SCHEDULE = "change_schedule"
    CHANGE_CAPACITY = "change_capacity"
    CHANGE_PRIORITY = "change_priority"
    ACCEPT_RISK = "accept_risk"
    MITIGATE_RISK = "mitigate_risk"


# ============================================================================
# Subtype Enums
# ============================================================================

class ChangeScopeSubtype(str, Enum):
    ADD = "ADD"
    REMOVE = "REMOVE"
    SWAP = "SWAP"
    SPLIT_PHASES = "SPLIT_PHASES"


class ChangeScheduleSubtype(str, Enum):
    MOVE_TARGET_DATE = "MOVE_TARGET_DATE"
    CHANGE_CONFIDENCE_LEVEL = "CHANGE_CONFIDENCE_LEVEL"
    FREEZE_DATE = "FREEZE_DATE"


class ChangeCapacitySubtype(str, Enum):
    ADD_PEOPLE = "ADD_PEOPLE"
    REMOVE_PEOPLE = "REMOVE_PEOPLE"
    REALLOCATE_PEOPLE = "REALLOCATE_PEOPLE"
    ADD_TIMEBOX = "ADD_TIMEBOX"
    ADD_BUDGET = "ADD_BUDGET"


class ChangePrioritySubtype(str, Enum):
    MAKE_CRITICAL = "MAKE_CRITICAL"
    DEPRIORITISE = "DEPRIORITISE"
    PAUSE = "PAUSE"
    RESUME = "RESUME"


class AcceptRiskSubtype(str, Enum):
    ACCEPT_UNTIL_DATE = "ACCEPT_UNTIL_DATE"
    ACCEPT_WITH_THRESHOLD = "ACCEPT_WITH_THRESHOLD"
    ACCEPT_AND_MONITOR = "ACCEPT_AND_MONITOR"


class MitigateRiskSubtype(str, Enum):
    DECOUPLE_DEPENDENCY = "DECOUPLE_DEPENDENCY"
    REDUCE_WIP = "REDUCE_WIP"
    SPLIT_WORK = "SPLIT_WORK"
    ADD_REVIEWER_CAPACITY = "ADD_REVIEWER_CAPACITY"
    ESCALATE_BLOCKER = "ESCALATE_BLOCKER"


# ============================================================================
# Decision Status
# ============================================================================

class DecisionStatus(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    SUPERSEDED = "superseded"


# ============================================================================
# Main Decision Model (Option 1: Typed Fields)
# ============================================================================

class Decision(BaseModel):
    """
    Decision model with explicit typed fields instead of payload JSON blob.
    All type-specific fields are Optional and validated based on decision_type + subtype.
    """
    # Common fields (always present)
    id: str
    decision_type: DecisionType
    subtype: str
    status: DecisionStatus = DecisionStatus.PROPOSED
    milestone_name: str = ""
    next_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.now)
    # Note: Ownership is tracked separately via the Ownership model
    # Use owner_actor_id from Ownership table to get the owner
    
    # CHANGE_SCOPE fields
    add_item_ids: Optional[List[str]] = None
    remove_item_ids: Optional[List[str]] = None
    reason: Optional[str] = None  # Used by CHANGE_SCOPE and CHANGE_PRIORITY
    effort_delta_days: Optional[float] = None
    
    # CHANGE_SCHEDULE fields
    new_target_date: Optional[date] = None
    previous_target_date: Optional[date] = None
    commitment_percentile: Optional[Literal[50, 80]] = None
    
    # CHANGE_CAPACITY fields
    team_id: Optional[str] = None
    delta_fte: Optional[float] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    method: Optional[Literal["hire", "contractor", "internal_reallocation"]] = None
    cost_delta: Optional[float] = None
    
    # CHANGE_PRIORITY fields
    item_ids: Optional[List[str]] = None  # Also used by CHANGE_SCOPE
    priority_rank: Optional[int] = None
    priority_bucket: Optional[Literal["P0", "P1", "P2"]] = None
    
    # ACCEPT_RISK fields
    risk_id: Optional[str] = None  # Also used by MITIGATE_RISK
    acceptance_until: Optional[date] = None
    threshold: Optional[str] = None
    escalation_trigger: Optional[str] = None
    
    # MITIGATE_RISK fields
    action: Optional[str] = None
    expected_probability_delta: Optional[float] = None
    expected_impact_days_delta: Optional[float] = None
    due_date: Optional[date] = None

    @model_validator(mode='after')
    def validate_subtype(self):
        """Validate subtype matches decision_type"""
        valid_subtypes = {
            DecisionType.CHANGE_SCOPE: [e.value for e in ChangeScopeSubtype],
            DecisionType.CHANGE_SCHEDULE: [e.value for e in ChangeScheduleSubtype],
            DecisionType.CHANGE_CAPACITY: [e.value for e in ChangeCapacitySubtype],
            DecisionType.CHANGE_PRIORITY: [e.value for e in ChangePrioritySubtype],
            DecisionType.ACCEPT_RISK: [e.value for e in AcceptRiskSubtype],
            DecisionType.MITIGATE_RISK: [e.value for e in MitigateRiskSubtype],
        }
        
        if self.decision_type in valid_subtypes:
            if self.subtype not in valid_subtypes[self.decision_type]:
                raise ValueError(
                    f"Invalid subtype '{self.subtype}' for decision_type '{self.decision_type}'. "
                    f"Valid subtypes: {valid_subtypes[self.decision_type]}"
                )
        return self

    @model_validator(mode='after')
    def validate_required_fields(self):
        """Validate required fields based on decision_type and subtype"""
        
        if self.decision_type == DecisionType.CHANGE_SCOPE:
            # At least one of add_item_ids or remove_item_ids must be provided
            if not self.add_item_ids and not self.remove_item_ids:
                raise ValueError("CHANGE_SCOPE requires at least one of add_item_ids or remove_item_ids")
            # Reason is required
            if not self.reason:
                raise ValueError("CHANGE_SCOPE requires reason field")
        
        elif self.decision_type == DecisionType.CHANGE_SCHEDULE:
            if self.subtype == ChangeScheduleSubtype.MOVE_TARGET_DATE.value:
                if not self.new_target_date:
                    raise ValueError("MOVE_TARGET_DATE requires new_target_date")
            elif self.subtype == ChangeScheduleSubtype.CHANGE_CONFIDENCE_LEVEL.value:
                if not self.commitment_percentile:
                    raise ValueError("CHANGE_CONFIDENCE_LEVEL requires commitment_percentile")
            # FREEZE_DATE doesn't require additional fields
        
        elif self.decision_type == DecisionType.CHANGE_CAPACITY:
            if not self.team_id:
                raise ValueError("CHANGE_CAPACITY requires team_id")
            if self.delta_fte is None:
                raise ValueError("CHANGE_CAPACITY requires delta_fte")
            if not self.start_date:
                raise ValueError("CHANGE_CAPACITY requires start_date")
            if not self.method:
                raise ValueError("CHANGE_CAPACITY requires method")
        
        elif self.decision_type == DecisionType.CHANGE_PRIORITY:
            if not self.item_ids or len(self.item_ids) == 0:
                raise ValueError("CHANGE_PRIORITY requires item_ids")
            if not self.reason:
                raise ValueError("CHANGE_PRIORITY requires reason")
        
        elif self.decision_type == DecisionType.ACCEPT_RISK:
            if not self.risk_id:
                raise ValueError("ACCEPT_RISK requires risk_id")
            if self.subtype == AcceptRiskSubtype.ACCEPT_UNTIL_DATE.value:
                if not self.acceptance_until:
                    raise ValueError("ACCEPT_UNTIL_DATE requires acceptance_until")
            elif self.subtype == AcceptRiskSubtype.ACCEPT_WITH_THRESHOLD.value:
                if not self.threshold:
                    raise ValueError("ACCEPT_WITH_THRESHOLD requires threshold")
            # ACCEPT_AND_MONITOR doesn't require additional fields
        
        elif self.decision_type == DecisionType.MITIGATE_RISK:
            if not self.risk_id:
                raise ValueError("MITIGATE_RISK requires risk_id")
            if not self.action:
                raise ValueError("MITIGATE_RISK requires action")
        
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "id": "dec_001",
                "decision_type": "change_schedule",
                "subtype": "MOVE_TARGET_DATE",
                "milestone_name": "Authentication MVP",
                "status": "proposed",
                "new_target_date": "2026-05-07",
                "previous_target_date": "2026-04-30",
                "created_at": "2026-01-01T10:00:00Z"
            }
        }
