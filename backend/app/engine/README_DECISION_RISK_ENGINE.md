# Decision-Risk Engine v0

## Overview

The Decision-Risk Engine is a deterministic, rule-based system that listens to state change events and emits commands to modify system state. It does NOT write to the database directly—instead, it produces commands that are executed by a separate command handler.

## Architecture

```
(event, current_state) → engine.process_event() → commands[]
```

### Core Principles

1. **Deterministic**: Same input always produces same output
2. **Side-effect free**: Only emits commands, never mutates state
3. **Testable**: Pure functions with clear inputs/outputs
4. **Rule-based**: Logic is organized into discrete, composable rules

## Components

### 1. Event Schema

Events represent immutable facts about what happened in the system.

```python
class Event(BaseModel):
    event_id: str
    event_type: EventType  # DEPENDENCY_BLOCKED, DECISION_APPROVED, etc.
    timestamp: datetime
    # Event-specific fields (dependency_id, decision_id, etc.)
    metadata: Dict[str, Any]
```

**Supported Event Types:**
- `DEPENDENCY_BLOCKED`: A dependency is blocking progress
- `DECISION_APPROVED`: A decision was approved
- `DECISION_REJECTED`: A decision was rejected
- `RISK_THRESHOLD_EXCEEDED`: A risk exceeded its threshold
- `MILESTONE_AT_RISK`: A milestone is at risk

### 2. Command Schema

Commands represent actions to be taken. They are emitted by the engine but executed elsewhere.

```python
class Command(BaseModel):
    command_id: str
    command_type: CommandType
    target_id: str  # ID of entity to act on
    reason: str     # Why this command was issued
    rule_name: str  # Which rule generated this
    payload: Dict[str, Any]
    priority: str = "normal"
```

**Supported Command Types:**
- `CREATE_ISSUE`: Create a new issue
- `UPDATE_ISSUE`: Update an existing issue
- `CREATE_RISK`: Create a new risk
- `UPDATE_RISK`: Update an existing risk
- `UPDATE_FORECAST`: Update forecast data
- `SET_NEXT_DATE`: Set next review date for owner
- `CREATE_NOTIFICATION`: Create a notification

### 3. State Snapshot

An immutable snapshot of current system state. The engine reads from this but never mutates it.

```python
class StateSnapshot(BaseModel):
    work_items: Dict[str, Any]
    dependencies: Dict[str, Any]
    risks: Dict[str, Any]
    issues: Dict[str, Any]
    decisions: Dict[str, Any]
    milestones: Dict[str, Any]
    ownerships: Dict[str, Any]
    forecasts: Dict[str, Any]
```

## Implemented Rules

### Rule 1: Dependency Blocked

**When**: A dependency is blocked

**Then**:
1. Ensure an Issue exists (type: `dependency_blocked`)
2. Call the forecast/ripple stub
3. Compare forecast before vs after
4. If P80 delta > 7 days threshold:
   - Create or update a Risk
   - Set owner (dependency owner or milestone owner)
   - Set next_date = now + 7 days

**Configuration**:
- `P80_THRESHOLD_DAYS = 7.0`

### Rule 2: Accept Risk Decision Approved

**When**: 
- Event = `DECISION_APPROVED`
- Decision type = `ACCEPT_RISK`

**Then**:
1. Transition `Risk.status` → `ACCEPTED`
2. Suppress escalation until acceptance boundary
3. Set `next_date` = `acceptance_until` (or sooner)

### Rule 3: Mitigate Risk Decision Approved

**When**:
- Event = `DECISION_APPROVED`
- Decision type = `MITIGATE_RISK`

**Then**:
1. Transition `Risk.status` → `MITIGATING`
2. Track mitigation `due_date`
3. Schedule forecast recomputation on mitigation completion

## Forecast/Ripple Stub

The engine uses a deterministic stub for forecast simulation:

```python
def simulate_ripple_stub(
    triggering_event: Event,
    state_snapshot: StateSnapshot
) -> ForecastResult:
    # Returns deterministic heuristic results
    # TODO: Replace with real Monte Carlo simulation
```

**Current behavior**:
- Dependency blocks: adds ~7 days P50, ~14 days P80
- All results tagged with `confidence="LOW"` and `method="heuristic_stub"`

## Usage

### Basic Usage

```python
from engine.decision_risk_engine import (
    DecisionRiskEngine,
    Event,
    EventType,
    StateSnapshot
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

# Execute commands (outside the engine)
for cmd in commands:
    execute_command(cmd)  # Your command handler
```

