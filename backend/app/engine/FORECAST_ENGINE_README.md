# Forecast Engine v1

> **A single, unified forecast engine that powers decision-making through explainability and intervention.**

## Overview

The Forecast Engine v1 is designed as a **decision surface**, not a predictor. It enables teams to:

1. **Understand** why dates are slipping (contribution breakdown)
2. **Explore** what-if scenarios before committing (scenario forecasting)
3. **Evaluate** mitigation impact before approving decisions (mitigation preview)

### Core Design Principle

**ONE forecast function. All advanced features via multiple runs with modified inputs.**

- No duplicate logic
- No separate engines
- Pure functions (no side effects)
- Simple, explainable heuristics

## Features

### 1. Baseline Forecasting

Compute P50 and P80 dates with full causal attribution:

```python
from forecast import forecastMilestone

result = forecastMilestone("milestone_001", state_snapshot)

print(f"P50: {result.p50_date}")
print(f"P80: {result.p80_date}")
print(f"Contributors: {result.contribution_breakdown}")
```

**Output:**
```
P50: 2026-02-12
P80: 2026-02-19
Contributors: [
  {"cause": "Materialised risk: Security review", "days": 3.0},
  {"cause": "External dependency: API Gateway", "days": 2.0},
  {"cause": "Recent scope change", "days": 2.4},
  ...
]
```

### 2. What-If Scenario Forecasting

Run side-by-side comparisons to see impact before committing:

```python
from forecast import forecast_with_scenario, ScenarioType

baseline, scenario = forecast_with_scenario(
    "milestone_001",
    state_snapshot,
    ScenarioType.DEPENDENCY_DELAY,
    {"work_item_id": "wi_external", "delay_days": 5}
)

impact = scenario.delta_p80_days - baseline.delta_p80_days
print(f"Impact: P80 slips by {impact} days")
```

**Supported Scenarios:**

| Scenario Type | Params | Use Case |
|--------------|--------|----------|
| `DEPENDENCY_DELAY` | `work_item_id`, `delay_days` | External dependency slips |
| `SCOPE_CHANGE` | `effort_delta_days` | Add/remove scope |
| `CAPACITY_CHANGE` | `capacity_multiplier` | Team capacity changes |

### 3. Mitigation Impact Preview

See the benefit of a mitigation **before** approving the decision:

```python
from forecast import forecast_mitigation_impact

current, with_mitigation, improvement = forecast_mitigation_impact(
    "milestone_001",
    state_snapshot,
    "risk_001",
    expected_impact_reduction_days=4.0
)

print(f"If mitigation succeeds, P80 improves by {improvement} days")
```

**Decision Surface:**
- If improvement > 3 days: ✅ Strong ROI, proceed with mitigation
- If improvement 1-3 days: ⚠️ Moderate ROI, evaluate cost/benefit
- If improvement < 1 day: ❌ Low ROI, consider accepting risk

## How It Works

### Forecast Logic

```
P50 = baseline_date + total_delay
P80 = P50 + uncertainty_buffer

total_delay = dependency_delays + risk_delays + scope_delays
```

### Delay Sources

1. **Dependency Delays**
   - External dependencies (work items in other milestones)
   - Blocked work items
   - Scenario-induced delays

2. **Risk Delays** (status-based)
   - `OPEN`: probability-weighted buffer (precautionary)
   - `MATERIALISED`: full impact (hard delay)
   - `MITIGATING`: reduced buffer (30% of full impact)
   - `ACCEPTED`/`CLOSED`: no delay

3. **Scope Change Delays**
   - Recent approved `CHANGE_SCOPE` decisions
   - 80% of added effort → delay (heuristic)

4. **Uncertainty Buffer** (P80)
   - Based on open/mitigating risk count
   - General uncertainty allowance

### Contribution Tracking

Contributions are tracked **during computation**, not inferred post-hoc:

```python
tracker = ContributionTracker()
tracker.add("Materialised risk: Security review", 3.0)
tracker.add("External dependency: API Gateway", 2.0)

# Get sorted by impact
contributions = tracker.get_sorted()
```

## API Reference

### Core Function

```python
def forecastMilestone(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    options: Optional[ForecastOptions] = None
) -> ForecastResult
```

**Parameters:**
- `milestone_id`: ID of milestone to forecast
- `state_snapshot`: Complete state (milestones, work_items, dependencies, risks, decisions)
- `options`: Optional scenario or mitigation parameters

