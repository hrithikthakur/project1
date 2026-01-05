# API Reference Overview

Complete reference for the Decision Risk Engine REST API.

## Base URL

```
Development: http://localhost:8000
Production: https://api.your-domain.com
```

## API Structure

### Endpoints

The API is organized into logical groups:

- **Forecast** (`/api/forecast`) - Generate predictions
- **Decisions** (`/api/decisions`) - Model what-if scenarios
- **Risks** (`/api/risks`) - Track and analyze risks
- **Work Items** (`/api/work-items`) - Manage tasks
- **Actors** (`/api/actors`) - Team members and resources
- **Milestones** (`/api/milestones`) - Target dates
- **Metadata** (`/api/metadata`) - System information

### Interactive Documentation

Visit the auto-generated API docs:

```
Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc
```

## Authentication

### Current Status

The development version does not require authentication.

### Production Authentication

For production deployments, the API supports:

**Bearer Token Authentication:**
```bash
curl -X GET http://localhost:8000/api/work-items \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**API Key Authentication:**
```bash
curl -X GET http://localhost:8000/api/work-items \
  -H "X-API-Key: YOUR_API_KEY"
```

### Getting Credentials

Contact your system administrator for API credentials.

## Request Format

### Headers

**Required:**
```
Content-Type: application/json
```

**Optional:**
```
Accept: application/json
Authorization: Bearer <token>
X-API-Key: <key>
```

### Body

Requests use JSON format:

```bash
curl -X POST http://localhost:8000/api/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Example Task",
    "estimate_likely": 5
  }'
