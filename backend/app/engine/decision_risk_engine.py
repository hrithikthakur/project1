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
    """Supported event types"""
    DEPENDENCY_BLOCKED = "dependency_blocked"
    DECISION_APPROVED = "decision_approved"
    DECISION_REJECTED = "decision_rejected"
    RISK_THRESHOLD_EXCEEDED = "risk_threshold_exceeded"
    MILESTONE_AT_RISK = "milestone_at_risk"


class Event(BaseModel):
    """
    Event model representing a state change in the system.
    Events are immutable facts about what happened.
    """
    event_id: str
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Context fields (event-specific)
    dependency_id: Optional[str] = None  # For DEPENDENCY_BLOCKED
    decision_id: Optional[str] = None    # For DECISION_APPROVED/REJECTED
    risk_id: Optional[str] = None        # For RISK_THRESHOLD_EXCEEDED
    milestone_id: Optional[str] = None   # For MILESTONE_AT_RISK
    
    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# COMMAND SCHEMA
# ============================================================================

class CommandType(str, Enum):
    """Command types that the engine can emit"""
    CREATE_ISSUE = "create_issue"
    UPDATE_ISSUE = "update_issue"
    CREATE_RISK = "create_risk"
    UPDATE_RISK = "update_risk"
    UPDATE_FORECAST = "update_forecast"
    SET_NEXT_DATE = "set_next_date"
    CREATE_NOTIFICATION = "create_notification"


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
    issues: Dict[str, Any] = Field(default_factory=dict)
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
    if triggering_event.event_type == EventType.DEPENDENCY_BLOCKED:
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
    Rule 1: Dependency Blocked
    
    When a dependency is blocked:
    1. Ensure an Issue exists (type: dependency_blocked)
    2. Call forecast/ripple stub
    3. Compare forecast before vs after
    4. If P80 delta > threshold: create or update a Risk
    """
    
    name = "rule_1_dependency_blocked"
    
    # Configuration
    P80_THRESHOLD_DAYS = 7.0  # Create risk if P80 slips by more than 7 days
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.DEPENDENCY_BLOCKED
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        dependency_id = event.dependency_id
        if not dependency_id:
            return commands
        
        dependency = state.dependencies.get(dependency_id)
        if not dependency:
            return commands
        
        # Step 1: Ensure Issue exists
        issue_id = f"issue_dep_blocked_{dependency_id}"
        existing_issue = state.issues.get(issue_id)
        
        if not existing_issue:
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_create_issue",
                command_type=CommandType.CREATE_ISSUE,
                target_id=issue_id,
                reason=f"Dependency {dependency_id} is blocked",
                rule_name=self.name,
                payload={
                    "id": issue_id,
                    "type": "dependency_blocked",
                    "title": f"Dependency blocked: {dependency.get('from_id')} → {dependency.get('to_id')}",
                    "description": f"Work item {dependency.get('from_id')} is blocked waiting for {dependency.get('to_id')}",
                    "dependency_id": dependency_id,
                    "created_at": datetime.now().isoformat(),
                }
            ))
        
        # Step 2: Call forecast stub
        forecast_result = simulate_ripple_stub(event, state)
        
        # Step 3: Compare forecast delta
        p80_delta = forecast_result.delta_p80_days
        
        # Step 4: If P80 delta > threshold, create/update Risk
        if p80_delta > self.P80_THRESHOLD_DAYS:
            risk_id = f"risk_dep_blocked_{dependency_id}"
            existing_risk = state.risks.get(risk_id)
            
            # Determine owner (dependency owner or milestone owner)
            owner_id = self._determine_owner(dependency, state)
            
            # Calculate next_date
            next_date = date.today() + timedelta(days=7)
            
            if existing_risk:
                # Update existing risk
                commands.append(Command(
                    command_id=f"cmd_{event.event_id}_update_risk",
                    command_type=CommandType.UPDATE_RISK,
                    target_id=risk_id,
                    reason=f"P80 forecast slipped by {p80_delta:.1f} days (threshold: {self.P80_THRESHOLD_DAYS})",
                    rule_name=self.name,
                    payload={
                        "status": "active",
                        "impact": {
                            "p80_delay_days": p80_delta,
                            "p50_delay_days": forecast_result.delta_p50_days
                        },
                        "forecast_method": forecast_result.method,
                        "confidence": forecast_result.confidence,
                    },
                    priority="high"
                ))
            else:
                # Create new risk
                commands.append(Command(
                    command_id=f"cmd_{event.event_id}_create_risk",
                    command_type=CommandType.CREATE_RISK,
                    target_id=risk_id,
                    reason=f"P80 forecast slipped by {p80_delta:.1f} days (threshold: {self.P80_THRESHOLD_DAYS})",
                    rule_name=self.name,
                    payload={
                        "id": risk_id,
                        "title": f"Schedule risk due to blocked dependency",
                        "description": f"Blocked dependency {dependency_id} may delay milestone by {p80_delta:.1f} days",
                        "severity": "high" if p80_delta > 14 else "medium",
                        "status": "active",
                        "probability": 0.8,  # P80 implies 80% confidence
                        "impact": {
                            "p80_delay_days": p80_delta,
                            "p50_delay_days": forecast_result.delta_p50_days
                        },
                        "affected_items": [dependency.get('from_id')],
                        "detected_at": datetime.now().isoformat(),
                    }
                ))
            
            # Set next_date for owner
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_set_next_date",
                command_type=CommandType.SET_NEXT_DATE,
                target_id=owner_id,
                reason="Risk requires review within 7 days",
                rule_name=self.name,
                payload={
                    "owner_id": owner_id,
                    "entity_type": "risk",
                    "entity_id": risk_id,
                    "next_date": next_date.isoformat(),
                }
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


class Rule2_AcceptRiskDecisionApproved(Rule):
    """
    Rule 2: Accept Risk Decision Approved
    
    When a decision to accept a risk is approved:
    1. Transition Risk.status → ACCEPTED
    2. Suppress escalation until acceptance boundary
    3. Set next_date = acceptance_until (or sooner)
    """
    
    name = "rule_2_accept_risk_approved"
    
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
                "accepted_by_decision": event.decision_id,
            }
        ))
        
        # Step 2 & 3: Set next_date to acceptance_until
        acceptance_until = decision.get("acceptance_until")
        if acceptance_until:
            # Convert to date if it's a string
            if isinstance(acceptance_until, str):
                try:
                    acceptance_date = datetime.fromisoformat(acceptance_until.replace('Z', '+00:00')).date()
                except:
                    acceptance_date = date.today() + timedelta(days=30)
            else:
                acceptance_date = acceptance_until
            
            # Determine owner
            owner_id = self._get_risk_owner(risk, state)
            
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_set_next_date_acceptance",
                command_type=CommandType.SET_NEXT_DATE,
                target_id=owner_id,
                reason=f"Accepted risk must be reviewed by {acceptance_date}",
                rule_name=self.name,
                payload={
                    "owner_id": owner_id,
                    "entity_type": "risk",
                    "entity_id": risk_id,
                    "next_date": acceptance_date.isoformat(),
                    "suppress_escalation_until": acceptance_date.isoformat(),
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


class Rule3_MitigateRiskDecisionApproved(Rule):
    """
    Rule 3: Mitigate Risk Decision Approved
    
    When a decision to mitigate a risk is approved:
    1. Transition Risk.status → MITIGATING
    2. Track mitigation due_date
    3. Recompute forecast on mitigation completion
    """
    
    name = "rule_3_mitigate_risk_approved"
    
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
        """Initialize the engine with rules"""
        self.rules: List[Rule] = [
            Rule1_DependencyBlocked(),
            Rule2_AcceptRiskDecisionApproved(),
            Rule3_MitigateRiskDecisionApproved(),
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

