# Tracking Risks

Learn how to identify, quantify, and model project risks using probabilistic analysis.

## Overview

Risks are uncertain events that could negatively impact your project. The Decision Risk Engine helps you:
- Quantify risks with probability and impact
- Calculate expected value of risk exposure
- Model how risks ripple through dependencies
- Make informed decisions about risk mitigation

## Risk Components

### Probability

The likelihood that a risk will occur (0.0 to 1.0).

**Examples:**
- **0.1 (10%)**: Unlikely but possible
- **0.3 (30%)**: Moderate chance
- **0.5 (50%)**: Coin flip
- **0.8 (80%)**: Very likely

**Estimation Techniques:**
```
Historical Data: 3 of last 10 releases had vendor issues = 0.3
Expert Judgment: Team says "probably 25% chance" = 0.25
Similar Projects: Industry average for this risk type = 0.4
```

### Impact

The effect if the risk materializes.

**Impact Types:**

**Delay (days)**
```json
{
  "impact_type": "delay_days",
  "impact_value": 14
}
```
Adds fixed delay to start date.

**Velocity Multiplier**
```json
{
  "impact_type": "velocity_multiplier",
  "impact_value": 0.7
}
```
Reduces velocity (0.7 = 30% slowdown).

**Estimate Multiplier**
```json
{
  "impact_type": "estimate_multiplier",
  "impact_value": 1.5
}
```
Increases work scope (1.5 = 50% more work).

**Cost Increase**
```json
{
  "impact_type": "cost_multiplier",
  "impact_value": 1.3
}
```
Increases costs (1.3 = 30% more expensive).

### Expected Value

Expected value = Probability × Impact

**Example:**
```
Risk: Vendor API instability
Probability: 30% (0.3)
Impact: 10 days delay
Expected Value: 0.3 × 10 = 3 days

This means: On average, this risk costs 3 days
```

### Affected Items

Which work items are exposed to this risk.

**Targeting Strategies:**
- **Specific items**: [1, 2, 3]
- **By epic/milestone**: All items in "Payment Integration"
- **By actor**: All items assigned to external vendor
- **Critical path**: Only items on critical path

## Creating Risks

### Via UI

1. Navigate to **Risks** view
2. Click **"Create Risk"**
3. Fill in details:
   ```
   Title: API Rate Limiting
   Description: Third-party API may throttle requests
   Severity: Medium
   Probability: 0.4 (40%)
   Impact Type: Velocity Multiplier
   Impact Value: 0.6 (40% slowdown)
   Affected Items: 4, 5, 6
   ```
4. Click **"Save Risk"**

### Via API

```bash
curl -X POST http://localhost:8000/api/risks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Rate Limiting",
    "description": "Third-party API may throttle requests",
    "severity": "medium",
    "probability": 0.4,
    "impact_type": "velocity_multiplier",
    "impact_value": 0.6,
    "affected_work_item_ids": [4, 5, 6],
    "mitigation_plan": "Implement caching and request batching"
  }'
```

## Risk Analysis

### Single Risk Analysis

Analyze one risk in isolation:

**Before Risk:**
```
P50: Jan 20, 2026
P90: Jan 28, 2026
```

**After Risk:**
```
P50: Jan 23, 2026  (+3 days)
P90: Feb 2, 2026   (+5 days)
Expected Delay: 3 days (0.4 × 7.5 days)
```

**Interpretation:**
- P50 shifts by expected value (3 days)
- P90 shifts more (5 days) due to added uncertainty
- Range widens: risk adds variability

### Multiple Risks

Model several risks together:

```json
{
  "risks": [
    {
      "title": "Vendor delay",
      "probability": 0.3,
      "impact": 10
    },
    {
      "title": "Team member leave",
      "probability": 0.1,
      "impact": 15
    },
    {
      "title": "Requirement changes",
      "probability": 0.5,
      "impact": 5
    }
  ]
}
```

**Combined Analysis:**
```
Expected total delay: 
  (0.3 × 10) + (0.1 × 15) + (0.5 × 5) = 7.5 days
  
Actual forecast with risks:
  P50: +8 days (close to expected)
  P90: +15 days (includes risk correlation)
```

### Risk Interactions

Some risks correlate or compound:

**Independent Risks:**
```
Risk A: 30% × 10 days = 3 days
Risk B: 40% × 5 days = 2 days
Combined: ~5 days expected
```

**Correlated Risks:**
```
Risk A: Vendor A delays (30%)
Risk B: Vendor B delays (30%)
If same root cause: Combined probability may be 30% not 51%
```

## Risk Severity Levels

### Low Severity

**Characteristics:**
- Probability < 20% OR Impact < 5 days
- Doesn't affect critical path
- Has easy mitigation

**Example:**
```
Risk: Minor UI bug found in testing
Probability: 15%
Impact: 2 days to fix
Expected: 0.3 days
Action: Accept risk, handle if occurs
```

