# Decisions API

Create and analyze decisions that affect project timelines.

## Endpoints

### POST /api/decisions

Create a new decision.

**Request:**
```bash
POST /api/decisions
Content-Type: application/json

{
  "type": "hire",
  "target_work_item_id": 1,
  "target_actor_id": null,
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "description": "Hire senior engineer",
  "cost": 150000,
  "proposed_by": "john@example.com"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | Decision type: `hire`, `fire`, `delay`, `accelerate`, `change_scope` |
| `target_work_item_id` | integer | Conditional | Required for item-specific decisions |
| `target_actor_id` | integer | Conditional | Required for actor-specific decisions |
| `effect_type` | string | Yes | `velocity_change`, `delay_days`, `estimate_multiplier` |
| `effect_value` | float | Yes | Magnitude of effect |
| `rampup_days` | integer | No | Days before effect takes hold (default: 0) |
| `duration_days` | integer | No | How long effect lasts (default: null = permanent) |
| `description` | string | Yes | Human-readable description |
| `cost` | float | No | Financial cost of decision |
| `proposed_by` | string | No | Who proposed the decision |

**Response:**
```json
{
  "id": "decision-123",
  "type": "hire",
  "status": "proposed",
  "target_work_item_id": 1,
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "description": "Hire senior engineer",
  "cost": 150000,
  "proposed_by": "john@example.com",
  "proposed_at": "2026-01-05T10:30:00Z",
  "created_at": "2026-01-05T10:30:00Z",
  "updated_at": "2026-01-05T10:30:00Z"
}
```

**Status Codes:**
- `201 Created`: Decision created successfully
- `400 Bad Request`: Invalid parameters
- `422 Unprocessable Entity`: Validation error

### GET /api/decisions

List all decisions.

**Request:**
```bash
GET /api/decisions?status=proposed&type=hire&limit=20&offset=0
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `type` | string | Filter by decision type |
| `proposed_by` | string | Filter by proposer |
| `limit` | integer | Results per page (default: 50, max: 100) |
| `offset` | integer | Offset for pagination (default: 0) |
| `sort` | string | Field to sort by (default: `created_at`) |
| `order` | string | `asc` or `desc` (default: `desc`) |

**Response:**
```json
{
  "decisions": [
    {
      "id": "decision-123",
      "type": "hire",
      "status": "proposed",
      "description": "Hire senior engineer",
      "proposed_at": "2026-01-05T10:30:00Z"
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0,
  "has_more": true
}
```

### GET /api/decisions/{decision_id}

Get a specific decision.

**Request:**
```bash
GET /api/decisions/decision-123
```

**Response:**
```json
{
  "id": "decision-123",
  "type": "hire",
  "status": "approved",
  "target_work_item_id": 1,
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "description": "Hire senior engineer",
  "cost": 150000,
  "proposed_by": "john@example.com",
  "proposed_at": "2026-01-05T10:30:00Z",
  "approved_by": "manager@example.com",
  "approved_at": "2026-01-06T14:20:00Z",
  "implemented_at": null,
  "completed_at": null
}
```

**Status Codes:**
- `200 OK`: Decision found
- `404 Not Found`: Decision doesn't exist

### PATCH /api/decisions/{decision_id}

Update a decision.

**Request:**
```bash
PATCH /api/decisions/decision-123
Content-Type: application/json

{
  "status": "approved",
  "approved_by": "manager@example.com",
  "notes": "Approved pending budget confirmation"
}
```

**Updatable Fields:**
- `status`: Change decision status
- `effect_value`: Modify effect magnitude
- `rampup_days`: Adjust rampup period
- `description`: Update description
- `approved_by`: Set approver
- `notes`: Add notes

**Response:**
```json
{
  "id": "decision-123",
  "status": "approved",
  "approved_by": "manager@example.com",
  "approved_at": "2026-01-06T14:20:00Z",
  "notes": "Approved pending budget confirmation"
}
```

### DELETE /api/decisions/{decision_id}

Delete a decision (soft delete).

**Request:**
```bash
DELETE /api/decisions/decision-123
```

**Response:**
```
204 No Content
```

## Decision Analysis

### POST /api/decisions/analyze

Analyze the impact of a specific decision.

**Request:**
```bash
POST /api/decisions/analyze
Content-Type: application/json

{
  "decision_id": "decision-123",
  "num_simulations": 5000,
  "compare_to_baseline": true
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `decision_id` | string | Yes | - | ID of decision to analyze |
| `num_simulations` | integer | No | 5000 | Number of Monte Carlo iterations |
| `compare_to_baseline` | boolean | No | true | Include baseline comparison |

**Response:**
```json
{
  "decision": {
    "id": "decision-123",
    "type": "hire",
    "description": "Hire senior engineer"
  },
  "baseline_forecast": {
    "milestone_P50": "2026-02-10",
    "milestone_P90": "2026-02-20",
    "critical_path_duration": 42
  },
  "with_decision_forecast": {
    "milestone_P50": "2026-02-05",
    "milestone_P90": "2026-02-12",
    "critical_path_duration": 37
  },
  "impact_analysis": {
    "P50_improvement_days": 5,
    "P90_improvement_days": 8,
    "critical_path_reduction": 5,
    "affected_work_items": [1, 2, 3, 4, 5],
    "expected_benefit_days": 5.2,
    "confidence": 0.85
  },
  "cost_benefit": {
    "decision_cost": 150000,
    "days_saved": 5,
    "value_per_day": 10000,
    "total_benefit": 50000,
    "roi": -66.7,
    "payback_period_days": null
  },
  "simulation_metadata": {
    "num_simulations": 5000,
    "execution_time_ms": 2156
  }
}
```

### POST /api/decisions/compare

Compare multiple decisions.

**Request:**
```bash
POST /api/decisions/compare
Content-Type: application/json

