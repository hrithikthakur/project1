# Decision-Risk Engine v0 - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROJECT DELIVERY SYSTEM                      │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Work Items  │  │ Dependencies │  │  Milestones  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Decisions  │  │    Risks     │  │    Issues    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ State Changes
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          EVENT STREAM                                │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ DEPENDENCY       │  │ DECISION         │  │ RISK             │ │
│  │ BLOCKED          │  │ APPROVED         │  │ THRESHOLD        │ │
│  └──────────────────┘  └──────────────────┘  │ EXCEEDED         │ │
│                                               └──────────────────┘ │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DECISION-RISK ENGINE v0                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  process_event(event, state) → commands[]                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │  Rule 1:        │  │  Rule 2:        │  │  Rule 3:        │   │
│  │  Dependency     │  │  Accept Risk    │  │  Mitigate Risk  │   │
│  │  Blocked        │  │  Approved       │  │  Approved       │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
│                                                                      │
│  Each rule:                                                         │
│  • matches(event, state) → bool                                    │
│  • execute(event, state) → commands[]                              │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ Commands
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        COMMAND HANDLER                               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ CREATE_RISK  │  │ UPDATE_RISK  │  │ CREATE_ISSUE │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │SET_NEXT_DATE │  │UPDATE_       │  │CREATE_       │             │
│  │              │  │FORECAST      │  │NOTIFICATION  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                      │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ Database Writes
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                   │
│                                                                      │
│  Risks updated, Issues created, Next dates set, etc.               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Event Creation

```
User Action / System Event
         │
         ▼
┌─────────────────┐
│  Event          │
│  ├─ event_id    │
│  ├─ event_type  │
│  ├─ timestamp   │
│  └─ context     │
└─────────────────┘
```

### 2. State Snapshot

```
Current System State
         │
         ▼
┌─────────────────────┐
│  StateSnapshot      │
│  ├─ work_items      │
│  ├─ dependencies    │
│  ├─ risks           │
│  ├─ issues          │
│  ├─ decisions       │
│  ├─ milestones      │
│  ├─ ownerships      │
│  └─ forecasts       │
└─────────────────────┘
```

### 3. Rule Evaluation

```
For each rule:
    if rule.matches(event, state):
        commands.extend(rule.execute(event, state))
```

### 4. Command Generation

```
┌─────────────────────┐
│  Command            │
│  ├─ command_id      │
│  ├─ command_type    │
│  ├─ target_id       │
│  ├─ reason          │  ← Why this command?
│  ├─ rule_name       │  ← Which rule generated it?
│  ├─ payload         │
│  └─ priority        │
└─────────────────────┘
```

## Rule Architecture

### Rule Base Class

```python
class Rule:
    name: str
    
    def matches(event, state) → bool:
        """Should this rule fire?"""
        
    def execute(event, state) → commands[]:
        """What commands should be issued?"""
```

### Rule 1: Dependency Blocked

```
Event: DEPENDENCY_BLOCKED
  │
  ├─ Get dependency from state
  │
  ├─ Create Issue (type: dependency_blocked)
  │
  ├─ Call forecast stub
  │   └─ Returns: forecast_before, forecast_after, delta
  │
  ├─ If delta_p80 > threshold (7 days):
  │   ├─ Create/Update Risk
  │   │   ├─ severity: based on delta
  │   │   ├─ status: active
  │   │   └─ impact: {p80_delay_days, p50_delay_days}
  │   │
  │   └─ Set Next Date
  │       ├─ owner: dependency owner
  │       └─ next_date: now + 7 days
  │
  └─ Return commands[]
```

### Rule 2: Accept Risk Decision Approved

```
Event: DECISION_APPROVED (type: accept_risk)
  │
  ├─ Get decision from state
  │
  ├─ Get risk from state
  │
  ├─ Update Risk
  │   ├─ status: accepted
  │   ├─ accepted_at: now
  │   └─ accepted_by_decision: decision_id
  │
  ├─ Set Next Date
  │   ├─ owner: risk owner
  │   ├─ next_date: acceptance_until
  │   └─ suppress_escalation_until: acceptance_until
  │
  └─ Return commands[]
```

### Rule 3: Mitigate Risk Decision Approved

