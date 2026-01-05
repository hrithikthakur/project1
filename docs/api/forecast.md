# Forecast API

Generate Monte Carlo forecasts for work item completion dates.

## Endpoints

### POST /api/forecast

Generate a forecast using Monte Carlo simulation.

**Request:**
```bash
POST /api/forecast
Content-Type: application/json

{
  "num_simulations": 5000,
  "decisions": [],
  "risks": [],
  "filter_work_item_ids": null,
  "filter_milestone_id": null,
  "random_seed": null
}
```

**Request Body Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `num_simulations` | integer | No | 1000 | Number of Monte Carlo iterations |
| `decisions` | array | No | [] | List of decision IDs or objects to include |
| `risks` | array | No | [] | List of risk IDs or objects to include |
| `filter_work_item_ids` | array | No | null | Only forecast these work items |
| `filter_milestone_id` | integer | No | null | Only forecast work items in this milestone |
| `random_seed` | integer | No | null | Seed for reproducible results |

**Response:**
```json
{
  "work_items": [
    {
      "id": 1,
      "title": "User Login API",
      "status": "not_started",
      "assigned_actor_id": 101,
      "percentiles": {
        "P10": "2026-01-12",
        "P50": "2026-01-18",
        "P90": "2026-01-27",
        "P99": "2026-02-03"
      },
      "duration_days": {
        "P10": 3.2,
        "P50": 5.1,
        "P90": 8.4,
        "P99": 11.2
      },
      "confidence_interval_95": {
        "lower": "2026-01-13",
        "upper": "2026-02-01"
      }
    }
  ],
  "milestones": [
    {
      "id": 1,
      "title": "MVP Launch",
      "target_date": "2026-02-01",
      "percentiles": {
        "P10": "2026-01-28",
        "P50": "2026-02-05",
        "P90": "2026-02-15",
        "P99": "2026-02-20"
      },
      "probability_on_time": 0.35,
      "expected_delay_days": 4.2
    }
  ],
  "simulation_metadata": {
    "num_simulations": 5000,
    "execution_time_ms": 1234,
    "decisions_applied": [],
    "risks_applied": [],
    "random_seed": 42
  }
}
```

**Status Codes:**
- `200 OK`: Forecast generated successfully
- `400 Bad Request`: Invalid parameters
- `422 Unprocessable Entity`: Validation error

**Example:**
```bash
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "num_simulations": 5000,
    "decisions": [],
    "risks": []
  }'
```

## Forecast with Decisions

Include decisions in your forecast to model what-if scenarios.

**Request:**
```json
{
  "num_simulations": 5000,
  "decisions": [
    {
      "id": "decision-1",
      "type": "hire",
      "target_work_item_id": 1,
      "effect_type": "velocity_change",
      "effect_value": 1.3,
      "rampup_days": 14,
      "description": "Hire senior engineer"
    },
    {
      "id": "decision-2",
      "type": "delay",
      "target_work_item_id": 5,
      "effect_type": "delay_days",
      "effect_value": 7,
      "description": "Wait for vendor API"
    }
  ]
}
```

**Response includes decision impact:**
```json
{
  "work_items": [...],
  "decision_analysis": {
    "baseline_P50": "2026-02-10",
    "with_decisions_P50": "2026-02-08",
    "net_impact_days": -2,
    "decisions_applied": [
      {
        "id": "decision-1",
        "impact_days": -7,
        "affected_items": [1, 2, 3]
      },
      {
        "id": "decision-2",
        "impact_days": 5,
        "affected_items": [5]
      }
    ]
  }
}
```

## Forecast with Risks

Include risks to model uncertainty.

**Request:**
```json
{
  "num_simulations": 10000,
  "risks": [
    {
      "id": "risk-1",
      "title": "API Instability",
      "probability": 0.3,
      "impact_type": "velocity_multiplier",
      "impact_value": 0.7,
      "affected_work_item_ids": [4, 5, 6]
    },
    {
      "id": "risk-2",
      "title": "Team Member Leave",
      "probability": 0.1,
      "impact_type": "delay_days",
      "impact_value": 10,
      "affected_work_item_ids": [1, 2, 3, 4, 5, 6]
    }
  ]
}
```

**Response includes risk analysis:**
```json
{
  "work_items": [...],
  "risk_analysis": {
    "expected_delay_days": 5.1,
    "risk_adjusted_P50": "2026-02-15",
    "risks_applied": [
      {
        "id": "risk-1",
        "expected_value": 2.1,
        "materialized_in_pct_of_simulations": 0.31
      },
      {
        "id": "risk-2",
        "expected_value": 1.0,
        "materialized_in_pct_of_simulations": 0.09
      }
    ]
  }
}
```

## Filtered Forecasts

### By Work Items

Forecast specific work items only:

```bash
POST /api/forecast
{
  "num_simulations": 5000,
  "filter_work_item_ids": [1, 2, 3]
}
```

