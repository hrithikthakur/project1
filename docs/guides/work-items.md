# Work Items & Dependencies

Learn how to structure your project with work items and manage dependencies effectively.

## Overview

Work items are the fundamental units of work in your project. Understanding how to structure them and define their relationships is key to accurate forecasting.

## Work Item Basics

### Anatomy of a Work Item

```json
{
  "id": 1,
  "title": "User Login API",
  "description": "Implement authentication endpoint",
  "estimate_min": 3,
  "estimate_likely": 5,
  "estimate_max": 8,
  "status": "not_started",
  "assigned_actor_id": 101,
  "dependencies": [2, 3],
  "tags": ["backend", "auth", "mvp"],
  "epic_id": 1,
  "milestone_id": 1
}
```

**Key Fields:**

**ID**: Unique identifier (integer)
**Title**: Short descriptive name
**Description**: Detailed explanation of the work
**Estimates**: Three-point estimate (min, likely, max) in days
**Status**: `not_started`, `in_progress`, `completed`, `blocked`
**Assigned Actor**: Team member responsible (can be null)
**Dependencies**: IDs of work items that must complete first
**Tags**: Labels for filtering and organization
**Epic**: Group of related work items
**Milestone**: Target delivery date association

### Work Item Status

```
not_started → in_progress → completed
     ↓
  blocked
```

**not_started**: Work hasn't begun
- Included in forecasts
- Start date determined by dependencies

**in_progress**: Work is underway
- Partially complete
- Remaining time estimated

**completed**: Work is done
- Not included in future forecasts
- Used for velocity calculations

**blocked**: Cannot proceed
- Waiting on external dependency
- Explicitly modeled as delay

### Three-Point Estimates

Use triangular distribution for uncertainty:

**Min (Optimistic)**: Best case if everything goes well
**Likely (Most Probable)**: What you expect given normal circumstances
**Max (Pessimistic)**: Worst case with expected complications

**Example: Simple CRUD API**
```
Min: 2 days (no issues, familiar tech)
Likely: 4 days (typical)
Max: 7 days (authentication complexity, testing challenges)
```

**Example: Complex Integration**
```
Min: 10 days (vendor API works perfectly)
Likely: 20 days (some troubleshooting needed)
Max: 40 days (major compatibility issues)
```

**Calibration Tips:**
- Min should occur ~10% of the time
- Likely should be most common outcome
- Max should occur ~10% of the time
- If actual > max frequently, estimates are too optimistic

## Creating Work Items

### Via UI

1. Navigate to **Work Items** view
2. Click **"Create Work Item"**
3. Fill in the form:
   ```
   Title: User Signup API
   Description: Create endpoint for new user registration
   Estimate Min: 3 days
   Estimate Likely: 5 days
   Estimate Max: 9 days
   Status: Not Started
   Assigned To: Alice Johnson
   ```
4. Click **"Save"**

### Via API

```bash
curl -X POST http://localhost:8000/api/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Signup API",
    "description": "Create endpoint for new user registration",
    "estimate_min": 3,
    "estimate_likely": 5,
    "estimate_max": 9,
    "status": "not_started",
    "assigned_actor_id": 101
  }'
```

### Bulk Import

```bash
curl -X POST http://localhost:8000/api/work-items/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "work_items": [
      {"title": "Item 1", "estimate_likely": 5},
      {"title": "Item 2", "estimate_likely": 3},
      {"title": "Item 3", "estimate_likely": 8}
    ]
  }'
```

## Dependencies

### Dependency Types

**Finish-to-Start (FS)**
```
Item A must finish before Item B can start
```
Most common type. Example:
```
Design API → Implement API → Write Tests
```

**Blocking**
```
Item A blocks Item B from proceeding
```
Similar to FS but emphasizes criticality. Example:
```
Security Review blocks Deployment
```

**Finish-to-Finish (FF)**
```
Item A must finish before Item B can finish
```
Less common. Example:
```
Backend API and Frontend UI must complete together
```

### Defining Dependencies

**Via UI:**
1. Edit work item
2. In "Dependencies" section, add item IDs
3. Select dependency type
4. Save

**Via API:**
```bash
curl -X POST http://localhost:8000/api/dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "from_work_item_id": 1,
    "to_work_item_id": 2,
    "type": "finish_to_start",
    "delay_days": 0
  }'
```