### Adding Custom Rules

```python
from engine.decision_risk_engine import Rule, Command

class CustomRule(Rule):
    name = "custom_rule"
    
    def matches(self, event: Event, state: StateSnapshot) -> bool:
        # Return True if this rule applies
        return event.event_type == EventType.MILESTONE_AT_RISK
    
    def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
        # Generate and return commands
        return [Command(...)]

# Add to engine
engine = DecisionRiskEngine()
engine.add_rule(CustomRule())
```

## Testing

Run the test suite:

```bash
cd backend
pytest app/engine/test_decision_risk_engine.py -v
```

**Key test cases**:
- ✅ Dependency blocked → risk created
- ✅ Accept risk decision → status transitions
- ✅ Mitigate risk decision → status transitions
- ✅ Engine is deterministic (same input → same output)
- ✅ Engine does not mutate state
- ✅ All commands have required metadata

## Integration

### Command Execution

Commands emitted by the engine must be executed by a separate command handler:

```python
def execute_command(cmd: Command):
    """Execute a command by writing to the database"""
    if cmd.command_type == CommandType.CREATE_RISK:
        # Write to database
        db.risks.create(cmd.payload)
    elif cmd.command_type == CommandType.UPDATE_RISK:
        # Update database
        db.risks.update(cmd.target_id, cmd.payload)
    # ... handle other command types
```

### Event Stream

Events can come from:
- Database triggers (e.g., when a dependency is marked as blocked)
- API endpoints (e.g., when a decision is approved)
- Scheduled jobs (e.g., checking for threshold exceedances)
- External systems (e.g., when an external blocker is reported)

Example API integration:

```python
from fastapi import APIRouter
from engine.decision_risk_engine import DecisionRiskEngine, Event, EventType

router = APIRouter()
engine = DecisionRiskEngine()

@router.post("/events/dependency-blocked")
async def handle_dependency_blocked(dependency_id: str):
    # Create event
    event = Event(
        event_id=generate_id(),
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id=dependency_id
    )
    
    # Get current state
    state = get_current_state_snapshot()
    
    # Process event
    commands = engine.process_event(event, state)
    
    # Execute commands
    for cmd in commands:
        execute_command(cmd)
    
    return {"commands_issued": len(commands)}
```

## Future Improvements

### Near-term (v0.1)
- [ ] Replace forecast stub with real Monte Carlo simulation
- [ ] Add more event types (work item completed, actor unavailable, etc.)
- [ ] Add command batching/deduplication
- [ ] Add command validation before execution

### Medium-term (v0.2)
- [ ] Add rule priority/ordering
- [ ] Add rule conflict detection
- [ ] Add command rollback/undo support
- [ ] Add audit trail for all rule evaluations

### Long-term (v1.0)
- [ ] Support conditional rules (if-then-else logic)
- [ ] Support temporal rules (if X happens within Y days of Z)
- [ ] Add rule versioning and migration
- [ ] Add A/B testing for rules

## Design Decisions

### Why commands instead of direct DB writes?

1. **Testability**: Easy to test without database
2. **Auditability**: All changes are explicit commands
3. **Flexibility**: Can batch, defer, or cancel commands
4. **Separation of concerns**: Engine focuses on logic, not persistence

### Why deterministic stub for forecast?

1. **Incremental development**: Can test engine logic before simulation is ready
2. **Fast tests**: Don't need expensive Monte Carlo in unit tests
3. **Clear interface**: Stub defines the contract for real simulation

### Why rule-based instead of ML/AI?

1. **Transparency**: Stakeholders can understand and audit decisions
2. **Correctness**: Can prove behavior is correct
3. **Speed**: No training, no model serving overhead
4. **Simplicity**: Easier to maintain and debug

## Glossary

- **Event**: Immutable fact about something that happened
- **Command**: Action to be taken (not yet executed)
- **State Snapshot**: Immutable view of current system state
- **Rule**: Condition + action logic
- **Engine**: Coordinator that evaluates rules and emits commands
- **Forecast**: Probabilistic prediction of future dates (P50, P80, etc.)
- **Ripple Effect**: How changes propagate through dependency graph

## Contributing

When adding new rules:

1. Extend `EventType` enum if needed
2. Create new `Rule` subclass
3. Implement `matches()` and `execute()` methods
4. Add comprehensive tests
5. Document the rule in this README
6. Consider edge cases and failure modes

When modifying existing rules:

1. Update tests first (TDD)
2. Ensure backward compatibility
3. Update documentation
4. Run full test suite