### By Milestone

Forecast all items in a milestone:

```bash
POST /api/forecast
{
  "num_simulations": 5000,
  "filter_milestone_id": 1
}
```

## Reproducible Forecasts

Use a random seed for reproducibility:

```bash
POST /api/forecast
{
  "num_simulations": 5000,
  "random_seed": 42
}
```

Running this request multiple times will return identical results.

## Advanced Options

### High-Precision Forecast

For critical decisions, use more simulations:

```bash
POST /api/forecast
{
  "num_simulations": 50000
}
```

**Trade-off:** Higher precision but slower (5-10 seconds).

### Quick Forecast

For rapid iteration:

```bash
POST /api/forecast
{
  "num_simulations": 1000
}
```

**Trade-off:** Faster (<1 second) but noisier results.

## Response Fields

### Work Item Forecast

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Work item ID |
| `title` | string | Work item title |
| `status` | string | Current status |
| `percentiles` | object | Completion date percentiles |
| `duration_days` | object | Duration percentiles |
| `confidence_interval_95` | object | 95% confidence interval |

### Milestone Forecast

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Milestone ID |
| `title` | string | Milestone title |
| `target_date` | string | Target completion date |
| `percentiles` | object | Completion date percentiles |
| `probability_on_time` | float | Probability of hitting target |
| `expected_delay_days` | float | Expected delay from target |

### Simulation Metadata

| Field | Type | Description |
|-------|------|-------------|
| `num_simulations` | integer | Simulations executed |
| `execution_time_ms` | integer | Time taken in milliseconds |
| `decisions_applied` | array | List of decision IDs |
| `risks_applied` | array | List of risk IDs |
| `random_seed` | integer | Seed used (if specified) |

## Error Handling

### Circular Dependencies

**Error:**
```json
{
  "detail": "Circular dependency detected: 1 → 2 → 3 → 1",
  "cycle": [1, 2, 3, 1]
}
```

**Solution:** Remove or modify dependencies to break the cycle.

### Invalid Work Item State

**Error:**
```json
{
  "detail": "Work item 5 has invalid estimate: min > max",
  "work_item_id": 5
}
```

**Solution:** Correct the work item estimates.

### Too Many Simulations

**Error:**
```json
{
  "detail": "num_simulations exceeds maximum of 100000",
  "max_allowed": 100000
}
```

**Solution:** Reduce number of simulations.

## Performance

### Typical Execution Times

| Simulations | Work Items | Time |
|-------------|------------|------|
| 1,000 | 10 | 0.2s |
| 1,000 | 100 | 0.8s |
| 5,000 | 10 | 0.5s |
| 5,000 | 100 | 2.5s |
| 10,000 | 100 | 4.5s |
| 50,000 | 100 | 20s |

### Optimization Tips

**1. Use Filtered Forecasts**
```bash
# Instead of forecasting all 500 items
POST /api/forecast
{
  "num_simulations": 5000
}

# Forecast only the 20 items you care about
POST /api/forecast
{
  "num_simulations": 5000,
  "filter_work_item_ids": [1, 2, ..., 20]
}
```

**2. Use Appropriate Simulation Counts**
- Exploration: 1,000-2,000
- Analysis: 5,000-10,000
- Final report: 10,000-20,000

**3. Cache Results**
```python
# Cache forecast results for 15 minutes
cache_key = f"forecast:{work_items_hash}:{num_simulations}"
forecast = cache.get(cache_key)
if not forecast:
    forecast = client.forecast.create(...)
    cache.set(cache_key, forecast, ttl=900)
```

## Examples

### Basic Forecast

```python
import requests

response = requests.post(
    "http://localhost:8000/api/forecast",
    json={"num_simulations": 5000}
)

forecast = response.json()
for item in forecast["work_items"]:
    print(f"{item['title']}: P50 = {item['percentiles']['P50']}")
```

### Forecast with Decision

```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 5000,
        "decisions": [{
            "type": "hire",
            "effect_value": 1.3,
            "rampup_days": 14
        }]
    }
)

analysis = response.json()["decision_analysis"]
print(f"Impact: {analysis['net_impact_days']} days")
```

### Milestone Probability

```python
response = requests.post(
    "http://localhost:8000/api/forecast",
    json={
        "num_simulations": 10000,
        "filter_milestone_id": 1
    }
)

milestone = response.json()["milestones"][0]
print(f"Probability of on-time delivery: {milestone['probability_on_time']:.1%}")
```

## Related Endpoints

- [POST /api/decisions/analyze](decisions.md#analyze-decision) - Analyze specific decision
- [POST /api/risks/analyze](risks.md#analyze-risk) - Analyze specific risk
- [GET /api/work-items](work-items.md) - Get work items for forecast

## See Also

- [Running Forecasts Guide](../guides/forecasts.md)
- [Decision Analysis](../guides/decisions.md)
- [Risk Modeling](../guides/risks.md)

