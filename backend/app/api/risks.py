from fastapi import APIRouter, HTTPException
from typing import List
from ..models.risk import Risk
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine

router = APIRouter()


@router.post("/risks", response_model=Risk)
async def create_risk(risk: Risk):
    """Create a new risk"""
    # In a real system, this would persist to a database
    return risk


@router.get("/risks", response_model=List[Risk])
async def list_risks():
    """List all risks"""
    # In a real system, this would fetch from database
    return []


@router.post("/risks/analyze")
async def analyze_risk_impact(risk: Risk):
    """
    Analyze the impact of a risk on work items.
    Returns affected items and their modified properties.
    """
    try:
        graph = DependencyGraph()
        ripple_engine = RippleEffectEngine(graph)
        
        # Convert risk to dict format
        risk_dict = {
            "probability": risk.probability,
            "impact": risk.impact,
            "affected_items": risk.affected_items
        }
        
        # Apply risk
        effects = ripple_engine.apply_risks([risk_dict])
        
        # Get affected items
        affected_items = []
        for item_id in risk.affected_items:
            if item_id in effects:
                modified_item = ripple_engine.get_modified_item(item_id)
                affected_items.append({
                    "item_id": item_id,
                    "original_estimated_days": ripple_engine.work_items[item_id].get("estimated_days", 0),
                    "modified_estimated_days": modified_item.get("estimated_days", 0),
                    "effects": effects[item_id]
                })
        
        return {
            "risk": risk.dict(),
            "affected_items": affected_items
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

