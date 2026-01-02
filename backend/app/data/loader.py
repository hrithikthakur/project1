import json
from pathlib import Path
from typing import Dict, Any


def load_mock_world() -> Dict[str, Any]:
    """Load mock_world.json data file"""
    # Get the path relative to this file
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    
    if not data_file.exists():
        # Return empty structure if file doesn't exist
        return {
            "work_items": [],
            "milestones": [],
            "dependencies": [],
            "resources": []
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
    """Get all resources from mock world"""
    world = load_mock_world()
    return world.get("resources", [])

