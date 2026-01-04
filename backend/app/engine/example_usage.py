"""
Example usage of the Decision Risk Engine

This demonstrates how to use the event-driven decision risk engine
with Rule 1 (Dependency blocked → Issue + Risk) implemented.
"""

from datetime import datetime, date, timedelta
from app.engine.decision_risk_engine import (
    DecisionRiskEngine,
    Event,
    EventType,
    StateSnapshot
)


def example_dependency_blocked():
    """
    Example: A dependency is blocked
    
    This triggers Rule 1 which:
    1. Creates an Issue
    2. Runs forecast simulation
    3. Creates a Risk if P80 delta > threshold
    4. Sets next_date for owner
    """
    print("=" * 80)
    print("Example: Dependency Blocked Event")
    print("=" * 80)
    
    # Initialize engine
    engine = DecisionRiskEngine()
    print(f"✓ Engine initialized with {len(engine.rules)} rules")
    
    # Create event: A dependency is blocked
    event = Event(
        event_id="evt_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_auth_to_payment",
        milestone_id="milestone_q1_2026",
        owner_id="alice",
        timestamp=datetime.now()
    )
    print(f"\n✓ Event created: {event.event_type.value}")
    print(f"  - dependency_id: {event.dependency_id}")
    print(f"  - milestone_id: {event.milestone_id}")
    
    # Create state snapshot
    state = StateSnapshot(
        dependencies={
            "dep_auth_to_payment": {
                "id": "dep_auth_to_payment",
                "from_id": "work_item_auth_003",
                "to_id": "work_item_payment_001",
                "status": "blocked"
            }
        },
        work_items={
            "work_item_auth_003": {
                "id": "work_item_auth_003",
                "title": "User authentication",
                "status": "in_progress"
            },
            "work_item_payment_001": {
                "id": "work_item_payment_001",
                "title": "Payment API integration",
                "status": "not_started"
            }
        },
        milestones={
            "milestone_q1_2026": {
                "id": "milestone_q1_2026",
                "name": "Q1 2026 Release",
                "target_date": date(2026, 3, 31)
            }
        },
        ownerships={
            "ownership_001": {
                "id": "ownership_001",
                "entity_id": "work_item_auth_003",
                "owner_actor_id": "alice"
            }
        },
        risks={},
        issues={},
        decisions={},
        forecasts={}
    )
    print(f"\n✓ State snapshot created")
    print(f"  - {len(state.dependencies)} dependencies")
    print(f"  - {len(state.work_items)} work items")
    print(f"  - {len(state.milestones)} milestones")
    
    # Process event through engine
    commands = engine.process_event(event, state)
    
    print(f"\n✓ Engine processed event and emitted {len(commands)} commands:")
    print()
    
    for i, cmd in enumerate(commands, 1):
        print(f"  Command {i}:")
        print(f"    Type:     {cmd.command_type.value}")
        print(f"    Target:   {cmd.target_id}")
        print(f"    Reason:   {cmd.reason}")
        print(f"    Rule:     {cmd.rule_name}")
        print(f"    Priority: {cmd.priority}")
        if cmd.payload:
            print(f"    Payload keys: {list(cmd.payload.keys())}")
        print()
    
    print("=" * 80)
    print("Result: State layer would now execute these commands")
    print("=" * 80)
    print()


