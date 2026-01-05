# Managing Decisions

Learn how to model and analyze the impact of project decisions using what-if scenarios.

## Overview

Decisions represent actions you can take that affect project timelines:
- Hiring or removing team members
- Changing scope or priorities
- Adding delays or accelerating work
- Allocating or reallocating resources

The engine calculates how these decisions ripple through your project dependencies.

## Decision Types

### Hire

Add a team member to increase capacity.

**Use Cases:**
- Adding engineers to accelerate development
- Bringing in contractors for specialized work
- Scaling the team for a big push

**Parameters:**
```json
{
  "type": "hire",
  "target_work_item_id": 1,
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "description": "Hire senior engineer"
}
```

**Effect:**
- Initial rampup period with reduced productivity
- After rampup, increases team velocity
- Affects all work assigned to the team

**Example:**
```
Before: Team of 2, velocity = 1.0
Add senior engineer (velocity 1.3)
After rampup: Team velocity = 1.15 average
Net impact: Tasks complete 15% faster
```

### Fire / Remove Resource

Remove a team member (reduces capacity).

**Use Cases:**
- Team member leaving
- Budget cuts
- Reallocation to other projects

**Parameters:**
```json
{
  "type": "fire",
  "target_actor_id": 101,
  "effect_type": "velocity_change",
  "effect_value": 0.0,
  "knowledge_transfer_days": 7,
  "description": "Alice leaving for another team"
}
```

**Effect:**
- Optional knowledge transfer period
- Reduces team capacity
- May require work reassignment

**Example:**
```
Before: Team of 3, total capacity = 120 hrs/week
Remove 1 person (40 hrs/week)
After: Team of 2, total capacity = 80 hrs/week
Net impact: ~33% slower delivery
```

### Delay

Add a waiting period before work can start.

**Use Cases:**
- Waiting for external dependencies
- Legal/compliance reviews
- Vendor delivery delays
- Regulatory approval

**Parameters:**
```json
{
  "type": "delay",
  "target_work_item_id": 5,
  "effect_type": "delay_days",
  "effect_value": 14,
  "description": "Wait for vendor API access"
}
```

**Effect:**
- Shifts start date for affected item(s)
- Ripples to dependent items
- Doesn't affect duration of work

**Example:**
```
Original: Item 5 starts Jan 10, completes Jan 20
Add 14-day delay
New: Item 5 starts Jan 24, completes Feb 3
Dependencies also shift by 14 days
```

### Accelerate

Temporarily increase velocity (e.g., overtime, focus time).

**Use Cases:**
- Sprint to meet deadline
- Focused effort on critical path
- Overtime work
- Removing distractions

**Parameters:**
```json
{
  "type": "accelerate",
  "target_work_item_ids": [1, 2, 3],
  "effect_type": "velocity_multiplier",
  "effect_value": 1.5,
  "duration_days": 10,
  "description": "Focus sprint on critical items"
}
```

**Effect:**
- Increases velocity for duration
- Only affects specified items
- Can model burnout with later slowdown

**Example:**
```
Normal velocity: 1.0
Accelerate to: 1.5 (50% faster)
10-day item completes in ~7 days
But: Consider sustainability for long efforts
```

### Change Scope

Modify the amount of work in an item.

**Use Cases:**
- Cutting features to meet deadline
- Discovering hidden complexity
- Simplifying implementation
- Adding requirements

**Parameters:**
```json
{
  "type": "change_scope",
  "target_work_item_id": 7,
  "effect_type": "estimate_multiplier",
  "effect_value": 0.7,
  "description": "Reduce scope of reporting feature"
}
```

**Effect:**
- Multiplies estimate (min, likely, max)
- Value < 1.0 reduces scope
- Value > 1.0 increases scope
- Affects dependent items' start dates

**Example:**
```
Original estimate: 5-8-12 days
Apply 0.7 multiplier (cut 30% of scope)
New estimate: 3.5-5.6-8.4 days
P50 moves from 8 days to 5.6 days
```

### Add/Remove Resource

Allocate or deallocate specific resources.

**Use Cases:**
- Reassigning people between projects
- Part-time to full-time (or vice versa)
- Bringing in subject matter expert
- Rotating on-call duties

