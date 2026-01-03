# Issues Feature - Documentation

## Overview

The Issues feature provides a comprehensive system for tracking blockers, problems, and impediments in project delivery. Issues can be created manually or automatically by the Decision-Risk Engine.

## Components

### Backend

**Model:** `backend/app/models/issue.py`
- IssueType enum (6 types)
- IssueStatus enum (4 statuses)
- IssuePriority enum (4 levels)
- Issue model with full metadata

**API:** `backend/app/api/issues.py`
- GET `/api/issues` - List all issues with filtering
- GET `/api/issues/{id}` - Get specific issue
- POST `/api/issues` - Create new issue
- PUT `/api/issues/{id}` - Update issue
- DELETE `/api/issues/{id}` - Delete issue
- POST `/api/issues/{id}/resolve` - Mark as resolved
- POST `/api/issues/{id}/reopen` - Reopen issue
- GET `/api/issues/stats/summary` - Get statistics

### Frontend

**Component:** `frontend/src/components/IssuesView.tsx`
- Beautiful card-based UI
- Real-time statistics dashboard
- Filtering by status and priority
- Create, edit, resolve, reopen functionality
- Color-coded by priority and type
- Impact descriptions and resolution notes

## Issue Types

1. **Dependency Blocked** 🔗
   - Work item blocked by dependencies
   - Created automatically by Decision-Risk Engine

2. **Resource Constraint** ⚡
   - Insufficient resources (people, budget, etc.)

3. **Technical Blocker** 🔧
   - Technical problems blocking progress

4. **External Dependency** 🌐
   - Waiting on external parties/systems

5. **Scope Unclear** ❓
   - Requirements or scope not well-defined

6. **Other** 📝
   - General issues

## Issue Statuses

- **Open** 🔴 - New issue, not yet worked on
- **In Progress** 🔵 - Currently being addressed
- **Resolved** ✅ - Issue has been fixed
- **Closed** ⚫ - Issue is closed (no action needed)

## Issue Priorities

- **Low** 🟢 - Minor issue, low urgency
- **Medium** 🟡 - Standard priority
- **High** 🟠 - Important, needs attention soon
- **Critical** 🔴 - Urgent, blocking progress

## Sample Issues

The system includes 3 sample issues:

### Issue 1: Dependency Blocked
- **Type:** dependency_blocked
- **Priority:** high
- **Status:** open
- **Impact:** 7-day delay, blocks 2 work items

### Issue 2: Technical Blocker
- **Type:** technical_blocker
- **Priority:** critical
- **Status:** in_progress
- **Impact:** Blocks deployment to production

### Issue 3: External Dependency
- **Type:** external_dependency
- **Priority:** medium
- **Status:** open
- **Impact:** Intermittent failures during peak hours

## API Examples

### List All Issues
```bash
curl http://localhost:8000/api/issues
```

### Filter by Status
```bash
curl "http://localhost:8000/api/issues?status=open"
```

### Filter by Priority
```bash
curl "http://localhost:8000/api/issues?priority=critical"
```

### Get Statistics
```bash
curl http://localhost:8000/api/issues/stats/summary
```

### Create Issue
```bash
curl -X POST http://localhost:8000/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "id": "issue_004",
    "title": "Test issue",
    "description": "Test description",
    "type": "other",
    "status": "open",
    "priority": "medium",
    "created_at": "2026-01-03T12:00:00Z"
  }'
```

### Resolve Issue
```bash
curl -X POST http://localhost:8000/api/issues/issue_001/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution_notes": "Fixed by completing backend API"}'
```

### Reopen Issue
```bash
curl -X POST http://localhost:8000/api/issues/issue_001/reopen
```

## Integration with Decision-Risk Engine

The Decision-Risk Engine automatically creates issues via **Rule 1: Dependency Blocked**.

When a `DEPENDENCY_BLOCKED` event is processed:
1. Engine creates an Issue (type: `dependency_blocked`)
2. If P80 delay > 7 days, also creates a Risk
3. Sets owner's next_date for review

Example command emitted by engine:
```python
Command(
    command_type=CommandType.CREATE_ISSUE,
    target_id="issue_dep_blocked_dep_001",
    reason="Dependency dep_001 is blocked",
    rule_name="rule_1_dependency_blocked",
    payload={
        "id": "issue_dep_blocked_dep_001",
        "type": "dependency_blocked",
        "title": "Dependency blocked: ...",
        "description": "Work item X is blocked waiting for Y",
        "dependency_id": "dep_001",
        "created_at": "2026-01-03T...",
    }
)
```

