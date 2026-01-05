# Running Forecasts

Learn how to generate timeline predictions using Monte Carlo simulation.

## Overview

Forecasts use Monte Carlo simulation to predict work item completion dates by running thousands of scenarios with random variation in estimates, team velocity, and external factors.

## Creating a Basic Forecast

### Step 1: Navigate to Forecast View

From the dashboard, click "Forecast" in the navigation menu.

### Step 2: Configure Simulation Parameters

```
Number of Simulations: 5000
Random Seed: (optional, for reproducibility)
```

**Simulation Count Guidelines:**
- **1,000**: Quick exploration
- **5,000**: Standard analysis
- **10,000**: High precision
- **50,000+**: Research/validation

### Step 3: Run the Forecast

Click **"Run Forecast"** and wait for results (usually 1-3 seconds).

### Step 4: Interpret Results

Results show percentile completion dates for each work item:

```
Work Item #1: User Login API
  Current Status: In Progress
  
  Completion Date Forecast:
    P10: Jan 12, 2026  (10% confidence)
    P50: Jan 18, 2026  (50% confidence)
    P90: Jan 27, 2026  (90% confidence)
    P99: Feb 3, 2026   (99% confidence)
  
  Duration Forecast:
    P50: 5.2 days
    P90: 8.7 days
```

## Understanding Results

### Percentiles Explained

**P50 (Median)**
- 50% chance of completing by this date
- Best for internal planning
- Use for expected value calculations

**P90 (Conservative)**
- 90% confidence level
- Good for external commitments
- Includes most risks

**P10 and P99 (Range)**
- Show full uncertainty range
- P10 = optimistic scenario
- P99 = pessimistic scenario
- Wide range = high uncertainty

### Completion Date vs Duration

**Completion Date**: Calendar date when work finishes
- Accounts for weekends
- Respects dependencies
- Considers team capacity

**Duration**: Actual work time required
- Pure effort estimate
- Doesn't include waiting
- Used for resource planning

### Confidence Intervals

The spread between percentiles indicates uncertainty:

```
Tight Distribution (Low Uncertainty):
  P50: Jan 15
  P90: Jan 18
  Spread: 3 days

Wide Distribution (High Uncertainty):
  P50: Jan 15
  P90: Feb 5
  Spread: 21 days  ← Need to reduce uncertainty!
```

## Advanced Forecasting

### Including Decisions

Model what-if scenarios by adding decisions to your forecast.

**Example: Hiring Impact**

1. Create a "hire" decision in Decisions view
2. Return to Forecast view
3. Click "Add Decision" and select your hiring decision
4. Run forecast to see combined impact

```
Baseline P50: Feb 1
With Hiring: Jan 25
Improvement: 7 days
```

### Including Risks

Quantify risk impact on your forecast.

**Example: Vendor Delay Risk**

1. Create a risk in Risks view:
   - Probability: 0.3 (30%)
   - Impact: 10 days delay
   - Affected items: [4, 5, 6]

2. Add risk to forecast
3. Run to see expected impact:

```
Without Risk: P50 = Jan 20
With Risk:    P50 = Jan 23
Expected Delay: 3 days (0.3 × 10)
```

### Multiple Scenarios

Compare multiple scenarios in one forecast:

**Scenario: Resource Allocation**

```
Decisions:
  1. Hire Senior Engineer (velocity +1.3)
  2. Delay Feature X (reduce scope)
  
Risks:
  1. API Instability (30% prob, 5 day impact)
  2. Team Member Leave (10% prob, 10 day impact)
  
Result:
  Baseline:           P50 = Feb 15, P90 = Mar 1
  + Decisions:        P50 = Feb 8,  P90 = Feb 20
  + Decisions + Risks: P50 = Feb 11, P90 = Feb 24
```

## Milestone Forecasting

### Single Milestone

Forecast when a specific milestone will complete.

**Example: MVP Launch**

```
Milestone: MVP Launch
Work Items: 1, 2, 3, 4, 5, 6
Target Date: Feb 1, 2026

Forecast Results:
  P50: Feb 5, 2026    (5 days late)
  P80: Feb 12, 2026   (11 days late)
  P90: Feb 15, 2026   (14 days late)
  
Probability of hitting target: 35%
```

**Interpretation:**
- Only 35% chance of hitting Feb 1
- P80 suggests Feb 12 is more realistic
- Consider adding buffer or reducing scope

### Multiple Milestones

Track several milestones simultaneously:

```
Milestone 1: Alpha Release
  P50: Jan 15
  P90: Jan 22
  
Milestone 2: Beta Release  
  P50: Feb 1
  P90: Feb 10
  
Milestone 3: Production Release
  P50: Feb 20
  P90: Mar 5
```

## Filtering and Focusing

### Filter by Status

```
Show only: Not Started
Result: See forecast for remaining work
```

### Filter by Actor

```
Show only: Work assigned to Alice
Result: See individual capacity forecast
```

### Filter by Milestone

```
Show only: Items in MVP milestone
Result: See milestone-specific forecast
```

## Forecast Accuracy

### Calibrating Estimates

Compare forecasts to actual results:

```
Work Item #1:
  Forecast P50: 5 days
  Actual: 7 days
  Error: +40%
  
Action: Increase future estimates by 40%
```

### Tracking Accuracy Over Time

