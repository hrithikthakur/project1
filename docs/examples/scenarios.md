# Example Scenarios

Real-world examples of using the Decision Risk Engine.

## Scenario 1: Sprint Planning

### Context

Your team is planning the next 2-week sprint. You have 8 work items to consider, and the sprint ends on Feb 1.

### Work Items

```json
[
  {"id": 1, "title": "User Login", "estimate": "2-3-5 days"},
  {"id": 2, "title": "User Signup", "estimate": "2-4-6 days"},
  {"id": 3, "title": "Password Reset", "estimate": "1-2-4 days"},
  {"id": 4, "title": "Profile Page", "estimate": "3-5-8 days"},
  {"id": 5, "title": "Settings UI", "estimate": "2-3-5 days"},
  {"id": 6, "title": "API Integration", "estimate": "5-8-12 days"},
  {"id": 7, "title": "Error Handling", "estimate": "1-2-3 days"},
  {"id": 8, "title": "Testing", "estimate": "2-4-6 days"}
]
```

### Team

- 2 engineers
- 10 days available (2 weeks)
- Velocity: 1.0 (average productivity)

### Analysis

**Step 1: Run baseline forecast**

```python
import requests

response = requests.post(
    "http://localhost:8000/api/forecast",
    json={"num_simulations": 5000}
)

forecast = response.json()

# Results:
# Total work: P50 = 16 days, P90 = 22 days
# Sprint capacity: 20 days (2 people × 10 days)
```

**Conclusion:** Can't fit all 8 items. Need to prioritize.

**Step 2: Filter to top 5 items**

```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "filter_work_item_ids": [1, 2, 3, 4, 5]  # Top priority items
    }
)

# Results:
# Total work: P50 = 12 days, P90 = 16 days
# Sprint capacity: 20 days
```

**Conclusion:** P90 = 16 days fits comfortably in sprint!

**Step 3: Add buffer risk**

```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "filter_work_item_ids": [1, 2, 3, 4, 5],
        "risks": [{
            "title": "Unexpected complexity",
            "probability": 0.3,
            "impact_type": "velocity_multiplier",
            "impact_value": 0.8,
            "affected_work_item_ids": [1, 2, 3, 4, 5]
        }]
    }
)

# Results with risk:
# P50 = 13 days, P90 = 17 days
```

**Final Decision:** Commit to items 1-5 at P90 confidence.

### Outcome

During the sprint:
- Items 1, 2, 3 completed as expected
- Item 4 hit unexpected complexity (risk materialized!)
- Item 5 completed
- Final: 13 days actual vs 12-13 day P50 prediction ✅

## Scenario 2: Resource Allocation

### Context

You're 2 weeks behind on a critical project. Should you hire a contractor or cut scope?

### Current State

```
Project: E-commerce checkout
Target date: March 1 (4 weeks away)
Current forecast: P50 = March 15 (2 weeks late)
Remaining work: 15 items, ~40 days effort
Team: 3 engineers
```

### Option 1: Hire Contractor

**Decision:**
```python
hire_decision = {
    "type": "hire",
    "effect_type": "velocity_change",
    "effect_value": 1.1,  # Mid-level contractor
    "rampup_days": 5,     # 1 week onboarding
    "description": "Hire contract developer",
    "cost": 30000  # For 1 month
}
```

**Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/decisions/analyze",
    json={
        "decision": hire_decision,
        "num_simulations": 5000
    }
)

analysis = response.json()

# Results:
# Baseline P50: March 15
# With hire: P50 = March 8
# Improvement: 7 days
# Probability of hitting March 1: 25%
```

**Cost-Benefit:**
```
Cost: $30k
Benefit: 7 days earlier = $70k (at $10k/day opportunity cost)
ROI: +$40k
```

### Option 2: Cut Scope

**Decision:**
```python
scope_decision = {
    "type": "change_scope",
    "target_work_item_ids": [10, 11, 12],  # Nice-to-have features
    "effect_type": "estimate_multiplier",
    "effect_value": 0.0,  # Remove completely
    "description": "Defer social login, gift cards, and reviews to V2",
    "cost": 0
}
```

**Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/decisions/analyze",
    json={
        "decision": scope_decision,
        "num_simulations": 5000
    }
)

# Results:
# With scope cut: P50 = March 3
# Improvement: 12 days
# Probability of hitting March 1: 45%
```

**Cost-Benefit:**
```
Cost: $0 (but delayed features)
Benefit: 12 days earlier
ROI: Infinite (no cost)
```

### Option 3: Both

**Combined Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "decisions": [hire_decision, scope_decision]
    }
)

