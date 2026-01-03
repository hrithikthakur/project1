# Decision-Risk Engine v0 - Usage Guide

## Quick Start

### 1. Run the Demo

The fastest way to see the engine in action:

```bash
cd backend
./venv/bin/python -m app.engine.demo_decision_risk_engine
```

This will run 4 demos showing:
- Dependency blocked → risk created
- Accept risk decision → status transitions
- Mitigate risk decision → status transitions  
- Determinism verification

### 2. Use the API

Start the server:

```bash
cd backend
./start.sh
```

Then use the API endpoints:

#### Health Check

```bash
curl http://localhost:8000/api/decision-risk-engine/health
```

#### List Rules

```bash
curl http://localhost:8000/api/decision-risk-engine/rules
```

#### Process a Dependency Blocked Event

```bash
curl -X POST "http://localhost:8000/api/decision-risk-engine/events/dependency-blocked?dependency_id=dep_001"
```

#### Process a Decision Approved Event

```bash
curl -X POST "http://localhost:8000/api/decision-risk-engine/events/decision-approved?decision_id=dec_001"
```

#### Process Any Event (Generic)

```bash
curl -X POST http://localhost:8000/api/decision-risk-engine/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "dependency_blocked",
    "dependency_id": "dep_001",
    "metadata": {}
  }'
```

### 3. Use Programmatically

```python
from app.engine.decision_risk_engine import (
    DecisionRiskEngine,
    Event,
    EventType,
    StateSnapshot,
)

# Initialize engine
engine = DecisionRiskEngine()

# Create event
event = Event(
    event_id="evt_001",
    event_type=EventType.DEPENDENCY_BLOCKED,
    dependency_id="dep_001"
)

# Create state snapshot
state = StateSnapshot(
    dependencies={"dep_001": {...}},
    work_items={"work_item_001": {...}},
    # ... other state
)

# Process event
commands = engine.process_event(event, state)

# Handle commands
for cmd in commands:
    print(f"Command: {cmd.command_type} -> {cmd.target_id}")
    print(f"Reason: {cmd.reason}")
    # Execute command (write to DB, send notifications, etc.)
```

## Architecture

```
┌─────────────────┐
│  Event Source   │  (API, DB trigger, scheduler, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Event Stream   │  (DEPENDENCY_BLOCKED, DECISION_APPROVED, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Decision-Risk Engine                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Rule 1  │  │  Rule 2  │  │  Rule 3  │  ...        │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│  (event, state) → evaluate rules → commands[]          │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Command Handler │  (Writes to DB, sends notifications)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │  (Risks, Issues, Forecasts updated)
└─────────────────┘
```

## Event Types

### DEPENDENCY_BLOCKED

Triggered when a work item is blocked by a dependency.

**Required fields:**
- `dependency_id`: ID of the blocked dependency

**What happens:**
1. Issue is created (type: `dependency_blocked`)
2. Forecast stub is called to estimate impact
3. If P80 delta > 7 days: Risk is created
4. Owner's next_date is set

**Example:**
```python
Event(
    event_id="evt_001",
    event_type=EventType.DEPENDENCY_BLOCKED,
    dependency_id="dep_001"
)
```

### DECISION_APPROVED

Triggered when a decision is approved.

**Required fields:**
- `decision_id`: ID of the approved decision

**What happens:**
- If decision type is `accept_risk`:
  - Risk status → ACCEPTED
  - Escalation suppressed until acceptance boundary
  - next_date = acceptance_until

- If decision type is `mitigate_risk`:
  - Risk status → MITIGATING
  - Mitigation due_date tracked
  - Forecast recomputation scheduled

**Example:**
```python
Event(
    event_id="evt_002",
    event_type=EventType.DECISION_APPROVED,
    decision_id="dec_001"
)
```

## Command Types

Commands are emitted by the engine but executed elsewhere.

### CREATE_ISSUE

Create a new issue.

**Payload:**
- `id`: Issue ID
- `type`: Issue type (e.g., "dependency_blocked")
- `title`: Issue title
- `description`: Issue description
- Other issue-specific fields

### CREATE_RISK / UPDATE_RISK

Create or update a risk.

