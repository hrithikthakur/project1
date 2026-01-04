# Decision Risk Engine Specification

This document defines the event-driven decision risk engine architecture.

The engine operates on a simple principle:

> **Events** describe reality → **Rules** interpret reality → **Commands** change state

The engine never mutates state directly. It only emits commands.

---

## 1. EVENTS

Events are facts emitted by the state layer.
They describe **what changed**, not **what to do**.

### A. Dependency Events

These come from user actions or integrations.

- `DEPENDENCY_BLOCKED`
- `DEPENDENCY_UNBLOCKED`
- `DEPENDENCY_UNAVAILABLE`
- `DEPENDENCY_AVAILABLE`

**Payload (minimal):**
```
dependency_id
milestone_id
owner_id
timestamp
```

---

### B. Issue Events

- `ISSUE_CREATED`
- `ISSUE_RESOLVED`
- `ISSUE_ESCALATED`

**Payload:**
```
issue_id
issue_type
milestone_id
timestamp
```

---

### C. Risk Events

- `RISK_CREATED`
- `RISK_UPDATED`
- `RISK_ACCEPTANCE_EXPIRED`
- `RISK_MATERIALISED`

**Payload:**
```
risk_id
risk_status
milestone_id
timestamp
```

---

### D. Decision Events

- `DECISION_CREATED`
- `DECISION_APPROVED`
- `DECISION_SUPERSEDED`

**Payload:**
```
decision_id
decision_type
milestone_id
timestamp
```

---

### E. Change Events

- `CHANGE_CREATED`
- `CHANGE_APPROVED`
- `CHANGE_REJECTED`

**Payload:**
```
change_id
change_type
milestone_id
timestamp
```

---

### F. Forecast Events

- `FORECAST_UPDATED`
- `FORECAST_THRESHOLD_BREACHED`

**Payload:**
```
forecast_id
p50_date
p80_date
delta_p80_days
milestone_id
timestamp
```

---

## 2. RULES

Rules are pure logic:

> **When** event X happens, **and** condition Y holds, **emit** commands Z.

---

### Rule 1: Dependency blocked → Issue + Risk

**When:**
- Event = `DEPENDENCY_BLOCKED` or `DEPENDENCY_UNAVAILABLE`

**Then:**
1. Ensure Issue exists (type: `dependency_blocked`)
2. Call forecast/ripple engine
3. If `delta_p80_days > threshold`:
   - Create or update Risk
   - Set owner
   - Set `next_date` (+7 days)

---

### Rule 2: Dependency unblocked → Issue resolved

**When:**
- Event = `DEPENDENCY_UNBLOCKED` or `DEPENDENCY_AVAILABLE`

**Then:**
1. Resolve related Issue
2. Recompute forecast
3. Update Risk impact (do not auto-close)

---

### Rule 3: Forecast threshold breached → Escalate risk

**When:**
- Event = `FORECAST_THRESHOLD_BREACHED`

**Then:**
1. If risk is `ACCEPTED` and boundary breached:
   - Reopen risk
   - Escalate
2. Tighten `next_date` (+2 days)

---

### Rule 4: Decision approved (ACCEPT_RISK)

**When:**
- Event = `DECISION_APPROVED`
- `decision_type = ACCEPT_RISK`

**Then:**
1. Set `risk.status = ACCEPTED`
2. Store acceptance boundary
3. Suppress escalation until boundary
4. Set `next_date` = review date

---

### Rule 5: Decision approved (MITIGATE_RISK)

**When:**
- Event = `DECISION_APPROVED`
- `decision_type = MITIGATE_RISK`

**Then:**
1. Set `risk.status = MITIGATING`
2. Track mitigation `due_date`
3. Recompute forecast on completion

---

### Rule 6: Risk materialises → Issue

**When:**
- Event = `RISK_MATERIALISED`

**Then:**
1. Create Issue linked to Risk
2. Escalate
3. Tighten `next_date`

---

### Rule 7: Issue resolved → Update forecast

**When:**
- Event = `ISSUE_RESOLVED`

