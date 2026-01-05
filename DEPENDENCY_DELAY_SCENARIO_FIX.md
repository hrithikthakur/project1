# Dependency Delay What-If Scenario Fix

## Problem
The dependency delay what-if scenario was not properly showing up in the contribution breakdown. When users ran a scenario to test "what if this dependency is delayed by X days?", the scenario delay was being applied but not clearly identified in the forecast results.

## Root Cause
In the `_calculate_dependency_delays` function in `backend/app/engine/forecast.py`, scenario delays were being stored in `state["scenario_delays"]` and applied during delay calculation, but they weren't being explicitly tracked in the contribution breakdown with a clear "Scenario:" label.

The delay was being included in the general "Dependency:" contribution, making it impossible for users to distinguish between:
- Real dependency delays (from actual work item status/progress)
- Scenario delays (from what-if testing)

## Solution
Updated the forecast engine to:

1. **Modified `_calculate_realistic_delay`** (lines 464-570):
   - Changed return type from `float` to `Tuple[float, bool]`
   - Returns both the delay amount and a flag indicating if it's a scenario delay
   - Properly tracks when a delay comes from `scenario_delays`

2. **Enhanced contribution tracking** (lines 632-655):
   - Added logic to detect when a dependency delay is from a scenario
   - Uses a distinct label: `"Scenario: {work_item_name} delayed by {days}d"`
   - Keeps regular dependency delays with the existing format: `"Dependency: {work_item_name}"`

## Example Output

### Before Fix
```json
{
  "contribution_breakdown": [
    {"cause": "Dependency: Design Payment System", "days": 2.5},
    {"cause": "Uncertainty buffer (P80)", "days": 1.5}
  ]
}
```

### After Fix
```json
{
  "contribution_breakdown": [
    {"cause": "Scenario: Design Payment System delayed by 5d", "days": 2.5},
    {"cause": "Dependency: Implement Payment API", "days": 7.5},
    {"cause": "Uncertainty buffer (P80)", "days": 1.5}
  ]
}
```

## Testing

### API Test
```bash
# Test dependency delay scenario on milestone_003
curl -X POST http://localhost:8000/api/forecast/milestone_003/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario_type": "dependency_delay", "params": {"work_item_id": "work_item_007", "delay_days": 5}}'
```

### Expected Results
- **Baseline**: Shows regular dependency delays
- **Scenario**: Shows "Scenario: {work_item} delayed by {days}d" in contribution breakdown
- **Impact**: Clear indication of how many days the P80 slips

## UI Usage
1. Navigate to Forecast view (📈)
2. Select a milestone
3. Click "Run Forecast"
4. Click "🔮 What-If Scenario"
5. Select "Dependency Delay"
6. Choose a work item that has dependents
7. Enter delay days (e.g., 5)
8. Click "Run Scenario"
9. View the scenario results - the contribution breakdown will now clearly show "Scenario: {work_item} delayed by {days}d"

## Notes
- For the scenario to have visible impact, the selected work item must have dependents in the same milestone
- Work items that are already completed won't show scenario impact
- The scenario delay propagates through the dependency chain using critical path logic

## Files Changed
- `backend/app/engine/forecast.py`: Updated delay calculation and contribution tracking logic