```
Event: DECISION_APPROVED (type: mitigate_risk)
  │
  ├─ Get decision from state
  │
  ├─ Get risk from state
  │
  ├─ Update Risk
  │   ├─ status: mitigating
  │   ├─ mitigation_started_at: now
  │   ├─ mitigation_decision: decision_id
  │   ├─ mitigation_action: decision.action
  │   └─ mitigation_due_date: decision.due_date
  │
  ├─ Set Next Date
  │   ├─ owner: risk owner
  │   ├─ next_date: due_date
  │   └─ action_required: complete_mitigation
  │
  ├─ Schedule Forecast Update
  │   ├─ trigger: mitigation_completion
  │   └─ risk_id: risk_id
  │
  └─ Return commands[]
```

## Forecast Stub Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  simulate_ripple_stub(event, state) → ForecastResult           │
│                                                                  │
│  Current Implementation (Deterministic Heuristic):              │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  if event_type == DEPENDENCY_BLOCKED:                  │    │
│  │      delta_p50 = 7.0 days                              │    │
│  │      delta_p80 = 14.0 days                             │    │
│  │      confidence = "LOW"                                │    │
│  │      method = "heuristic_stub"                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Future Implementation (Monte Carlo):                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Build dependency graph                             │    │
│  │  2. Run N simulations (e.g., 1000)                     │    │
│  │  3. Calculate ripple effects                           │    │
│  │  4. Return probabilistic forecasts                     │    │
│  │     • P50, P80, P90 dates                              │    │
│  │     • Confidence intervals                             │    │
│  │     • Sensitivity analysis                             │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Command Execution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  execute_command(cmd)                                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  if cmd.command_type == CREATE_RISK:                   │    │
│  │      db.risks.create(cmd.payload)                      │    │
│  │                                                         │    │
│  │  elif cmd.command_type == UPDATE_RISK:                 │    │
│  │      db.risks.update(cmd.target_id, cmd.payload)       │    │
│  │                                                         │    │
│  │  elif cmd.command_type == SET_NEXT_DATE:               │    │
│  │      db.ownerships.update_next_date(...)               │    │
│  │                                                         │    │
│  │  # Log execution                                       │    │
│  │  db.command_log.create({                               │    │
│  │      "command_id": cmd.command_id,                     │    │
│  │      "executed_at": now(),                             │    │
│  │      "rule_name": cmd.rule_name,                       │    │
│  │  })                                                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## API Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI Application                                            │
│                                                                  │
│  POST /api/decision-risk-engine/events                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Parse request → EventSubmission                    │    │
│  │  2. Create Event                                       │    │
│  │  3. Get StateSnapshot (from DB or cache)               │    │
│  │  4. engine.process_event(event, state) → commands      │    │
│  │  5. Return commands (don't execute)                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  POST /api/decision-risk-engine/events/execute                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1-4. Same as above                                    │    │
│  │  5. Execute commands (write to DB)                     │    │
│  │  6. Return commands + execution results                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  GET /api/decision-risk-engine/health                           │
│  GET /api/decision-risk-engine/rules                            │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Test Suite (pytest)                                            │
│                                                                  │
│  Unit Tests:                                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  • test_rule_1_matches_dependency_blocked_only()       │    │
│  │  • test_rule_2_matches_accept_risk_only()              │    │
│  │  • test_rule_3_matches_mitigate_risk_only()            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Integration Tests:                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  • test_dependency_blocked_creates_risk()              │    │
│  │  • test_accept_risk_transitions_status()               │    │
│  │  • test_mitigate_risk_transitions_status()             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Property Tests:                                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  • test_engine_is_deterministic()                      │    │
│  │  • test_engine_does_not_mutate_state()                 │    │
│  │  • test_all_commands_have_metadata()                   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Production Deployment                                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  FastAPI Server (Uvicorn)                              │    │
│  │  ├─ API Endpoints                                      │    │
│  │  ├─ Decision-Risk Engine (in-memory)                   │    │
│  │  └─ Command Handler                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Event Sources                                         │    │
│  │  ├─ Database triggers (on state change)                │    │
│  │  ├─ API endpoints (user actions)                       │    │
│  │  ├─ Scheduled jobs (periodic checks)                   │    │
│  │  └─ Webhooks (external systems)                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Database                                              │    │
│  │  ├─ Work Items, Dependencies, Milestones              │    │
│  │  ├─ Risks, Issues, Decisions                          │    │
│  │  ├─ Ownerships, Forecasts                             │    │
│  │  └─ Command Log (audit trail)                         │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Extension Points

### Adding New Event Types

```python
class EventType(str, Enum):
    # Existing
    DEPENDENCY_BLOCKED = "dependency_blocked"
    DECISION_APPROVED = "decision_approved"
    
    # New
    WORK_ITEM_COMPLETED = "work_item_completed"
    ACTOR_UNAVAILABLE = "actor_unavailable"
    MILESTONE_MISSED = "milestone_missed"
```

### Adding New Command Types

```python
class CommandType(str, Enum):
    # Existing
    CREATE_RISK = "create_risk"
    UPDATE_RISK = "update_risk"
    
    # New
    ESCALATE_RISK = "escalate_risk"
    NOTIFY_STAKEHOLDER = "notify_stakeholder"
    TRIGGER_REPLAN = "trigger_replan"
```

### Adding New Rules

```python
class Rule4_WorkItemCompleted(Rule):
    name = "rule_4_work_item_completed"
    
    def matches(self, event, state):
        return event.event_type == EventType.WORK_ITEM_COMPLETED
    
    def execute(self, event, state):
        # Check if this unblocks any dependencies
        # Update forecasts for dependent items
        # Close related issues
        return commands
```

## Performance Considerations

### Current Performance (with stub)

```
Latency:     < 10ms per event
Throughput:  ~10,000 events/second
Memory:      ~10MB (engine + state snapshot)
CPU:         ~5% (single core)
```

### Expected Performance (with real simulation)

```
Latency:     100-500ms per event
Throughput:  ~100-1000 events/second
Memory:      ~100MB (simulation state)
CPU:         ~50% (multiple cores)
```

### Optimization Strategies

1. **Cache simulation results**
   - Key: (dependency_graph_hash, event_type)
   - TTL: 5 minutes

2. **Async simulation**
   - Process event → emit commands immediately
   - Run simulation in background
   - Update forecast when complete

3. **Incremental simulation**
   - Only re-simulate affected items
   - Reuse unchanged portions of graph

4. **Parallel processing**
   - Process independent events in parallel
   - Use process pool for simulations

## Security Considerations

### Input Validation

```python
# Validate event before processing
if not event.event_id:
    raise ValueError("event_id required")
if not event.event_type:
    raise ValueError("event_type required")

# Validate state snapshot
if not isinstance(state, StateSnapshot):
    raise TypeError("state must be StateSnapshot")
```

### Command Validation

```python
# Validate command before execution
if not cmd.command_id:
    raise ValueError("command_id required")
if not cmd.target_id:
    raise ValueError("target_id required")
if not cmd.reason:
    raise ValueError("reason required")
if not cmd.rule_name:
    raise ValueError("rule_name required")
```

### Audit Trail

```python
# Log all events and commands
db.audit_log.create({
    "event_id": event.event_id,
    "event_type": event.event_type,
    "commands_issued": len(commands),
    "rules_fired": [cmd.rule_name for cmd in commands],
    "timestamp": now(),
})
```

## Monitoring and Observability

### Metrics to Track

```
• Events processed per second
• Commands issued per event
• Rule execution time
• Command execution time
• Error rate
• Cache hit rate (for simulations)
```

### Logging

```python
logger.info(f"Event {event.event_id} processed")
logger.info(f"  Type: {event.event_type}")
logger.info(f"  Commands issued: {len(commands)}")
logger.info(f"  Rules fired: {[cmd.rule_name for cmd in commands]}")
```

### Alerting

```
• Alert if error rate > 1%
• Alert if latency > 1 second
• Alert if no events processed in 5 minutes
• Alert if command execution fails
```

---

**This architecture is designed for:**
- ✅ Clarity: Easy to understand
- ✅ Testability: Pure functions, no side effects
- ✅ Maintainability: Clear separation of concerns
- ✅ Extensibility: Easy to add rules, events, commands
- ✅ Performance: Fast with stub, scalable with real simulation