**Returns:**
```python
ForecastResult(
    p50_date: datetime,
    p80_date: datetime,
    delta_p50_days: float,
    delta_p80_days: float,
    confidence_level: str,  # "LOW" - honest about accuracy
    contribution_breakdown: List[Dict],
    explanation: str
)
```

### Advanced Functions

```python
# Scenario forecasting
def forecast_with_scenario(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    scenario_type: ScenarioType,
    scenario_params: Dict[str, Any]
) -> Tuple[ForecastResult, ForecastResult]  # (baseline, scenario)

# Mitigation impact preview
def forecast_mitigation_impact(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    risk_id: str,
    expected_impact_reduction_days: Optional[float] = None
) -> Tuple[ForecastResult, ForecastResult, float]  # (current, with_mitigation, improvement)

# Forecast change explanation
def explain_forecast_change(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    previous_result: ForecastResult,
    current_result: ForecastResult
) -> str
```

## Usage Examples

### Example 1: Decision Flow with Forecast

```python
# 1. Baseline forecast
baseline = forecastMilestone("milestone_001", state)
print(f"Current P80: {baseline.p80_date} ({baseline.delta_p80_days:+d} days)")

# 2. Explore mitigation option
current, with_mitigation, improvement = forecast_mitigation_impact(
    "milestone_001", state, "risk_security_review", 3.0
)

if improvement > 2:
    print(f"✅ Mitigation recommended (improves by {improvement:.0f} days)")
    # Approve MITIGATE_RISK decision
else:
    print(f"❌ Mitigation has low impact, consider accepting risk")

# 3. After decision, show new forecast
updated_state = apply_decision(state, decision)
new_forecast = forecastMilestone("milestone_001", updated_state)
print(f"New P80: {new_forecast.p80_date}")
```

### Example 2: Stakeholder Communication

```python
result = forecastMilestone("milestone_001", state)

print("Forecast Summary:")
print(f"  Target: {milestone['target_date']}")
print(f"  P50: {result.p50_date} ({result.delta_p50_days:+d} days)")
print(f"  P80: {result.p80_date} ({result.delta_p80_days:+d} days)")
print()
print("Why is it delayed?")
for contrib in result.contribution_breakdown[:3]:
    print(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
```

### Example 3: Multi-Scenario Comparison

```python
# Compare multiple futures
scenarios = {
    "Current": forecastMilestone("milestone_001", state),
    "Add scope": forecast_with_scenario(..., SCOPE_CHANGE, ...)[1],
    "Reduce capacity": forecast_with_scenario(..., CAPACITY_CHANGE, ...)[1],
    "Mitigate risk": forecast_mitigation_impact(...)[1]
}

print("Scenario Comparison:")
for name, result in scenarios.items():
    print(f"  {name}: {result.p80_date} ({result.delta_p80_days:+d} days)")
```

## State Snapshot Format

The forecast engine expects a state dictionary with:

```python
state_snapshot = {
    "milestones": [
        {
            "id": str,
            "name": str,
            "target_date": datetime | str (ISO),
            "work_items": List[str],
            "status": str
        }
    ],
    "work_items": [
        {
            "id": str,
            "title": str,
            "status": "not_started" | "in_progress" | "blocked" | "completed",
            "estimated_days": float,
            "milestone_id": str,
            "dependencies": List[str]
        }
    ],
    "dependencies": [
        {
            "from_id": str,  # dependent work item
            "to_id": str     # dependency
        }
    ],
    "risks": [
        {
            "id": str,
            "title": str,
            "status": "open" | "materialised" | "mitigating" | "accepted" | "closed",
            "probability": float,  # 0.0 to 1.0
            "impact": {
                "impact_days": float | None,
                "delay_days": float | None
            },
            "milestone_id": str,
            "affected_items": List[str]
        }
    ],
    "decisions": [
        {
            "id": str,
            "decision_type": "change_scope" | ...,
            "status": "proposed" | "approved" | "superseded",
            "effort_delta_days": float | None,
            ...
        }
    ]
}
```

## Limitations & Future Improvements

### Current Limitations (Acknowledged)

1. **Accuracy**: Simple heuristics, no historical calibration
2. **Confidence**: Always returns "LOW" (honest about uncertainty)
3. **Dependency modeling**: Max ripple only, no critical path
4. **Risk quantification**: Fixed buffers, no distributions

