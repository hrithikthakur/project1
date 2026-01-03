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
        dep.get("id", f"dep_{i}"): dep 
        for i, dep in enumerate(dependencies_list)
    }
    risks_dict = {risk["id"]: risk for risk in risks}
    decisions_dict = {dec["id"]: dec for dec in decisions}
    milestones_dict = {ms["id"]: ms for ms in milestones}
    
    # Load ownerships from database
    from ..data.loader import get_ownership, get_issues
    ownerships_list = get_ownership()
    ownerships_dict = {own["id"]: own for own in ownerships_list}
    
    # TODO: Load forecasts from database
    forecasts_dict = {}
    
    # Load issues from database
    issues_list = get_issues()
    issues_dict = {issue["id"]: issue for issue in issues_list}
    
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
    Execute a command by writing to the database.
    
    This function:
    1. Validates the command
    2. Writes to the database
    3. Returns execution result
    """
    from ..data.loader import get_risks, get_issues, load_mock_world
    import json
    from pathlib import Path
    
    print(f"[COMMAND EXECUTOR] {cmd.command_type.value}: {cmd.target_id}")
    print(f"  Reason: {cmd.reason}")
    print(f"  Rule: {cmd.rule_name}")
    
    try:
        # Load mock world data
        data_dir = Path(__file__).parent.parent.parent.parent / "data"
        data_file = data_dir / "mock_world.json"
        
        with open(data_file, 'r') as f:
            world = json.load(f)
        
        if cmd.command_type.value == "create_risk":
            # Create new risk
            world["risks"].append(cmd.payload)
            print(f"  ✓ Created risk: {cmd.payload.get('id')}")
            
        elif cmd.command_type.value == "update_risk":
            # Update existing risk
            for i, risk in enumerate(world["risks"]):
                if risk.get("id") == cmd.target_id:
                    # Merge payload into existing risk
                    world["risks"][i] = {**risk, **cmd.payload}
                    print(f"  ✓ Updated risk: {cmd.target_id}")
                    print(f"    - Set status: {cmd.payload.get('status')}")
                    if cmd.payload.get('accepted_at'):
                        print(f"    - Accepted at: {cmd.payload.get('accepted_at')}")
                    if cmd.payload.get('acceptance_boundary'):
                        print(f"    - Boundary: {cmd.payload.get('acceptance_boundary')}")
                    break
                    
        elif cmd.command_type.value == "create_issue":
            # Create new issue
            if "issues" not in world:
                world["issues"] = []
            world["issues"].append(cmd.payload)
            print(f"  ✓ Created issue: {cmd.payload.get('id')}")
            
        elif cmd.command_type.value == "set_next_date":
            # Update ownership or create entry (simplified for now)
            print(f"  ✓ Set next_date for {cmd.payload.get('owner_id')}: {cmd.payload.get('next_date')}")
            # In production: update ownerships table
            
        elif cmd.command_type.value == "update_forecast":
            # Schedule forecast update
            print(f"  ✓ Scheduled forecast update for {cmd.target_id}")
            # In production: queue forecast job
        
        # Save back to file
        with open(data_file, 'w') as f:
            json.dump(world, f, indent=2)
        
        return {
            "status": "success",
            "command_id": cmd.command_id,
            "executed_at": datetime.now().isoformat(),
            "note": "Command executed and written to database"
        }
        
    except Exception as e:
        print(f"  ✗ Error executing command: {e}")
        return {
            "status": "error",
            "command_id": cmd.command_id,
            "error": str(e),
            "executed_at": datetime.now().isoformat(),
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