# Results:
# With both: P50 = Feb 28
# Improvement: 15 days
# Probability of hitting March 1: 55%
```

### Decision

**Recommended:** Cut scope first (free!), then re-evaluate. If still behind, hire.

**Actual Result:** Cut scope, hit March 2 (P60), saved $30k ✅

## Scenario 3: Risk Management

### Context

You're building a payment integration that depends on a third-party API with reliability concerns.

### Risks Identified

**Risk 1: API Instability**
```python
{
    "title": "Payment API has downtime",
    "probability": 0.4,
    "impact_type": "delay_days",
    "impact_value": 7,
    "affected_work_item_ids": [5, 6, 7]
}
```

**Risk 2: Rate Limiting**
```python
{
    "title": "API rate limits hit during testing",
    "probability": 0.6,
    "impact_type": "velocity_multiplier",
    "impact_value": 0.7,
    "affected_work_item_ids": [7, 8]
}
```

**Risk 3: Documentation Issues**
```python
{
    "title": "API docs incomplete",
    "probability": 0.5,
    "impact_type": "estimate_multiplier",
    "impact_value": 1.3,
    "affected_work_item_ids": [5, 6]
}
```

### Analysis

**Portfolio Risk Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/risks/portfolio",
    json={
        "risks": [risk_1, risk_2, risk_3],
        "num_simulations": 10000
    }
)

analysis = response.json()

# Results:
# Baseline P50: Feb 1
# With all risks: P50 = Feb 12
# Expected delay: 11 days
# 
# Risk breakdown:
# - API Instability: 2.8 days (0.4 × 7)
# - Rate Limiting: 3.6 days (0.6 × 6)
# - Docs Issues: 4.5 days (0.5 × 9)
# Total expected: 10.9 days
```

### Mitigation Strategies

**Strategy 1: Build Retry Logic**
```python
{
    "name": "Implement retry with exponential backoff",
    "reduces_risk_id": "risk-1",
    "probability_reduction": 0.2,  # 40% → 20%
    "cost_days": 2
}
```

**Strategy 2: Cache Responses**
```python
{
    "name": "Cache API responses",
    "reduces_risk_id": "risk-2",
    "impact_reduction": 0.6,  # Reduce velocity impact
    "cost_days": 3
}
```

**Strategy 3: Use API Sandbox**
```python
{
    "name": "Use sandbox for initial development",
    "reduces_risk_id": "risk-3",
    "probability_reduction": 0.3,  # 50% → 20%
    "cost_days": 1
}
```

**Mitigation Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/risks/mitigation-analysis",
    json={
        "risks": [risk_1, risk_2, risk_3],
        "mitigations": [strategy_1, strategy_2, strategy_3],
        "num_simulations": 5000
    }
)

# Results:
# Current expected delay: 11 days
# With mitigations: 4 days
# Mitigation cost: 6 days upfront
# Net benefit: 1 day
# ROI: 17%
```

### Decision

**Implement all mitigations.** Upfront cost is worthwhile given risk reduction.

**Actual Outcome:**
- Built retry logic and caching (4 days)
- API had 2 outages but retry logic handled it
- No significant delays
- Total: On time delivery ✅

## Scenario 4: Milestone Tracking

### Context

You have a major product launch scheduled for March 15. Multiple teams are working on different components.

### Setup

**Teams:**
- Backend team: 4 engineers
- Frontend team: 3 engineers
- DevOps team: 2 engineers

**Epics:**
1. API Development (15 work items)
2. UI Development (12 work items)
3. Infrastructure (8 work items)

**Milestone:**
```json
{
    "title": "Product Launch",
    "target_date": "2026-03-15",
    "work_item_ids": [1, 2, 3, ... 35]
}
```

### Weekly Tracking

**Week 1 (Jan 5):**
```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "filter_milestone_id": 1
    }
)

# Results:
# P50: March 12
# P90: March 20
# Probability of March 15 launch: 65%
```

**Status:** On track, but tight.

**Week 4 (Feb 1):**
```python
# Update: 5 items completed, 1 item blocked

response = requests.post(
    "http://localhost:8000/api/forecast",
    json={"num_simulations": 5000}
)

# Results:
# P50: March 16 (slipped 4 days!)
# P90: March 25
# Probability of March 15: 48%
```

**Status:** Behind schedule. Need action.

**Week 5 (Feb 8):**

**Action Taken:** Cut 3 low-priority features

```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "decisions": [scope_cut_decision]
    }
)

# Results:
# P50: March 13
# P90: March 20
# Probability of March 15: 68%
```

**Status:** Back on track!

**Week 9 (March 8):**

**Final forecast before launch:**
```python
# Results:
# P50: March 14
# P90: March 18
# Probability of March 15: 62%
```

**Decision:** Proceed with launch. High confidence.

**Actual Launch:** March 14 ✅

### Lessons

1. Weekly forecasting caught slippage early
2. Scope cut was enough to recover
3. Probabilistic thinking avoided last-minute panic
4. Launch was successful with realistic planning

## Scenario 5: Scaling Team

### Context

Your startup is growing fast. Should you hire aggressively or grow gradually?

### Current State

- Team: 5 engineers
- Velocity: 1.0 average
- Backlog: 100 work items (~200 days of work)
- Goal: Clear backlog in 6 months

### Option 1: Aggressive Hiring (Double Team)

**Plan:** Hire 5 more engineers immediately

```python
hire_decisions = [
    {"type": "hire", "effect_value": 0.8, "rampup_days": 30},  # Junior
    {"type": "hire", "effect_value": 0.8, "rampup_days": 30},  # Junior
    {"type": "hire", "effect_value": 1.0, "rampup_days": 21},  # Mid
    {"type": "hire", "effect_value": 1.0, "rampup_days": 21},  # Mid
    {"type": "hire", "effect_value": 1.3, "rampup_days": 14},  # Senior
]