**With Delay:**
```json
{
  "from_work_item_id": 1,
  "to_work_item_id": 2,
  "type": "finish_to_start",
  "delay_days": 5,
  "reason": "Wait for vendor review"
}
```

### Dependency Graph

The system builds a directed acyclic graph (DAG):

```
         Item 1: Design
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Item 2: Backend    Item 3: Frontend
    ↓                   ↓
    └─────────┬─────────┘
              ↓
    Item 4: Integration
```

**Graph Properties:**
- Must be acyclic (no circular dependencies)
- Can have multiple paths
- Critical path = longest path through graph

### Critical Path

The longest sequence of dependent items determines minimum project duration.

**Example:**
```
Path A: 1 → 2 → 4 = 5 + 8 + 3 = 16 days
Path B: 1 → 3 → 4 = 5 + 4 + 3 = 12 days

Critical Path: Path A (16 days)
```

**Why It Matters:**
- Delays on critical path directly impact delivery
- Non-critical path items have "float" or "slack"
- Focus optimization efforts on critical path

## Organizing Work

### Epics

Group related work items into epics:

```json
{
  "id": 1,
  "title": "User Authentication",
  "description": "Complete authentication system",
  "work_item_ids": [1, 2, 3, 4],
  "status": "in_progress"
}
```

**Benefits:**
- Track progress on feature sets
- Forecast epic completion
- Organize backlog

**Example Epic Structure:**
```
Epic: Payment Integration
  - Item 1: Design payment flow
  - Item 2: Integrate Stripe API
  - Item 3: Build checkout UI
  - Item 4: Add receipt generation
  - Item 5: Test payment flows
```

### Milestones

Associate work items with target dates:

```json
{
  "id": 1,
  "title": "MVP Launch",
  "target_date": "2026-02-01",
  "work_item_ids": [1, 2, 3, 4, 5, 6, 7, 8],
  "description": "Minimum viable product for beta users"
}
```

**Milestone Forecasting:**
```
Milestone: MVP Launch
Target: Feb 1, 2026

Forecast:
  P50: Feb 5, 2026 (4 days late)
  P80: Feb 12, 2026 (11 days late)
  P90: Feb 15, 2026 (14 days late)
  
Probability of hitting target: 32%
```

### Tags

Categorize work items for filtering:

```json
{
  "id": 1,
  "title": "User Login API",
  "tags": ["backend", "auth", "api", "mvp", "security"]
}
```

**Common Tag Categories:**
- **Layer**: frontend, backend, database, devops
- **Feature**: auth, payments, reporting, admin
- **Priority**: mvp, v2, nice-to-have
- **Type**: bug, feature, tech-debt, spike

## Work Item Sizing

### Sizing Guidelines

**Small (1-3 days)**
- Clear requirements
- Familiar technology
- Minimal dependencies
- Example: Add validation to form field

**Medium (3-8 days)**
- Moderate complexity
- Some unknowns
- Few dependencies
- Example: Implement new API endpoint

**Large (8-15 days)**
- Complex requirements
- Multiple unknowns
- Several dependencies
- Example: Build complete feature

**Extra Large (15+ days)**
- Very complex
- Many unknowns
- Consider breaking down
- Example: Integrate with external system

### Breaking Down Large Items

**Anti-Pattern:**
```
❌ Item: "Build payment system" (30 days)
```

**Better:**
```
✓ Epic: Payment System
  - Item 1: Design payment flow (2 days)
  - Item 2: Set up Stripe account (1 day)
  - Item 3: Implement Stripe API client (5 days)
  - Item 4: Build checkout UI (4 days)
  - Item 5: Add payment confirmation (2 days)
  - Item 6: Test payment flows (3 days)
  - Item 7: Add error handling (2 days)
```

**Benefits of Smaller Items:**
- More accurate estimates
- Better tracking of progress
- Easier to parallelize
- Reduced risk

### Estimation Techniques

**Planning Poker**
```
1. Present work item to team
2. Each person estimates independently
3. Reveal estimates simultaneously
4. Discuss outliers
5. Converge on min/likely/max
```

**Historical Data**
```
Past similar items:
  - Login API: 4 days
  - Signup API: 5 days
  - Password reset: 3 days
  
New item (similar complexity): 3-4-6 days
```

