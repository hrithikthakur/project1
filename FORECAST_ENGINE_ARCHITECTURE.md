# Forecast Engine v1 - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Milestone   │  │   Decision   │  │   Scenario   │          │
│  │    Card      │  │   Approval   │  │  Explorer    │          │
│  │  (Forecast)  │  │  (Preview)   │  │  (What-if)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
└─────────┼─────────────────┼─────────────────┼────────────────────┘
          │                 │                 │
          │ GET /forecast   │ POST /mitigation│ POST /scenario
          │                 │ -preview        │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              REST API Layer                                 │ │
│  │   /api/forecast/                                            │ │
│  │   ├─ /{milestone_id}              (GET)                    │ │
│  │   ├─ /{milestone_id}/scenario     (POST)                   │ │
│  │   ├─ /{milestone_id}/mitigation-preview (POST)             │ │
│  │   └─ /{milestone_id}/summary      (GET)                    │ │
│  └─────────────────────┬──────────────────────────────────────┘ │
│                        │                                          │
│                        ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Core Forecast Engine                              │ │
│  │   app/engine/forecast.py                                    │ │
│  │                                                              │ │
│  │   ┌────────────────────────────────────────────────────┐   │ │
│  │   │  forecastMilestone(milestone_id, state, options)   │   │ │
│  │   │                                                      │   │ │
│  │   │  ONE function, all features:                        │   │ │
│  │   │  • Baseline forecasting                             │   │ │
│  │   │  • What-if scenarios                                │   │ │
│  │   │  • Mitigation preview                               │   │ │
│  │   └────────────────────────────────────────────────────┘   │ │
│  │                        │                                     │ │
│  │                        ▼                                     │ │
│  │   ┌────────────────────────────────────────────────────┐   │ │
│  │   │  Helper Functions                                   │   │ │
│  │   │  • _apply_scenario_perturbations()                  │   │ │
│  │   │  • _apply_hypothetical_mitigation()                 │   │ │
│  │   │  • _calculate_dependency_delays()                   │   │ │
│  │   │  • _calculate_risk_delays()                         │   │ │
│  │   │  • _calculate_scope_change_delays()                 │   │ │
│  │   │  • _calculate_uncertainty_buffer()                  │   │ │
│  │   └────────────────────────────────────────────────────┘   │ │
│  │                        │                                     │ │
│  │                        ▼                                     │ │
│  │   ┌────────────────────────────────────────────────────┐   │ │
│  │   │  ContributionTracker                                │   │ │
│  │   │  • Tracks causes during computation                 │   │ │
│  │   │  • Returns sorted breakdown                         │   │ │
│  │   └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                        │                                          │
│                        ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │           Data Layer                                        │ │
│  │   • Milestones                                              │ │
│  │   • Work Items                                              │ │
│  │   • Dependencies                                            │ │
│  │   • Risks                                                   │ │
│  │   • Decisions                                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Engine Architecture

### Single Forecast Function (Design Constraint)

```
┌────────────────────────────────────────────────────────────────┐
│                    forecastMilestone()                          │
│                                                                  │
│  Input:                                                          │
│  ├─ milestone_id: str                                           │
│  ├─ state_snapshot: Dict (milestones, work_items, ...)         │
│  └─ options?: ForecastOptions                                   │
│      └─ scenario?: Scenario                                     │
│      └─ hypothetical_mitigation?: HypotheticalMitigation       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: Apply Scenario Perturbations (if present)        │  │
│  │   • Modify state_snapshot based on scenario type         │  │
│  │   • Track scenario contributions                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 2: Apply Hypothetical Mitigation (if present)       │  │
│  │   • Simulate mitigation effect on risks                  │  │
│  │   • Track mitigation contributions                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 3: Calculate Dependency Delays                      │  │
│  │   • External dependencies (other milestones)             │  │
│  │   • Blocked work items                                   │  │
│  │   • Scenario-induced delays                              │  │
│  │   • Track each contribution                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 4: Calculate Risk Delays                            │  │
│  │   • OPEN: probability-weighted buffer                    │  │
│  │   • MATERIALISED: full impact                            │  │
│  │   • MITIGATING: reduced buffer                           │  │
│  │   • Track each contribution                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 5: Calculate Scope Change Delays                    │  │
│  │   • Recent CHANGE_SCOPE decisions                        │  │
│  │   • Track each contribution                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 6: Calculate P50 and P80                            │  │
│  │   • P50 = baseline + total_delay                         │  │
│  │   • P80 = P50 + uncertainty_buffer                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                     │
│  Output: ForecastResult                                          │
│  ├─ p50_date, p80_date                                          │
│  ├─ delta_p50_days, delta_p80_days                             │
│  ├─ confidence_level: "LOW"                                     │
│  ├─ contribution_breakdown: [{cause, days}, ...]               │
│  └─ explanation: str                                            │
└────────────────────────────────────────────────────────────────┘
```

## Feature Implementation

### Feature 1: Baseline Forecasting

