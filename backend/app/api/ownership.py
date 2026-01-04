from fastapi import APIRouter, HTTPException
from typing import List
from ..models.ownership import Ownership
from ..data.loader import get_ownership, load_mock_world
from datetime import datetime
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)


@router.get("/ownership", response_model=List[Ownership])
async def list_ownership():
    """List all ownership records"""
    return get_ownership()


@router.get("/ownership/{ownership_id}", response_model=Ownership)
async def get_ownership_record(ownership_id: str):
    """Get a specific ownership record by ID"""
    ownership_records = get_ownership()
    for ownership in ownership_records:
        if ownership.get("id") == ownership_id:
            return ownership
    raise HTTPException(status_code=404, detail=f"Ownership {ownership_id} not found")


@router.get("/ownership/object/{object_type}/{object_id}", response_model=Ownership)
async def get_active_ownership(object_type: str, object_id: str):
    """Get the active ownership for a specific object"""
    ownership_records = get_ownership()
    for ownership in ownership_records:
        if (ownership.get("object_type") == object_type and 
            ownership.get("object_id") == object_id and 
            ownership.get("ended_at") is None):
            return ownership
    raise HTTPException(status_code=404, detail=f"No active ownership found for {object_type}/{object_id}")


@router.post("/ownership", response_model=Ownership)
async def create_ownership(ownership: Ownership):
    """Create a new ownership record"""
    world = load_mock_world()
    ownership_records = world.get("ownership", [])
    
    # Check if ID already exists
    if any(o.get("id") == ownership.id for o in ownership_records):
        raise HTTPException(status_code=400, detail=f"Ownership with ID {ownership.id} already exists")
    
    # If this is an active ownership (ended_at is None), end any existing active ownership for the same object
    if ownership.ended_at is None:
        for o in ownership_records:
            if (o.get("object_type") == ownership.object_type.value and 
                o.get("object_id") == ownership.object_id and 
                o.get("ended_at") is None):
                # End the previous ownership
                o["ended_at"] = ownership.assigned_at.isoformat()
    
    ownership_dict = ownership.model_dump(mode='json')
    
    ownership_records.append(ownership_dict)
    world["ownership"] = ownership_records
    _save_mock_world(world)
    
    return ownership


@router.put("/ownership/{ownership_id}", response_model=Ownership)
async def update_ownership(ownership_id: str, ownership: Ownership):
    """Update an existing ownership record"""
    if ownership.id != ownership_id:
        raise HTTPException(status_code=400, detail="Ownership ID mismatch")
    
    world = load_mock_world()
    ownership_records = world.get("ownership", [])
    
    found = False
    for i, o in enumerate(ownership_records):
        if o.get("id") == ownership_id:
            ownership_dict = ownership.model_dump(mode='json')
            ownership_records[i] = ownership_dict
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Ownership {ownership_id} not found")
    
    world["ownership"] = ownership_records
    _save_mock_world(world)
    
    return ownership


@router.delete("/ownership/{ownership_id}")
async def delete_ownership(ownership_id: str):
    """Delete an ownership record"""
    world = load_mock_world()
    ownership_records = world.get("ownership", [])
    
    original_count = len(ownership_records)
    ownership_records = [o for o in ownership_records if o.get("id") != ownership_id]
    
    if len(ownership_records) == original_count:
        raise HTTPException(status_code=404, detail=f"Ownership {ownership_id} not found")
    
    world["ownership"] = ownership_records
    _save_mock_world(world)
    
    return {"message": f"Ownership {ownership_id} deleted successfully"}

