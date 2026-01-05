# Basic Concepts

Understanding these core concepts will help you use the Decision Risk Engine effectively.

## Core Entities

### Work Items

**Work Items** are the fundamental units of work in your project.

**Properties:**
- **ID**: Unique identifier
- **Title**: Descriptive name
- **Estimate**: Time required (min, likely, max)
- **Status**: Not started, in progress, or completed
- **Dependencies**: Other work items that must complete first
- **Assigned Actor**: Team member responsible

**Example:**
```json
{
  "id": 1,
  "title": "User Login API",
  "estimate_min": 3,
  "estimate_likely": 5,
  "estimate_max": 8,
  "status": "not_started",
  "dependencies": [],
  "assigned_actor_id": 101
}
```

**Three-Point Estimates**

We use triangular distributions for uncertainty:
- **Min**: Best-case scenario (optimistic)
- **Likely**: Most probable outcome
- **Max**: Worst-case scenario (pessimistic)

The simulation randomly samples from this distribution.

### Actors

**Actors** represent team members or resources.

**Properties:**
- **ID**: Unique identifier
- **Name**: Person or resource name
- **Velocity**: Productivity multiplier (1.0 = baseline)
- **Capacity**: Available hours per week
- **Role**: Optional role assignment

**Example:**
```json
{
  "id": 101,
  "name": "Alice Johnson",
  "velocity": 1.2,
  "capacity": 40,
  "role_id": 1
}
```

**Velocity Explained**

Velocity is a multiplier on work speed:
- **1.0**: Average productivity
- **1.2**: 20% faster than average
- **0.8**: 20% slower than average

Used to model:
- Experience levels (senior = 1.3, junior = 0.7)
- Part-time allocation (half-time = 0.5)
- Team ramp-up (new hire starts at 0.5)

### Dependencies

**Dependencies** define the relationships between work items.

**Types:**
- **Finish-to-Start**: Item B can't start until Item A finishes
- **Blocking**: Item A must complete for Item B to proceed

**Example:**
```json
{
  "from_item_id": 1,
  "to_item_id": 2,
  "type": "finish_to_start",
  "delay_days": 0
}
```

**Dependency Graph**

The system builds a directed acyclic graph (DAG):
```
Item 1: API Design
  ↓
Item 2: API Implementation
  ↓
Item 3: Frontend Integration
```

**Critical Path**

The longest path through the dependency graph determines the minimum project duration.

### Milestones

**Milestones** represent target dates or project phases.

**Properties:**
- **ID**: Unique identifier
- **Title**: Milestone name
- **Target Date**: Desired completion date
- **Work Items**: Associated items that must complete

**Example:**
```json
{
  "id": 1,
  "title": "MVP Launch",
  "target_date": "2026-02-01",
  "work_item_ids": [1, 2, 3, 4, 5]
}
```

**Milestone Analysis**

The forecast calculates:
- Probability of hitting target date
- Expected completion date (P50)
- Risk buffer needed (P90 - P50)

## Simulation Concepts

### Monte Carlo Simulation

**What is it?**

A statistical technique that runs thousands of scenarios with random variation to understand probability distributions.

**How it works:**

1. **Sample**: Randomly pick values from estimate ranges
2. **Simulate**: Calculate completion dates respecting dependencies
3. **Repeat**: Run thousands of times
4. **Analyze**: Aggregate results into percentiles

**Why use it?**

Traditional planning:
```
5 + 3 + 2 = 10 days  ← Ignores uncertainty!
```

Monte Carlo approach:
```
Run 10,000 simulations
P50: 10.2 days
P90: 13.5 days  ← Shows realistic range
```

### Percentiles

**Percentiles** indicate probability of completion by a certain date.

**Common Percentiles:**
- **P10**: 10% confidence (very optimistic)
- **P50**: 50% confidence (median, most likely)
- **P90**: 90% confidence (includes most risks)
- **P99**: 99% confidence (very conservative)

**Choosing Percentiles:**

| Scenario | Recommended Percentile |
|----------|------------------------|
| Internal deadline | P50-P70 |
| External commitment | P80-P90 |
| Fixed date (legal/marketing) | P95-P99 |
| Exploration/estimation | P50 |

### Confidence Intervals

The range between percentiles shows uncertainty:

```
P50: Jan 15
P90: Feb 1
Spread: 17 days  ← High uncertainty!
```

Wide spreads indicate:
- Large estimate ranges
- Complex dependencies
- High risk exposure

## Decision Analysis

### Decision Types

**Hire**
- Adds team capacity
- Includes ramp-up time
- Increases long-term velocity

**Fire**
- Reduces team capacity
- May include knowledge transfer delay
- Decreases velocity

**Delay**
- Adds wait time to specific work items
- Models external dependencies
- Useful for vendor delays

**Accelerate**
- Temporarily increases velocity
- Models overtime or focus
- Can have sustainability limits

**Change Scope**
- Modifies work item estimates
- Models adding/removing features
- Affects all dependent items

### Decision Effects

**Immediate vs Delayed**

