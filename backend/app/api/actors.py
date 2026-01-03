from fastapi import APIRouter, HTTPException
from typing import List
from ..models.actor import Actor
from ..data.loader import get_actors, load_mock_world
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)


@router.get("/actors", response_model=List[Actor])
async def list_actors():
    """List all actors"""
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


@router.get("/actors/{actor_id}", response_model=Actor)
async def get_actor(actor_id: str):
    """Get a specific actor by ID"""
    actors = get_actors()
    for actor in actors:
        if actor.get("id") == actor_id:
            return actor
    raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")


@router.post("/actors", response_model=Actor)
async def create_actor(actor: Actor):
    """Create a new actor"""
    world = load_mock_world()
    actors = world.get("actors", [])
    
    # Check if ID already exists
    if any(a.get("id") == actor.id for a in actors):
        raise HTTPException(status_code=400, detail=f"Actor with ID {actor.id} already exists")
    
    actors.append(actor.model_dump())
    world["actors"] = actors
    _save_mock_world(world)
    
    return actor


@router.put("/actors/{actor_id}", response_model=Actor)
async def update_actor(actor_id: str, actor: Actor):
    """Update an existing actor"""
    if actor.id != actor_id:
        raise HTTPException(status_code=400, detail="Actor ID mismatch")
    
    world = load_mock_world()
    actors = world.get("actors", [])
    
    found = False
    for i, a in enumerate(actors):
        if a.get("id") == actor_id:
            actors[i] = actor.model_dump()
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    
    world["actors"] = actors
    _save_mock_world(world)
    
    return actor


@router.delete("/actors/{actor_id}")
async def delete_actor(actor_id: str):
    """Delete an actor"""
    world = load_mock_world()
    actors = world.get("actors", [])
    
    original_count = len(actors)
    actors = [a for a in actors if a.get("id") != actor_id]
    
    if len(actors) == original_count:
        raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")
    
    world["actors"] = actors
    _save_mock_world(world)
    
    return {"message": f"Actor {actor_id} deleted successfully"}

