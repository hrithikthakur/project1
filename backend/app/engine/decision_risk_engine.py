"""
Decision-Risk Engine v0
=======================

A deterministic, rule-based engine that:
- Listens to state change events
- Applies rules
- Emits commands (does NOT write to DB directly)

Architecture:
    (event, current_state) → commands[]
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date
from enum import Enum
from pydantic import BaseModel, Field


# ============================================================================
# EVENT SCHEMA
# ============================================================================

class EventType(str, Enum):
    """Supported event types organized by category"""
    
    # A. Dependency events
    DEPENDENCY_BLOCKED = "dependency_blocked"
    DEPENDENCY_UNBLOCKED = "dependency_unblocked"
    DEPENDENCY_UNAVAILABLE = "dependency_unavailable"
    DEPENDENCY_AVAILABLE = "dependency_available"
    
    # B. Risk events
    RISK_CREATED = "risk_created"
    RISK_UPDATED = "risk_updated"
    RISK_ACCEPTANCE_EXPIRED = "risk_acceptance_expired"
    RISK_MATERIALISED = "risk_materialised"
    
    # C. Decision events
    DECISION_CREATED = "decision_created"
    DECISION_APPROVED = "decision_approved"
    DECISION_SUPERSEDED = "decision_superseded"
    
    # D. Change events
    CHANGE_CREATED = "change_created"
    CHANGE_APPROVED = "change_approved"
    CHANGE_REJECTED = "change_rejected"
    
    # E. Forecast events
    FORECAST_UPDATED = "forecast_updated"
    FORECAST_THRESHOLD_BREACHED = "forecast_threshold_breached"


class Event(BaseModel):
    """
    Event model representing a state change in the system.
    Events are immutable facts about what happened.
    """
    event_id: str
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Context fields (event-specific)
    dependency_id: Optional[str] = None
    risk_id: Optional[str] = None
    risk_status: Optional[str] = None
    decision_id: Optional[str] = None
    decision_type: Optional[str] = None
    change_id: Optional[str] = None
    change_type: Optional[str] = None
    forecast_id: Optional[str] = None
    p50_date: Optional[date] = None
    p80_date: Optional[date] = None
    delta_p80_days: Optional[float] = None
    
    # Common fields
    milestone_id: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# COMMAND SCHEMA
# ============================================================================

class CommandType(str, Enum):
    """Command types that the engine can emit"""
    
    # Risk-related
    CREATE_RISK = "create_risk"
    UPDATE_RISK = "update_risk"
    SET_RISK_STATUS = "set_risk_status"
    LINK_RISK_TO_MILESTONE = "link_risk_to_milestone"
    
    # Decision-related
    LINK_DECISION_TO_RISK = "link_decision_to_risk"
    MARK_DECISION_EFFECTIVE = "mark_decision_effective"
    
    # Forecast-related
    UPDATE_FORECAST = "update_forecast"
    RECOMPUTE_FORECAST = "recompute_forecast"
    
    # Control / hygiene
    SET_NEXT_DATE = "set_next_date"
    ASSIGN_OWNER = "assign_owner"
    EMIT_EXPLANATION = "emit_explanation"
    ESCALATE_RISK = "escalate_risk"


class Command(BaseModel):
    """
    Command model representing an action to be taken.
    Commands are emitted by the engine but executed elsewhere.
    """
    command_id: str
    command_type: CommandType
    target_id: str  # ID of the entity to act on
    
    # Required metadata
    reason: str  # Why this command was issued
    rule_name: str  # Which rule generated this command
    
    # Command-specific payload
    payload: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    issued_at: datetime = Field(default_factory=datetime.now)
    priority: str = "normal"  # "low", "normal", "high", "urgent"


# ============================================================================
# STATE SNAPSHOT
# ============================================================================

class StateSnapshot(BaseModel):
    """
    Immutable snapshot of current system state.
    The engine reads from this but never mutates it.
    """
    work_items: Dict[str, Any] = Field(default_factory=dict)
    dependencies: Dict[str, Any] = Field(default_factory=dict)
    risks: Dict[str, Any] = Field(default_factory=dict)
    decisions: Dict[str, Any] = Field(default_factory=dict)
    milestones: Dict[str, Any] = Field(default_factory=dict)
    ownerships: Dict[str, Any] = Field(default_factory=dict)
    forecasts: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# FORECAST STUB
# ============================================================================

class ForecastResult(BaseModel):
    """Result from forecast/ripple simulation"""
    forecast_before: Dict[str, date]  # {"p50_date": ..., "p80_date": ...}
    forecast_after: Dict[str, date]   # {"p50_date": ..., "p80_date": ...}
    delta_p50_days: float
    delta_p80_days: float
    confidence: str = "LOW"
    method: str = "heuristic_stub"
    explanation: str


def simulate_ripple_stub(
    triggering_event: Event,
    state_snapshot: StateSnapshot
) -> ForecastResult:
    """
    STUB: Deterministic placeholder for forecast/ripple simulation.
    
    In production, this would:
    1. Run Monte Carlo simulation
    2. Calculate ripple effects through dependency graph
    3. Return probabilistic forecast deltas
    
    For now, returns deterministic heuristic results.
    """
    # TODO: Replace with real simulation
    
    # Heuristic: dependency blocks add ~7 days with high variance
    if triggering_event.event_type in [EventType.DEPENDENCY_BLOCKED, EventType.DEPENDENCY_UNAVAILABLE]:
        p50_delta = 7.0
        p80_delta = 14.0
        explanation = "Heuristic: Blocked dependencies typically add 7-14 days"
    else:
        p50_delta = 0.0
        p80_delta = 0.0
        explanation = "No delay heuristic for this event type"
    
    # Mock dates
    today = date.today()
    
    return ForecastResult(
        forecast_before={
            "p50_date": today + timedelta(days=30),
            "p80_date": today + timedelta(days=40)
        },
        forecast_after={
            "p50_date": today + timedelta(days=30 + p50_delta),
            "p80_date": today + timedelta(days=40 + p80_delta)
        },
        delta_p50_days=p50_delta,
        delta_p80_days=p80_delta,
        confidence="LOW",
        method="heuristic_stub",
        explanation=explanation
    )


# ============================================================================
# RULES
# ============================================================================

class Rule:
    """Base class for rules"""
    
    name: str = "base_rule"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        """Check if this rule applies to the given event and state"""
        raise NotImplementedError
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        """Execute the rule and return commands"""
        raise NotImplementedError


class Rule1_DependencyBlocked(Rule):
    """
    Rule 1: Dependency Blocked → Risk (MATERIALISED)
    
    When a dependency is blocked or unavailable:
    1. Call forecast/ripple stub
    2. Compare forecast before vs after
    3. Create or update a Risk with status MATERIALISED
    4. Tighten next_date (now + 1 day)
    """
    
    name = "rule_1_dependency_blocked"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type in [
            EventType.DEPENDENCY_BLOCKED,
            EventType.DEPENDENCY_UNAVAILABLE
        ]
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        dependency_id = event.dependency_id
        if not dependency_id:
            return commands
        
        dependency = state.dependencies.get(dependency_id)
        if not dependency:
            return commands
        
        # Step 1: Call forecast stub
        forecast_result = simulate_ripple_stub(event, state)
        p80_delta = forecast_result.delta_p80_days
        
        # Step 2: Get work item names for readable descriptions
        from_id = dependency.get('from_id')
        to_id = dependency.get('to_id')
        
        from_item = state.work_items.get(from_id, {})
        to_item = state.work_items.get(to_id, {})
        
        from_name = from_item.get('title', from_id)
        to_name = to_item.get('title', to_id)
        
        # Step 3: Create/update Risk with status MATERIALISED
        risk_id = f"risk_dep_blocked_{dependency_id}"
        existing_risk = state.risks.get(risk_id)
        
        # Determine owner
        owner_id = self._determine_owner(dependency, state)
        
        # Tighten next_date (now + 1 day for materialized risks)
        next_date = date.today() + timedelta(days=1)
        
        if existing_risk:
            # Update existing risk to MATERIALISED
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_update_risk",
                command_type=CommandType.UPDATE_RISK,
                target_id=risk_id,
                reason=f"Dependency blocked: '{from_name}' is waiting for '{to_name}'. Risk materialized with {p80_delta:.1f} day impact.",
                rule_name=self.name,
                payload={
                    "status": "materialised",
                    "description": f"Work item '{from_name}' is blocked waiting for '{to_name}' to complete. Expected delay: {p80_delta:.1f} days",
                    "impact": {
                        "p80_delay_days": p80_delta,
                        "p50_delay_days": forecast_result.delta_p50_days,
                        "blocked_item": from_name,
                        "blocking_item": to_name,
                    },
                    "forecast_method": forecast_result.method,
                    "confidence": forecast_result.confidence,
                },
                priority="urgent"
            ))
        else:
            # Create new risk as MATERIALISED
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_create_risk",
                command_type=CommandType.CREATE_RISK,
                target_id=risk_id,
                reason=f"Dependency blocked: '{from_name}' is waiting for '{to_name}'. Risk materialized with {p80_delta:.1f} day impact.",
                rule_name=self.name,
                payload={
                    "id": risk_id,
                    "title": f"Blocked Dependency: {from_name}",
                    "description": f"Work item '{from_name}' is blocked waiting for '{to_name}' to complete. Expected delay: {p80_delta:.1f} days",
                    "severity": "high" if p80_delta > 14 else "medium",
                    "status": "materialised",
                    "probability": 1.0,  # Materialized = 100%
                    "impact": {
                        "p80_delay_days": p80_delta,
                        "p50_delay_days": forecast_result.delta_p50_days,
                        "blocked_item": from_name,
                        "blocking_item": to_name,
                    },
                    "affected_items": [from_id],
                    "detected_at": datetime.now().isoformat(),
                },
                priority="urgent"
            ))
        
        # Step 3: Tighten next_date for owner
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_set_next_date",
            command_type=CommandType.SET_NEXT_DATE,
            target_id=owner_id,
            reason="Materialized risk requires immediate attention (within 24h)",
            rule_name=self.name,
            payload={
                "owner_id": owner_id,
                "entity_type": "risk",
                "entity_id": risk_id,
                "next_date": next_date.isoformat(),
            },
            priority="urgent"
        ))
        
        # Step 4: Escalate
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_escalate",
            command_type=CommandType.ESCALATE_RISK,
            target_id=risk_id,
            reason="Risk materialized - immediate attention required",
            rule_name=self.name,
            priority="urgent"
        ))
        
        return commands
    
    def _determine_owner(self, dependency: Dict[str, Any], state: StateSnapshot) -> str:
        """Determine who should own the risk"""
        # TODO: Look up actual ownership from state
        # For now, return a placeholder
        from_id = dependency.get("from_id", "")
        
        # Try to find ownership for the blocked work item
        for ownership_id, ownership in state.ownerships.items():
            if ownership.get("entity_id") == from_id:
                return ownership.get("owner_actor_id", "default_owner")
        
        return "default_owner"


class Rule2_DependencyUnblocked(Rule):
    """
    Rule 2: Dependency unblocked → Risk CLOSED
    
    When a dependency is unblocked or becomes available:
    1. Update Risk.status → CLOSED
    2. Recompute forecast
    """
    
    name = "rule_2_dependency_unblocked"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type in [
            EventType.DEPENDENCY_UNBLOCKED,
            EventType.DEPENDENCY_AVAILABLE
        ]
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        dependency_id = event.dependency_id
        if not dependency_id:
            return commands
        
        # Step 1: Find and close related Risk
        risk_id = f"risk_dep_blocked_{dependency_id}"
        existing_risk = state.risks.get(risk_id)
        
        if existing_risk:
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_close_risk",
                command_type=CommandType.SET_RISK_STATUS,
                target_id=risk_id,
                reason=f"Dependency {dependency_id} unblocked. Closing materialized risk.",
                rule_name=self.name,
                payload={
                    "status": "closed",
                    "closed_at": datetime.now().isoformat()
                }
            ))
        
        # Step 2: Recompute forecast
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_recompute_forecast",
            command_type=CommandType.RECOMPUTE_FORECAST,
            target_id="system",
            reason="Dependency unblocked - recomputing overall forecast",
            rule_name=self.name
        ))
        
        return commands


class Rule3_ForecastThresholdBreached(Rule):
    """
    Rule 3: Forecast threshold breached → Escalate risk
    
    When forecast threshold is breached:
    1. If risk is ACCEPTED and boundary breached:
       - Reopen risk
       - Escalate
    2. Tighten next_date (+2 days)
    """
    
    name = "rule_3_forecast_threshold_breached"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.FORECAST_THRESHOLD_BREACHED
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        """STUB: To be implemented"""
        commands = []
        
        # TODO: Implement Rule 3
        # 1. Check if risk is ACCEPTED
        # 2. Check if boundary breached
        # 3. Reopen risk and escalate
        # 4. Tighten next_date
        
        return commands


class Rule4_AcceptRiskDecisionApproved(Rule):
    """
    Rule 4: Accept Risk Decision Approved
    
    When a decision to accept a risk is approved:
    1. Transition Risk.status → ACCEPTED
    2. Suppress escalation until acceptance boundary
    3. Set next_date = acceptance_until (or sooner)
    """
    
    name = "rule_4_accept_risk_approved"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        if event.event_type != EventType.DECISION_APPROVED:
            return False
        
        decision = state.decisions.get(event.decision_id)
        if not decision:
            return False
        
        return decision.get("decision_type") == "accept_risk"
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        decision = state.decisions.get(event.decision_id)
        if not decision:
            return commands
        
        risk_id = decision.get("risk_id")
        if not risk_id:
            return commands
        
        risk = state.risks.get(risk_id)
        if not risk:
            return commands
        
        # Get approver (who made the decision)
        # In production, get from decision ownership or auth context
        owner_id = self._get_risk_owner(risk, state)
        
        # Parse acceptance boundary
        acceptance_until = decision.get("acceptance_until")
        threshold = decision.get("threshold")
        escalation_trigger = decision.get("escalation_trigger")
        
        # Build acceptance_boundary dict
        acceptance_boundary = {}
        boundary_date = None
        
        if acceptance_until:
            # Convert to date if it's a string
            if isinstance(acceptance_until, str):
                try:
                    boundary_date = datetime.fromisoformat(acceptance_until.replace('Z', '+00:00')).date()
                except:
                    boundary_date = date.today() + timedelta(days=30)
            else:
                boundary_date = acceptance_until
            acceptance_boundary["type"] = "date"
            acceptance_boundary["date"] = boundary_date.isoformat()
        
        if threshold:
            acceptance_boundary["type"] = "threshold"
            acceptance_boundary["threshold"] = threshold
        
        if escalation_trigger:
            acceptance_boundary["type"] = "event"
            acceptance_boundary["trigger"] = escalation_trigger
        
        # Calculate next_date: min(boundary_date, now + 7 days)
        review_interval_days = 7
        default_review_date = date.today() + timedelta(days=review_interval_days)
        
        if boundary_date:
            next_review_date = min(boundary_date, default_review_date)
        else:
            # No boundary date, use default review interval
            next_review_date = default_review_date
        
        # Step 1: Transition Risk.status → ACCEPTED
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_accept_risk",
            command_type=CommandType.UPDATE_RISK,
            target_id=risk_id,
            reason=f"Decision {event.decision_id} approved to accept this risk",
            rule_name=self.name,
            payload={
                "status": "accepted",
                "accepted_at": datetime.now().isoformat(),
                "accepted_by": owner_id,  # Approver actor ID
                "acceptance_boundary": acceptance_boundary,
                "next_date": next_review_date.isoformat(),
            }
        ))
        
        # Step 2: Update ownership with next_date and escalation suppression
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_set_next_date_acceptance",
            command_type=CommandType.SET_NEXT_DATE,
            target_id=owner_id,
            reason=f"Accepted risk must be reviewed by {next_review_date}",
            rule_name=self.name,
            payload={
                "owner_id": owner_id,
                "entity_type": "risk",
                "entity_id": risk_id,
                "next_date": next_review_date.isoformat(),
                "suppress_escalation_until": acceptance_boundary.get("date") or next_review_date.isoformat(),
                "escalation_mode": "quiet_monitoring",  # Monitor quietly, no noisy alerts
            }
        ))
        
        return commands
    
    def _get_risk_owner(self, risk: Dict[str, Any], state: StateSnapshot) -> str:
        """Get the owner of a risk"""
        risk_id = risk.get("id")
        
        for ownership_id, ownership in state.ownerships.items():
            if ownership.get("entity_id") == risk_id:
                return ownership.get("owner_actor_id", "default_owner")
        
        return "default_owner"


class Rule5_MitigateRiskDecisionApproved(Rule):
    """
    Rule 5: Mitigate Risk Decision Approved
    
    When a decision to mitigate a risk is approved:
    1. Transition Risk.status → MITIGATING
    2. Track mitigation due_date
    3. Recompute forecast on mitigation completion
    """
    
    name = "rule_5_mitigate_risk_approved"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        if event.event_type != EventType.DECISION_APPROVED:
            return False
        
        decision = state.decisions.get(event.decision_id)
        if not decision:
            return False
        
        return decision.get("decision_type") == "mitigate_risk"
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        decision = state.decisions.get(event.decision_id)
        if not decision:
            return commands
        
        risk_id = decision.get("risk_id")
        if not risk_id:
            return commands
        
        risk = state.risks.get(risk_id)
        if not risk:
            return commands
        
        # Step 1: Transition Risk.status → MITIGATING
        due_date = decision.get("due_date")
        
        # Convert due_date to ISO format string if needed
        due_date_str = None
        if due_date:
            if isinstance(due_date, str):
                due_date_str = due_date
            else:
                due_date_str = due_date.isoformat()
        
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_mitigate_risk",
            command_type=CommandType.UPDATE_RISK,
            target_id=risk_id,
            reason=f"Decision {event.decision_id} approved to mitigate this risk",
            rule_name=self.name,
            payload={
                "status": "mitigating",
                "mitigation_started_at": datetime.now().isoformat(),
                "mitigation_decision": event.decision_id,
                "mitigation_action": decision.get("action", ""),
                "mitigation_due_date": due_date_str,
            }
        ))
        
        # Step 2: Track mitigation due_date
        if due_date:
            owner_id = self._get_risk_owner(risk, state)
            
            # Convert to date if needed
            if isinstance(due_date, str):
                try:
                    due_date_obj = datetime.fromisoformat(due_date.replace('Z', '+00:00')).date()
                except:
                    due_date_obj = date.today() + timedelta(days=14)
            else:
                due_date_obj = due_date
            
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_set_mitigation_due_date",
                command_type=CommandType.SET_NEXT_DATE,
                target_id=owner_id,
                reason=f"Mitigation action due by {due_date_obj}",
                rule_name=self.name,
                payload={
                    "owner_id": owner_id,
                    "entity_type": "risk",
                    "entity_id": risk_id,
                    "next_date": due_date_obj.isoformat(),
                    "action_required": "complete_mitigation",
                }
            ))
        
        # Step 3: Schedule forecast recomputation (placeholder)
        # In a real system, this would trigger when mitigation is completed
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_schedule_forecast",
            command_type=CommandType.UPDATE_FORECAST,
            target_id=risk_id,
            reason="Forecast will be recomputed after mitigation completion",
            rule_name=self.name,
            payload={
                "trigger": "mitigation_completion",
                "risk_id": risk_id,
                "note": "TODO: Implement forecast recomputation trigger",
            }
        ))
        
        return commands
    
    def _get_risk_owner(self, risk: Dict[str, Any], state: StateSnapshot) -> str:
        """Get the owner of a risk"""
        risk_id = risk.get("id")
        
        for ownership_id, ownership in state.ownerships.items():
            if ownership.get("entity_id") == risk_id:
                return ownership.get("owner_actor_id", "default_owner")
        
        return "default_owner"


class Rule6_RiskMaterialised(Rule):
    """
    Rule 6: Risk materialises → Escalate
    
    When a risk materialises (detected externally):
    1. Set status to MATERIALISED
    2. Escalate
    3. Tighten next_date (24h)
    """
    
    name = "rule_6_risk_materialised"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.RISK_MATERIALISED
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        risk_id = event.risk_id
        if not risk_id:
            return commands
        
        # 1. Update status to MATERIALISED
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_materialise_risk",
            command_type=CommandType.SET_RISK_STATUS,
            target_id=risk_id,
            reason="Risk materialisation detected",
            rule_name=self.name,
            payload={"status": "materialised"},
            priority="urgent"
        ))
        
        # 2. Escalate
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_escalate_materialised",
            command_type=CommandType.ESCALATE_RISK,
            target_id=risk_id,
            reason="Risk has materialised - urgent attention required",
            rule_name=self.name,
            priority="urgent"
        ))
        
        return commands


class Rule7_RiskClosed(Rule):
    """
    Rule 7: Risk closed → Update forecast
    
    When a risk is closed:
    1. Recompute forecast
    """
    
    name = "rule_7_risk_closed"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        if event.event_type == EventType.RISK_UPDATED:
            return event.risk_status == "closed"
        return False
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        commands.append(Command(
            command_id=f"cmd_{event.event_id}_recompute_forecast_on_close",
            command_type=CommandType.RECOMPUTE_FORECAST,
            target_id="system",
            reason="Risk closed - updating forecast",
            rule_name=self.name
        ))
        
        return commands


class Rule8_ChangeApproved(Rule):
    """
    Rule 8: Change approved → Forecast update
    
    When a change is approved:
    1. Recompute forecast
    2. If negative impact:
       - Create or update Risk
    3. Set next_date
    """
    
    name = "rule_8_change_approved"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.CHANGE_APPROVED
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        """STUB: To be implemented"""
        commands = []
        
        change_id = event.change_id
        if not change_id:
            return commands
        
        # TODO: Implement Rule 8
        # 1. Recompute forecast
        # 2. If negative impact, create/update Risk
        # 3. Set next_date
        
        return commands


class Rule9_DecisionSuperseded(Rule):
    """
    Rule 9: Decision superseded
    
    When a decision is superseded:
    1. Re-evaluate linked risks
    2. Restore escalation if needed
    3. Set new next_dates
    """
    
    name = "rule_9_decision_superseded"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.DECISION_SUPERSEDED
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        """STUB: To be implemented"""
        commands = []
        
        decision_id = event.decision_id
        if not decision_id:
            return commands
        
        # TODO: Implement Rule 9
        # 1. Re-evaluate linked risks
        # 2. Restore escalation if needed
        # 3. Set new next_dates
        
        return commands


# ============================================================================
# ENGINE
# ============================================================================

class DecisionRiskEngine:
    """
    Decision-Risk Engine v0
    
    Architecture: (event, current_state) → commands[]
    
    The engine is:
    - Deterministic: same input always produces same output
    - Side-effect free: only emits commands, never mutates state
    - Testable: pure functions with clear inputs/outputs
    """
    
    def __init__(self):
        """Initialize the engine with all rules"""
        self.rules: List[Rule] = [
            # Rule 1: Dependency blocked → Risk (MATERIALISED)
            Rule1_DependencyBlocked(),
            
            # Rule 2: Dependency unblocked → Risk CLOSED
            Rule2_DependencyUnblocked(),
            
            # Rule 3: Forecast threshold breached → Escalate risk (STUB)
            Rule3_ForecastThresholdBreached(),
            
            # Rule 4: Decision approved (ACCEPT_RISK)
            Rule4_AcceptRiskDecisionApproved(),
            
            # Rule 5: Decision approved (MITIGATE_RISK)
            Rule5_MitigateRiskDecisionApproved(),
            
            # Rule 6: Risk materialises → Escalate
            Rule6_RiskMaterialised(),
            
            # Rule 7: Risk closed → Update forecast
            Rule7_RiskClosed(),
            
            # Rule 8: Change approved → Forecast update (STUB)
            Rule8_ChangeApproved(),
            
            # Rule 9: Decision superseded (STUB)
            Rule9_DecisionSuperseded(),
        ]
    
    def process_event(self, event: Event, state: StateSnapshot) -> List[Command]:
        """
        Main entry point: process an event and return commands.
        
        Args:
            event: The event that occurred
            state: Current state snapshot (immutable)
        
        Returns:
            List of commands to execute
        """
        commands = []
        
        # Evaluate each rule
        for rule in self.rules:
            if rule.matches(event, state):
                rule_commands = rule.execute(event, state)
                commands.extend(rule_commands)
        
        return commands
    
    def add_rule(self, rule: Rule):
        """Add a custom rule to the engine"""
        self.rules.append(rule)