**Payload:**
- `id`: Risk ID (for CREATE)
- `status`: Risk status (active, accepted, mitigating, etc.)
- `severity`: Risk severity (low, medium, high, critical)
- `impact`: Impact metrics (e.g., p80_delay_days)
- Other risk-specific fields

### SET_NEXT_DATE

Set the next review date for an owner.

**Payload:**
- `owner_id`: Actor ID who owns the entity
- `entity_type`: Type of entity (risk, issue, decision)
- `entity_id`: ID of the entity
- `next_date`: Next review date (ISO format)
- Optional: `suppress_escalation_until`, `action_required`

### UPDATE_FORECAST

Schedule a forecast recomputation.

**Payload:**
- `trigger`: What triggers the recomputation
- `risk_id`: Related risk ID
- Other forecast-specific fields

## Rules

### Rule 1: Dependency Blocked

**Trigger:** `DEPENDENCY_BLOCKED` event

**Logic:**
1. Ensure Issue exists
2. Call forecast stub
3. If P80 delta > 7 days threshold:
   - Create/update Risk
   - Set owner's next_date

**Configuration:**
- `P80_THRESHOLD_DAYS = 7.0`

### Rule 2: Accept Risk Decision Approved

**Trigger:** `DECISION_APPROVED` event with `decision_type = accept_risk`

**Logic:**
1. Transition Risk.status → ACCEPTED
2. Suppress escalation until acceptance boundary
3. Set next_date = acceptance_until

### Rule 3: Mitigate Risk Decision Approved

**Trigger:** `DECISION_APPROVED` event with `decision_type = mitigate_risk`

**Logic:**
1. Transition Risk.status → MITIGATING
2. Track mitigation due_date
3. Schedule forecast recomputation

## Adding Custom Rules

Create a new rule class:

```python
from app.engine.decision_risk_engine import Rule, Event, StateSnapshot, Command, CommandType

class Rule4_MilestoneAtRisk(Rule):
    """Custom rule for milestone at risk"""
    
    name = "rule_4_milestone_at_risk"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        return event.event_type == EventType.MILESTONE_AT_RISK
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        commands = []
        
        milestone_id = event.milestone_id
        milestone = state.milestones.get(milestone_id)
        
        if milestone:
            # Create notification command
            commands.append(Command(
                command_id=f"cmd_{event.event_id}_notify",
                command_type=CommandType.CREATE_NOTIFICATION,
                target_id=milestone_id,
                reason=f"Milestone {milestone_id} is at risk",
                rule_name=self.name,
                payload={
                    "type": "milestone_at_risk",
                    "milestone_id": milestone_id,
                    "severity": "high"
                }
            ))
        
        return commands
```

Add it to the engine:

```python
from app.engine.decision_risk_engine import DecisionRiskEngine

engine = DecisionRiskEngine()
engine.add_rule(Rule4_MilestoneAtRisk())
```

## Testing

The engine is designed to be easily testable:

```python
def test_my_scenario():
    # Setup
    engine = DecisionRiskEngine()
    
    event = Event(
        event_id="evt_test",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001"
    )
    
    state = StateSnapshot(
        dependencies={"dep_001": {...}},
        # ... other state
    )
    
    # Execute
    commands = engine.process_event(event, state)
    
    # Assert
    assert len(commands) > 0
    assert any(c.command_type == CommandType.CREATE_RISK for c in commands)
```

## Integration Patterns

### Pattern 1: Event-Driven (Recommended)

```python
# In your API endpoint
@router.post("/work-items/{item_id}/block")
async def block_work_item(item_id: str, dependency_id: str):
    # 1. Update database
    db.work_items.update(item_id, {"status": "blocked"})
    
    # 2. Emit event
    event = Event(
        event_id=generate_id(),
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id=dependency_id
    )
    
    # 3. Process event
    state = get_current_state_snapshot()
    commands = engine.process_event(event, state)
    
    # 4. Execute commands
    for cmd in commands:
        execute_command(cmd)
    
    return {"status": "blocked", "commands_issued": len(commands)}
```

### Pattern 2: Batch Processing