## UI Features

### Statistics Dashboard
- Total issues count
- Open issues count (red)
- In Progress issues count (blue)
- Resolved issues count (green)
- Critical issues alert (if any)

### Filters
- Filter by status (all/open/in_progress/resolved/closed)
- Filter by priority (all/critical/high/medium/low)

### Card Display
- Color-coded left border by priority
- Type icon and badges
- Status and priority badges
- Description
- Impact description (if present)
- Resolution notes (if resolved)
- Metadata (created date, resolved date, work item, risk)
- Action buttons (Resolve, Reopen, Edit, Delete)

### Form
- Title (required)
- Description
- Type selection
- Priority selection
- Status selection
- Impact description

## Data Model

```typescript
interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'dependency_blocked' | 'resource_constraint' | 'technical_blocker' | 
        'external_dependency' | 'scope_unclear' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependency_id?: string | null;
  work_item_id?: string | null;
  risk_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  impact_description?: string | null;
  resolution_notes?: string | null;
}
```

## Color Scheme

### Type Colors
- dependency_blocked: #e74c3c (red)
- resource_constraint: #f39c12 (orange)
- technical_blocker: #9b59b6 (purple)
- external_dependency: #3498db (blue)
- scope_unclear: #95a5a6 (gray)
- other: #7f8c8d (dark gray)

### Priority Colors
- low: #27ae60 (green)
- medium: #f39c12 (orange)
- high: #e67e22 (dark orange)
- critical: #e74c3c (red)

### Status Colors
- open: #e74c3c (red)
- in_progress: #3498db (blue)
- resolved: #27ae60 (green)
- closed: #95a5a6 (gray)

## Navigation

Access the Issues view:
1. Click the **Issues** button in the navigation bar (🔴 icon)
2. Or navigate directly to the Issues view

## Workflow

### Creating an Issue
1. Click "+ New Issue"
2. Fill in title, description, type, priority
3. Optionally add impact description
4. Click "Create"

### Resolving an Issue
1. Click "✓ Resolve" on the issue card
2. Enter resolution notes (optional)
3. Issue status changes to "resolved"
4. resolved_at timestamp is set

### Reopening an Issue
1. Click "↻ Reopen" on resolved/closed issue
2. Issue status changes back to "open"
3. resolved_at is cleared

### Editing an Issue
1. Click "✏️ Edit"
2. Update fields as needed
3. Click "Update"

### Deleting an Issue
1. Click "🗑️ Delete"
2. Confirm deletion
3. Issue is permanently removed

## Testing

### Backend API Test
```bash
# List issues
curl http://localhost:8000/api/issues

# Get stats
curl http://localhost:8000/api/issues/stats/summary

# Expected output:
{
    "total": 3,
    "by_status": {"open": 2, "in_progress": 1, "resolved": 0, "closed": 0},
    "by_priority": {"low": 0, "medium": 1, "high": 1, "critical": 1},
    "by_type": {"dependency_blocked": 1, "technical_blocker": 1, "external_dependency": 1, ...}
}
```

### Frontend Test
1. Start servers (backend and frontend)
2. Navigate to Issues view
3. Verify 3 sample issues display
4. Test filtering by status/priority
5. Test creating new issue
6. Test resolving/reopening issue
7. Test editing issue
8. Test deleting issue

## Files Created/Modified

### Backend
- ✅ Created: `backend/app/models/issue.py` (Issue model)
- ✅ Created: `backend/app/api/issues.py` (API endpoints)
- ✅ Modified: `backend/app/data/loader.py` (Added get_issues, save_issues)
- ✅ Modified: `backend/app/main.py` (Added issues router)
- ✅ Modified: `data/mock_world.json` (Added 3 sample issues)

### Frontend
- ✅ Created: `frontend/src/components/IssuesView.tsx` (UI component)
- ✅ Modified: `frontend/src/App.tsx` (Added Issues route)

### Documentation
- ✅ Created: `ISSUES_FEATURE.md` (This file)

## Summary

The Issues feature is now **complete and fully functional**:

✅ Backend model with 6 types, 4 statuses, 4 priorities  
✅ Full REST API with CRUD operations  
✅ Beautiful responsive UI with statistics  
✅ Filtering and search capabilities  
✅ Integration with Decision-Risk Engine  
✅ Sample data for testing  
✅ Complete documentation  

**Start using it now:** Navigate to the Issues view in the UI! 🔴