def example_accept_risk_decision():
    """
    Example: A decision to accept a risk is approved
    
    This triggers Rule 4 which:
    1. Transitions risk.status → ACCEPTED
    2. Stores acceptance boundary
    3. Suppresses escalation
    4. Sets next_date
    """
    print("=" * 80)
    print("Example: Accept Risk Decision Approved")
    print("=" * 80)
    
    engine = DecisionRiskEngine()
    print(f"✓ Engine initialized with {len(engine.rules)} rules")
    
    # Create event: A decision is approved
    event = Event(
        event_id="evt_002",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_accept_risk_001",
        milestone_id="milestone_q1_2026",
        timestamp=datetime.now()
    )
    print(f"\n✓ Event created: {event.event_type.value}")
    print(f"  - decision_id: {event.decision_id}")
    
    # Create state snapshot with existing risk and decision
    state = StateSnapshot(
        dependencies={},
        work_items={},
        milestones={
            "milestone_q1_2026": {
                "id": "milestone_q1_2026",
                "name": "Q1 2026 Release",
                "target_date": date(2026, 3, 31)
            }
        },
        risks={
            "risk_dep_blocked_dep_auth_to_payment": {
                "id": "risk_dep_blocked_dep_auth_to_payment",
                "title": "Schedule risk due to blocked dependency",
                "status": "active",
                "severity": "high"
            }
        },
        decisions={
            "dec_accept_risk_001": {
                "id": "dec_accept_risk_001",
                "decision_type": "accept_risk",
                "risk_id": "risk_dep_blocked_dep_auth_to_payment",
                "acceptance_until": (date.today() + timedelta(days=30)).isoformat(),
                "threshold": None,
                "escalation_trigger": None
            }
        },
        ownerships={
            "ownership_002": {
                "id": "ownership_002",
                "entity_id": "risk_dep_blocked_dep_auth_to_payment",
                "owner_actor_id": "bob"
            }
        },
        issues={},
        forecasts={}
    )
    print(f"\n✓ State snapshot created")
    print(f"  - 1 risk (active)")
    print(f"  - 1 decision (accept_risk)")
    
    # Process event
    commands = engine.process_event(event, state)
    
    print(f"\n✓ Engine processed event and emitted {len(commands)} commands:")
    print()
    
    for i, cmd in enumerate(commands, 1):
        print(f"  Command {i}:")
        print(f"    Type:     {cmd.command_type.value}")
        print(f"    Target:   {cmd.target_id}")
        print(f"    Reason:   {cmd.reason}")
        print(f"    Rule:     {cmd.rule_name}")
        if cmd.payload:
            print(f"    Payload keys: {list(cmd.payload.keys())}")
        print()
    
    print("=" * 80)
    print("Result: Risk status would be set to ACCEPTED with monitoring")
    print("=" * 80)
    print()


def example_stubbed_rule():
    """
    Example: Event that matches a stubbed rule
    
    This shows that stubbed rules match but return empty command lists.
    """
    print("=" * 80)
    print("Example: Dependency Unblocked Event (Stubbed Rule)")
    print("=" * 80)
    
    engine = DecisionRiskEngine()
    print(f"✓ Engine initialized with {len(engine.rules)} rules")
    
    # Create event: A dependency is unblocked
    event = Event(
        event_id="evt_003",
        event_type=EventType.DEPENDENCY_UNBLOCKED,
        dependency_id="dep_auth_to_payment",
        milestone_id="milestone_q1_2026",
        timestamp=datetime.now()
    )
    print(f"\n✓ Event created: {event.event_type.value}")
    print(f"  - dependency_id: {event.dependency_id}")
    
    state = StateSnapshot()
    
    # Process event
    commands = engine.process_event(event, state)
    
    print(f"\n✓ Engine processed event and emitted {len(commands)} commands")
    print(f"  (Rule 2 is stubbed, so no commands emitted yet)")
    print()
    
    print("=" * 80)
    print("Result: Once Rule 2 is implemented, it will emit commands")
    print("=" * 80)
    print()


if __name__ == "__main__":
    # Run examples
    example_dependency_blocked()
    example_accept_risk_decision()
    example_stubbed_rule()
    
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    print()
    print("✓ Rule 1: Dependency blocked → Issue + Risk (IMPLEMENTED)")
    print("✓ Rule 4: Accept Risk Decision (IMPLEMENTED)")
    print("✓ Rule 5: Mitigate Risk Decision (IMPLEMENTED)")
    print("⏳ Rules 2, 3, 6, 7, 8, 9 (STUBBED - ready to implement)")
    print()
    print("The engine is deterministic and side-effect free.")
    print("It only emits commands; the state layer executes them.")
    print()

