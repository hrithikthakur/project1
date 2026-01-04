# Risk Auto-Close Fix - Issue Resolved

## Problem

When a work item status changed from "blocked" to "in_progress" or "completed", the corresponding materialized risk cards were **not being automatically closed**.

### Root Cause

The backend auto-resolution logic was looking for the work item ID in the risk's `affected_items` list, but:
- Risks created by `_create_materialized_risk_for_blocked_item()` stored the **dependent items** in `affected_items`
- The **blocked item itself** was only referenced in the risk ID (e.g., `risk_from_blocked_work_item_004`)
- When the blocked item was unblocked, the system couldn't find it in `affected_items`, so the risk stayed open

### Example of the Issue

1. **work_item_004** (Database Schema Design) was blocked
2. System created risk: `risk_from_blocked_work_item_004`
   - Status: `materialised`
   - Affected items: `['work_item_005']` (the dependent item, not work_item_004!)
3. **work_item_004** changed to `completed`
4. Auto-close logic looked for work_item_004 in `affected_items`
5. **Didn't find it** → Risk stayed materialised ❌

## Solution

### 1. Fixed Backend Logic (`backend/app/api/work_items.py`)

Updated `_auto_resolve_risks_for_work_item()` to check **three cases**:

**Case 1: Risk ID contains the work item ID**
```python
if f"blocked_{work_item_id}" in risk_id or f"blocked_work_item_{work_item_id.split('_')[-1]}" in risk_id:
    # Close the risk - the blocked item is now unblocked
```

**Case 2: Check impact.blocked_item field**
```python
if impact.get("blocked_item") == work_item_id:
    # Close the risk - this item was the blocker
```

**Case 3: Check affected_items list** (original logic)
```python
if work_item_id in affected_items:
    # Remove from affected items or close if none remain
```

### 2. Fixed Existing Stale Risks

Ran a cleanup script that:
- Found all materialized risks where the blocked item is no longer blocked
- Automatically closed them
- Added `[AUTO-RESOLVED: {reason}]` to their descriptions

**Results:**
- ✅ Fixed 2 stale risks immediately
- ✅ All materialized risks are now properly synced with work item status

## Verification

### Test Results

**Before Fix:**
```
Materialized risks where blocked item is no longer blocked:
- risk_from_blocked_work_item_004: work_item_004 is completed ❌
- risk_from_blocked_work_item_002: work_item_002 is in_progress ❌
```

**After Fix:**
```
Materialized risks: 0 ✅
Auto-closed risks: 4 ✅
```

### Live Test

Ran complete test cycle:
1. ✅ Set work_item_007 to `blocked` → Risk created as `materialised`
2. ✅ Set work_item_007 to `in_progress` → Risk **automatically closed**
3. ✅ Description includes `[AUTO-RESOLVED: work_item_007 is no longer blocked]`

## How It Works Now

### When You Change Work Item Status

1. **Change status** from `blocked` to `in_progress` or `completed`

2. **Backend automatically:**
   - Detects the status change
   - Finds related risks by checking:
     - Risk ID pattern
     - `impact.blocked_item` field
     - `affected_items` list
   - Closes the risk
   - Adds auto-resolution note to description

3. **Frontend displays (within 10 seconds):**
   - Risk card changes to green border
   - ✅ checkmark appears
   - Status shows as "closed"

### Visual Confirmation

**Materialized Risk (before):**
```
┌─────────────────────────────────────────┐ (red border)
│ 🚨 Blocked Dependency: Database Schema │
│ Status: materialised                    │
└─────────────────────────────────────────┘
```

**Closed Risk (after):**
```
┌─────────────────────────────────────────┐ (green border)
│ ✅ Blocked Dependency: Database Schema │
│ Status: closed                          │
│ [AUTO-RESOLVED: work_item_004 is no    │
│  longer blocked]                        │
└─────────────────────────────────────────┘
```

## Testing Steps

To verify the fix is working:

1. **Open Risks page** in frontend
2. **Find or create a blocked work item**
   - Go to Work Items
   - Change a work item status to "blocked"
   - This will create a materialized risk

3. **Unblock the work item**
   - Change status to "in_progress" or "completed"

4. **Check Risks page** (within 10 seconds or click 🔄 Refresh)
   - Risk should now show as "closed"
   - Green border with ✅ icon
   - Description includes AUTO-RESOLVED note

## Technical Details

### Backend Changes

**File:** `backend/app/api/work_items.py`

**Function:** `_auto_resolve_risks_for_work_item()`

**Key improvements:**
- Multi-stage risk matching (ID pattern, impact field, affected items)
- Added logging for debugging (`print` statements)
- Handles risks created by different methods
- Preserves original description, adds resolution note

**Code snippet:**
```python
# Check multiple ways to identify related risks
if f"blocked_{work_item_id}" in risk_id:
    # Risk ID directly references this item
    
if impact.get("blocked_item") == work_item_id:
    # Impact field directly references this item
    
if work_item_id in affected_items:
    # Item is in the affected items list
```

### Frontend Auto-Refresh

The Risks view already had auto-refresh (every 10 seconds), so closed risks appear automatically without manual refresh.

## Impact

### Fixed Issues
- ✅ Stale materialized risks are now closed
- ✅ Future risks will auto-close correctly
- ✅ No manual intervention needed

### User Experience
- ✅ Risk cards stay in sync with work item status
- ✅ Clear visual indication (green border, ✅)
- ✅ Auto-resolved notes explain what happened

### Data Integrity
- ✅ No orphaned materialized risks
- ✅ Risk status accurately reflects system state
- ✅ Audit trail via AUTO-RESOLVED descriptions

## Maintenance

No ongoing maintenance required. The fix:
- Runs automatically on every work item status change
- Handles all risk creation patterns
- Includes logging for troubleshooting
- Self-healing (fixes stale risks when items change)

---

**Status:** ✅ **RESOLVED**
**Date Fixed:** January 4, 2026
**Files Modified:** `backend/app/api/work_items.py`

