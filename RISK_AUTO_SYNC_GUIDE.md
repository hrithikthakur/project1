# Risk Auto-Sync Feature

## Overview
The system now automatically updates risk cards when work item statuses change, eliminating the need to manually update risks when dependencies are resolved.

## How It Works

### Backend Auto-Resolution (`backend/app/api/work_items.py`)

When a work item status is updated, the backend automatically:

1. **Detects Status Changes:**
   - Monitors when a work item changes from "blocked" to "in_progress" or "completed"
   - Tracks when a work item is marked as "completed" (which may unblock other items)

2. **Updates Related Risks:**
   - Finds all risks that have the work item in their `affected_items` list
   - Closes risks if all blocked items are resolved
   - Updates risk descriptions to reflect reduced blocking
   - Removes resolved items from affected items list

3. **Cascading Updates:**
   - When a work item is completed, checks if it unblocks other work items
   - Updates risks for newly unblocked dependencies
   - Adds auto-resolution notes to risk descriptions

### Frontend Auto-Refresh (`frontend/src/components/RisksView.tsx`)

The Risks view now includes:

1. **Automatic Polling:**
   - Refreshes the risks list every 10 seconds
   - Ensures you always see the latest risk status
   - Runs in the background while the Risks page is open

2. **Manual Refresh Button:**
   - Click "🔄 Refresh" to immediately update the risks list
   - Useful when you know a change has just been made
   - Shows a success toast when refresh completes

3. **Visual Indicators:**
   - Info banner shows that auto-sync is enabled
   - Closed risks display with green border and ✅ checkmark
   - Auto-resolved risks include "[AUTO-RESOLVED: ...]" in description

## Usage Examples

### Example 1: Unblocking a Single Work Item

**Scenario:** Work item "Implement User API" is blocked

1. **Initial State:**
   - Work item status: "blocked"
   - Risk card exists: "Blocked Dependency: Implement User API" (status: materialised)

2. **Action:** Change work item status to "in_progress"

3. **Automatic Updates:**
   - Backend detects the status change
   - Checks if any other items are still blocked
   - If no more blocked items → Risk status changed to "closed"
   - Risk description updated with "[AUTO-RESOLVED: All blocking items resolved]"

4. **Frontend Display (within 10 seconds or on refresh):**
   - Risk card now shows green border
   - Risk status badge shows "closed"
   - ✅ checkmark appears on the risk card

### Example 2: Completing a Dependency

**Scenario:** Multiple items depend on "Database Schema Design"

1. **Initial State:**
   - "Database Schema Design" is completed
   - "Implement User API" is blocked (depends on Database Schema)
   - Risk exists for blocked dependency

2. **Action:** Mark "Database Schema Design" as "completed"

3. **Automatic Updates:**
   - Backend checks all items that depend on "Database Schema Design"
   - Finds "Implement User API" is blocked
   - Checks if ALL dependencies of "Implement User API" are now completed
   - If yes → Updates risk to remove "Implement User API" from affected items
   - If no more affected items → Closes the risk

4. **Frontend Display:**
   - Risk automatically updates within 10 seconds
   - Or click "🔄 Refresh" for immediate update

## Technical Details

### Backend Functions

**`_auto_resolve_risks_for_work_item()`**
- Called when work item status changes from "blocked" to "in_progress" or "completed"
- Removes the work item from affected items in related risks
- Closes risks if no more blocked items remain

**`_check_and_resolve_dependency_risks()`**
- Called when a work item is marked "completed"
- Finds items that depend on the completed item
- Checks if dependents are now fully unblocked
- Updates risks to reflect newly unblocked items

**`_create_materialized_risk_for_blocked_item()`**
- Called when work item becomes "blocked"
- Creates MATERIALISED risk showing cascading impact
- Includes human-readable item names

### Frontend Polling

```typescript
useEffect(() => {
  loadRisks();
  loadWorkItems();
  
  // Auto-refresh every 10 seconds
  const intervalId = setInterval(() => {
    loadRisks();
  }, 10000);
  
  return () => clearInterval(intervalId);
}, []);
```

## User Interface Features

### 1. Refresh Button
- **Location:** Top right of Risks page
- **Icon:** 🔄 Refresh
- **Tooltip:** "Refresh risks list (auto-refreshes every 10s)"
- **Action:** Immediately reloads all risks

### 2. Auto-Sync Info Banner
- **Location:** Above stats grid
- **Color:** Blue (informational)
- **Message:** "Auto-sync enabled: Risks automatically update when work items change status."

### 3. Visual Status Indicators

**Materialized Risks:**
- 🚨 Icon
- Red border (`#ef4444`)
- Status badge: "materialised"

**Closed Risks:**
- ✅ Icon
- Green border (`#27ae60`)
- Status badge: "closed"

## Troubleshooting

### Risk Not Updating?

1. **Check Auto-Refresh:**
   - Wait 10 seconds for automatic refresh
   - Or click "🔄 Refresh" button manually

2. **Verify Work Item Status:**
   - Ensure work item was actually changed from "blocked"
   - Check that change was saved successfully

3. **Check Backend Logs:**
   - Backend logs show when risks are auto-resolved
   - Look for messages about risk updates in terminal

### Manual Override

If you need to manually update a risk:
1. Navigate to Risks page
2. Click on the risk card
3. Click "✏️ Edit"
4. Change status manually
5. Save changes

## Best Practices

1. **Let Auto-Sync Work:**
   - Wait a few seconds after changing work item status
   - System will automatically update related risks

2. **Use Refresh Button:**
   - Click refresh after making multiple work item changes
   - Ensures you see all updates immediately

3. **Check Descriptions:**
   - Auto-resolved risks include explanation in description
   - Shows which items were unblocked

4. **Monitor Cascading Effects:**
   - When one item is unblocked, check if others are also affected
   - System handles cascading updates automatically

## API Endpoints

### Update Work Item (with auto-risk-sync)
```bash
PUT /api/work_items/{work_item_id}
{
  "id": "work_item_005",
  "status": "in_progress",
  ...
}
```

**Side Effects:**
- Automatically updates related risks
- Closes risks if all blocked items resolved
- Updates risk descriptions

### Get Risks (with latest updates)
```bash
GET /api/risks
```

Returns all risks with current status, including any auto-resolved risks.

## Implementation Notes

- Auto-sync runs on every work item update (PUT request)
- No manual intervention required for risk updates
- Frontend polling ensures UI stays in sync
- Backend writes are immediate; frontend sees within 10s
- Manual refresh available for instant updates

---

**Note:** This feature is enabled by default and requires no configuration.