```
Sprint 1: P50 accuracy = 85%
Sprint 2: P50 accuracy = 78%
Sprint 3: P50 accuracy = 92%

Average: 85% accuracy at P50
```

**Interpretation:**
- 85% means forecasts are slightly optimistic
- Consider using P60 instead of P50
- Or adjust estimate ranges

### Improving Accuracy

**Use Historical Data**
```
Average velocity over last 3 sprints: 23 points
Use this for future velocity estimates
```

**Calibrate Uncertainties**
```
Review past items:
- Simple features: ±20% variation
- Complex features: ±50% variation
  
Adjust min/max estimates accordingly
```

**Update Regularly**
```
Weekly: Update completed items
Sprint End: Recalibrate velocities
Monthly: Review risk probabilities
```

## API Usage

### Basic Forecast Request

```bash
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "num_simulations": 5000
  }'
```

### Forecast with Decisions

```bash
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "num_simulations": 5000,
    "decisions": [
      {
        "id": "hire-1",
        "type": "hire",
        "target_work_item_id": 1,
        "effect_type": "velocity_change",
        "effect_value": 1.3,
        "rampup_days": 14
      }
    ]
  }'
```

### Forecast with Risks

```bash
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "num_simulations": 5000,
    "risks": [
      {
        "id": "risk-1",
        "title": "API Instability",
        "probability": 0.3,
        "impact_type": "delay_days",
        "impact_value": 10,
        "affected_work_item_ids": [4, 5, 6]
      }
    ]
  }'
```

### Response Format

```json
{
  "work_items": [
    {
      "id": 1,
      "title": "User Login API",
      "percentiles": {
        "P10": "2026-01-12",
        "P50": "2026-01-18",
        "P90": "2026-01-27",
        "P99": "2026-02-03"
      },
      "duration_days": {
        "P50": 5.2,
        "P90": 8.7
      }
    }
  ],
  "milestones": [
    {
      "id": 1,
      "title": "MVP Launch",
      "target_date": "2026-02-01",
      "forecast_date_P50": "2026-02-05",
      "probability_on_time": 0.35
    }
  ]
}
```

## Best Practices

### Run Enough Simulations

```
Quick Check:     1,000 simulations
Daily Planning:  5,000 simulations
Sprint Planning: 10,000 simulations
Release Planning: 20,000+ simulations
```

### Use Appropriate Percentiles

| Context | Percentile | Reason |
|---------|-----------|--------|
| Internal Sprint | P50-P60 | Balanced estimate |
| External Demo | P80 | High confidence |
| Marketing Launch | P90-P95 | Critical deadline |
| Legal Deadline | P99 | Cannot miss |
| Exploration | P50 | Central tendency |

### Update Regularly

```
Daily: Mark items as completed
Weekly: Review in-progress items
Sprint: Recalibrate velocities
Monthly: Update risk probabilities
Quarterly: Review dependency graph
```

### Validate Results

**Sanity Checks:**
- Do P50 values seem reasonable?
- Is P90-P50 spread appropriate?
- Are critical path items identified?
- Do dependencies make sense?

**Compare to Intuition:**
- If forecast differs wildly from gut feel, investigate
- Check for data entry errors
- Verify dependency relationships
- Review estimate ranges

## Common Issues

### Unrealistic Results

**Problem**: P50 is 2 days, P90 is 200 days

**Causes**:
- Circular dependencies
- Missing dependency constraints
- Extreme estimate ranges

**Solutions**:
- Check for dependency cycles
- Tighten estimate ranges
- Review dependency graph

### Very Slow Simulations

**Problem**: Forecast takes > 30 seconds

**Causes**:
- Too many simulations (> 50,000)
- Complex dependency graph (> 500 items)
- Deep dependency chains (> 20 levels)

**Solutions**:
- Reduce simulation count
- Simplify dependency graph
- Break into smaller forecasts

### Results Don't Match Reality

**Problem**: P50 forecasts consistently off by 30%

**Causes**:
- Estimates are optimistic
- Velocity not calibrated
- Missing overhead time

**Solutions**:
- Increase estimates by 30%
- Reduce velocity multipliers
- Add buffer items for overhead

## Examples

### Sprint Planning Example

```python
# Sprint goal: Complete authentication module
# Team: 2 engineers, 5 days
# Items: Login (3-5-8 days), Signup (2-4-6 days), Password Reset (1-2-4 days)

POST /api/forecast
{
  "num_simulations": 5000,
  "filter_milestone_id": 1
}

# Result:
# P50: 12 days (will spill into next sprint)
# P90: 16 days

# Action: Remove Password Reset from sprint
```

### Release Planning Example

```python
# Release goal: Ship MVP by Feb 1
# Team: 5 engineers
# Items: 25 features across 3 epics

POST /api/forecast
{
  "num_simulations": 10000,
  "risks": [
    {"title": "Vendor API delays", "probability": 0.3, "impact": 7},
    {"title": "Key person leave", "probability": 0.1, "impact": 14}
  ]
}

# Result:
# P50: Feb 5 (5 days late)
# P90: Feb 20 (19 days late)

# Action: Cut scope or move date to Feb 20
```

## Summary

- Use Monte Carlo simulation for realistic date ranges
- Choose percentiles based on commitment level
- Include decisions and risks for complete picture
- Update regularly with actual progress
- Calibrate estimates based on historical performance

Next: Learn about [Managing Decisions](decisions.md)

