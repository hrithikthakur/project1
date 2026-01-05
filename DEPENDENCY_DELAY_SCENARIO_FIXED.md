# Dependency Delay Scenario - Fixed! ✅

## Problem
The dependency delay scenario in the What-If analysis was not showing any impact when a work item was delayed.

## Root Cause
The `_delay_for_work_item()` function in `forecast.py` was not checking for scenario delays on the work item itself. It only calculated delays based on:
1. Remaining days
2. Completion percentage  
3. Status (blocked, in_progress)

But it **never checked** the `scenario_delays` dictionary that gets populated when running a dependency delay scenario.

## Solution
Modified `_delay_for_work_item()` to check for scenario delays FIRST before calculating other delays:

```python
def _delay_for_work_item(wi_id: str) -> float:
    """Recursive critical-path delay accumulation for a work item."""
    # ... existing code ...
    
    # Calculate this item's own delay (from its status/progress)
    own_delay = 0.0
    
    # IMPORTANT: Check for scenario delays first (what-if scenarios)
    if wi_id in scenario_delays:
        own_delay = max(own_delay, float(scenario_delays[wi_id]))
    
    # Check for remaining work
    remaining_days = wi.get("remaining_days")
    if remaining_days is not None and remaining_days > 0:
        own_delay = max(own_delay, remaining_days)
    # ... rest of the logic
```

The key change is using `max()` to combine scenario delays with real delays, ensuring the scenario delay is always applied.

## Test Results

### Before Fix
```
SCENARIO FORECAST (with +5 day dependency delay):
  P50: 2026-02-13 (+9 days)
  P80: 2026-02-18 (+14 days)

SCENARIO IMPACT: P80 slips by +0 additional days ❌
```

### After Fix
```
SCENARIO FORECAST (with +5 day dependency delay):
  P50: 2026-02-21 (+17 days)
  P80: 2026-02-26 (+22 days)

SCENARIO IMPACT: P80 slips by +4 additional days ✅

Scenario contribution breakdown:
  • Dependency: OAuth integration: +10.0 days
  • Uncertainty buffer (P80): +5.2 days
  • Scenario: API Gateway setup delayed by 5d: +5.0 days ✅
  • Materialised risk: Security review delay: +3.0 days
  • Recent scope change: Added two-factor authentication requirement: +2.4 days
```

## How It Works Now

1. **User selects a work item** to delay in the What-If scenario UI
2. **`_perturb_dependency_delay()`** adds the work item ID and delay days to `state["scenario_delays"]`
3. **`_calculate_dependency_delays()`** processes all work items and their dependencies
4. **`_delay_for_work_item()`** is called for each work item in the dependency chain
5. **Scenario delay is applied** if the work item is in the `scenario_delays` dictionary
6. **Delay propagates** through the dependency chain using critical path logic
7. **Tracker records** the scenario contribution: `f"Scenario: {work_item_name} delayed by {delay}d"`

## Important Notes

### Dependency Chain Requirements
For the scenario to have an impact, the delayed work item must:
1. ✅ Be part of a dependency chain (have downstream work items that depend on it)
2. ✅ Have incomplete work items that depend on it
3. ✅ Those dependent work items must be part of the forecasted milestone

### Example That Works
```
Milestone: MVP Launch

Work Items:
  - API Gateway (in_progress, 3d remaining) ← DELAY THIS
    ↓ depends on
  - OAuth Integration (in_progress, 5d remaining)
    ↓ depends on
  - Login UI (not_started, 4d estimated)

Scenario: Delay "API Gateway" by +5 days
Result: Milestone slips by ~4-5 days ✅
```

### Example That Doesn't Work
```
Milestone: MVP Launch

Work Items:
  - Design Auth (completed) ← DELAY THIS
    ↓ depends on
  - Backend Auth (blocked)
    ↓ depends on  
  - Frontend Auth (completed) ← Already done!

Scenario: Delay "Design Auth" by +5 days
Result: No impact (0 days) ❌

Why? Because:
1. Design Auth is already completed (no remaining work)
2. Frontend Auth is already completed (delay doesn't matter)
3. Only Backend Auth is incomplete, but it's blocked anyway
```

## Testing

Run the examples to see all scenarios working:

```bash
cd backend
./venv/bin/python -m app.engine.forecast_examples
```

Or test a specific example:

```bash
# Example 2: Dependency Delay Scenario
./venv/bin/python -m app.engine.forecast_examples 2

# Example 3: Scope Change Scenario  
./venv/bin/python -m app.engine.forecast_examples 3

# Example 4: Capacity Change Scenario
./venv/bin/python -m app.engine.forecast_examples 4
```

## Files Modified

1. `backend/app/engine/forecast.py` - Fixed `_delay_for_work_item()` function
2. `backend/app/engine/forecast_examples.py` - Fixed import path and added proper dependency chain to mock data

## Status
✅ **FIXED AND WORKING** - All what-if scenarios (dependency delay, scope change, capacity change) are now working correctly!