```
┌─────────────────────────────────────────────┐
│  Call: forecastMilestone(milestone_id,      │
│                          state,             │
│                          options=None)      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  No options → baseline forecast             │
│  • Uses current state as-is                 │
│  • No perturbations                         │
│  • Returns P50/P80 with contributions       │
└─────────────────────────────────────────────┘
```

### Feature 2: What-If Scenario Forecasting

```
┌─────────────────────────────────────────────┐
│  Run 1: forecastMilestone(milestone_id,     │
│                           state,            │
│                           options=None)     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Baseline Result│
         └────────┬───────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Run 2: forecastMilestone(milestone_id,     │
│                           state,            │
│                           options={         │
│                             scenario: {     │
│                               type: ...,    │
│                               params: ...   │
│                             }               │
│                           })                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │Scenario Result │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  Compare Both  │
         │  Show Impact   │
         └────────────────┘
```

**Key:** Same function, different inputs → side-by-side comparison.

### Feature 3: Mitigation Impact Preview

```
┌─────────────────────────────────────────────┐
│  Run 1: forecastMilestone(milestone_id,     │
│                           state,            │
│                           options=None)     │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Current Result │
         └────────┬───────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Run 2: forecastMilestone(milestone_id,     │
│                           state,            │
│                           options={         │
│                             mitigation: {   │
│                               risk_id: ..., │
│                               reduction: ...│
│                             }               │
│                           })                │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ With Mitigation    │
         │ Result             │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Calculate          │
         │ Improvement        │
         │ → Recommendation   │
         └────────────────────┘
```

**Key:** Same function, hypothetical mitigation applied → show improvement.

## Contribution Tracking Flow

```
┌────────────────────────────────────────────────────────────┐
│               ContributionTracker                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  contributions: List[Contribution]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Methods:                                                    │
│  ├─ add(cause: str, days: float)                           │
│  ├─ get_sorted() → List[Dict]  # Sorted by impact          │
│  └─ total_delay() → float                                  │
└────────────────────────────────────────────────────────────┘
                            ▲
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────┴────┐       ┌─────┴─────┐      ┌────┴────┐
    │Scenario │       │Dependency │      │  Risk   │
    │Perturb  │       │  Delays   │      │ Delays  │
    └─────────┘       └───────────┘      └─────────┘
         │                  │                  │
         └─────────┬────────┴──────────────────┘
                   │
                   ▼
         All contributions tracked
         in single tracker instance
                   │
                   ▼
         ┌────────────────────┐
         │ get_sorted()       │
         │ → Ranked by impact │
         └────────────────────┘
```

**Key:** Single tracker instance passed through all calculations.

## Data Flow

### Input: State Snapshot

```
state_snapshot = {
    milestones: [
        {id, name, target_date, work_items, status}
    ],
    work_items: [
        {id, title, status, estimated_days, milestone_id, dependencies}
    ],
    dependencies: [
        {from_id, to_id}
    ],
    risks: [
        {id, title, status, probability, impact, milestone_id, affected_items}
    ],
    decisions: [
        {id, decision_type, status, effort_delta_days, ...}
    ]
}
```

### Output: Forecast Result

```
ForecastResult = {
    p50_date: datetime,
    p80_date: datetime,
    delta_p50_days: float,
    delta_p80_days: float,
    confidence_level: "LOW",
    contribution_breakdown: [
        {cause: "Materialised risk: Security review", days: 3.0},
        {cause: "External dependency: API Gateway", days: 2.0},
        {cause: "Recent scope change", days: 2.4},
        ...
    ],
    explanation: "Baseline forecast for 'Auth MVP': ..."
}
```

## API Integration

### REST Endpoints

```
GET  /api/forecast/{milestone_id}
     → Returns baseline forecast

POST /api/forecast/{milestone_id}/scenario
     Body: {scenario_type, params}
     → Returns baseline + scenario comparison

POST /api/forecast/{milestone_id}/mitigation-preview
     Body: {risk_id, expected_impact_reduction_days}
     → Returns current + with_mitigation + recommendation

GET  /api/forecast/{milestone_id}/summary
     → Returns quick summary (top 3 contributors)
```

### Integration with Decision-Risk Engine

```
┌────────────────────────────────────────────────────────────┐
│            Decision-Risk Engine                             │
│                                                              │
│  When evaluating MITIGATE_RISK decision:                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Get current forecast                               │  │
│  │    result = forecastMilestone(milestone_id, state)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Preview mitigation impact                          │  │
│  │    current, with_mitigation, improvement =            │  │
│  │      forecast_mitigation_impact(...)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 3. Make recommendation                                │  │
│  │    if improvement > 2 days:                           │  │
│  │      approve_decision()                               │  │
│  │    else:                                              │  │
│  │      reject_decision("Low ROI")                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Single Source of Truth

```
                ┌─────────────────────┐
                │ forecastMilestone() │
                │  (ONE FUNCTION)     │
                └──────────┬──────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐      ┌─────────┐
   │Baseline │       │Scenario │      │Mitigation│
   │Forecast │       │Forecast │      │ Preview │
   └─────────┘       └─────────┘      └─────────┘