```

### Query Parameters

For filtering and pagination:

```bash
GET /api/work-items?status=not_started&limit=20&offset=0
```

## Response Format

### Success Responses

**200 OK** - Request successful
```json
{
  "id": 1,
  "title": "Example Task",
  "status": "not_started"
}
```

**201 Created** - Resource created
```json
{
  "id": 123,
  "title": "New Task",
  "created_at": "2026-01-05T10:30:00Z"
}
```

**204 No Content** - Success with no body (e.g., DELETE)

### Error Responses

**400 Bad Request** - Invalid input
```json
{
  "detail": "Invalid estimate: min must be less than max",
  "field": "estimate_min"
}
```

**404 Not Found** - Resource doesn't exist
```json
{
  "detail": "Work item with id 999 not found"
}
```

**422 Unprocessable Entity** - Validation error
```json
{
  "detail": [
    {
      "loc": ["body", "estimate_likely"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**500 Internal Server Error** - Server error
```json
{
  "detail": "Internal server error",
  "error_id": "abc123"
}
```

## Data Types

### Common Types

**Date:**
```json
"2026-01-05"
```
ISO 8601 format: YYYY-MM-DD

**DateTime:**
```json
"2026-01-05T10:30:00Z"
```
ISO 8601 with timezone: YYYY-MM-DDTHH:MM:SSZ

**Duration (days):**
```json
5.5
```
Floating point number representing days

**Probability:**
```json
0.35
```
Float between 0.0 and 1.0 (0% to 100%)

**Percentile:**
```json
{
  "P10": "2026-01-15",
  "P50": "2026-01-22",
  "P90": "2026-02-05",
  "P99": "2026-02-12"
}
```

### Status Enums

**Work Item Status:**
- `not_started`
- `in_progress`
- `completed`
- `blocked`

**Decision Status:**
- `proposed`
- `approved`
- `rejected`
- `implemented`
- `completed`
- `cancelled`

**Risk Status:**
- `identified`
- `assessed`
- `active`
- `mitigated`
- `materialized`
- `closed`

**Severity:**
- `low`
- `medium`
- `high`
- `critical`

## Pagination

List endpoints support pagination:

**Request:**
```bash
GET /api/work-items?limit=20&offset=40
```

**Response:**
```json
{
  "items": [...],
  "total": 156,
  "limit": 20,
  "offset": 40,
  "has_more": true
}
```

**Parameters:**
- `limit`: Items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

## Filtering

Filter list endpoints:

```bash
GET /api/work-items?status=in_progress&assigned_actor_id=101
```

**Common Filters:**
- `status`: Filter by status
- `assigned_actor_id`: Filter by assignee
- `milestone_id`: Filter by milestone
- `tags`: Filter by tags (comma-separated)

## Sorting

Sort results:

```bash
GET /api/work-items?sort=created_at&order=desc
```

**Parameters:**
- `sort`: Field to sort by
- `order`: `asc` or `desc` (default: `asc`)

## Rate Limiting

**Current Limits:**
- 1000 requests per minute per IP
- 10,000 requests per hour per API key

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1640000000
```

**429 Too Many Requests:**
```json
{
  "detail": "Rate limit exceeded",
  "retry_after": 45
}
```

## Versioning

### Current Version

The API is at version 1.0.

### Version Header

Specify API version (optional):
```
X-API-Version: 1.0
```

### Future Versioning

Future versions will use URL versioning:
```
/api/v1/work-items
/api/v2/work-items
```

## CORS

CORS is enabled for all origins in development.

**Allowed Methods:**
- GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:**
- Content-Type, Authorization, X-API-Key

## Webhooks

### Coming Soon

Future versions will support webhooks for events:

- Work item completed
- Risk materialized
- Decision approved
- Forecast completed

## SDK Libraries

### Official SDKs

**Python:**
```bash
pip install decision-risk-engine-sdk
```

**JavaScript/TypeScript:**
```bash
npm install @decision-risk-engine/sdk
```

**Usage Example (Python):**
```python
from decision_risk_engine import Client

client = Client(api_key="your_key")
forecast = client.forecasts.create(num_simulations=5000)
print(forecast.work_items[0].percentiles.P50)
```

## Best Practices

### Use Bulk Operations

Instead of creating items one by one:
```bash
# ❌ Slow: 100 requests
for item in items:
    POST /api/work-items

# ✅ Fast: 1 request
POST /api/work-items/bulk
```

### Cache When Possible

Cache static data:
```python
# Cache actors list (changes infrequently)
actors = client.actors.list()
cache.set("actors", actors, ttl=3600)
```

### Handle Errors Gracefully

```python
try:
    forecast = client.forecasts.create()
except RateLimitError:
    time.sleep(60)
    forecast = client.forecasts.create()
except ValidationError as e:
    print(f"Invalid input: {e.detail}")
```

### Use Async for Bulk Operations

```python
import asyncio

async def create_items(items):
    tasks = [client.work_items.create_async(item) for item in items]
    return await asyncio.gather(*tasks)
```

## Examples

### Complete Forecast Workflow

```bash
# 1. Create work items
curl -X POST http://localhost:8000/api/work-items/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "work_items": [
      {"title": "Task 1", "estimate_likely": 5},
      {"title": "Task 2", "estimate_likely": 3}
    ]
  }'

# 2. Add dependencies
curl -X POST http://localhost:8000/api/dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "from_work_item_id": 1,
    "to_work_item_id": 2,
    "type": "finish_to_start"
  }'

# 3. Run forecast
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "num_simulations": 5000
  }'

# 4. Get results
# (Results included in forecast response)
```

### Decision Analysis Workflow

```bash
# 1. Create decision
curl -X POST http://localhost:8000/api/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hire",
    "effect_value": 1.3,
    "rampup_days": 14
  }'

# 2. Analyze impact
curl -X POST http://localhost:8000/api/decisions/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "decision_id": "decision-123",
    "num_simulations": 5000
  }'

# 3. Approve decision
curl -X PATCH http://localhost:8000/api/decisions/decision-123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved"
  }'
```

## Next Steps

Explore specific API endpoints:

- [Forecast API](forecast.md) - Generate predictions
- [Decisions API](decisions.md) - Model what-if scenarios
- [Risks API](risks.md) - Track and analyze risks
- [Work Items API](work-items.md) - Manage tasks

## Support

### API Issues

Report bugs or issues:
- GitHub Issues: https://github.com/yourorg/decision-risk-engine/issues
- Email: api-support@your-domain.com

### API Status

Check system status:
- Status Page: https://status.your-domain.com
- Health Endpoint: GET /health