response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "decisions": hire_decisions
    }
)

# Results:
# Month 1: Velocity = 0.6 (existing team slowed by onboarding)
# Month 2: Velocity = 0.9
# Month 3+: Velocity = 1.8
# Completion: 4.5 months
# Cost: $750k (5 engineers × $150k each)
```

### Option 2: Gradual Hiring

**Plan:** Hire 1 senior every month

```python
hire_schedule = [
    {"month": 1, "type": "hire", "effect_value": 1.3, "rampup_days": 14},
    {"month": 2, "type": "hire", "effect_value": 1.3, "rampup_days": 14},
    {"month": 3, "type": "hire", "effect_value": 1.2, "rampup_days": 14},
    {"month": 4, "type": "hire", "effect_value": 1.2, "rampup_days": 14},
]

# Results:
# Month 1: Velocity = 1.0
# Month 2: Velocity = 1.15
# Month 3: Velocity = 1.30
# Month 4+: Velocity = 1.45
# Completion: 5.8 months
# Cost: $600k (4 engineers × $150k each)
```

### Comparison

| Metric | Aggressive | Gradual | Winner |
|--------|-----------|---------|--------|
| Time to complete | 4.5 months | 5.8 months | Aggressive |
| Cost | $750k | $600k | Gradual |
| Quality risk | High (rushed onboarding) | Low | Gradual |
| Team disruption | High | Low | Gradual |

### Decision

**Recommended:** Gradual hiring
- Only 1.3 months slower
- $150k cheaper
- Lower risk
- Better team culture

## Scenario 6: External Dependencies

### Context

Your project depends on a vendor delivering their API. They're unreliable.

### Setup

**Your Work:**
```
Item 1-3: Frontend (no dependency)
Item 4-6: API integration (blocks on vendor)
Item 7-9: Testing (blocks on Item 4-6)
```

**Vendor Promise:** API ready by Feb 1

### Risk Modeling

**Risk: Vendor Delay**
```python
vendor_risk = {
    "title": "Vendor API delayed",
    "probability": 0.7,  # They're usually late
    "impact_type": "delay_days",
    "impact_value_min": 7,
    "impact_value_likely": 14,
    "impact_value_max": 30,
    "affected_work_item_ids": [4, 5, 6]
}
```

**Analysis:**
```python
response = requests.post(
    "http://localhost:8000/api/risks/analyze",
    json={
        "risk": vendor_risk,
        "num_simulations": 10000
    }
)

# Results:
# Without risk: P50 = Feb 15
# With risk: P50 = Feb 25
# Expected delay from vendor: 9.8 days (0.7 × 14)
```

### Mitigation Options

**Option 1: Build Mock API**
```python
{
    "name": "Build mock API for development",
    "cost_days": 3,
    "benefit": "Unblock Items 4-6, reduce dependency"
}

# Analysis:
# Cost: 3 days upfront
# Benefit: Items 4-6 can start immediately
# Net: 6.8 days saved
# ROI: 227%
```

**Option 2: Parallel Implementation**
```python
{
    "name": "Build abstraction layer, implement mock and real",
    "cost_days": 5,
    "benefit": "Complete independence from vendor"
}

# Analysis:
# Cost: 5 days upfront
# Benefit: Full independence
# Net: 4.8 days saved
# ROI: 96%
```

**Option 3: Contractual Guarantee**
```python
{
    "name": "Negotiate SLA with financial penalty",
    "cost": "$0",
    "probability_reduction": 0.3  # 70% → 40%
}

# Analysis:
# Cost: $0 (lawyer time already sunk)
# Benefit: Lower probability
# Expected delay: 5.6 days (was 9.8)
# Improvement: 4.2 days
```

### Decision

**Implement Option 1** (Mock API) + **Option 3** (SLA)
- Low cost
- High benefit
- Removes blocker
- Insurance via SLA

**Actual Outcome:**
- Built mock API in 2 days
- Vendor delayed by 10 days (risk materialized)
- But our work continued unblocked
- Delivered on time ✅

## Key Takeaways

1. **Use forecasts for planning**: P50 for expectations, P90 for commitments
2. **Model decisions before acting**: Analyze impact before spending money
3. **Quantify risks**: Expected value helps prioritize mitigation
4. **Track weekly**: Catch slippage early while you can still act
5. **Consider multiple options**: Compare scenarios systematically
6. **Mitigate early**: Upfront work often pays off exponentially

## Related Documentation

- [Running Forecasts](../guides/forecasts.md)
- [Managing Decisions](../guides/decisions.md)
- [Tracking Risks](../guides/risks.md)

