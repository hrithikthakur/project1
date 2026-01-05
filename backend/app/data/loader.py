import json
from pathlib import Path
from typing import Dict, Any


def load_mock_world() -> Dict[str, Any]:
    """Load mock_world.json data file"""
    # Try environment variable first (set by Vercel entry point), then fallback to relative path
    root_dir = os.environ.get("PROJECT_ROOT")
    if root_dir:
        data_file = Path(root_dir) / "data" / "mock_world.json"
    else:
        # Local development fallback
        data_dir = Path(__file__).parent.parent.parent.parent / "data"
        data_file = data_dir / "mock_world.json"
    
    if not data_file.exists():
        # Return empty structure if file doesn't exist
        return {
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
    
    with open(data_file, 'r') as f:
        return json.load(f)


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

