# Forecast Engine v1 - Quickstart Guide

> Get started with the Forecast Engine in 5 minutes

## What You Just Got

A **production-ready forecast engine** that:

✅ **One function, three powers:**
- Baseline forecasting with causal attribution
- What-if scenario exploration
- Mitigation impact preview

✅ **Clean architecture:**
- Single forecast function (no duplicate logic)
- Pure functions (no side effects)
- Tracks contributions during computation (not post-hoc)

✅ **Decision-oriented:**
- Fast feedback (milliseconds)
- Explainable (shows why dates slip)
- Actionable (preview interventions)

## Quick Start

### 1. Run the Examples

```bash
cd backend/app/engine
python3 forecast_examples.py
```

You'll see:
- Baseline forecast with contribution breakdown
- 3 types of what-if scenarios
- Mitigation impact preview
- Multi-scenario comparison

### 2. Use in Code

```python
from app.engine.forecast import forecastMilestone

# Get your state snapshot
state = {
    "milestones": [...],
    "work_items": [...],
    "dependencies": [...],
    "risks": [...],
    "decisions": [...]
}

# Run forecast
result = forecastMilestone("milestone_001", state)

# Use results
print(f"P50: {result.p50_date}")
print(f"P80: {result.p80_date}")
print(f"Delay: {result.delta_p80_days} days from target")

# See why it's delayed
for contrib in result.contribution_breakdown[:3]:
    print(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
```

### 3. Test the API

Start the backend:
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

Try the endpoints:

**Baseline forecast:**
```bash
curl http://localhost:8000/api/forecast/milestone_001
```

**What-if scenario:**
```bash
curl -X POST http://localhost:8000/api/forecast/milestone_001/scenario \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_type": "dependency_delay",
    "params": {"work_item_id": "wi_external", "delay_days": 5}
  }'
```

**Mitigation preview:**
```bash
curl -X POST http://localhost:8000/api/forecast/milestone_001/mitigation-preview \
  -H "Content-Type: application/json" \
  -d '{
    "risk_id": "risk_001",
    "expected_impact_reduction_days": 4
  }'
```

**Quick summary:**
```bash
curl http://localhost:8000/api/forecast/milestone_001/summary
```

## File Structure

```
backend/app/engine/
├── forecast.py                    # Core forecast engine (single module)
├── forecast_examples.py           # Comprehensive examples (runnable)
└── FORECAST_ENGINE_README.md      # Full documentation

backend/app/api/
└── forecast.py                    # REST API endpoints

FORECAST_ENGINE_QUICKSTART.md     # This file
```

## Core Concepts (60 seconds)

### 1. One Forecast Function

```python
forecastMilestone(milestone_id, state, options?) → ForecastResult
```

All features use this ONE function. Advanced features = run multiple times with modified inputs.

### 2. Contribution Breakdown

Every forecast returns **why** dates changed:

```python
result.contribution_breakdown = [
    {"cause": "Materialised risk: Security review", "days": 3.0},
    {"cause": "External dependency: API Gateway", "days": 2.0},
    {"cause": "Recent scope change", "days": 2.4},
    ...
]
```

Tracked **during computation**, not inferred post-hoc.

### 3. Three Advanced Features

**Feature 1: What-if scenarios**
```python
baseline, scenario = forecast_with_scenario(
    milestone_id, state,
    ScenarioType.DEPENDENCY_DELAY,
    {"work_item_id": "wi_001", "delay_days": 5}
)

impact = scenario.delta_p80_days - baseline.delta_p80_days
print(f"Scenario adds {impact} days")
```

**Feature 2: Mitigation preview**
```python
current, with_mitigation, improvement = forecast_mitigation_impact(
    milestone_id, state, risk_id, expected_reduction_days
)

print(f"Mitigation improves P80 by {improvement} days")
```

**Feature 3: Multi-scenario comparison**
```python
scenarios = {
    "Baseline": forecastMilestone(milestone_id, state),
    "Add scope": forecast_with_scenario(...)[1],
    "Mitigate risk": forecast_mitigation_impact(...)[1]
}

# Compare all P80 dates side-by-side
```

## Example Output

```
Baseline forecast for 'Authentication MVP':
  Baseline target: 2026-02-03
  Forecast P50: 2026-02-12 (+9 days)
  Forecast P80: 2026-02-19 (+16 days)

Top contributors:
  • Uncertainty buffer (P80): +7.0 days
  • Materialised risk: Security review delay: +3.0 days
  • Recent scope change: Added 2FA requirement: +2.4 days
  • External dependency: API Gateway setup: +2.0 days
  • Open risk: OAuth API instability: +1.0 days

Confidence: LOW (simple heuristics, no historical data)
```

## Integration Patterns

### Pattern 1: Decision Evaluation

```python
# Before approving a MITIGATE_RISK decision
current, with_mitigation, improvement = forecast_mitigation_impact(
    milestone_id, state, decision.risk_id, decision.expected_impact_days_delta
)

if improvement > 2:
    # Mitigation has significant impact → approve
    approve_decision(decision)
else:
    # Low impact → suggest ACCEPT_RISK instead
    reject_decision(decision, reason=f"Low ROI: only {improvement:.0f} days improvement")
```

### Pattern 2: Stakeholder Communication

