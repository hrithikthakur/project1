from fastapi import APIRouter, HTTPException
from typing import List
from ..models.decision import Decision, DecisionType, DecisionStatus, ChangeScheduleSubtype, ChangeScopeSubtype
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine
from ..data.loader import get_decisions, load_mock_world, get_risks, get_milestones
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)


@router.post("/decisions", response_model=Decision)
async def create_decision(decision: Decision):
    """Create a new decision"""
    world = load_mock_world()
    decisions = world.get("decisions", [])
    
    # Check if ID already exists
    if any(d.get("id") == decision.id for d in decisions):
        raise HTTPException(status_code=400, detail=f"Decision with ID {decision.id} already exists")
    
    # Auto-populate milestone_name from risk if it's an accept/mitigate risk decision and milestone_name is missing
    if not decision.milestone_name and (decision.decision_type == DecisionType.ACCEPT_RISK or decision.decision_type == DecisionType.MITIGATE_RISK):
        if decision.risk_id:
            from ..models.risk import Risk
            risks_data = get_risks()
            milestones_data = get_milestones()
            
            # Find the risk
            target_risk = None
            for r in risks_data:
                if r.get('id') == decision.risk_id:
                    # Use Pydantic to normalize the risk data
                    target_risk = Risk(**r)
                    break
            
            if target_risk and target_risk.milestone_id:
                # Find the milestone name
                for m in milestones_data:
                    if m.get('id') == target_risk.milestone_id:
                        decision.milestone_name = m.get('name')
                        break

    # Convert to dict with mode='json' to properly serialize dates
    decision_dict = decision.model_dump(mode='json')
    decisions.append(decision_dict)
    world["decisions"] = decisions
    _save_mock_world(world)
    
    # Apply effects to milestones if decision is approved or just created
    _apply_decision_effects(decision, world)
    
    return decision


@router.get("/decisions", response_model=List[Decision])
async def list_decisions():
    """List all decisions"""
    return get_decisions()


@router.get("/decisions/{decision_id}", response_model=Decision)
async def get_decision(decision_id: str):
    """Get a specific decision by ID"""
    decisions = get_decisions()
    for decision in decisions:
        if decision.get("id") == decision_id:
            return decision
    raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")


@router.put("/decisions/{decision_id}", response_model=Decision)
async def update_decision(decision_id: str, decision: Decision):
    """Update an existing decision"""
    if decision.id != decision_id:
        raise HTTPException(status_code=400, detail="Decision ID mismatch")
    
    world = load_mock_world()
    decisions = world.get("decisions", [])
    
    found = False
    for i, d in enumerate(decisions):
        if d.get("id") == decision_id:
            # Convert to dict with mode='json' to properly serialize dates
            decisions[i] = decision.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    
    world["decisions"] = decisions
    _save_mock_world(world)
    
    # Apply effects to milestones if decision is approved or updated
    _apply_decision_effects(decision, world)
    
    return decision


@router.delete("/decisions/{decision_id}")
async def delete_decision(decision_id: str):
    """Delete a decision"""
    world = load_mock_world()
    decisions = world.get("decisions", [])
    
    original_count = len(decisions)
    decisions = [d for d in decisions if d.get("id") != decision_id]
    
    if len(decisions) == original_count:
        raise HTTPException(status_code=404, detail=f"Decision {decision_id} not found")
    
    world["decisions"] = decisions
    _save_mock_world(world)
    
    return {"message": f"Decision {decision_id} deleted successfully"}


def _apply_decision_effects(decision: Decision, world: dict):
    """
    Apply decision effects to the world (e.g., update milestone target dates).
    Only applies effects if the decision is APPROVED or if it's a new decision 
    (assuming creation implies immediate effect for now, matching user expectations).
    """
    if decision.status == DecisionStatus.SUPERSEDED:
        return

    milestones = world.get("milestones", [])
    updated = False

    # 1. Handle MOVE_TARGET_DATE
    if decision.decision_type == DecisionType.CHANGE_SCHEDULE and \
       decision.subtype == ChangeScheduleSubtype.MOVE_TARGET_DATE.value and \
       decision.new_target_date:
        
        # Find the milestone by name
        target_milestone = None
        for m in milestones:
            if m.get("name") == decision.milestone_name:
                target_milestone = m
                break
        
        if target_milestone:
            print(f"[DECISION-EFFECT] Updating milestone {target_milestone['id']} target_date to {decision.new_target_date}")
            # Convert date to isoformat string for JSON storage
            target_milestone["target_date"] = decision.new_target_date.isoformat()
            updated = True

    # 2. Handle CHANGE_SCOPE (ADD/REMOVE)
    elif decision.decision_type == DecisionType.CHANGE_SCOPE:
        target_milestone = None
        for m in milestones:
            if m.get("name") == decision.milestone_name:
                target_milestone = m
                break
        
        if target_milestone:
            milestone_work_items = set(target_milestone.get("work_items", []))
            
            if decision.subtype == ChangeScopeSubtype.ADD.value and decision.add_item_ids:
                for item_id in decision.add_item_ids:
                    milestone_work_items.add(item_id)
                updated = True
            
            elif decision.subtype == ChangeScopeSubtype.REMOVE.value and decision.remove_item_ids:
                for item_id in decision.remove_item_ids:
                    if item_id in milestone_work_items:
                        milestone_work_items.remove(item_id)
                updated = True
            
            if updated:
                target_milestone["work_items"] = list(milestone_work_items)
                print(f"[DECISION-EFFECT] Updated milestone {target_milestone['id']} work_items count to {len(target_milestone['work_items'])}")

    if updated:
        world["milestones"] = milestones
        _save_mock_world(world)