```python
# In a scheduled job
async def process_pending_events():
    events = db.events.get_pending()
    
    for event in events:
        state = get_current_state_snapshot()
        commands = engine.process_event(event, state)
        
        for cmd in commands:
            execute_command(cmd)
        
        db.events.mark_processed(event.event_id)
```

### Pattern 3: Webhook Integration

```python
@router.post("/webhooks/external-blocker")
async def handle_external_blocker(payload: dict):
    # External system reports a blocker
    dependency_id = payload["dependency_id"]
    
    event = Event(
        event_id=generate_id(),
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id=dependency_id,
        metadata={"source": "external", "payload": payload}
    )
    
    state = get_current_state_snapshot()
    commands = engine.process_event(event, state)
    
    for cmd in commands:
        execute_command(cmd)
    
    return {"acknowledged": True}
```

## Command Execution

Commands must be executed by a separate handler:

```python
def execute_command(cmd: Command):
    """Execute a command by writing to the database"""
    
    if cmd.command_type == CommandType.CREATE_RISK:
        db.risks.create(cmd.payload)
        
    elif cmd.command_type == CommandType.UPDATE_RISK:
        db.risks.update(cmd.target_id, cmd.payload)
        
    elif cmd.command_type == CommandType.CREATE_ISSUE:
        db.issues.create(cmd.payload)
        
    elif cmd.command_type == CommandType.SET_NEXT_DATE:
        owner_id = cmd.payload["owner_id"]
        entity_id = cmd.payload["entity_id"]
        next_date = cmd.payload["next_date"]
        
        db.ownerships.update_next_date(
            owner_id=owner_id,
            entity_id=entity_id,
            next_date=next_date
        )
        
    elif cmd.command_type == CommandType.UPDATE_FORECAST:
        # Schedule forecast recomputation
        scheduler.schedule_forecast_update(cmd.payload)
    
    # Log command execution
    db.command_log.create({
        "command_id": cmd.command_id,
        "command_type": cmd.command_type.value,
        "target_id": cmd.target_id,
        "rule_name": cmd.rule_name,
        "executed_at": datetime.now().isoformat(),
    })
```

## Forecast Stub

The current implementation uses a deterministic stub:

```python
def simulate_ripple_stub(event, state) -> ForecastResult:
    # Heuristic: dependency blocks add ~7 days P50, ~14 days P80
    return ForecastResult(
        forecast_before={"p50_date": ..., "p80_date": ...},
        forecast_after={"p50_date": ..., "p80_date": ...},
        delta_p50_days=7.0,
        delta_p80_days=14.0,
        confidence="LOW",
        method="heuristic_stub",
        explanation="..."
    )
```

**To replace with real simulation:**

1. Implement Monte Carlo simulation
2. Calculate ripple effects through dependency graph
3. Return probabilistic forecasts
4. Update `simulate_ripple_stub` in `decision_risk_engine.py`

## Next Steps

### Immediate (v0.1)
- [ ] Replace forecast stub with real Monte Carlo simulation
- [ ] Implement command execution layer (write to DB)
- [ ] Add command validation
- [ ] Add more event types

### Short-term (v0.2)
- [ ] Add rule priority/ordering
- [ ] Add command batching/deduplication
- [ ] Add audit trail for rule evaluations
- [ ] Add notification system

### Medium-term (v1.0)
- [ ] Support conditional rules
- [ ] Support temporal rules (time-based triggers)
- [ ] Add rule versioning
- [ ] Add A/B testing for rules

## Troubleshooting

### "No commands emitted"

Check that:
1. Event type is supported
2. Required fields are provided (dependency_id, decision_id, etc.)
3. State snapshot contains relevant entities
4. Rules are loaded in the engine

### "Command execution failed"

Check that:
1. Command payload is valid
2. Target entity exists in database
3. Database permissions are correct
4. Command handler is implemented

### "Forecast stub returns wrong values"

This is expected! The stub uses simple heuristics. Replace it with real simulation for accurate forecasts.

## Support

For questions or issues:
1. Check the README: `backend/app/engine/README_DECISION_RISK_ENGINE.md`
2. Run the demo: `python -m app.engine.demo_decision_risk_engine`
3. Review the code: `backend/app/engine/decision_risk_engine.py`
4. Check the tests: `backend/app/engine/test_decision_risk_engine.py`

