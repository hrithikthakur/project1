"""
API endpoints for Decision-Risk Engine event processing

This module provides REST endpoints to:
1. Submit events to the engine
2. View generated commands
3. Execute commands (placeholder)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

from ..engine.decision_risk_engine import (
    Event,
    EventType,
    Command,
    StateSnapshot,
    DecisionRiskEngine,
)
from ..data.loader import (
    get_work_items,
    get_dependencies,
    get_risks,
    get_decisions,
    get_milestones,
)


router = APIRouter(prefix="/api/decision-risk-engine", tags=["decision-risk-engine"])

# Global engine instance
engine = DecisionRiskEngine()


# ============================================================================
# Request/Response Models
# ============================================================================

class EventSubmission(BaseModel):
    """Request model for submitting an event"""
    event_type: EventType
    dependency_id: Optional[str] = None
    decision_id: Optional[str] = None
    risk_id: Optional[str] = None
    milestone_id: Optional[str] = None
    metadata: Dict[str, Any] = {}


class CommandResponse(BaseModel):
    """Response model for a command"""
    command_id: str
    command_type: str
    target_id: str
    reason: str
    rule_name: str
    payload: Dict[str, Any]
    priority: str
    issued_at: str


class EventProcessingResult(BaseModel):
    """Response model for event processing"""
    event_id: str
    event_type: str
    timestamp: str
    commands_issued: int
    commands: List[CommandResponse]


# ============================================================================
# Helper Functions
# ============================================================================

def get_current_state_snapshot() -> StateSnapshot:
    """
    Build a state snapshot from current data.
    
    In production, this would query the database.
    For now, we use the data loader.
    """
    # Load data
    work_items = get_work_items()
    dependencies_list = get_dependencies()
    risks = get_risks()
    decisions = get_decisions()
    milestones = get_milestones()
    
    # Convert to dictionaries keyed by ID
    work_items_dict = {item["id"]: item for item in work_items}
    dependencies_dict = {
        f"dep_{i}": dep 
        for i, dep in enumerate(dependencies_list)
    }
    risks_dict = {risk["id"]: risk for risk in risks}
    decisions_dict = {dec["id"]: dec for dec in decisions}
    milestones_dict = {ms["id"]: ms for ms in milestones}
    
    # TODO: Load ownerships from database
    # For now, use empty dict
    ownerships_dict = {}
    
    # TODO: Load forecasts from database
    forecasts_dict = {}
    
    # TODO: Load issues from database
    issues_dict = {}
    
    return StateSnapshot(
        work_items=work_items_dict,
        dependencies=dependencies_dict,
        risks=risks_dict,
        issues=issues_dict,
        decisions=decisions_dict,
        milestones=milestones_dict,
        ownerships=ownerships_dict,
        forecasts=forecasts_dict,
    )


def command_to_response(cmd: Command) -> CommandResponse:
    """Convert Command to CommandResponse"""
    return CommandResponse(
        command_id=cmd.command_id,
        command_type=cmd.command_type.value,
        target_id=cmd.target_id,
        reason=cmd.reason,
        rule_name=cmd.rule_name,
        payload=cmd.payload,
        priority=cmd.priority,
        issued_at=cmd.issued_at.isoformat(),
    )


def execute_command_placeholder(cmd: Command) -> Dict[str, Any]:
    """
    Placeholder for command execution.
    
    In production, this would:
    1. Validate the command
    2. Write to the database
    3. Send notifications
    4. Update caches
    5. Return execution result
    
    For now, just logs and returns success.
    """
    print(f"[COMMAND EXECUTOR] {cmd.command_type.value}: {cmd.target_id}")
    print(f"  Reason: {cmd.reason}")
    print(f"  Rule: {cmd.rule_name}")
    
    # TODO: Implement actual command execution
    # Example:
    # if cmd.command_type == CommandType.CREATE_RISK:
    #     db.risks.create(cmd.payload)
    # elif cmd.command_type == CommandType.UPDATE_RISK:
    #     db.risks.update(cmd.target_id, cmd.payload)
    
    return {
        "status": "success",
        "command_id": cmd.command_id,
        "executed_at": datetime.now().isoformat(),
        "note": "Placeholder execution - not actually written to database"
    }


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/events", response_model=EventProcessingResult)
async def process_event(submission: EventSubmission):
    """
    Process an event through the Decision-Risk Engine.
    
    This endpoint:
    1. Creates an Event from the submission
    2. Gets current state snapshot
    3. Processes the event through the engine
    4. Returns the generated commands
    
    Note: Commands are NOT automatically executed. Use /execute-commands
    to execute them.
    """
    # Create event
    event = Event(
        event_id=f"evt_{uuid.uuid4().hex[:8]}",
        event_type=submission.event_type,
        timestamp=datetime.now(),
        dependency_id=submission.dependency_id,
        decision_id=submission.decision_id,
        risk_id=submission.risk_id,
        milestone_id=submission.milestone_id,
        metadata=submission.metadata,
    )
    
    # Get current state
    state = get_current_state_snapshot()
    
    # Process event
    commands = engine.process_event(event, state)
    
    # Convert to response
    return EventProcessingResult(
        event_id=event.event_id,
        event_type=event.event_type.value,
        timestamp=event.timestamp.isoformat(),
        commands_issued=len(commands),
        commands=[command_to_response(cmd) for cmd in commands],
    )


@router.post("/events/execute", response_model=EventProcessingResult)
async def process_and_execute_event(submission: EventSubmission):
    """
    Process an event AND execute the generated commands.
    
    This is a convenience endpoint that combines:
    1. Event processing (generates commands)
    2. Command execution (writes to database)
    
    Use this for production workflows where you want immediate execution.
    """
    # Create event
    event = Event(
        event_id=f"evt_{uuid.uuid4().hex[:8]}",
        event_type=submission.event_type,
        timestamp=datetime.now(),
        dependency_id=submission.dependency_id,
        decision_id=submission.decision_id,
        risk_id=submission.risk_id,
        milestone_id=submission.milestone_id,
        metadata=submission.metadata,
    )
    
    # Get current state
    state = get_current_state_snapshot()
    
    # Process event
    commands = engine.process_event(event, state)
    
    # Execute commands
    for cmd in commands:
        execute_command_placeholder(cmd)
    
    # Convert to response
    return EventProcessingResult(
        event_id=event.event_id,
        event_type=event.event_type.value,
        timestamp=event.timestamp.isoformat(),
        commands_issued=len(commands),
        commands=[command_to_response(cmd) for cmd in commands],
    )


@router.post("/events/dependency-blocked")
async def handle_dependency_blocked(dependency_id: str):
    """
    Convenience endpoint for DEPENDENCY_BLOCKED events.
    
    Example usage:
        POST /api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_001
    """
    submission = EventSubmission(
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id=dependency_id,
    )
    return await process_and_execute_event(submission)


@router.post("/events/decision-approved")
async def handle_decision_approved(decision_id: str):
    """
    Convenience endpoint for DECISION_APPROVED events.
    
    Example usage:
        POST /api/decision-risk-engine/events/decision-approved?decision_id=dec_001
    """
    submission = EventSubmission(
        event_type=EventType.DECISION_APPROVED,
        decision_id=decision_id,
    )
    return await process_and_execute_event(submission)


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "engine": "DecisionRiskEngine v0",
        "rules_loaded": len(engine.rules),
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/rules")
async def list_rules():
    """List all loaded rules"""
    return {
        "rules": [
            {
                "name": rule.name,
                "type": type(rule).__name__,
            }
            for rule in engine.rules
        ],
        "count": len(engine.rules),
    }