def _convert_decision_to_legacy_format(decision: Decision) -> dict:
    """
    Convert Decision model with typed fields to legacy format for ripple engine.
    This is a temporary adapter until ripple engine is updated.
    Note: milestone_name is used for reference, but ripple engine still uses IDs internally.
    """
    # Extract target_id and effects based on decision type and subtype
    # For now, use milestone_name as placeholder - ripple engine may need ID lookup
    target_id = decision.milestone_name  # Using name as placeholder
    effects = {}
    
    if decision.decision_type == DecisionType.CHANGE_SCOPE:
        # For scope changes, target affected items
        if decision.add_item_ids:
            target_id = decision.add_item_ids[0] if decision.add_item_ids else decision.milestone_name
        elif decision.remove_item_ids:
            target_id = decision.remove_item_ids[0] if decision.remove_item_ids else decision.milestone_name
        
        # Calculate scope change effect
        if decision.subtype == "ADD":
            # Adding items increases scope
            effects["scope_change"] = 0.1  # Rough estimate
        elif decision.subtype == "REMOVE":
            # Removing items decreases scope
            effects["scope_change"] = -0.1
        elif decision.subtype == "SWAP":
            # Swapping is roughly neutral
            effects["scope_change"] = 0.0
        
        if decision.effort_delta_days is not None:
            effects["delay_days"] = decision.effort_delta_days
    
    elif decision.decision_type == DecisionType.CHANGE_SCHEDULE:
        if decision.subtype == "MOVE_TARGET_DATE" and decision.new_target_date:
            # Calculate delay based on date change
            # This is simplified - would need current target date to calculate properly
            effects["delay_days"] = 0  # Placeholder
        elif decision.subtype == "CHANGE_CONFIDENCE_LEVEL":
            # Changing confidence level doesn't directly affect velocity
            effects["velocity_multiplier"] = 1.0
    
    elif decision.decision_type == DecisionType.CHANGE_CAPACITY:
        target_id = decision.team_id or decision.milestone_name
        delta_fte = decision.delta_fte or 0.0
        
        # Convert FTE change to velocity multiplier
        # Rough approximation: 1 FTE = 20% velocity change
        effects["velocity_multiplier"] = 1.0 + (delta_fte * 0.2)
    
    elif decision.decision_type == DecisionType.CHANGE_PRIORITY:
        # Priority changes affect which items get attention first
        # This is more about ordering than direct effects
        if decision.item_ids:
            target_id = decision.item_ids[0]
        effects["velocity_multiplier"] = 1.0  # No direct velocity change
    
    elif decision.decision_type == DecisionType.ACCEPT_RISK:
        # Accepting risk doesn't change velocity, just acknowledges it
        target_id = decision.risk_id or decision.milestone_name
        effects["velocity_multiplier"] = 1.0
    
    elif decision.decision_type == DecisionType.MITIGATE_RISK:
        target_id = decision.risk_id or decision.issue_id or decision.milestone_name
        
        # Mitigation actions can improve velocity
        impact_delta = decision.expected_impact_days_delta or 0.0
        if impact_delta < 0:  # Negative delta means improvement
            # Convert days saved to velocity multiplier (rough approximation)
            effects["velocity_multiplier"] = 1.1  # Placeholder
        else:
            effects["velocity_multiplier"] = 1.0
    
    return {
        "decision_type": decision.decision_type.value,
        "target_id": target_id,
        "effects": effects
    }


@router.post("/decisions/analyze")
async def analyze_decision_impact(decision: Decision):
    """
    Analyze the impact of a decision on work items.
    Returns affected items and their modified properties.
    """
    try:
        graph = DependencyGraph()
        ripple_engine = RippleEffectEngine(graph)
        
        # Convert new Decision model to legacy format for ripple engine
        decision_dict = _convert_decision_to_legacy_format(decision)
        
        # Apply decision
        effects = ripple_engine.apply_decisions([decision_dict])
        
        # Get affected items
        affected_items = []
        for item_id, item_effects in effects.items():
            modified_item = ripple_engine.get_modified_item(item_id)
            affected_items.append({
                "item_id": item_id,
                "original_estimated_days": ripple_engine.work_items[item_id].get("estimated_days", 0),
                "modified_estimated_days": modified_item.get("estimated_days", 0),
                "effects": item_effects
            })
        
        return {
            "decision": decision.model_dump(),
            "affected_items": affected_items
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