Some decisions have delayed effects:
```
Hire Decision:
  Weeks 1-2: Ramp-up (velocity = 0.5)
  Week 3+: Full productivity (velocity = 1.2)
```

**Localized vs Ripple**

Effects can be:
- **Localized**: Only affects specific items
- **Ripple**: Propagates through dependencies

## Risk Modeling

### Risk Components

**Probability**
- Likelihood the risk occurs (0.0 - 1.0)
- Based on historical data or expert judgment

**Impact**
- Effect if risk materializes
- Can be delay, velocity reduction, or cost

**Affected Items**
- Which work items are impacted
- Determines ripple effect scope

### Risk Types

**Velocity Risks**
```json
{
  "impact_type": "velocity_multiplier",
  "impact_value": 0.7,  // 30% slowdown
  "probability": 0.3
}
```

**Delay Risks**
```json
{
  "impact_type": "delay_days",
  "impact_value": 14,  // 2-week delay
  "probability": 0.2
}
```

**Scope Risks**
```json
{
  "impact_type": "estimate_multiplier",
  "impact_value": 1.5,  // 50% more work
  "probability": 0.4
}
```

### Expected Value

Risks contribute their expected value to forecasts:

```
Risk: API Outage
  Probability: 30%
  Impact: 10 days delay
  Expected Value: 3 days  (0.3 × 10)
```

This increases forecast uncertainty and shifts distributions.

### Risk States

Risks have a lifecycle:

1. **Identified**: Risk is known
2. **Assessed**: Probability and impact quantified
3. **Active**: Risk is being monitored
4. **Materialized**: Risk has occurred
5. **Closed**: Risk is no longer relevant

## Ripple Effects

### What are Ripple Effects?

When you make a decision or model a risk, effects automatically propagate through the dependency chain.

**Example:**

```
Decision: Delay Item 1 by 5 days

Automatic Ripple:
  Item 1: +5 days
  Item 2 (depends on 1): +5 days
  Item 3 (depends on 2): +5 days
  Milestone (includes 1,2,3): +5 days
```

### Effect Propagation Rules

**Velocity Changes**
- Apply to specific actor or team
- Affect all items assigned to that actor
- Compound with other velocity effects

**Delays**
- Add to start time of affected items
- Propagate to dependent items
- Don't affect parallel work

**Scope Changes**
- Modify estimate distributions
- Affect only specified items
- May create new dependencies

## Data Model Relationships

### Entity Relationship Diagram

```
Actor
  ↓ assigned_to
Work Item
  ↓ contains
  Dependencies ← depends_on
  ↓ part_of
Milestone
  ↓ tracks
  Completion Date
```

### Data Flow

1. **Input**: Work items, actors, dependencies
2. **Simulation**: Monte Carlo engine
3. **Effects**: Apply decisions and risks
4. **Propagation**: Ripple through dependencies
5. **Output**: Percentile forecasts

## Best Practices

### Estimating

- Use historical data when available
- Be honest about uncertainty (wide ranges OK)
- Include buffer in max estimates
- Review and calibrate regularly

### Dependencies

- Keep dependency graph simple
- Avoid circular dependencies
- Document why dependencies exist
- Review for unnecessary coupling

### Actors

- Model realistic velocities
- Account for part-time allocation
- Include ramp-up for new hires
- Consider team interactions

### Risks

- Identify risks early
- Quantify with data when possible
- Update probabilities as info changes
- Close risks that are no longer relevant

### Forecasting

- Run enough simulations (5000+)
- Update forecasts regularly
- Compare to actuals for calibration
- Use appropriate percentiles for context

## Common Patterns

### Sprint Planning

```
1. Load next sprint's work items
2. Run baseline forecast
3. Check if P70 meets sprint end date
4. Adjust scope if needed
```

### Release Planning

```
1. Define milestone with target date
2. Add all required work items
3. Run forecast with known risks
4. Use P90 for external commitments
5. Identify critical path items
```

### Resource Planning

```
1. Model current team (baseline)
2. Create hiring decision
3. Compare forecasts
4. Calculate ROI of hiring
```

### Risk Management

```
1. Identify top risks in backlog refinement
2. Quantify probability and impact
3. Run forecast with risks included
4. Prioritize mitigation based on expected value
```

## Next Steps

Now that you understand the concepts:

1. **Try the [Quick Start Tutorial](quickstart.md)** - Hands-on practice
2. **Read the [User Guides](../guides/)** - Detailed feature documentation
3. **Explore [Examples](../examples/)** - Real-world scenarios
4. **Review [Architecture](../architecture/)** - System design details

## Glossary

- **Percentile (Pxx)**: xx% probability of completing by this date
- **Velocity**: Productivity multiplier (1.0 = baseline)
- **Ripple Effect**: Cascading impact through dependencies
- **Critical Path**: Longest sequence of dependent items
- **Expected Value**: Probability × Impact
- **Three-Point Estimate**: Min, Likely, Max values
- **Monte Carlo**: Statistical simulation technique
- **DAG**: Directed Acyclic Graph (no circular dependencies)

