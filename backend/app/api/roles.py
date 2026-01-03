from fastapi import APIRouter, HTTPException
from typing import List
from ..models.role import Role, ActorRole
from ..data.loader import get_roles, get_actor_roles, load_mock_world
import json
from pathlib import Path

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)


# Roles endpoints
@router.get("/roles", response_model=List[Role])
async def list_roles():
    """List all roles"""
    roles_data = get_roles()
    # Convert dictionaries to Pydantic models
    result = []
    for role in roles_data:
        if isinstance(role, dict):
            result.append(Role(**role))
        else:
            result.append(role)
    return result


@router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str):
    """Get a specific role by ID"""
    roles = get_roles()
    for role in roles:
        if role.get("id") == role_id:
            return role
    raise HTTPException(status_code=404, detail=f"Role {role_id} not found")


@router.post("/roles", response_model=Role)
async def create_role(role: Role):
    """Create a new role"""
    world = load_mock_world()
    roles = world.get("roles", [])
    
    # Check if ID already exists
    if any(r.get("id") == role.id for r in roles):
        raise HTTPException(status_code=400, detail=f"Role with ID {role.id} already exists")
    
    # Convert to dict with mode='json' to properly serialize dates
    role_dict = role.model_dump(mode='json')
    roles.append(role_dict)
    world["roles"] = roles
    _save_mock_world(world)
    
    return role


@router.put("/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, role: Role):
    """Update an existing role"""
    if role.id != role_id:
        raise HTTPException(status_code=400, detail="Role ID mismatch")
    
    world = load_mock_world()
    roles = world.get("roles", [])
    
    found = False
    for i, r in enumerate(roles):
        if r.get("id") == role_id:
            # Convert to dict with mode='json' to properly serialize dates
            roles[i] = role.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Role {role_id} not found")
    
    world["roles"] = roles
    _save_mock_world(world)
    
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str):
    """Delete a role"""
    world = load_mock_world()
    roles = world.get("roles", [])
    
    original_count = len(roles)
    roles = [r for r in roles if r.get("id") != role_id]
    
    if len(roles) == original_count:
        raise HTTPException(status_code=404, detail=f"Role {role_id} not found")
    
    world["roles"] = roles
    _save_mock_world(world)
    
    return {"message": f"Role {role_id} deleted successfully"}


# ActorRoles endpoints
@router.get("/actor_roles", response_model=List[ActorRole])
async def list_actor_roles():
    """List all actor role assignments"""
    actor_roles_data = get_actor_roles()
    # Convert dictionaries to Pydantic models
    result = []
    for actor_role in actor_roles_data:
        if isinstance(actor_role, dict):
            result.append(ActorRole(**actor_role))
        else:
            result.append(actor_role)
    return result


@router.get("/actor_roles/actor/{actor_id}", response_model=List[ActorRole])
async def get_actor_roles_by_actor(actor_id: str):
    """Get all role assignments for a specific actor"""
    actor_roles = get_actor_roles()
    return [ar for ar in actor_roles if ar.get("actor_id") == actor_id]


@router.post("/actor_roles", response_model=ActorRole)
async def create_actor_role(actor_role: ActorRole):
    """Create a new actor role assignment"""
    world = load_mock_world()
    actor_roles = world.get("actor_roles", [])
    
    # Check if combination already exists
    if any(ar.get("actor_id") == actor_role.actor_id and 
           ar.get("role_id") == actor_role.role_id and
           ar.get("scope_type") == actor_role.scope_type.value and
           ar.get("scope_id") == actor_role.scope_id 
           for ar in actor_roles):
        raise HTTPException(status_code=400, detail="Actor role assignment already exists")
    
    # Convert to dict with mode='json' to properly serialize dates
    actor_role_dict = actor_role.model_dump(mode='json')
    actor_roles.append(actor_role_dict)
    world["actor_roles"] = actor_roles
    _save_mock_world(world)
    
    return actor_role


@router.delete("/actor_roles")
async def delete_actor_role(actor_id: str, role_id: str, scope_type: str, scope_id: str = None):
    """Delete an actor role assignment"""
    world = load_mock_world()
    actor_roles = world.get("actor_roles", [])
    
    original_count = len(actor_roles)
    actor_roles = [
        ar for ar in actor_roles 
        if not (ar.get("actor_id") == actor_id and 
                ar.get("role_id") == role_id and
                ar.get("scope_type") == scope_type and
                ar.get("scope_id") == scope_id)
    ]
    
    if len(actor_roles) == original_count:
        raise HTTPException(status_code=404, detail="Actor role assignment not found")
    
    world["actor_roles"] = actor_roles
    _save_mock_world(world)
    
    return {"message": "Actor role assignment deleted successfully"}