### Medium Severity

**Characteristics:**
- Probability 20-50% OR Impact 5-15 days
- May affect schedule
- Mitigation moderately complex

**Example:**
```
Risk: API integration more complex than expected
Probability: 40%
Impact: 8 days additional work
Expected: 3.2 days
Action: Plan mitigation (prototype early)
```

### High Severity

**Characteristics:**
- Probability > 50% OR Impact > 15 days
- Significantly affects critical path
- Requires active mitigation

**Example:**
```
Risk: Key team member leaving
Probability: 25%
Impact: 20 days (knowledge transfer + slowdown)
Expected: 5 days
Action: Mitigate immediately (documentation, pairing)
```

### Critical Severity

**Characteristics:**
- High probability AND high impact
- Could derail project
- Needs executive attention

**Example:**
```
Risk: Vendor goes out of business
Probability: 10%
Impact: 60 days (find alternative, migrate)
Expected: 6 days
Action: Develop contingency plan NOW
```

## Risk Mitigation

### Mitigation Strategies

**Avoid**
```
Strategy: Eliminate the risk
Example: Use stable in-house API instead of risky vendor
Effect: Probability → 0%
```

**Reduce Probability**
```
Strategy: Make risk less likely
Example: Add automated testing to catch bugs early
Effect: Probability 0.4 → 0.2
```

**Reduce Impact**
```
Strategy: Limit damage if risk occurs
Example: Create detailed documentation for knowledge transfer
Effect: Impact 20 days → 10 days
```

**Transfer**
```
Strategy: Shift risk to third party
Example: Buy insurance, use SLA guarantees
Effect: Cost risk transferred
```

**Accept**
```
Strategy: Do nothing, handle if it happens
Example: Low probability/impact risks
Effect: No change, budgeted in forecast
```

### Modeling Mitigation

**Before Mitigation:**
```json
{
  "risk_id": "risk-1",
  "probability": 0.4,
  "impact": 15,
  "expected_value": 6
}
```

**After Mitigation:**
```json
{
  "risk_id": "risk-1-mitigated",
  "probability": 0.2,
  "impact": 10,
  "expected_value": 2,
  "mitigation_cost": 3
}
```

**ROI:**
```
Benefit: 6 - 2 = 4 days saved
Cost: 3 days of mitigation work
Net: 1 day improvement
Decision: Worth it!
```

## Risk Lifecycle

### States

```
identified → assessed → active → [mitigated|materialized|closed]
```

**Identified**: Risk is known but not quantified
**Assessed**: Probability and impact estimated
**Active**: Risk is being monitored
**Mitigated**: Actions taken to reduce risk
**Materialized**: Risk has occurred
**Closed**: Risk no longer relevant

### Risk Register

Track all project risks:

```
| ID | Title | Probability | Impact | Expected | Status | Owner |
|----|-------|-------------|---------|----------|--------|-------|
| R1 | Vendor delay | 30% | 10d | 3d | Active | Alice |
| R2 | Team leave | 10% | 20d | 2d | Mitigated | Bob |
| R3 | API issues | 40% | 5d | 2d | Active | Carol |
| R4 | Scope creep | 60% | 7d | 4.2d | Active | Alice |
```

### Regular Risk Reviews

**Weekly:**
- Review active risks
- Update probabilities based on new info
- Check mitigation progress

**Sprint Planning:**
- Identify new risks
- Re-assess existing risks
- Plan mitigation work

**Monthly:**
- Close obsolete risks
- Analyze materialized risks
- Report to stakeholders

## Advanced Risk Modeling

### Conditional Risks

Risks that depend on other events:

```python
if work_item_1_delayed:
    risk_cascade_probability = 0.6  # Higher
else:
    risk_cascade_probability = 0.2  # Lower
```

### Time-Dependent Risks

Risks whose probability changes over time:

```python
# New vendor: high risk early, decreases as relationship matures
month_1_probability = 0.5
month_6_probability = 0.2
month_12_probability = 0.1
```

### Cascading Risks

Risks that trigger other risks:

```
Risk A occurs (Vendor delays)
  → Triggers Risk B (Team idle time)
  → Triggers Risk C (Missed milestone)
  → Triggers Risk D (Revenue impact)
```

### Portfolio Risks

Risks affecting multiple projects:

```
Risk: Major infrastructure outage
Affects: All 5 projects simultaneously
Combined impact: Compounds across portfolio
```

## Best Practices

### Risk Identification

**Sources:**
- Pre-mortem exercises ("assume we failed, why?")
- Historical data from similar projects
- Team brainstorming sessions
- Stakeholder interviews
- Industry benchmarks

**Categories to Consider:**
- Technical risks (complexity, unknowns)
- Resource risks (availability, skills)
- External risks (vendors, market)
- Requirements risks (clarity, stability)
- Integration risks (dependencies, interfaces)

