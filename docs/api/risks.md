# Risks API

Track and analyze project risks with probabilistic modeling.

## Endpoints

### POST /api/risks

Create a new risk.

**Request:**
```bash
POST /api/risks
Content-Type: application/json

{
  "title": "API Rate Limiting",
  "description": "Third-party API may throttle our requests",
  "severity": "medium",
  "probability": 0.4,
  "impact_type": "velocity_multiplier",
  "impact_value": 0.6,
  "affected_work_item_ids": [4, 5, 6],
  "mitigation_plan": "Implement caching and request batching",
  "owner": "alice@example.com",
  "identified_date": "2026-01-05"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Short risk title |
| `description` | string | Yes | Detailed description |
| `severity` | string | Yes | `low`, `medium`, `high`, `critical` |
| `probability` | float | Yes | Likelihood (0.0 to 1.0) |
| `impact_type` | string | Yes | `delay_days`, `velocity_multiplier`, `estimate_multiplier`, `cost_multiplier` |
| `impact_value` | float | Yes | Magnitude of impact |
| `affected_work_item_ids` | array | Yes | List of affected work item IDs |
| `mitigation_plan` | string | No | How to mitigate the risk |
| `owner` | string | No | Person responsible for risk |
| `identified_date` | string | No | When risk was identified |

**Response:**
```json
{
  "id": "risk-123",
  "title": "API Rate Limiting",
  "description": "Third-party API may throttle our requests",
  "severity": "medium",
  "status": "identified",
  "probability": 0.4,
  "impact_type": "velocity_multiplier",
  "impact_value": 0.6,
  "expected_value": 2.4,
  "affected_work_item_ids": [4, 5, 6],
  "mitigation_plan": "Implement caching and request batching",
  "owner": "alice@example.com",
  "identified_date": "2026-01-05",
  "created_at": "2026-01-05T10:30:00Z",
  "updated_at": "2026-01-05T10:30:00Z"
}
```

**Status Codes:**
- `201 Created`: Risk created successfully
- `400 Bad Request`: Invalid parameters
- `422 Unprocessable Entity`: Validation error

### GET /api/risks

List all risks.

**Request:**
```bash
GET /api/risks?status=active&severity=high&limit=20&offset=0
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `identified`, `assessed`, `active`, `mitigated`, `materialized`, `closed` |
| `severity` | string | Filter by severity |
| `owner` | string | Filter by owner |
| `min_probability` | float | Filter by minimum probability |
| `min_expected_value` | float | Filter by minimum expected value |
| `limit` | integer | Results per page (default: 50, max: 100) |
| `offset` | integer | Offset for pagination (default: 0) |
| `sort` | string | Field to sort by (default: `expected_value`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

**Response:**
```json
{
  "risks": [
    {
      "id": "risk-123",
      "title": "API Rate Limiting",
      "severity": "medium",
      "status": "active",
      "probability": 0.4,
      "expected_value": 2.4,
      "owner": "alice@example.com"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0,
  "has_more": true,
  "summary": {
    "total_expected_value": 23.5,
    "high_severity_count": 5,
    "critical_severity_count": 2
  }
}
```

### GET /api/risks/{risk_id}

Get a specific risk.

**Request:**
```bash
GET /api/risks/risk-123
```

**Response:**
```json
{
  "id": "risk-123",
  "title": "API Rate Limiting",
  "description": "Third-party API may throttle our requests",
  "severity": "medium",
  "status": "active",
  "probability": 0.4,
  "impact_type": "velocity_multiplier",
  "impact_value": 0.6,
  "expected_value": 2.4,
  "affected_work_item_ids": [4, 5, 6],
  "mitigation_plan": "Implement caching and request batching",
  "mitigation_status": "planned",
  "owner": "alice@example.com",
  "identified_date": "2026-01-05",
  "assessed_date": "2026-01-06",
  "created_at": "2026-01-05T10:30:00Z",
  "updated_at": "2026-01-06T15:30:00Z",
  "history": [
    {
      "date": "2026-01-05",
      "action": "created",
      "user": "alice@example.com"
    },
    {
      "date": "2026-01-06",
      "action": "assessed",
      "user": "alice@example.com",
      "notes": "Updated probability based on vendor feedback"
    }
  ]
}
```

### PATCH /api/risks/{risk_id}

Update a risk.

**Request:**
```bash
PATCH /api/risks/risk-123
Content-Type: application/json

{
  "status": "mitigated",
  "probability": 0.1,
  "notes": "Implemented caching layer, reducing risk"
}
```

**Updatable Fields:**
- `status`: Change risk status
- `probability`: Update likelihood
- `impact_value`: Update impact magnitude
- `severity`: Change severity level
- `mitigation_status`: Update mitigation progress
- `owner`: Reassign owner
- `notes`: Add notes

**Response:**
```json
{
  "id": "risk-123",
  "status": "mitigated",
  "probability": 0.1,
  "expected_value": 0.6,
  "updated_at": "2026-01-10T09:15:00Z"
}
```

### DELETE /api/risks/{risk_id}

Delete a risk (soft delete, sets status to closed).

**Request:**
```bash
DELETE /api/risks/risk-123
```

**Response:**
```
204 No Content
```

## Risk Analysis

### POST /api/risks/analyze

Analyze the impact of a specific risk.

**Request:**
```bash
POST /api/risks/analyze
Content-Type: application/json

{
  "risk_id": "risk-123",
  "num_simulations": 5000,
  "compare_to_baseline": true
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `risk_id` | string | Yes | - | ID of risk to analyze |
| `num_simulations` | integer | No | 5000 | Number of Monte Carlo iterations |
| `compare_to_baseline` | boolean | No | true | Include baseline comparison |

**Response:**
```json
{
  "risk": {
    "id": "risk-123",
    "title": "API Rate Limiting",
    "probability": 0.4,
    "impact_type": "velocity_multiplier",
    "impact_value": 0.6
  },
  "baseline_forecast": {
    "milestone_P50": "2026-02-10",
    "milestone_P90": "2026-02-20"
  },
  "with_risk_forecast": {
    "milestone_P50": "2026-02-13",
    "milestone_P90": "2026-02-25"
  },
  "impact_analysis": {
    "expected_delay_days": 3.2,
    "P50_delay": 3,
    "P90_delay": 5,
    "materialization_rate": 0.39,
    "affected_work_items": [4, 5, 6],
    "ripple_effect_items": [7, 8, 9]
  },
  "mitigation_analysis": {
    "current_expected_value": 3.2,
    "with_mitigation_expected_value": 0.8,
    "mitigation_benefit": 2.4,
    "recommended_action": "Implement mitigation"
  },
  "simulation_metadata": {
    "num_simulations": 5000,
    "execution_time_ms": 1876
  }
}
```

### POST /api/risks/portfolio

Analyze multiple risks together (portfolio view).

**Request:**
```bash
POST /api/risks/portfolio
Content-Type: application/json

{
  "risk_ids": ["risk-123", "risk-456", "risk-789"],
  "num_simulations": 10000,
  "include_correlations": true
}
```

**Response:**
```json
{
  "baseline": {
    "P50": "2026-02-10",
    "P90": "2026-02-20"
  },
  "with_all_risks": {
    "P50": "2026-02-17",
    "P90": "2026-03-05"
  },
  "total_expected_delay": 7.2,
  "risks": [
    {
      "id": "risk-123",
      "title": "API Rate Limiting",
      "expected_value": 3.2,
      "contribution_pct": 44.4
    },
    {
      "id": "risk-456",
      "title": "Team Member Leave",
      "expected_value": 2.0,
      "contribution_pct": 27.8
    },
    {
      "id": "risk-789",
      "title": "Requirement Changes",
      "expected_value": 2.0,
      "contribution_pct": 27.8
    }
  ],
  "correlations": {
    "risk-123_risk-456": 0.15,
    "risk-123_risk-789": -0.05,
    "risk-456_risk-789": 0.22
  },
  "top_risks": [
    {
      "id": "risk-123",
      "reason": "Highest expected value"
    }
  ]
}
```

### POST /api/risks/mitigation-analysis

Analyze mitigation strategies.

**Request:**
```bash
POST /api/risks/mitigation-analysis
Content-Type: application/json

{
  "risk_id": "risk-123",
  "mitigation_strategies": [
    {
      "name": "Implement caching",
      "probability_reduction": 0.3,
      "impact_reduction": 0.0,
      "cost_days": 2
    },
    {
      "name": "Use alternative API",
      "probability_reduction": 0.0,
      "impact_reduction": 0.8,
      "cost_days": 10
    }
  ],
  "num_simulations": 5000
}
```

**Response:**
```json
{
  "current_expected_value": 3.2,
  "strategies": [
    {
      "name": "Implement caching",
      "new_probability": 0.1,
      "new_expected_value": 0.8,
      "benefit": 2.4,
      "cost": 2,
      "net_benefit": 0.4,
      "roi": 20.0,
      "recommendation": "Strongly recommended"
    },
    {
      "name": "Use alternative API",
      "new_probability": 0.4,
      "new_expected_value": 0.5,
      "benefit": 2.7,
      "cost": 10,
      "net_benefit": -7.3,
      "roi": -73.0,
      "recommendation": "Not recommended"
    }
  ],
  "best_strategy": {
    "name": "Implement caching",
    "reason": "Highest net benefit"
  }
}
```

## Risk Lifecycle

### Status Workflow

```
identified → assessed → active → [mitigated|materialized|closed]
```

### Status Transitions

**identified → assessed**
```bash
PATCH /api/risks/risk-123
{
  "status": "assessed",
  "probability": 0.4,
  "impact_value": 0.6,
  "assessed_date": "2026-01-06"
}
```

**assessed → active**
```bash
PATCH /api/risks/risk-123
{
  "status": "active",
  "owner": "alice@example.com"
}
```

**active → mitigated**
```bash
PATCH /api/risks/risk-123
{
  "status": "mitigated",
  "probability": 0.1,
  "mitigation_notes": "Caching implemented"
}
```

**active → materialized**
```bash
PATCH /api/risks/risk-123
{
  "status": "materialized",
  "materialized_date": "2026-01-15",
  "actual_impact_days": 8
}
```

**active → closed**
```bash
PATCH /api/risks/risk-123
{
  "status": "closed",
  "close_reason": "No longer relevant after scope change"
}
```

## Examples

### Create and Analyze Risk

```python
import requests

# 1. Create risk
response = requests.post(
    "http://localhost:8000/api/risks",
    json={
        "title": "Vendor API Instability",
        "description": "Third-party API may be unstable",
        "severity": "high",
        "probability": 0.3,
        "impact_type": "delay_days",
        "impact_value": 10,
        "affected_work_item_ids": [4, 5, 6]
    }
)
risk_id = response.json()["id"]

# 2. Analyze impact
response = requests.post(
    "http://localhost:8000/api/risks/analyze",
    json={
        "risk_id": risk_id,
        "num_simulations": 5000
    }
)

analysis = response.json()
print(f"Expected delay: {analysis['impact_analysis']['expected_delay_days']} days")
```

### Portfolio Risk Analysis

```python
# Analyze multiple risks together
response = requests.post(
    "http://localhost:8000/api/risks/portfolio",
    json={
        "risk_ids": ["risk-1", "risk-2", "risk-3"],
        "num_simulations": 10000
    }
)

portfolio = response.json()
print(f"Total expected delay: {portfolio['total_expected_delay']} days")
for risk in portfolio["top_risks"]:
    print(f"Top risk: {risk['id']} - {risk['reason']}")
```

### Mitigation Analysis

```python
# Compare mitigation strategies
response = requests.post(
    "http://localhost:8000/api/risks/mitigation-analysis",
    json={
        "risk_id": "risk-123",
        "mitigation_strategies": [
            {
                "name": "Option A",
                "probability_reduction": 0.2,
                "cost_days": 3
            },
            {
                "name": "Option B",
                "probability_reduction": 0.4,
                "cost_days": 8
            }
        ]
    }
)

best = response.json()["best_strategy"]
print(f"Best mitigation: {best['name']} - {best['reason']}")
```

### Track Risk Over Time

```python
risk_id = "risk-123"

# Week 1: Identify
requests.post("/api/risks", json={...})

# Week 2: Assess
requests.patch(f"/api/risks/{risk_id}", json={
    "status": "assessed",
    "probability": 0.4
})

# Week 3: Make active
requests.patch(f"/api/risks/{risk_id}", json={
    "status": "active",
    "owner": "alice@example.com"
})

# Week 5: Mitigate
requests.patch(f"/api/risks/{risk_id}", json={
    "status": "mitigated",
    "probability": 0.1
})
```

## Related Endpoints

- [POST /api/forecast](forecast.md) - Include risks in forecasts
- [GET /api/work-items](work-items.md) - Get items affected by risks
- [POST /api/risk-detection](risk-detection.md) - Auto-detect risks

## See Also

- [Tracking Risks Guide](../guides/risks.md)
- [Risk Analysis Examples](../examples/scenarios.md#risk-scenarios)
- [Best Practices](../guides/risks.md#best-practices)