{
  "decision_ids": ["decision-123", "decision-456", "decision-789"],
  "num_simulations": 5000
}
```

**Response:**
```json
{
  "baseline": {
    "P50": "2026-02-10",
    "P90": "2026-02-20"
  },
  "decisions": [
    {
      "id": "decision-123",
      "type": "hire",
      "P50": "2026-02-05",
      "P90": "2026-02-12",
      "improvement_days": 5,
      "cost": 150000,
      "roi": -66.7
    },
    {
      "id": "decision-456",
      "type": "change_scope",
      "P50": "2026-02-03",
      "P90": "2026-02-10",
      "improvement_days": 7,
      "cost": 0,
      "roi": null
    },
    {
      "id": "decision-789",
      "type": "delay",
      "P50": "2026-02-15",
      "P90": "2026-02-25",
      "improvement_days": -5,
      "cost": 0,
      "roi": null
    }
  ],
  "recommendation": {
    "best_option": "decision-456",
    "reason": "Maximum improvement with zero cost"
  }
}
```

## Decision Types

### Hire Decision

```json
{
  "type": "hire",
  "effect_type": "velocity_change",
  "effect_value": 1.3,
  "rampup_days": 14,
  "target_work_item_id": null,
  "description": "Hire senior engineer"
}
```

### Fire/Remove Decision

```json
{
  "type": "fire",
  "target_actor_id": 101,
  "effect_type": "velocity_change",
  "effect_value": 0.0,
  "knowledge_transfer_days": 7,
  "description": "Team member leaving"
}
```

### Delay Decision

```json
{
  "type": "delay",
  "target_work_item_id": 5,
  "effect_type": "delay_days",
  "effect_value": 14,
  "description": "Wait for vendor API access"
}
```

### Accelerate Decision

```json
{
  "type": "accelerate",
  "target_work_item_ids": [1, 2, 3],
  "effect_type": "velocity_multiplier",
  "effect_value": 1.5,
  "duration_days": 10,
  "description": "Sprint to deadline"
}
```

### Change Scope Decision

```json
{
  "type": "change_scope",
  "target_work_item_id": 7,
  "effect_type": "estimate_multiplier",
  "effect_value": 0.7,
  "description": "Reduce scope by 30%"
}
```

## Status Workflow

```
proposed → approved → implemented → completed
     ↓          ↓           ↓
  rejected   cancelled   rolled_back
```

### Status Transitions

**proposed → approved**
```bash
PATCH /api/decisions/decision-123
{"status": "approved", "approved_by": "manager@example.com"}
```

**approved → implemented**
```bash
PATCH /api/decisions/decision-123
{"status": "implemented", "implemented_at": "2026-01-15"}
```

**implemented → completed**
```bash
PATCH /api/decisions/decision-123
{"status": "completed", "completed_at": "2026-01-30"}
```

## Examples

### Create and Analyze Hiring Decision

```python
import requests

# 1. Create decision
response = requests.post(
    "http://localhost:8000/api/decisions",
    json={
        "type": "hire",
        "effect_type": "velocity_change",
        "effect_value": 1.3,
        "rampup_days": 14,
        "description": "Hire senior engineer",
        "cost": 150000
    }
)
decision_id = response.json()["id"]

# 2. Analyze impact
response = requests.post(
    "http://localhost:8000/api/decisions/analyze",
    json={
        "decision_id": decision_id,
        "num_simulations": 5000
    }
)

analysis = response.json()
print(f"Days saved: {analysis['impact_analysis']['P50_improvement_days']}")
print(f"ROI: {analysis['cost_benefit']['roi']:.1f}%")
```

### Compare Multiple Options

```python
# Compare hiring vs scope reduction
hire_decision = {...}  # Create hire decision
scope_decision = {...}  # Create scope decision

response = requests.post(
    "http://localhost:8000/api/decisions/compare",
    json={
        "decision_ids": [hire_decision["id"], scope_decision["id"]],
        "num_simulations": 5000
    }
)

comparison = response.json()
best = comparison["recommendation"]["best_option"]
print(f"Best option: {best}")
```

### Approve Decision Workflow

```python
decision_id = "decision-123"

# 1. Propose decision
requests.post("/api/decisions", json={...})

# 2. Analyze impact
analysis = requests.post(f"/api/decisions/analyze", json={"decision_id": decision_id})

# 3. If impact is positive, approve
if analysis.json()["impact_analysis"]["P50_improvement_days"] > 0:
    requests.patch(
        f"/api/decisions/{decision_id}",
        json={"status": "approved", "approved_by": "manager@example.com"}
    )
```

## Related Endpoints

- [POST /api/forecast](forecast.md) - Include decisions in forecasts
- [GET /api/work-items](work-items.md) - Get items affected by decisions
- [GET /api/actors](actors.md) - Get team members for resource decisions

## See Also

- [Managing Decisions Guide](../guides/decisions.md)
- [Decision Analysis Examples](../examples/scenarios.md#decision-scenarios)
- [Best Practices](../guides/decisions.md#best-practices)

