from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..models.work_item import WorkItem
from ..data.loader import get_work_items, load_mock_world
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)


@router.get("/work_items", response_model=List[WorkItem])
async def list_work_items():
    """List all work items"""
    return get_work_items()


@router.get("/work_items/{work_item_id}", response_model=WorkItem)
async def get_work_item(work_item_id: str):
    """Get a specific work item by ID"""
    work_items = get_work_items()
    for item in work_items:
        if item.get("id") == work_item_id:
            return item
    raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")


@router.post("/work_items", response_model=WorkItem)
async def create_work_item(work_item: WorkItem):
    """Create a new work item"""
    world = load_mock_world()
    work_items = world.get("work_items", [])
    
    # Check if ID already exists
    if any(item.get("id") == work_item.id for item in work_items):
        raise HTTPException(status_code=400, detail=f"Work item with ID {work_item.id} already exists")
    
    work_items.append(work_item.model_dump(mode='json'))
    world["work_items"] = work_items
    _save_mock_world(world)
    
    return work_item


@router.put("/work_items/{work_item_id}", response_model=WorkItem)
async def update_work_item(work_item_id: str, work_item: WorkItem):
    """Update an existing work item"""
    if work_item.id != work_item_id:
        raise HTTPException(status_code=400, detail="Work item ID mismatch")
    
    world = load_mock_world()
    work_items = world.get("work_items", [])
    
    found = False
    for i, item in enumerate(work_items):
        if item.get("id") == work_item_id:
            # Convert to dict with mode='json' to properly serialize dates
            work_items[i] = work_item.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    
    world["work_items"] = work_items
    _save_mock_world(world)
    
    return work_item


@router.delete("/work_items/{work_item_id}")
async def delete_work_item(work_item_id: str):
    """Delete a work item"""
    world = load_mock_world()
    work_items = world.get("work_items", [])
    
    original_count = len(work_items)
    work_items = [item for item in work_items if item.get("id") != work_item_id]
    
    if len(work_items) == original_count:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    
    world["work_items"] = work_items
    _save_mock_world(world)
    
    return {"message": f"Work item {work_item_id} deleted successfully"}

