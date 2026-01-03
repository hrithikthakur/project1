"""
API endpoints for Issues

Issues represent blockers or problems that need to be addressed.
They can be created manually or automatically by the Decision-Risk Engine.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime

from ..models.issue import Issue, IssueType, IssueStatus, IssuePriority
from ..data.loader import get_issues, save_issues

router = APIRouter()


@router.get("/issues", response_model=List[Issue])
async def get_all_issues(
    status: Optional[IssueStatus] = None,
    priority: Optional[IssuePriority] = None,
    type: Optional[IssueType] = None
):
    """
    Get all issues with optional filtering.
    
    Query parameters:
    - status: Filter by status (open, in_progress, resolved, closed)
    - priority: Filter by priority (low, medium, high, critical)
    - type: Filter by type (dependency_blocked, resource_constraint, etc.)
    """
    issues = get_issues()
    
    # Apply filters
    if status:
        issues = [i for i in issues if i.get("status") == status]
    if priority:
        issues = [i for i in issues if i.get("priority") == priority]
    if type:
        issues = [i for i in issues if i.get("type") == type]
    
    return issues


@router.get("/issues/{issue_id}", response_model=Issue)
async def get_issue(issue_id: str):
    """Get a specific issue by ID"""
    issues = get_issues()
    
    for issue in issues:
        if issue["id"] == issue_id:
            return issue
    
    raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")


@router.post("/issues", response_model=Issue)
async def create_issue(issue: Issue):
    """
    Create a new issue.
    
    This endpoint can be used to manually create issues, or by the
    Decision-Risk Engine to create issues automatically.
    """
    issues = get_issues()
    
    # Check if issue already exists
    if any(i["id"] == issue.id for i in issues):
        raise HTTPException(status_code=400, detail=f"Issue {issue.id} already exists")
    
    # Add timestamps
    issue_dict = issue.model_dump()
    if not issue_dict.get("created_at"):
        issue_dict["created_at"] = datetime.now().isoformat()
    
    issues.append(issue_dict)
    save_issues(issues)
    
    return issue_dict


@router.put("/issues/{issue_id}", response_model=Issue)
async def update_issue(issue_id: str, issue_update: dict):
    """
    Update an issue.
    
    Partial updates are supported. Only provided fields will be updated.
    """
    issues = get_issues()
    
    for i, issue in enumerate(issues):
        if issue["id"] == issue_id:
            # Update only provided fields
            updated_issue = {**issue, **issue_update}
            updated_issue["updated_at"] = datetime.now().isoformat()
            
            # If status changed to resolved, set resolved_at
            if (issue_update.get("status") == IssueStatus.RESOLVED and 
                issue.get("status") != IssueStatus.RESOLVED):
                updated_issue["resolved_at"] = datetime.now().isoformat()
            
            issues[i] = updated_issue
            save_issues(issues)
            
            return updated_issue
    
    raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")


@router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str):
    """Delete an issue"""
    issues = get_issues()
    
    for i, issue in enumerate(issues):
        if issue["id"] == issue_id:
            issues.pop(i)
            save_issues(issues)
            return {"message": f"Issue {issue_id} deleted"}
    
    raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")


@router.post("/issues/{issue_id}/resolve")
async def resolve_issue(issue_id: str, resolution_notes: Optional[str] = None):
    """
    Mark an issue as resolved.
    
    This is a convenience endpoint for the common action of resolving an issue.
    """
    issues = get_issues()
    
    for i, issue in enumerate(issues):
        if issue["id"] == issue_id:
            issues[i]["status"] = IssueStatus.RESOLVED
            issues[i]["resolved_at"] = datetime.now().isoformat()
            issues[i]["updated_at"] = datetime.now().isoformat()
            
            if resolution_notes:
                issues[i]["resolution_notes"] = resolution_notes
            
            save_issues(issues)
            return issues[i]
    
    raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")


@router.post("/issues/{issue_id}/reopen")
async def reopen_issue(issue_id: str):
    """
    Reopen a closed or resolved issue.
    """
    issues = get_issues()
    
    for i, issue in enumerate(issues):
        if issue["id"] == issue_id:
            issues[i]["status"] = IssueStatus.OPEN
            issues[i]["resolved_at"] = None
            issues[i]["updated_at"] = datetime.now().isoformat()
            
            save_issues(issues)
            return issues[i]
    
    raise HTTPException(status_code=404, detail=f"Issue {issue_id} not found")


@router.get("/issues/stats/summary")
async def get_issues_summary():
    """
    Get summary statistics for issues.
    
    Returns counts by status, priority, and type.
    """
    issues = get_issues()
    
    # Count by status
    status_counts = {}
    for status in IssueStatus:
        status_counts[status.value] = len([i for i in issues if i.get("status") == status.value])
    
    # Count by priority
    priority_counts = {}
    for priority in IssuePriority:
        priority_counts[priority.value] = len([i for i in issues if i.get("priority") == priority.value])
    
    # Count by type
    type_counts = {}
    for issue_type in IssueType:
        type_counts[issue_type.value] = len([i for i in issues if i.get("type") == issue_type.value])
    
    return {
        "total": len(issues),
        "by_status": status_counts,
        "by_priority": priority_counts,
        "by_type": type_counts
    }

