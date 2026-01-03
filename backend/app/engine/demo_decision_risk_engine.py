"""
Demo script for Decision-Risk Engine v0

This script demonstrates the engine's behavior without requiring pytest.
Run with: python -m app.engine.demo_decision_risk_engine
"""

from datetime import datetime, date, timedelta
from .decision_risk_engine import (
    Event,
    EventType,
    Command,
    CommandType,
    StateSnapshot,
    DecisionRiskEngine,
)


def print_separator(title: str = ""):
    """Print a visual separator"""
    if title:
        print(f"\n{'=' * 80}")
        print(f"  {title}")
        print('=' * 80)
    else:
        print('-' * 80)


def print_command(cmd: Command):
    """Pretty print a command"""
    print(f"\n  Command ID: {cmd.command_id}")
    print(f"  Type: {cmd.command_type.value}")
    print(f"  Target: {cmd.target_id}")
    print(f"  Rule: {cmd.rule_name}")
    print(f"  Reason: {cmd.reason}")
    print(f"  Priority: {cmd.priority}")
    if cmd.payload:
        print(f"  Payload keys: {list(cmd.payload.keys())}")


def demo_1_dependency_blocked():
    """Demo: Dependency blocked → risk created"""
    print_separator("DEMO 1: Dependency Blocked → Risk Created")
    
    # Setup state
    state = StateSnapshot(
        dependencies={
            "dep_001": {
                "from_id": "work_item_002",
                "to_id": "work_item_001",
                "type": "finish_to_start"
            }
        },
        work_items={
            "work_item_001": {
                "id": "work_item_001",
                "title": "Foundation work",
                "status": "in_progress",
                "estimated_days": 5.0
            },
            "work_item_002": {
                "id": "work_item_002",
                "title": "Dependent work",
                "status": "blocked",
                "estimated_days": 3.0,
                "dependencies": ["work_item_001"]
            }
        },
        ownerships={
            "own_001": {
                "entity_id": "work_item_002",
                "owner_actor_id": "actor_001"
            }
        }
    )
    
    # Create event
    event = Event(
        event_id="evt_demo_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime.now()
    )
    
    print("\n📥 INPUT:")
    print(f"  Event: {event.event_type.value}")
    print(f"  Dependency: {event.dependency_id}")
    print(f"  Blocked: work_item_002 waiting for work_item_001")
    
    # Process
    engine = DecisionRiskEngine()
    commands = engine.process_event(event, state)
    
    print(f"\n📤 OUTPUT: {len(commands)} commands emitted")
    
    for i, cmd in enumerate(commands, 1):
        print(f"\n  [{i}] {cmd.command_type.value.upper()}")
        print_command(cmd)
    
    # Verify expectations
    print("\n✅ VERIFICATION:")
    issue_cmds = [c for c in commands if c.command_type == CommandType.CREATE_ISSUE]
    risk_cmds = [c for c in commands if c.command_type == CommandType.CREATE_RISK]
    next_date_cmds = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    
    print(f"  ✓ Issue created: {len(issue_cmds) == 1}")
    print(f"  ✓ Risk created: {len(risk_cmds) == 1}")
    print(f"  ✓ Next date set: {len(next_date_cmds) == 1}")
    
    if risk_cmds:
        risk_cmd = risk_cmds[0]
        print(f"  ✓ Risk severity: {risk_cmd.payload.get('severity')}")
        print(f"  ✓ P80 delay: {risk_cmd.payload.get('impact', {}).get('p80_delay_days')} days")


def demo_2_accept_risk():
    """Demo: Accept risk decision approved"""
    print_separator("DEMO 2: Accept Risk Decision Approved")
    
    # Setup state
    acceptance_date = date.today() + timedelta(days=30)
    state = StateSnapshot(
        risks={
            "risk_001": {
                "id": "risk_001",
                "title": "Schedule risk due to resource constraint",
                "status": "active",
                "severity": "high",
                "probability": 0.7
            }
        },
        decisions={
            "dec_001": {
                "id": "dec_001",
                "decision_type": "accept_risk",
                "status": "approved",
                "risk_id": "risk_001",
                "acceptance_until": acceptance_date.isoformat()
            }
        },
        ownerships={
            "own_002": {
                "entity_id": "risk_001",
                "owner_actor_id": "actor_002"
            }
        }
    )
    
    # Create event
    event = Event(
        event_id="evt_demo_002",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_001",
        timestamp=datetime.now()
    )
    
    print("\n📥 INPUT:")
    print(f"  Event: {event.event_type.value}")
    print(f"  Decision: {event.decision_id} (accept_risk)")
    print(f"  Risk: risk_001")
    print(f"  Acceptance until: {acceptance_date}")
    
    # Process
    engine = DecisionRiskEngine()
    commands = engine.process_event(event, state)
    
    print(f"\n📤 OUTPUT: {len(commands)} commands emitted")
    
    for i, cmd in enumerate(commands, 1):
        print(f"\n  [{i}] {cmd.command_type.value.upper()}")
        print_command(cmd)
    
    # Verify expectations
    print("\n✅ VERIFICATION:")
    update_cmds = [c for c in commands if c.command_type == CommandType.UPDATE_RISK]
    next_date_cmds = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    
    print(f"  ✓ Risk updated: {len(update_cmds) == 1}")
    print(f"  ✓ Next date set: {len(next_date_cmds) == 1}")
    
    if update_cmds:
        update_cmd = update_cmds[0]
        print(f"  ✓ New status: {update_cmd.payload.get('status')}")
        print(f"  ✓ Accepted at: {update_cmd.payload.get('accepted_at') is not None}")


