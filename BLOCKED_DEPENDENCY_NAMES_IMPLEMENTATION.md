# Blocked Dependency Names Implementation

## Overview
Updated the Decision Risk Engine to display **work item names** instead of **IDs** when a dependency is blocked and shows up as a materialized risk card.

## What Was Changed

### 1. Decision Risk Engine (`backend/app/engine/decision_risk_engine.py`)

**Rule1_DependencyBlocked** was enhanced to:
- Fetch work item names from the state snapshot
- Include readable item names in risk titles and descriptions
- Add structured impact information with both blocked and blocking item names

**Before:**
```
Title: "Materialized Risk: Blocked Dependency"
Description: "Blocked dependency dep_001 is delaying milestone by 14.0 days"
```

**After:**
```
Title: "Blocked Dependency: Implement Authentication Backend"
Description: "Work item 'Implement Authentication Backend' is blocked waiting for 'Design Authentication System' to complete. Expected delay: 14.0 days"
Impact: {
  "blocked_item": "Implement Authentication Backend",
  "blocking_item": "Design Authentication System",
  "p80_delay_days": 14.0,
  "p50_delay_days": 7.0
}
```

### 2. Risk Detector (`backend/app/engine/risk_detector.py`)

Updated auto-detection methods to include work item names:

- **_detect_blocked_dependencies()**: Now lists item names in the description
- **_detect_blocked_time_exceeded()**: Shows which specific items are blocked by name
- Added `blocked_item_names` to the impact metadata

**Example Output:**
```
"Blocked Dependencies in Authentication MVP"
"2 work items blocked: Design Authentication System, Implement User API"
```

### 3. Frontend Risk Display (`frontend/src/components/RisksView.tsx`)

Added two enhancements:

#### A. Risk Card Preview
Shows blocking relationship directly on the risk card:
```
🚫 Implement Authentication Backend waiting for Design Authentication System • Delay: 14.0d
```

#### B. Risk Details Modal
Added a dedicated "Dependency Blocked" section that displays:
- Blocked Item name
- Waiting For (blocking item) name
- Expected Delay (P80)

## How It Works

1. **Event Triggered**: When a `DEPENDENCY_BLOCKED` event is fired for a dependency (e.g., `dep_001`)

2. **Engine Processing**: 
   - Rule1_DependencyBlocked extracts `from_id` and `to_id` from the dependency
   - Looks up work items in the state snapshot
   - Retrieves `title` field for human-readable names
   - Creates risk with names embedded in title, description, and impact

3. **Display**: 
   - Frontend reads the `impact.blocked_item` and `impact.blocking_item` fields
   - Shows formatted blocking relationship with names
   - Falls back to IDs if names are not available

## Testing

Tested with dependency `dep_001`:
- **Blocked Item**: work_item_002 → "Implement Authentication Backend"
- **Blocking Item**: work_item_001 → "Design Authentication System"

### Test Results
✓ Risk title includes blocked item name
✓ Risk description shows both item names
✓ Status is 'materialised'
✓ Impact contains structured blocked/blocking item names
✓ Frontend displays names correctly in cards and details

## API Endpoint Usage

To trigger a blocked dependency event:
```bash
POST http://localhost:8000/api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_001
```

Response includes commands that create/update risks with item names:
```json
{
  "event_id": "evt_xyz",
  "commands_issued": 3,
  "commands": [
    {
      "command_type": "update_risk",
      "reason": "Dependency blocked: 'Implement Authentication Backend' is waiting for 'Design Authentication System'..."
    }
  ]
}
```

## Benefits

1. **Better UX**: Users see meaningful item names instead of cryptic IDs
2. **Faster Understanding**: No need to cross-reference IDs to understand what's blocked
3. **Improved Communication**: Risk descriptions are now self-explanatory
4. **Consistency**: Both engine-created and auto-detected risks use the same format

## Future Enhancements

Potential improvements:
- Add milestone names to risks affecting specific milestones
- Include actor/owner names instead of actor IDs
- Show dependency type (finish-to-start, etc.) in risk details
- Add links to navigate to the actual work items from risk cards

