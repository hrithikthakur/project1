from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..models.work_item import WorkItem
from ..data.loader import get_work_items, load_mock_world, get_risks, get_milestones
from ..models.risk import Risk, RiskStatus, RiskSeverity
import json
from pathlib import Path
from datetime import datetime

router = APIRouter()


def _save_mock_world(data: dict):
    """Save updated data back to mock_world.json"""
    data_dir = Path(__file__).parent.parent.parent.parent / "data"
    data_file = data_dir / "mock_world.json"
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2, default=str)


def _auto_resolve_risks_for_work_item(work_item_id: str, new_status: str, world: dict):
    """
    Automatically resolve or update risks when a work item status changes.
    If a work item is no longer blocked, resolve related risks.
    """
    if new_status not in ["in_progress", "completed"]:
        return  # Only auto-resolve when moving to in_progress or completed
    
    risks = world.get("risks", [])
    work_items = world.get("work_items", [])
    updated = False
    
    # Check if there are no more blocked items
    blocked_items = [item for item in work_items if item.get("status") == "blocked"]
    
    for risk in risks:
        # Check if this risk is about blocked dependencies and includes our work item
        affected_items = risk.get("affected_items", [])
        
        # If this work item was affecting this risk
        if work_item_id in affected_items:
            # If no more blocked items remain, close the risk
            if len(blocked_items) == 0:
                if risk.get("status") not in [RiskStatus.CLOSED, "closed"]:
                    risk["status"] = RiskStatus.CLOSED
                    risk["mitigated_at"] = datetime.now().isoformat()
                    risk["description"] = risk.get("description", "") + " [AUTO-RESOLVED: All blocking items completed]"
                    updated = True
            # If some blocked items remain but not this one, update the risk
            else:
                # Remove this work item from affected items
                new_affected = [item_id for item_id in affected_items if item_id != work_item_id]
                if len(new_affected) != len(affected_items):
                    risk["affected_items"] = new_affected
                    
                    # Update the description to reflect reduced blocking
                    if len(new_affected) == 0:
                        risk["status"] = RiskStatus.CLOSED
                        risk["mitigated_at"] = datetime.now().isoformat()
                        risk["description"] = risk.get("description", "") + " [AUTO-RESOLVED: All blocking items resolved]"
                    else:
                        # Update impact
                        if "impact" in risk:
                            risk["impact"]["blocked_items"] = new_affected
                            risk["impact"]["delay_days"] = len(new_affected) * 2
                        
                        risk["description"] = f"{len(new_affected)} work item(s) still blocked (reduced from {len(affected_items)})"
                    
                    updated = True
    
    if updated:
        world["risks"] = risks
        _save_mock_world(world)


def _check_and_resolve_dependency_risks(completed_work_item_id: str, world: dict):
    """
    When a work item is completed, check if it unblocks other items.
    If all blocking dependencies for other items are resolved, update risks accordingly.
    """
    work_items = world.get("work_items", [])
    risks = world.get("risks", [])
    updated = False
    
    # Find items that were depending on this completed item
    dependent_items = []
    for item in work_items:
        dependencies = item.get("dependencies", [])
        if completed_work_item_id in dependencies and item.get("status") == "blocked":
            # Check if ALL dependencies for this item are now completed
            all_deps_completed = True
            for dep_id in dependencies:
                dep_item = next((wi for wi in work_items if wi.get("id") == dep_id), None)
                if dep_item and dep_item.get("status") != "completed":
                    all_deps_completed = False
                    break
            
            if all_deps_completed:
                dependent_items.append(item)
    
    # If we found items that are now unblocked, update related risks
    if dependent_items:
        for risk in risks:
            affected_items = risk.get("affected_items", [])
            
            # Check if any of the now-unblocked items are in this risk
            unblocked_in_risk = [item["id"] for item in dependent_items if item["id"] in affected_items]
            
            if unblocked_in_risk:
                # Remove unblocked items from risk
                new_affected = [item_id for item_id in affected_items if item_id not in unblocked_in_risk]
                risk["affected_items"] = new_affected
                
                if len(new_affected) == 0:
                    # All items in this risk are now unblocked
                    risk["status"] = RiskStatus.CLOSED
                    risk["mitigated_at"] = datetime.now().isoformat()
                    original_desc = risk.get("description", "").split("[AUTO-RESOLVED")[0].strip()
                    risk["description"] = original_desc + f" [AUTO-RESOLVED: Dependency {completed_work_item_id} completed]"
                    updated = True
                elif len(new_affected) < len(affected_items):
                    # Some items unblocked, update the risk
                    if "impact" in risk:
                        risk["impact"]["blocked_items"] = new_affected
                        risk["impact"]["delay_days"] = len(new_affected) * 2
                    
                    original_desc = risk.get("description", "").split("[AUTO-RESOLVED")[0].strip()
                    risk["description"] = f"{len(new_affected)} work item(s) still blocked (reduced from {len(affected_items)} after completing {completed_work_item_id})"
                    updated = True
    
    if updated:
        world["risks"] = risks
        _save_mock_world(world)


