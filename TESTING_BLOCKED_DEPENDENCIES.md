# Testing Blocked Dependency Names Feature

## Quick Test Guide

### Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173` (or your configured port)

### Method 1: View Existing Materialized Risks

1. Open the frontend in your browser
2. Navigate to the **Risks** section
3. Look for risks with status **"materialised"**
4. You should see:
   - **In the risk card**: A preview showing blocked item name waiting for blocking item name
   - **In the details modal**: Full dependency information with item names

**Example Display:**
```
🚫 Implement Authentication Backend waiting for Design Authentication System • Delay: 14.0d
```

### Method 2: Trigger a New Blocked Dependency Event

#### Using cURL:
```bash
curl -X POST "http://localhost:8000/api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_002"
```

#### Using the API directly:
```bash
POST http://localhost:8000/api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_002
```

#### Response:
```json
{
  "event_id": "evt_xyz",
  "event_type": "dependency_blocked",
  "commands_issued": 3,
  "commands": [
    {
      "command_type": "update_risk",
      "reason": "Dependency blocked: 'Item Name' is waiting for 'Other Item Name'...",
      ...
    }
  ]
}
```

### Method 3: Auto-Detect Risks

1. Open the frontend
2. Go to the **Risks** section
3. Click the **"🔍 Auto-Detect Risks"** button
4. The system will scan for blocked work items and create materialized risk cards
5. New risks will show item names in the description

### What to Look For

#### ✅ Correct Display (Item Names):
- "Implement Authentication Backend waiting for Design Authentication System"
- "Work item 'Dashboard UI' is blocked waiting for 'User API' to complete"

#### ❌ Old Display (IDs):
- "dep_001 is blocked"
- "work_item_002 depends on work_item_001"

### Viewing Risk Details

Click on any materialized risk card to open the details modal. You should see:

1. **Dependency Blocked Section** (red background):
   - 🚨 Dependency Blocked
   - **Blocked Item:** {Item Name}
   - **Waiting For:** {Blocking Item Name}
   - **Expected Delay:** {X} days (P80)

2. **Affected Work Items Section**:
   - Shows the work item names (not IDs)

### Available Dependencies in Mock Data

Current dependencies you can test with:
- `dep_001`: work_item_002 → work_item_001 ("Implement Authentication Backend" → "Design Authentication System")
- `dep_002`: work_item_003 → work_item_002 ("Implement Authentication Frontend" → "Implement Authentication Backend")
- `dep_003`: work_item_005 → work_item_004
- `dep_004`: work_item_006 → work_item_005
- And more...

### Troubleshooting

**Issue**: Risk shows IDs instead of names
- **Cause**: Old risk format from before the update
- **Solution**: Delete the old risk and trigger a new blocked dependency event

**Issue**: Cannot see the blocking details section
- **Cause**: Risk doesn't have the `blocked_item` and `blocking_item` fields in impact
- **Solution**: Trigger a new event or wait for the system to create a new risk

**Issue**: Frontend not updating
- **Cause**: Frontend code not refreshed
- **Solution**: Hard refresh the browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### API Endpoints for Manual Testing

1. **List all risks:**
   ```bash
   curl http://localhost:8000/api/risks
   ```

2. **Get specific risk:**
   ```bash
   curl http://localhost:8000/api/risks/risk_dep_blocked_dep_001
   ```

3. **Trigger blocked dependency:**
   ```bash
   curl -X POST "http://localhost:8000/api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_001"
   ```

4. **Check engine health:**
   ```bash
   curl http://localhost:8000/api/decision-risk-engine/health
   ```

### Expected Behavior

When a dependency is blocked:

1. **Engine creates/updates risk** with:
   - Title includes blocked item name
   - Description shows both item names
   - Status set to "materialised"
   - Impact includes structured blocked/blocking item info

2. **Frontend displays**:
   - Risk card shows blocking relationship preview
   - Details modal shows full dependency information
   - All names are human-readable (no IDs visible)

3. **User experience**:
   - Immediate understanding of what's blocked
   - No need to look up IDs
   - Clear action items visible

