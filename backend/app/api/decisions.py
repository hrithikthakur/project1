from fastapi import APIRouter, HTTPException
from typing import List
from ..models.decision import Decision
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine
from ..engine.decision_effects import get_decision_effects

router = APIRouter()


@router.post("/decisions", response_model=Decision)
async def create_decision(decision: Decision):
    """Create a new decision"""
    # In a real system, this would persist to a database
    # For now, just validate and return
    return decision


@router.get("/decisions", response_model=List[Decision])
async def list_decisions():
    """List all decisions"""
    # In a real system, this would fetch from database
    return []


@router.post("/decisions/analyze")
async def analyze_decision_impact(decision: Decision):
    """
    Analyze the impact of a decision on work items.
    Returns affected items and their modified properties.
    """
    try:
        graph = DependencyGraph()
        ripple_engine = RippleEffectEngine(graph)
        
        # Convert decision to dict format
        decision_dict = {
            "decision_type": decision.decision_type,
            "target_id": decision.target_id,
            "effects": decision.effects or {}
        }
        
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
            "decision": decision.dict(),
            "affected_items": affected_items
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