def demo_3_mitigate_risk():
    """Demo: Mitigate risk decision approved"""
    print_separator("DEMO 3: Mitigate Risk Decision Approved")
    
    # Setup state
    due_date = date.today() + timedelta(days=14)
    state = StateSnapshot(
        risks={
            "risk_002": {
                "id": "risk_002",
                "title": "Dependency risk on external API",
                "status": "active",
                "severity": "medium",
                "probability": 0.6
            }
        },
        decisions={
            "dec_002": {
                "id": "dec_002",
                "decision_type": "mitigate_risk",
                "status": "approved",
                "risk_id": "risk_002",
                "action": "Build fallback mechanism to decouple from external API",
                "due_date": due_date.isoformat()
            }
        },
        ownerships={
            "own_003": {
                "entity_id": "risk_002",
                "owner_actor_id": "actor_003"
            }
        }
    )
    
    # Create event
    event = Event(
        event_id="evt_demo_003",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_002",
        timestamp=datetime.now()
    )
    
    print("\n📥 INPUT:")
    print(f"  Event: {event.event_type.value}")
    print(f"  Decision: {event.decision_id} (mitigate_risk)")
    print(f"  Risk: risk_002")
    print(f"  Action: Build fallback mechanism")
    print(f"  Due date: {due_date}")
    
    # Process
    engine = DecisionRiskEngine()
    commands = engine.process_event(event, state)
    
    print(f"\n📤 OUTPUT: {len(commands)} commands emitted")
    
    for i, cmd in enumerate(commands, 1):
        print(f"\n  [{i}] {cmd.command_type.value.upper()}")
        print_command(cmd)
    
    # Verify expectations
    print("\n✅ VERIFICATION:")
    update_cmds = [c for c in commands if c.command_type == CommandType.UPDATE_RISK]
    next_date_cmds = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    forecast_cmds = [c for c in commands if c.command_type == CommandType.UPDATE_FORECAST]
    
    print(f"  ✓ Risk updated: {len(update_cmds) == 1}")
    print(f"  ✓ Next date set: {len(next_date_cmds) == 1}")
    print(f"  ✓ Forecast scheduled: {len(forecast_cmds) == 1}")
    
    if update_cmds:
        update_cmd = update_cmds[0]
        print(f"  ✓ New status: {update_cmd.payload.get('status')}")
        print(f"  ✓ Mitigation action: {update_cmd.payload.get('mitigation_action')}")


def demo_4_determinism():
    """Demo: Engine is deterministic"""
    print_separator("DEMO 4: Determinism Test")
    
    # Setup state
    state = StateSnapshot(
        dependencies={
            "dep_001": {
                "from_id": "work_item_002",
                "to_id": "work_item_001",
                "type": "finish_to_start"
            }
        },
        work_items={
            "work_item_001": {"id": "work_item_001", "status": "in_progress"},
            "work_item_002": {"id": "work_item_002", "status": "blocked"}
        }
    )
    
    # Create event with fixed timestamp
    event = Event(
        event_id="evt_det_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime(2026, 1, 1, 12, 0, 0)
    )
    
    print("\n📥 INPUT:")
    print(f"  Event: {event.event_type.value}")
    print(f"  Timestamp: {event.timestamp} (fixed)")
    
    # Process twice
    engine = DecisionRiskEngine()
    commands_1 = engine.process_event(event, state)
    commands_2 = engine.process_event(event, state)
    
    print(f"\n📤 OUTPUT:")
    print(f"  Run 1: {len(commands_1)} commands")
    print(f"  Run 2: {len(commands_2)} commands")
    
    # Verify determinism
    print("\n✅ VERIFICATION:")
    print(f"  ✓ Same number of commands: {len(commands_1) == len(commands_2)}")
    
    matches = True
    for c1, c2 in zip(commands_1, commands_2):
        if c1.command_type != c2.command_type or c1.target_id != c2.target_id:
            matches = False
            break
    
    print(f"  ✓ Commands match: {matches}")
    print(f"  ✓ Engine is deterministic: {len(commands_1) == len(commands_2) and matches}")


def main():
    """Run all demos"""
    print("\n" + "=" * 80)
    print("  Decision-Risk Engine v0 - Interactive Demo")
    print("=" * 80)
    print("\n  This demo shows the engine processing events and emitting commands.")
    print("  The engine is deterministic, testable, and side-effect free.")
    
    try:
        demo_1_dependency_blocked()
        demo_2_accept_risk()
        demo_3_mitigate_risk()
        demo_4_determinism()
        
        print_separator("SUMMARY")
        print("\n  ✅ All demos completed successfully!")
        print("\n  The Decision-Risk Engine:")
        print("    • Processes events deterministically")
        print("    • Emits commands (does not mutate state)")
        print("    • Applies rules consistently")
        print("    • Tracks ownership and next dates")
        print("\n  Next steps:")
        print("    • Replace forecast stub with real simulation")
        print("    • Add command execution layer")
        print("    • Integrate with API endpoints")
        print("    • Add more rules as needed")
        
        print("\n" + "=" * 80 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