### Labeled TODOs for v2+

```python
# TODO: Calibrate risk buffers from historical data
# TODO: Add work item complexity multipliers
# TODO: Incorporate team velocity trends
# TODO: Critical path analysis for dependency chains
# TODO: Monte Carlo simulation mode (optional)
# TODO: Confidence intervals based on historical variance
# TODO: Integration with actual progress tracking
```

### What This Engine Is NOT

- ❌ Not a perfect predictor (impossible)
- ❌ Not a Monte Carlo simulator (overkill for MVP)
- ❌ Not a CPM/PERT engine (too academic)
- ❌ Not ML-based (insufficient data)

### What This Engine IS

- ✅ A **decision surface** for exploring interventions
- ✅ A **causal explainer** for understanding delays
- ✅ A **fast feedback** mechanism for course correction
- ✅ **Simple enough** to understand and trust

## Design Philosophy

### Why One Function?

Multiple functions = duplicate logic = drift over time.

One function ensures:
- Consistency across baseline and scenarios
- Single source of truth for forecast logic
- Easy to test and maintain
- Clear mental model

### Why Track Contributions During Computation?

Post-hoc inference is fragile and inaccurate.

Tracking during computation ensures:
- Accurate attribution
- No lost information
- Debuggable (can trace each contribution)
- Composable (scenarios add their own contributions)

### Why Simple Heuristics?

Complex models require:
- More data than we have
- More time than we have
- More trust than they deserve

Simple heuristics:
- Work with sparse data
- Run instantly
- Fail visibly (not silently)
- Can be improved incrementally

### Why Low Confidence?

Honesty builds trust.

"LOW" confidence signals:
- Don't bet the company on this
- Use for direction, not precision
- Expect variance
- Review frequently

## Integration Guide

### With FastAPI Backend

```python
# In backend/app/api/forecast.py
from app.engine.forecast import forecastMilestone, forecast_with_scenario
from app.data.loader import load_mock_world

@app.get("/api/forecast/{milestone_id}")
def get_forecast(milestone_id: str):
    state = load_mock_world()
    result = forecastMilestone(milestone_id, state)
    return {
        "p50_date": result.p50_date.isoformat(),
        "p80_date": result.p80_date.isoformat(),
        "delta_p50_days": result.delta_p50_days,
        "delta_p80_days": result.delta_p80_days,
        "confidence": result.confidence_level,
        "contributions": result.contribution_breakdown,
        "explanation": result.explanation
    }

@app.post("/api/forecast/{milestone_id}/scenario")
def get_scenario_forecast(milestone_id: str, scenario: ScenarioRequest):
    state = load_mock_world()
    baseline, scenario_result = forecast_with_scenario(
        milestone_id, state,
        ScenarioType(scenario.type),
        scenario.params
    )
    return {
        "baseline": serialize_result(baseline),
        "scenario": serialize_result(scenario_result),
        "impact_days": scenario_result.delta_p80_days - baseline.delta_p80_days
    }
```

### With Decision-Risk Engine

```python
# In decision risk evaluation
from app.engine.forecast import forecast_mitigation_impact

def evaluate_mitigate_risk_decision(decision, state):
    current, with_mitigation, improvement = forecast_mitigation_impact(
        decision.milestone_id,
        state,
        decision.risk_id,
        decision.expected_impact_days_delta
    )
    
    return {
        "forecast_improvement_days": improvement,
        "recommendation": "approve" if improvement > 2 else "reject",
        "reasoning": f"Mitigation improves P80 by {improvement:.0f} days"
    }
```

## Testing

Run examples:
```bash
cd backend/app/engine
python3 forecast_examples.py
```

Run unit tests (TODO):
```bash
pytest test_forecast.py
```

## Changelog

### v1.0 (Current)
- ✅ Single forecast function
- ✅ Baseline forecasting with contribution breakdown
- ✅ What-if scenario forecasting (3 types)
- ✅ Mitigation impact preview
- ✅ Comprehensive examples
- ✅ Documentation

### Roadmap
- [ ] Unit tests
- [ ] API integration
- [ ] Frontend visualization
- [ ] Historical calibration
- [ ] Confidence intervals
- [ ] Critical path analysis

---

**Built for:** Project delivery teams who need to make fast, informed decisions

**Not built for:** Academic rigor or perfect prediction

**Philosophy:** Clarity > Cleverness. Speed > Accuracy. Actionability > Precision.