### Risk Quantification

**Use Data When Available:**
```
Historical: "3 of last 10 releases had vendor issues"
Probability: 3/10 = 30%
```

**Calibrate Expert Estimates:**
```
Expert: "Very likely" → Clarify: "80% likely?"
Expert: "Significant impact" → Quantify: "2 weeks?"
```

**Estimate Ranges:**
```
Instead of: "10 days impact"
Use: "5-10-20 days impact (min-likely-max)"
```

### Risk Communication

**To Executives:**
```
Top 3 Risks:
1. Vendor delay (30% × 10d = 3d expected) - Mitigation: TBD
2. Team leave (10% × 20d = 2d expected) - Mitigation: Documentation
3. Scope creep (60% × 7d = 4d expected) - Mitigation: Change control

Total risk exposure: 9 days
Recommendation: Add 2-week buffer to P50 forecast
```

**To Team:**
```
This sprint's risks:
- API integration complexity (40% chance of 2-day delay)
- What to do: Spike API early, escalate if issues found
```

## Examples

### Example 1: Vendor Risk

**Scenario:**
```
Risk: Third-party API instability
Probability: 30%
Impact: 8 days of delays and workarounds
Affected: Items 4, 5, 6 (payment integration)
```

**Analysis:**
```bash
POST /api/risks/analyze
{
  "risk": {
    "probability": 0.3,
    "impact_type": "delay_days",
    "impact_value": 8,
    "affected_work_item_ids": [4, 5, 6]
  },
  "num_simulations": 5000
}
```

**Result:**
```
Expected delay: 2.4 days (0.3 × 8)
P50 moves from Jan 20 to Jan 23
P90 moves from Jan 28 to Feb 3

Recommendation: Implement API health monitoring
```

### Example 2: Team Risk

**Scenario:**
```
Risk: Senior engineer leaving team
Probability: 15%
Impact: 
  - 5 days knowledge transfer
  - 20% velocity reduction for 2 weeks
Affected: All items (team-wide)
```

**Analysis:**
```
Expected impact: 
  0.15 × (5 + 0.20 × 10) = 1.05 days expected
  
But: High impact if occurs (15 days actual)
Action: Mitigate with documentation and pairing
```

### Example 3: Requirement Risk

**Scenario:**
```
Risk: Requirements may change mid-sprint
Probability: 50%
Impact: 1.3× estimate multiplier (30% more work)
Affected: Items 7, 8, 9 (new feature)
```

**Mitigation:**
```
Option A: Freeze requirements (reduce probability to 10%)
Option B: Use agile approach (reduce impact to 1.15×)
Option C: Do nothing (accept risk)

Analysis:
  Current expected: 0.5 × 1.3 = 15% overhead
  With A: 0.1 × 1.3 = 3% overhead
  With B: 0.5 × 1.15 = 7.5% overhead
  
Decision: Option B (agile) - best balance
```

## API Reference

### Create Risk

```bash
POST /api/risks
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "severity": "low|medium|high|critical",
  "probability": 0.4,
  "impact_type": "delay_days|velocity_multiplier|estimate_multiplier",
  "impact_value": 0.7,
  "affected_work_item_ids": [1, 2, 3],
  "mitigation_plan": "string",
  "owner": "string"
}
```

### Analyze Risk

```bash
POST /api/risks/analyze
Content-Type: application/json

{
  "risk_id": "risk-123",
  "num_simulations": 5000
}
```

### Update Risk Status

```bash
PATCH /api/risks/risk-123
Content-Type: application/json

{
  "status": "mitigated",
  "probability": 0.1,
  "notes": "Implemented caching layer"
}
```

### List Risks

```bash
GET /api/risks?severity=high&status=active
```

## Common Anti-Patterns

### 🚫 Ignoring Low-Probability High-Impact Risks

**Problem:**
```
"Only 5% chance, let's ignore it"
Impact if occurs: 60 days
Expected value: 3 days - still significant!
```

**Solution:** Track all risks above threshold (e.g., >1 day expected).

### 🚫 False Precision

**Problem:**
```
"Probability is exactly 23.7%"
Reality: We don't know that precisely
```

**Solution:** Use ranges and round to nearest 5-10%.

### 🚫 Risk Theater

**Problem:**
```
Create exhaustive risk register
Never update it
Doesn't affect decisions
```

**Solution:** Focus on top 5-10 risks, review weekly, drive actions.

### 🚫 Confusing Risk with Issue

**Problem:**
```
"Risk: The API is broken"
That's not a risk, it's an issue!
```

**Solution:** Risks are uncertain future events, issues are current problems.

## Summary

- Quantify risks with probability and impact
- Calculate expected value for prioritization
- Model risk effects in forecasts
- Develop mitigation plans for high-value risks
- Review and update regularly

Next: Learn about [Work Items & Dependencies](work-items.md)

