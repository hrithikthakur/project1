from fastapi import APIRouter, HTTPException
from typing import List
from ..data.loader import get_milestones, get_actors, load_mock_world
from ..models.milestone import Milestone
from ..models.actor import Actor
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)


@router.get("/milestones", response_model=List[Milestone])
async def list_milestones():
    """Get all milestones"""
    milestones_data = get_milestones()
    # Convert dictionaries to Pydantic models
    result = []
    for milestone in milestones_data:
        if isinstance(milestone, dict):
            # Pydantic v2 will automatically parse datetime strings
            result.append(Milestone(**milestone))
        else:
            result.append(milestone)
    return result


@router.get("/milestones/{milestone_id}", response_model=Milestone)
async def get_milestone(milestone_id: str):
    """Get a specific milestone by ID"""
    milestones = get_milestones()
    for milestone in milestones:
        if milestone.get("id") == milestone_id:
            return milestone
    raise HTTPException(status_code=404, detail=f"Milestone {milestone_id} not found")


@router.post("/milestones", response_model=Milestone)
async def create_milestone(milestone: Milestone):
    """Create a new milestone"""
    world = load_mock_world()
    milestones = world.get("milestones", [])
    
    # Check if ID already exists
    if any(m.get("id") == milestone.id for m in milestones):
        raise HTTPException(status_code=400, detail=f"Milestone with ID {milestone.id} already exists")
    
    # Convert to dict with mode='json' to properly serialize dates
    milestone_dict = milestone.model_dump(mode='json')
    milestones.append(milestone_dict)
    world["milestones"] = milestones
    _save_mock_world(world)
    
    return milestone


@router.put("/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(milestone_id: str, milestone: Milestone):
    """Update an existing milestone"""
    if milestone.id != milestone_id:
        raise HTTPException(status_code=400, detail="Milestone ID mismatch")
    
    world = load_mock_world()
    milestones = world.get("milestones", [])
    
    found = False
    for i, m in enumerate(milestones):
        if m.get("id") == milestone_id:
            # Convert to dict with mode='json' to properly serialize dates
            milestones[i] = milestone.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Milestone {milestone_id} not found")
    
    world["milestones"] = milestones
    _save_mock_world(world)
    
    return milestone


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str):
    """Delete a milestone"""
    world = load_mock_world()
    milestones = world.get("milestones", [])
    
    original_count = len(milestones)
    milestones = [m for m in milestones if m.get("id") != milestone_id]
    
    if len(milestones) == original_count:
        raise HTTPException(status_code=404, detail=f"Milestone {milestone_id} not found")
    
    world["milestones"] = milestones
    _save_mock_world(world)
    
    return {"message": f"Milestone {milestone_id} deleted successfully"}


@router.get("/actors", response_model=List[Actor])
async def list_actors():
    """Get all actors (users and teams)"""
    actors_data = get_actors()
    # Convert dictionaries to Pydantic models
    result = []
    for actor in actors_data:
        if isinstance(actor, dict):
            # Pydantic v2 will automatically parse datetime strings
            result.append(Actor(**actor))
        else:
            result.append(actor)
    return result


@router.get("/resources")
async def list_resources():
    """
    DEPRECATED: Use /actors instead.
    Get all actors as resources (for backward compatibility).
    Returns simplified format with just name for owners.
    """
    actors_data = get_actors()
    # Return simplified format for backward compatibility
    return [{"name": actor["display_name"]} for actor in actors_data]
