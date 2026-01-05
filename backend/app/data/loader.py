import json
import os
from pathlib import Path
from typing import Dict, Any, Tuple


def load_mock_world(return_diagnostics: bool = False):
    """Load mock_world.json data file"""
    # Try multiple possible locations for the data file
    possible_paths = [
        # 0. API_DIR environment variable (set by api/index.py for Vercel)
        Path(os.environ.get("API_DIR", "")) / "mock_world.json" if os.environ.get("API_DIR") else None,
        # 1. In api directory (for Vercel deployment)
        Path(__file__).parent.parent.parent.parent / "api" / "mock_world.json",
        # 2. Environment variable (set by api/index.py)
        Path(os.environ.get("PROJECT_ROOT", "")) / "data" / "mock_world.json" if os.environ.get("PROJECT_ROOT") else None,
        # 3. Relative to current working directory
        Path("data/mock_world.json"),
        # 4. Relative to this file's location (standard location)
        Path(__file__).parent.parent.parent.parent / "data" / "mock_world.json",
    ]
    
    data_file = None
    errors = []
    for i, path in enumerate(possible_paths):
        try:
            if path and path.exists():
                data_file = path
                break
            else:
                errors.append(f"Path {i+1} ({path}): does not exist")
        except Exception as e:
            errors.append(f"Path {i+1} error: {str(e)}")
            continue
    
    diagnostics = {
        "paths_tried": errors,
        "path_used": str(data_file) if data_file else None,
    }
    
    if not data_file:
        # Log which paths were tried before falling back to empty structure
        error_msg = "Could not find mock_world.json. Tried: " + "; ".join(errors)
        print(f"WARNING: {error_msg}")
        empty_world = {
            "work_items": [],
            "milestones": [],
            "dependencies": [],
            "actors": [],
            "ownership": [],
            "roles": [],
            "actor_roles": [],
            "decisions": [],
            "risks": []
        }
        return (empty_world, diagnostics) if return_diagnostics else empty_world
    
    try:
        with open(data_file, 'r') as f:
            data = json.load(f)
            return (data, diagnostics) if return_diagnostics else data
    except Exception as e:
        print(f"ERROR loading {data_file}: {str(e)}")
        raise


def get_work_items() -> list:
    """Get all work items from mock world"""
    world = load_mock_world()
    return world.get("work_items", [])


def get_milestones() -> list:
    """Get all milestones from mock world"""
    world = load_mock_world()
    return world.get("milestones", [])


def get_dependencies() -> list:
    """Get all dependencies from mock world"""
    world = load_mock_world()
    return world.get("dependencies", [])


def get_resources() -> list:
    """
    DEPRECATED: Use get_actors() instead.
    Get all actors as resources (for backward compatibility).
    Returns simplified format matching old resource structure.
    """
    actors = get_actors()
    # Convert actors to old resource format for backward compatibility
    return [
        {
            "id": actor["id"],
            "name": actor["display_name"],
            "type": "engineer" if actor["type"] == "USER" else "team",
            "capacity": 1.0
        }
        for actor in actors
        if actor.get("is_active", True)
    ]


def get_actors() -> list:
    """Get all actors from mock world"""
    world = load_mock_world()
    return world.get("actors", [])


def get_ownership() -> list:
    """Get all ownership records from mock world"""
    world = load_mock_world()
    return world.get("ownership", [])


def get_roles() -> list:
    """Get all roles from mock world"""
    world = load_mock_world()
    return world.get("roles", [])


def get_actor_roles() -> list:
    """Get all actor role assignments from mock world"""
    world = load_mock_world()
    return world.get("actor_roles", [])


def get_active_ownership(object_type: str, object_id: str) -> dict:
    """Get the active ownership record for a specific object"""
    ownership_records = get_ownership()
    for ownership in ownership_records:
        if (ownership.get("object_type") == object_type and 
            ownership.get("object_id") == object_id and 
            ownership.get("ended_at") is None):
            return ownership
    return None


def get_actor_by_id(actor_id: str) -> dict:
    """Get an actor by ID"""
    actors = get_actors()
    for actor in actors:
        if actor.get("id") == actor_id:
            return actor
    return None


def get_decisions() -> list:
    """Get all decisions from mock world"""
    world = load_mock_world()
    return world.get("decisions", [])


def get_risks() -> list:
    """Get all risks from mock world"""
    world = load_mock_world()
    return world.get("risks", [])