**Parameters:**
```json
{
  "type": "add_resource",
  "target_work_item_id": 4,
  "actor_id": 102,
  "allocation_percentage": 50,
  "description": "Bob at 50% on payment integration"
}
```

**Effect:**
- Changes work assignments
- Affects capacity calculations
- May require ramp-up time

## Creating Decisions

### Via UI

1. Navigate to **Decisions** view
2. Click **"Create Decision"**
3. Fill in the form:
   - Decision type (dropdown)
   - Target (work item or actor)
   - Effect details
   - Description
4. Click **"Save Decision"**

### Via API

```bash
curl -X POST http://localhost:8000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hire",
    "target_work_item_id": 1,
    "effect_type": "velocity_change",
    "effect_value": 1.3,
    "rampup_days": 14,
    "description": "Hire senior engineer"
  }'
```

**Response:**
```json
{
  "id": "decision-123",
  "type": "hire",
  "status": "proposed",
  "created_at": "2026-01-05T10:30:00Z"
}
```

## Analyzing Decision Impact

### Single Decision Analysis

1. Create or select a decision
2. Click **"Analyze Decision"**
3. Review the impact report

**Example Output:**
```
Decision: Hire Senior Engineer

Before Decision:
  Work Item #1: P50 = Jan 22, P90 = Jan 30
  Work Item #2: P50 = Feb 1, P90 = Feb 10
  Milestone MVP: P50 = Feb 5

After Decision:
  Work Item #1: P50 = Jan 18, P90 = Jan 25
  Work Item #2: P50 = Jan 28, P90 = Feb 5
  Milestone MVP: P50 = Feb 1

Net Impact:
  Milestone accelerated by: 4 days
  Cost: $150,000 (annual salary)
  ROI: 4 days * $10k/day = $40k value
```

### Comparing Multiple Decisions

Run forecasts with different decisions to compare:

**Scenario 1: Hire Engineer**
```
P50: Feb 1
P90: Feb 8
Cost: $150k
```

**Scenario 2: Cut Scope**
```
P50: Jan 28
P90: Feb 3  
Cost: $0
```

**Scenario 3: Both**
```
P50: Jan 25
P90: Jan 30
Cost: $150k
```

**Analysis**: Cutting scope is most cost-effective for this timeline.

### Decision Sensitivity Analysis

Test how sensitive results are to decision parameters:

**Varying Rampup Time:**
```
0 days:  P50 = Jan 20
7 days:  P50 = Jan 22
14 days: P50 = Jan 25
30 days: P50 = Feb 1
```

**Insight**: Long rampup negates hiring benefit for short projects.

## Advanced Decision Modeling

### Conditional Decisions

Model decisions that depend on other outcomes:

```python
# Decision: Hire IF project is more than 2 weeks late
if forecast_P50 > target_date + 14_days:
    apply_decision("hire-engineer")
```

### Cascading Decisions

Model sequential decisions:

```
Week 1: Hire Engineer A (frontend)
Week 3: Hire Engineer B (backend) - if A is productive
Week 5: Expand to 3rd hire - if still behind
```

### Time-Bound Decisions

Model decisions with expiration:

```json
{
  "type": "accelerate",
  "effect_value": 1.5,
  "start_date": "2026-01-15",
  "end_date": "2026-02-01",
  "description": "Sprint for 2 weeks before deadline"
}
```

### Portfolio Decisions

Model decisions affecting multiple projects:

```json
{
  "type": "reallocate",
  "from_project": "project_a",
  "to_project": "project_b",
  "actor_ids": [101, 102],
  "description": "Move 2 engineers to Project B (higher priority)"
}
```

## Decision Lifecycle

### States

```
proposed → approved → implemented → completed
     ↓          ↓           ↓
  rejected   cancelled   rolled_back
```

**Proposed**: Decision is being considered
**Approved**: Approved but not yet enacted
**Implemented**: Decision is in effect
**Completed**: Decision has fully taken effect
**Rejected**: Decision was declined
**Cancelled**: Decision was approved but cancelled before implementation
**Rolled Back**: Decision was reversed after implementation

### Tracking Decisions