All features use the same function
→ Guaranteed consistency
→ No duplicate logic
→ Single point of maintenance
```

### 2. Track During, Not After

```
❌ BAD: Post-hoc inference
┌──────────────────────────────────┐
│ 1. Calculate total delay         │
│    total_delay = 12 days         │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ 2. Try to infer causes (fragile) │
│    causes = guess_contributors() │
└──────────────────────────────────┘


✅ GOOD: Track during computation
┌──────────────────────────────────┐
│ tracker = ContributionTracker()  │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ delay = calculate_risk_delay()   │
│ tracker.add("Risk X", delay)     │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ delay = calculate_dep_delay()    │
│ tracker.add("Dep Y", delay)      │
└────────────┬─────────────────────┘
             ▼
┌──────────────────────────────────┐
│ contributions = tracker.get()    │
│ → Accurate, complete             │
└──────────────────────────────────┘
```

### 3. Immutable State

```
Original State
      │
      ▼
┌───────────────┐
│ state_copy =  │
│ dict(state)   │
└───────┬───────┘
        │
        ▼
┌─────────────────────────┐
│ Apply perturbations     │
│ (modify copy only)      │
└───────┬─────────────────┘
        │
        ▼
┌─────────────────────────┐
│ Run forecast on copy    │
└─────────────────────────┘

Original state never mutated
→ Pure function
→ No side effects
→ Safe to run multiple scenarios
```

## Performance Characteristics

### Time Complexity

```
O(W + D + R)

Where:
  W = number of work items
  D = number of dependencies
  R = number of risks

Typical: 100 work items, 50 dependencies, 20 risks
→ ~1-2ms execution time
```

### Space Complexity

```
O(W + D + R + C)

Where:
  C = number of contributions tracked

Typical: ~50 contributions
→ < 1KB memory
```

### Scalability

```
Current: < 2ms for typical project
Scale:   < 10ms for large project (1000+ items)

Fast enough for:
  ✓ Real-time UI updates
  ✓ Multiple scenario comparisons
  ✓ Frequent recalculation
```

## Error Handling

```
┌────────────────────────────────────────┐
│ forecastMilestone(milestone_id, state) │
└─────────────────┬──────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Validate inputs│
         └────────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
    Valid?             Invalid?
         │                 │
         ▼                 ▼
┌────────────────┐  ┌──────────────────┐
│ Process        │  │ Raise ValueError │
│ forecast       │  │ with clear msg   │
└────────┬───────┘  └──────────────────┘
         │
         ▼
┌────────────────┐
│ Return result  │
└────────────────┘
```

**Error types:**
- `ValueError`: Milestone not found, invalid scenario type
- `KeyError`: Missing required fields in state
- Graceful degradation: Missing optional fields → use defaults

## Testing Strategy

### Unit Tests (TODO)

```
test_forecast.py
├── test_baseline_forecast()
├── test_dependency_delays()
├── test_risk_delays()
├── test_scope_change_delays()
├── test_scenario_dependency_delay()
├── test_scenario_scope_change()
├── test_scenario_capacity_change()
├── test_mitigation_preview()
└── test_contribution_tracking()
```

### Integration Tests (TODO)

```
test_forecast_api.py
├── test_get_baseline_forecast()
├── test_post_scenario_forecast()
├── test_post_mitigation_preview()
└── test_get_summary()
```

### Manual Testing (Current)

```bash
# Run examples
python forecast_examples.py

# Test API
curl localhost:8000/api/forecast/milestone_001
```

## Future Enhancements (Labeled TODOs)

### Phase 2: Historical Calibration

```
┌────────────────────────────────────────┐
│ Collect actual vs. predicted data      │
└─────────────────┬──────────────────────┘
                  ▼
┌────────────────────────────────────────┐
│ Calibrate risk buffers                 │
│ • OPEN risks: actual impact %          │
│ • MATERIALISED: actual delay           │
└─────────────────┬──────────────────────┘
                  ▼
┌────────────────────────────────────────┐
│ Adjust uncertainty buffer              │
│ • Based on historical variance         │
└────────────────────────────────────────┘
```

### Phase 3: Critical Path Analysis

```
┌────────────────────────────────────────┐
│ Build dependency graph                 │
└─────────────────┬──────────────────────┘
                  ▼
┌────────────────────────────────────────┐
│ Find critical path (longest path)      │
└─────────────────┬──────────────────────┘
                  ▼
┌────────────────────────────────────────┐
│ Focus delays on critical path items    │
└────────────────────────────────────────┘
```

### Phase 4: Monte Carlo Mode (Optional)

```
┌────────────────────────────────────────┐
│ For each iteration (1000x):            │
│  • Sample from risk probability dist   │
│  • Sample from effort estimate dist    │
│  • Run forecast                        │
└─────────────────┬──────────────────────┘
                  ▼
┌────────────────────────────────────────┐
│ Aggregate results                      │
│  • P50, P80, P95 from distribution     │
│  • Confidence intervals                │
└────────────────────────────────────────┘
```

---

**This architecture is production-ready now** and can be enhanced incrementally as you collect data and build trust.