def _create_materialized_risk_for_blocked_item(blocked_work_item_id: str, world: dict):
    """
    When a work item is blocked, check if other items depend on it.
    If so, create a MATERIALISED risk (actively blocking progress).
    """
    work_items = world.get("work_items", [])
    risks = world.get("risks", [])
    milestones = world.get("milestones", [])
    
    # Find the blocked work item
    blocked_item = next((item for item in work_items if item.get("id") == blocked_work_item_id), None)
    if not blocked_item:
        return
    
    # Find all items that depend on this blocked item
    dependent_items = []
    for item in work_items:
        dependencies = item.get("dependencies", [])
        if blocked_work_item_id in dependencies:
            dependent_items.append(item)
    
    # If no items depend on it, no need to create a risk
    if not dependent_items:
        return
    
    # Get the blocked item's milestone
    milestone_id = blocked_item.get("milestone_id")
    milestone_name = "Unknown"
    if milestone_id:
        milestone = next((m for m in milestones if m.get("id") == milestone_id), None)
        if milestone:
            milestone_name = milestone.get("name", "Unknown")
    
    # Create a risk ID based on the blocked item
    risk_id = f"risk_from_blocked_{blocked_work_item_id}"
    
    # Check if this risk already exists
    existing_risk = next((r for r in risks if r.get("id") == risk_id), None)
    
    # Get names for better descriptions
    blocked_item_name = blocked_item.get("title", blocked_work_item_id)
    dependent_names = [item.get("title", item.get("id")) for item in dependent_items]
    dependent_list = ", ".join(dependent_names[:3])
    if len(dependent_names) > 3:
        dependent_list += f" and {len(dependent_names) - 3} more"
    
    if existing_risk:
        # Update existing risk to MATERIALISED
        existing_risk["status"] = RiskStatus.MATERIALISED
        existing_risk["detected_at"] = datetime.now().isoformat()
        existing_risk["description"] = f"'{blocked_item_name}' is BLOCKED. {len(dependent_items)} dependent item(s) affected: {dependent_list}"
        existing_risk["affected_items"] = [item["id"] for item in dependent_items]
        if "impact" in existing_risk:
            existing_risk["impact"]["delay_days"] = len(dependent_items) * 3
            existing_risk["impact"]["blocked_item"] = blocked_work_item_id
            existing_risk["impact"]["dependent_items"] = [item["id"] for item in dependent_items]
    else:
        # Create new MATERIALISED risk
        new_risk = Risk(
            id=risk_id,
            title=f"Blocked Dependency: {blocked_item_name}",
            description=f"'{blocked_item_name}' is BLOCKED. {len(dependent_items)} dependent item(s) affected: {dependent_list}",
            severity=RiskSeverity.HIGH if len(dependent_items) >= 2 else RiskSeverity.MEDIUM,
            status=RiskStatus.MATERIALISED,  # MATERIALISED because it's actively blocking
            probability=1.0,  # 100% because it's happening now
            impact={
                "delay_days": len(dependent_items) * 3,
                "blocked_item": blocked_work_item_id,
                "dependent_items": [item["id"] for item in dependent_items],
                "cascading_delays": True,
            },
            milestone_id=milestone_id,
            affected_items=[item["id"] for item in dependent_items],
            detected_at=datetime.now(),
            mitigated_at=None
        )
        risks.append(new_risk.model_dump(mode='json'))
    
    world["risks"] = risks
    _save_mock_world(world)


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
    old_status = None
    for i, item in enumerate(work_items):
        if item.get("id") == work_item_id:
            old_status = item.get("status")
            # Convert to dict with mode='json' to properly serialize dates
            work_items[i] = work_item.model_dump(mode='json')
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail=f"Work item {work_item_id} not found")
    
    world["work_items"] = work_items
    _save_mock_world(world)
    
    # Create MATERIALISED risk if work item is blocked and has dependents
    if work_item.status == "blocked" and old_status != "blocked":
        _create_materialized_risk_for_blocked_item(work_item_id, world)
    
    # Auto-resolve risks if work item status changed from blocked to in_progress/completed
    if old_status == "blocked" and work_item.status in ["in_progress", "completed"]:
        _auto_resolve_risks_for_work_item(work_item_id, work_item.status, world)
    
    # Also check if this completes a dependency for other blocked items
    if work_item.status == "completed":
        _check_and_resolve_dependency_risks(work_item_id, world)
    
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

