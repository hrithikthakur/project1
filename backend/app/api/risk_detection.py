"""
Risk Detection API
Endpoint for triggering automatic risk detection
"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..models.risk import Risk
from ..engine.risk_detector import detect_risks_from_work_items
from ..data.loader import get_work_items, get_milestones, load_mock_world
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)


@router.post("/risks/detect", response_model=List[Risk])
async def detect_risks():
    """
    Automatically detect risks based on current work item patterns.
    Returns newly detected risks and saves them.
    Skips risks that already exist (based on deterministic IDs).
    """
    try:
        world = load_mock_world()
        work_items = get_work_items()
        milestones = get_milestones()
        existing_risks = world.get("risks", [])
        
        # Detect risks - pass existing risks to avoid duplicates
        detected_risks = detect_risks_from_work_items(work_items, milestones, existing_risks)
        
        if len(detected_risks) == 0:
            return []
        
        # Save detected risks to mock_world
        for risk in detected_risks:
            risk_dict = risk.model_dump(mode='json')
            existing_risks.append(risk_dict)
        
        world["risks"] = existing_risks
        _save_mock_world(world)
        
        return detected_risks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk detection error: {str(e)}")


@router.get("/risks/detect/preview", response_model=List[Risk])
async def preview_risk_detection():
    """
    Preview risks that would be detected without saving them.
    Useful for testing the detection logic.
    Shows all potential risks, even if they already exist.
    """
    try:
        work_items = get_work_items()
        milestones = get_milestones()
        
        # Don't pass existing risks for preview - show everything
        detected_risks = detect_risks_from_work_items(work_items, milestones, existing_risks=None)
        return detected_risks
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk detection error: {str(e)}")

