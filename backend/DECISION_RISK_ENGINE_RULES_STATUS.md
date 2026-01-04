# Decision Risk Engine - Rules Status

Quick reference for all 9 rules.

---

## Rule 1: Dependency blocked → Issue + Risk ✅ IMPLEMENTED

**Triggers:**
- `DEPENDENCY_BLOCKED`
- `DEPENDENCY_UNAVAILABLE`

**Logic:**
1. Ensure Issue exists (type: dependency_blocked)
2. Call forecast/ripple engine
3. If delta_p80_days > 7 days threshold:
   - Create or update Risk
   - Set owner
   - Set next_date (+7 days)

**Commands:**
- `CREATE_ISSUE` (if issue doesn't exist)
- `CREATE_RISK` (if P80 > threshold)
- `UPDATE_RISK` (if risk exists and P80 > threshold)
- `SET_NEXT_DATE`

**Test:** ✅ Working in `example_usage.py`

---

## Rule 2: Dependency unblocked → Issue resolved ⏳ STUBBED

**Triggers:**
- `DEPENDENCY_UNBLOCKED`
- `DEPENDENCY_AVAILABLE`

**Logic:**
1. Resolve related Issue
2. Recompute forecast
3. Update Risk impact (do not auto-close)

**Commands:**
- `RESOLVE_ISSUE`
- `RECOMPUTE_FORECAST`
- `UPDATE_RISK`

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    # 1. Find and resolve related Issue
    issue_id = f"issue_dep_blocked_{event.dependency_id}"
    if issue_id in state.issues:
        commands.append(Command(
            command_type=CommandType.RESOLVE_ISSUE,
            target_id=issue_id,
            reason="Dependency unblocked",
            rule_name=self.name,
            ...
        ))
    
    # 2. Recompute forecast
    # 3. Update risk impact
    
    return commands
```

---

## Rule 3: Forecast threshold breached → Escalate risk ⏳ STUBBED

**Triggers:**
- `FORECAST_THRESHOLD_BREACHED`

**Logic:**
1. If risk is ACCEPTED and boundary breached:
   - Reopen risk
   - Escalate
2. Tighten next_date (+2 days)

**Commands:**
- `UPDATE_RISK` (reopen)
- `ESCALATE_ISSUE`
- `SET_NEXT_DATE`

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    # 1. Check if risk is ACCEPTED
    risk = state.risks.get(event.risk_id)
    if risk and risk.get("status") == "accepted":
        # Check if boundary breached
        # Reopen and escalate
        ...
    
    # 2. Tighten next_date (+2 days)
    
    return commands
```

---

## Rule 4: Decision approved (ACCEPT_RISK) ✅ IMPLEMENTED

**Triggers:**
- `DECISION_APPROVED` (type: accept_risk)

**Logic:**
1. Set risk.status = ACCEPTED
2. Store acceptance boundary
3. Suppress escalation until boundary
4. Set next_date = review date

**Commands:**
- `UPDATE_RISK`
- `SET_NEXT_DATE`

**Test:** ✅ Working in `example_usage.py`

---

## Rule 5: Decision approved (MITIGATE_RISK) ✅ IMPLEMENTED

**Triggers:**
- `DECISION_APPROVED` (type: mitigate_risk)

**Logic:**
1. Set risk.status = MITIGATING
2. Track mitigation due_date
3. Recompute forecast on completion

**Commands:**
- `UPDATE_RISK`
- `SET_NEXT_DATE`
- `UPDATE_FORECAST`

**Test:** ✅ Working in codebase

---

## Rule 6: Risk materialises → Issue ⏳ STUBBED

**Triggers:**
- `RISK_MATERIALISED`

**Logic:**
1. Create Issue linked to Risk
2. Escalate
3. Tighten next_date

**Commands:**
- `CREATE_ISSUE`
- `ESCALATE_ISSUE`
- `SET_NEXT_DATE`

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    risk = state.risks.get(event.risk_id)
    if not risk:
        return commands
    
    # 1. Create Issue linked to Risk
    issue_id = f"issue_risk_materialised_{event.risk_id}"
    commands.append(Command(
        command_type=CommandType.CREATE_ISSUE,
        target_id=issue_id,
        reason=f"Risk {event.risk_id} has materialised",
        rule_name=self.name,
        payload={
            "type": "risk_materialised",
            "risk_id": event.risk_id,
            ...
        }
    ))
    
    # 2. Escalate
    # 3. Tighten next_date
    
    return commands
```

---

## Rule 7: Issue resolved → Update forecast ⏳ STUBBED

**Triggers:**
- `ISSUE_RESOLVED`

**Logic:**
1. Recompute forecast
2. Update risk probability/impact
3. Possibly close risk if no longer relevant

**Commands:**
- `RECOMPUTE_FORECAST`
- `UPDATE_RISK`
- `SET_RISK_STATUS` (optional: close)

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    issue = state.issues.get(event.issue_id)
    if not issue:
        return commands
    
    # 1. Recompute forecast
    commands.append(Command(
        command_type=CommandType.RECOMPUTE_FORECAST,
        target_id=event.milestone_id or "default",
        reason="Issue resolved, updating forecast",
        rule_name=self.name,
        ...
    ))
    
    # 2. Find linked risk and update
    risk_id = issue.get("risk_id")
    if risk_id:
        # Update risk probability/impact
        # Possibly close if no longer relevant
        ...
    
    return commands
```

---

## Rule 8: Change approved → Forecast update ⏳ STUBBED

**Triggers:**
- `CHANGE_APPROVED`

**Logic:**
1. Recompute forecast
2. If negative impact:
   - Create or update Risk
3. Set next_date

**Commands:**
- `RECOMPUTE_FORECAST`
- `CREATE_RISK` or `UPDATE_RISK` (conditional)
- `SET_NEXT_DATE`

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    # 1. Recompute forecast
    # Get forecast before/after
    forecast_result = simulate_ripple_stub(event, state)
    
    # 2. If negative impact, create/update Risk
    if forecast_result.delta_p80_days > threshold:
        commands.append(Command(
            command_type=CommandType.CREATE_RISK,
            ...
        ))
    
    # 3. Set next_date
    
    return commands
```

---

## Rule 9: Decision superseded ⏳ STUBBED

**Triggers:**
- `DECISION_SUPERSEDED`

**Logic:**
1. Re-evaluate linked risks
2. Restore escalation if needed
3. Set new next_dates

**Commands:**
- `UPDATE_RISK`
- `SET_NEXT_DATE`
- `ESCALATE_ISSUE` (conditional)

**Implementation needed:**
```python
def execute(self, event: Event, state: StateSnapshot) -> List[Command]:
    commands = []
    
    decision = state.decisions.get(event.decision_id)
    if not decision:
        return commands
    
    # 1. Find linked risks
    risk_id = decision.get("risk_id")
    if risk_id:
        risk = state.risks.get(risk_id)
        
        # 2. Re-evaluate risk
        # If decision was ACCEPT_RISK, restore escalation
        if decision.get("decision_type") == "accept_risk":
            commands.append(Command(
                command_type=CommandType.UPDATE_RISK,
                target_id=risk_id,
                reason="Acceptance decision superseded",
                rule_name=self.name,
                payload={
                    "status": "active",  # Restore from ACCEPTED
                    "acceptance_boundary": None,  # Clear boundary
                }
            ))
        
        # 3. Set new next_dates
        ...
    
    return commands
```

---

## Summary Table

| Rule | Trigger Events | Status | Priority |
|------|---------------|--------|----------|
| 1 | DEPENDENCY_BLOCKED, DEPENDENCY_UNAVAILABLE | ✅ IMPLEMENTED | HIGH |
| 2 | DEPENDENCY_UNBLOCKED, DEPENDENCY_AVAILABLE | ⏳ STUBBED | HIGH |
| 3 | FORECAST_THRESHOLD_BREACHED | ⏳ STUBBED | MEDIUM |
| 4 | DECISION_APPROVED (accept_risk) | ✅ IMPLEMENTED | HIGH |
| 5 | DECISION_APPROVED (mitigate_risk) | ✅ IMPLEMENTED | HIGH |
| 6 | RISK_MATERIALISED | ⏳ STUBBED | LOW |
| 7 | ISSUE_RESOLVED | ⏳ STUBBED | MEDIUM |
| 8 | CHANGE_APPROVED | ⏳ STUBBED | LOW |
| 9 | DECISION_SUPERSEDED | ⏳ STUBBED | LOW |

**Progress: 3/9 implemented (33%)**

---

## Recommended Implementation Order

1. ✅ **Rule 1** - Foundation for dependency management
2. **Rule 2** - Completes dependency lifecycle (NEXT)
3. **Rule 7** - Completes issue lifecycle
4. **Rule 3** - Risk monitoring and escalation
5. **Rule 8** - Change impact assessment
6. **Rule 6** - Risk materialization handling
7. **Rule 9** - Decision lifecycle cleanup

Rules 4 & 5 are already implemented.

---

## Testing Strategy

For each rule implementation:

1. **Unit test**: Event + State → Commands
2. **Integration test**: Full event flow
3. **Edge cases**: Empty state, missing entities, etc.
4. **Examples**: Add to `example_usage.py`

**Template:**
```python
def test_rule_X():
    engine = DecisionRiskEngine()
    event = Event(...)
    state = StateSnapshot(...)
    commands = engine.process_event(event, state)
    
    assert len(commands) == expected_count
    assert commands[0].command_type == expected_type
    assert commands[0].reason == expected_reason
```

---

## Notes

- All stubbed rules have matching logic in place
- Implementation is mechanical once Rule 1 pattern is understood
- Each rule should take ~30-60 minutes to implement
- Total remaining work: ~4-6 hours for all 6 stubbed rules