**T-Shirt Sizing**
```
First pass: S, M, L, XL
Then convert:
  S = 1-2-3 days
  M = 3-5-8 days
  L = 8-13-20 days
  XL = Break it down!
```

## Best Practices

### Work Item Definition

**Good:**
```
Title: Add email validation to signup form
Description: 
  - Validate email format on client side
  - Check for existing email on server side
  - Show clear error messages
Acceptance Criteria:
  - Invalid emails rejected
  - Duplicate emails prevented
  - User sees helpful error messages
```

**Bad:**
```
Title: Fix signup
Description: Make signup work better
Acceptance Criteria: (none)
```

### Dependency Management

**Do:**
- ✅ Keep dependency graph simple
- ✅ Document why dependencies exist
- ✅ Review for unnecessary coupling
- ✅ Allow parallel work when possible

**Don't:**
- ❌ Create circular dependencies
- ❌ Over-constrain with unnecessary deps
- ❌ Forget to update when plans change
- ❌ Create implicit dependencies (document them!)

### Estimation

**Do:**
- ✅ Use historical data when available
- ✅ Include testing and review time
- ✅ Account for unknowns in max estimate
- ✅ Re-estimate when requirements change

**Don't:**
- ❌ Estimate under pressure
- ❌ Forget about context switching overhead
- ❌ Assume ideal conditions (use likely/max for reality)
- ❌ Treat estimates as commitments

### Status Updates

**Daily:** Update in-progress items
```
Work Item #5: 40% complete, 3 days remaining
```

**Sprint End:** Mark completed items
```
Items 1, 2, 3 → status = completed
```

**Weekly:** Review blocked items
```
Item 7: blocked, waiting for vendor API key
```

## Advanced Patterns

### Parallel Work

Allow multiple items to proceed simultaneously:

```
Item 1: Design
  ↓
  ├─→ Item 2: Backend (Alice)
  └─→ Item 3: Frontend (Bob)
```

Both Item 2 and 3 can start after Item 1, and work in parallel.

### Phased Dependencies

Model phases of work:

```
Phase 1: Research & Design
  - Item 1: User research (5 days)
  - Item 2: Design mockups (3 days)
  
Phase 2: Implementation (starts after Phase 1)
  - Item 3: Backend API (8 days)
  - Item 4: Frontend UI (6 days)
  
Phase 3: Integration (starts after Phase 2)
  - Item 5: Connect FE to BE (2 days)
  - Item 6: End-to-end testing (3 days)
```

### Blocking Dependencies

Some items completely block others:

```
Item: Security Review (blocking)
  Blocks: Production Deployment
  
Cannot deploy until security approves
```

### Optional Dependencies

Model soft dependencies:

```
Item A: Core feature
Item B: Nice-to-have enhancement
  Soft dependency: "Should come after A, but not required"
  
In forecast: B can start before A if resources available
```

## API Reference

### Create Work Item

```bash
POST /api/work-items
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "estimate_min": 3,
  "estimate_likely": 5,
  "estimate_max": 8,
  "status": "not_started",
  "assigned_actor_id": 101,
  "tags": ["tag1", "tag2"]
}
```

### Update Work Item

```bash
PATCH /api/work-items/1
Content-Type: application/json

{
  "status": "in_progress",
  "percent_complete": 40
}
```

### Add Dependency

```bash
POST /api/dependencies
Content-Type: application/json

{
  "from_work_item_id": 1,
  "to_work_item_id": 2,
  "type": "finish_to_start"
}
```

### List Work Items

```bash
GET /api/work-items?status=not_started&assigned_actor_id=101
```

### Get Dependency Graph

```bash
GET /api/work-items/graph
```

Returns:
```json
{
  "nodes": [
    {"id": 1, "title": "Item 1"},
    {"id": 2, "title": "Item 2"}
  ],
  "edges": [
    {"from": 1, "to": 2, "type": "finish_to_start"}
  ]
}
```

## Summary

- Structure work with clear, sized work items
- Use three-point estimates for uncertainty
- Define dependencies explicitly
- Keep dependency graph simple and acyclic
- Organize with epics, milestones, and tags
- Update status regularly

Next: Explore the [API Reference](../api/overview.md) for programmatic access.

