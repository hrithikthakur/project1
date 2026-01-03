from fastapi import APIRouter, HTTPException
from typing import List
from ..models.risk import Risk
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine
from ..data.loader import get_risks, load_mock_world
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)


@router.post("/risks", response_model=Risk)
async def create_risk(risk: Risk):
    """Create a new risk"""
    world = load_mock_world()
    risks = world.get("risks", [])
    
    # Check if ID already exists
    if any(r.get("id") == risk.id for r in risks):
        raise HTTPException(status_code=400, detail=f"Risk with ID {risk.id} already exists")
    
    # Convert to dict with mode='json' to properly serialize dates
    risk_dict = risk.model_dump(mode='json')
    risks.append(risk_dict)
    world["risks"] = risks
    _save_mock_world(world)
    
    return risk


@router.get("/risks", response_model=List[Risk])
async def list_risks():
    """List all risks"""
    risks_data = get_risks()
    # Convert dictionaries to Pydantic models
    result = []
    for risk in risks_data:
        if isinstance(risk, dict):
            # Pydantic v2 will automatically parse datetime strings
            result.append(Risk(**risk))
        else:
            result.append(risk)
    return result


@router.get("/risks/{risk_id}", response_model=Risk)
async def get_risk(risk_id: str):
    """Get a specific risk by ID"""
    risks = get_risks()
    for risk in risks:
        if risk.get("id") == risk_id:
            return risk
    raise HTTPException(status_code=404, detail=f"Risk {risk_id} not found")


@router.put("/risks/{risk_id}", response_model=Risk)
async def update_risk(risk_id: str, risk: Risk):
    """Update an existing risk"""
    if risk.id != risk_id:
        raise HTTPException(status_code=400, detail="Risk ID mismatch")
    
    world = load_mock_world()
    risks = world.get("risks", [])
    
    found = False
    for i, r in enumerate(risks):
        if r.get("id") == risk_id:
            # Convert to dict with mode='json' to properly serialize dates
            risks[i] = risk.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Risk {risk_id} not found")
    
    world["risks"] = risks
    _save_mock_world(world)
    
    return risk


@router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str):
    """Delete a risk"""
    world = load_mock_world()
    risks = world.get("risks", [])
    
    original_count = len(risks)
    risks = [r for r in risks if r.get("id") != risk_id]
    
    if len(risks) == original_count:
        raise HTTPException(status_code=404, detail=f"Risk {risk_id} not found")
    
    world["risks"] = risks
    _save_mock_world(world)
    
    return {"message": f"Risk {risk_id} deleted successfully"}


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