```json
{
  "id": "decision-123",
  "type": "hire",
  "status": "implemented",
  "proposed_date": "2026-01-05",
  "approved_date": "2026-01-06",
  "implementation_date": "2026-01-15",
  "proposed_by": "John Smith",
  "approved_by": "Jane Doe"
}
```

## Best Practices

### When to Model Decisions

**Good Use Cases:**
- Significant resource changes (>10% capacity)
- Major scope changes (>20% effort)
- Critical path delays (>1 week)
- Costly interventions ($50k+)

**Not Worth Modeling:**
- Minor tweaks (<5% impact)
- Already-decided actions
- Frequent routine changes
- Negligible cost decisions

### Estimating Decision Effects

**Hiring Effects:**
```
Junior: velocity = 0.6-0.8, rampup = 30-60 days
Mid-level: velocity = 0.9-1.1, rampup = 14-30 days
Senior: velocity = 1.2-1.5, rampup = 7-14 days
```

**Scope Change Effects:**
```
Cosmetic cuts: 0.9x (10% reduction)
Feature removal: 0.6-0.8x (20-40% reduction)
Simplified approach: 0.7-0.8x (20-30% reduction)
```

**Delay Estimates:**
```
Vendor delays: 7-21 days typical
Approval processes: 3-10 days
Knowledge transfer: 3-7 days per person
```

### Communicating Decisions

**To Stakeholders:**
```
We're considering hiring a senior engineer:
  - Cost: $150k/year
  - Rampup: 2 weeks
  - Impact: Moves delivery from Feb 5 to Feb 1 (P50)
  - Confidence: 80% chance of hitting Feb 1 with hire vs 35% without
```

**To Team:**
```
Decision: Cut reporting dashboard from MVP
  - Saves: ~20 engineering days
  - Impact: Moves MVP from Feb 5 to Jan 28
  - Trade-off: Will need to build reporting in V2
```

## Examples

### Example 1: Should We Hire?

**Scenario**: MVP target is Feb 1, current P50 is Feb 10

**Analysis:**
```bash
# Baseline forecast
POST /api/forecast
Result: P50 = Feb 10, P90 = Feb 20

# With hiring decision
POST /api/forecast
{
  "decisions": [{
    "type": "hire",
    "effect_value": 1.3,
    "rampup_days": 14
  }]
}
Result: P50 = Feb 3, P90 = Feb 12

# Decision: Hire improves P50 by 7 days
# But still 3 days late at P50
# Recommendation: Hire AND cut some scope
```

### Example 2: Which Items to Delay?

**Scenario**: Need to delay something to meet critical deadline

**Analysis:**
```
Option A: Delay reporting (not on critical path)
  Impact: 0 days (no effect on critical path)
  
Option B: Delay API integration (on critical path)
  Impact: +14 days (delays everything downstream)
  
Decision: Delay reporting, keep API integration
```

### Example 3: Overtime vs Hiring

**Scenario**: Two weeks behind schedule

**Option 1: Overtime (accelerate)**
```
Effect: 1.3x velocity for 4 weeks
Cost: $0 (salaried team)
Risk: Burnout, quality issues
Impact: P50 moves to Feb 1
```

**Option 2: Hire Contractor**
```
Effect: +1 person at 1.2x velocity
Cost: $30k for 2 months
Rampup: 1 week
Impact: P50 moves to Jan 29
```

**Decision**: Overtime for short-term, but hire if this is a chronic problem.

## API Reference

### Create Decision

```bash
POST /api/decisions
Content-Type: application/json

{
  "type": "hire",
  "target_work_item_id": 1,
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "description": "string"
}
```

### Analyze Decision

```bash
POST /api/decisions/analyze
Content-Type: application/json

{
  "decision_id": "decision-123",
  "num_simulations": 5000
}
```

### List Decisions

```bash
GET /api/decisions?status=proposed&type=hire
```

### Update Decision

```bash
PATCH /api/decisions/decision-123
Content-Type: application/json

{
  "status": "approved",
  "approved_by": "manager@example.com"
}
```

## Summary

- Model significant decisions that affect timeline or resources
- Use what-if analysis to compare options
- Consider rampup time, costs, and ripple effects
- Track decision lifecycle from proposed to completed
- Communicate impacts clearly to stakeholders

Next: Learn about [Tracking Risks](risks.md)