**Then:**
1. Recompute forecast
2. Update risk probability/impact
3. Possibly close risk if no longer relevant

---

### Rule 8: Change approved → Forecast update

**When:**
- Event = `CHANGE_APPROVED`

**Then:**
1. Recompute forecast
2. If negative impact:
   - Create or update Risk
3. Set `next_date`

---

### Rule 9: Decision superseded

**When:**
- Event = `DECISION_SUPERSEDED`

**Then:**
1. Re-evaluate linked risks
2. Restore escalation if needed
3. Set new `next_dates`

---

## 3. COMMANDS

Commands are instructions the engine emits.
The state layer executes them.

### Core Commands (v1)

#### Issue-related
- `CREATE_ISSUE`
- `UPDATE_ISSUE`
- `RESOLVE_ISSUE`
- `ESCALATE_ISSUE`

#### Risk-related
- `CREATE_RISK`
- `UPDATE_RISK`
- `SET_RISK_STATUS`
- `LINK_RISK_TO_MILESTONE`

#### Decision-related
- `LINK_DECISION_TO_RISK`
- `MARK_DECISION_EFFECTIVE`

#### Forecast-related
- `UPDATE_FORECAST`
- `RECOMPUTE_FORECAST`

#### Control / hygiene
- `SET_NEXT_DATE`
- `ASSIGN_OWNER`
- `EMIT_EXPLANATION`

**Every command must include:**
```
command_type
target_object_id
reason
rule_name
timestamp
```

---

## 4. What is deliberately NOT here

This is important discipline.

**❌ No:**
- Approvals
- Notifications
- ML
- Permissions
- UI actions
- Workflows
- Free-form rules

Those belong elsewhere.

---

## 5. The One Invariant to Enforce

> **Every event handled must result in either zero or more explicit commands.**
> 
> **No silent state changes.**

If nothing happens, that's a valid outcome.
But it must be explicit.

---

## Final Mental Model (Lock This In)

- **Events** describe reality
- **Rules** interpret reality
- **Commands** change state
- **The engine never mutates directly**

That's the whole system.

---

## Implementation Status

✅ **Rule 1:** Dependency blocked → Issue + Risk (IMPLEMENTED)
⏳ **Rule 2:** Dependency unblocked → Issue resolved (STUBBED)
⏳ **Rule 3:** Forecast threshold breached → Escalate risk (STUBBED)
✅ **Rule 4:** Decision approved (ACCEPT_RISK) (IMPLEMENTED)
✅ **Rule 5:** Decision approved (MITIGATE_RISK) (IMPLEMENTED)
⏳ **Rule 6:** Risk materialises → Issue (STUBBED)
⏳ **Rule 7:** Issue resolved → Update forecast (STUBBED)
⏳ **Rule 8:** Change approved → Forecast update (STUBBED)
⏳ **Rule 9:** Decision superseded (STUBBED)

---

## Architecture Diagram

```
┌─────────────┐
│   Events    │  (Facts: what happened)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Rules    │  (Logic: when X, do Y)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Commands   │  (Instructions: change state)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ State Layer │  (Executes commands)
└─────────────┘
```

---

## Usage Example

```python
from app.engine.decision_risk_engine import (
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
    dependency_id="dep_001",
    milestone_id="milestone_001",
    timestamp=datetime.now()
)

# Create state snapshot
state = StateSnapshot(
    dependencies={"dep_001": {...}},
    work_items={...},
    risks={...},
    # ... other state
)

# Process event
commands = engine.process_event(event, state)

# Execute commands (state layer responsibility)
for command in commands:
    print(f"Command: {command.command_type}")
    print(f"Target: {command.target_id}")
    print(f"Reason: {command.reason}")
```

---

## Next Steps

1. ✅ Write this specification
2. ✅ Implement Rule 1 only
3. ✅ Stub all other rules
4. ⏳ Once Rule 1 works, implement remaining rules mechanically
5. ⏳ Add comprehensive tests
6. ⏳ Integrate with API layer

Once Rule 1 works end-to-end, the rest become mechanical.