```python
result = forecastMilestone(milestone_id, state)

send_email(
    to=stakeholders,
    subject=f"Milestone forecast: {result.p80_date.strftime('%Y-%m-%d')}",
    body=f"""
    Our latest forecast for {milestone.name}:
    
    Target: {milestone.target_date}
    P80 (80% confidence): {result.p80_date} ({result.delta_p80_days:+d} days)
    
    Main contributors to delay:
    {format_top_contributors(result.contribution_breakdown)}
    
    Recommended actions:
    {suggest_actions(result)}
    """
)
```

### Pattern 3: Continuous Monitoring

```python
# Store forecast in DB
previous_forecast = get_last_forecast(milestone_id)
current_forecast = forecastMilestone(milestone_id, get_current_state())

# Alert if forecast slips significantly
drift = current_forecast.delta_p80_days - previous_forecast.delta_p80_days
if drift > 3:
    alert_team(f"⚠️ Forecast slipped by {drift} days since yesterday")
    
save_forecast(milestone_id, current_forecast)
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/forecast/{milestone_id}` | GET | Baseline forecast |
| `/api/forecast/{milestone_id}/scenario` | POST | What-if scenario |
| `/api/forecast/{milestone_id}/mitigation-preview` | POST | Mitigation preview |
| `/api/forecast/{milestone_id}/summary` | GET | Quick summary |

See full API docs: http://localhost:8000/docs (when server is running)

## Common Use Cases

### Use Case 1: Daily Standup

"Why are we delayed?"

```python
result = forecastMilestone(milestone_id, state)
print("Top 3 reasons:")
for contrib in result.contribution_breakdown[:3]:
    print(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
```

### Use Case 2: Prioritization

"Should we add this feature or fix this risk?"

```python
# Option A: Add feature (8 days of work)
with_feature = forecast_with_scenario(
    milestone_id, state,
    ScenarioType.SCOPE_CHANGE,
    {"effort_delta_days": 8}
)[1]

# Option B: Mitigate risk
with_mitigation = forecast_mitigation_impact(
    milestone_id, state, risk_id, 4
)[1]

# Compare P80 dates
print(f"Add feature: {with_feature.p80_date}")
print(f"Fix risk: {with_mitigation.p80_date}")
```

### Use Case 3: Capacity Planning

"What if we lose a team member?"

```python
baseline, with_reduced_capacity = forecast_with_scenario(
    milestone_id, state,
    ScenarioType.CAPACITY_CHANGE,
    {"capacity_multiplier": 0.8}  # 20% reduction
)

impact = with_reduced_capacity.delta_p80_days - baseline.delta_p80_days
print(f"Losing 1 person delays by {impact:.0f} days")
```

## Limitations (Honest)

**This engine is NOT:**
- ❌ A perfect predictor (no such thing)
- ❌ A Monte Carlo simulator (overkill for v1)
- ❌ ML-powered (insufficient data)
- ❌ CPM/PERT compliant (too academic)

**This engine IS:**
- ✅ Fast (milliseconds)
- ✅ Explainable (shows causality)
- ✅ Decision-oriented (preview interventions)
- ✅ Simple (trust what you understand)

**Confidence level: LOW** (by design)
- Use for direction, not precision
- Expect ±20% variance
- Review frequently
- Improve incrementally

## TODOs for v2 (Labeled in Code)

```python
# TODO: Calibrate risk buffers from historical data
# TODO: Add work item complexity multipliers  
# TODO: Incorporate team velocity trends
# TODO: Critical path analysis for dependencies
# TODO: Monte Carlo mode (optional, for specific cases)
# TODO: Historical variance for confidence intervals
```

These are **labeled** in the code but not blocking for v1.

## Next Steps

1. **Run the examples** to see all features in action
2. **Integrate with your decision flow** (see Pattern 1 above)
3. **Add to your UI** using the REST API
4. **Calibrate over time** as you collect historical data

## Need Help?

**Read the docs:**
- Full documentation: `backend/app/engine/FORECAST_ENGINE_README.md`
- Code examples: `backend/app/engine/forecast_examples.py`
- API reference: http://localhost:8000/docs

**Understand the philosophy:**
- One function (consistency)
- Track during computation (accuracy)
- Simple heuristics (debuggable)
- Low confidence (honesty)

## Key Design Decisions

### Why not Monte Carlo?

Monte Carlo requires:
- Probability distributions for every work item (don't have)
- 1000s of simulation runs (slow)
- Complex to explain (trust issues)

Simple heuristics provide:
- 80% of the value
- 1% of the complexity
- Instant results
- Clear causality

You can add Monte Carlo later as an **optional** mode.

### Why "LOW" confidence?

Honesty builds trust.

High confidence requires:
- Historical calibration data
- Stable processes
- Accurate estimates

We don't have those yet. Saying "LOW" signals:
- Use this for direction
- Don't bet the company on it
- Expect to update frequently
- We're honest about limitations

### Why track contributions during computation?

Post-hoc inference:
```python
# BAD: Infer contributions after the fact
total_delay = calculate_delay()  # Black box
contributions = guess_what_caused_it(total_delay)  # Fragile!
```

During computation:
```python
# GOOD: Track as you go
tracker = ContributionTracker()
delay = calculate_dependency_delay()
tracker.add("External dependency", delay)  # Accurate!
```

Tracking during computation:
- ✅ Accurate (no guessing)
- ✅ Debuggable (can trace each addition)
- ✅ Composable (scenarios add their contributions)

---

**You're ready to go!** Run the examples, test the API, integrate with your system.

**Philosophy:** This is a **decision surface**, not a predictor. The goal is **leverage**, not accuracy.

