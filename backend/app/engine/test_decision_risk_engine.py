"""
Test suite for Decision-Risk Engine v0

Tests the deterministic behavior of the rule-based engine.
"""

import pytest
from datetime import datetime, date, timedelta
from typing import List

from .decision_risk_engine import (
    Event,
    EventType,
    Command,
    CommandType,
    StateSnapshot,
    DecisionRiskEngine,
    Rule1_DependencyBlocked,
    Rule2_AcceptRiskDecisionApproved,
    Rule3_MitigateRiskDecisionApproved,
)


# ============================================================================
# TEST FIXTURES
# ============================================================================

@pytest.fixture
def empty_state() -> StateSnapshot:
    """Empty state snapshot"""
    return StateSnapshot()


@pytest.fixture
def state_with_dependency() -> StateSnapshot:
    """State with a blocked dependency"""
    return StateSnapshot(
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


@pytest.fixture
def state_with_risk_and_decision() -> StateSnapshot:
    """State with a risk and an accept decision"""
    return StateSnapshot(
        risks={
            "risk_001": {
                "id": "risk_001",
                "title": "Schedule risk",
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
                "acceptance_until": (date.today() + timedelta(days=30)).isoformat()
            }
        },
        ownerships={
            "own_002": {
                "entity_id": "risk_001",
                "owner_actor_id": "actor_002"
            }
        }
    )


@pytest.fixture
def state_with_mitigation_decision() -> StateSnapshot:
    """State with a risk and a mitigation decision"""
    return StateSnapshot(
        risks={
            "risk_002": {
                "id": "risk_002",
                "title": "Dependency risk",
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
                "action": "Add parallel path to decouple dependency",
                "due_date": (date.today() + timedelta(days=14)).isoformat()
            }
        },
        ownerships={
            "own_003": {
                "entity_id": "risk_002",
                "owner_actor_id": "actor_003"
            }
        }
    )


@pytest.fixture
def engine() -> DecisionRiskEngine:
    """Fresh engine instance"""
    return DecisionRiskEngine()


# ============================================================================
# TEST CASE 1: Dependency Blocked → Risk Created
# ============================================================================

def test_dependency_blocked_creates_issue_and_risk(
    engine: DecisionRiskEngine,
    state_with_dependency: StateSnapshot
):
    """
    Test Case: Dependency blocked → risk created
    
    Given: A dependency is blocked
    When: A DEPENDENCY_BLOCKED event is processed
    Then: 
        - An issue is created
        - A risk is created (if P80 delta > threshold)
        - Owner's next_date is set
    """
    # Given: A dependency blocked event
    event = Event(
        event_id="evt_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime.now()
    )
    
    # When: Engine processes the event
    commands = engine.process_event(event, state_with_dependency)
    
    # Then: Commands are emitted
    assert len(commands) > 0, "Engine should emit commands"
    
    # Verify issue creation command
    issue_commands = [c for c in commands if c.command_type == CommandType.CREATE_ISSUE]
    assert len(issue_commands) == 1, "Should create one issue"
    
    issue_cmd = issue_commands[0]
    assert issue_cmd.rule_name == "rule_1_dependency_blocked"
    assert issue_cmd.payload["type"] == "dependency_blocked"
    assert "dep_001" in issue_cmd.payload["dependency_id"]
    
    # Verify risk creation command (if P80 delta > threshold)
    risk_commands = [c for c in commands if c.command_type == CommandType.CREATE_RISK]
    
    # Since stub returns delta_p80_days = 14.0 > threshold (7.0), risk should be created
    assert len(risk_commands) == 1, "Should create one risk"
    
    risk_cmd = risk_commands[0]
    assert risk_cmd.rule_name == "rule_1_dependency_blocked"
    assert "risk_dep_blocked_dep_001" in risk_cmd.target_id
    assert risk_cmd.payload["status"] == "active"
    assert "p80_delay_days" in risk_cmd.payload["impact"]
    
    # Verify next_date command
    next_date_commands = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    assert len(next_date_commands) == 1, "Should set next_date for owner"
    
    next_date_cmd = next_date_commands[0]
    assert next_date_cmd.rule_name == "rule_1_dependency_blocked"
    assert "next_date" in next_date_cmd.payload


def test_dependency_blocked_does_not_create_risk_if_below_threshold(
    engine: DecisionRiskEngine,
    state_with_dependency: StateSnapshot
):
    """
    Test that risk is NOT created if P80 delta is below threshold.
    
    Note: This test would require mocking the simulate_ripple_stub
    to return a delta below threshold. For now, it's a placeholder.
    """
    # TODO: Mock simulate_ripple_stub to return small delta
    # Then verify no CREATE_RISK command is emitted
    pass


# ============================================================================
# TEST CASE 2: Accept Risk Decision Approved
# ============================================================================

def test_accept_risk_decision_transitions_status(
    engine: DecisionRiskEngine,
    state_with_risk_and_decision: StateSnapshot
):
    """
    Test Case: Accept risk decision approved
    
    Given: A decision to accept a risk is approved
    When: A DECISION_APPROVED event is processed
    Then:
        - Risk status transitions to ACCEPTED
        - Owner's next_date is set to acceptance_until
        - Escalation is suppressed until acceptance boundary
    """
    # Given: A decision approved event
    event = Event(
        event_id="evt_002",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_001",
        timestamp=datetime.now()
    )
    
    # When: Engine processes the event
    commands = engine.process_event(event, state_with_risk_and_decision)
    
    # Then: Commands are emitted
    assert len(commands) > 0, "Engine should emit commands"
    
    # Verify risk update command
    risk_update_commands = [c for c in commands if c.command_type == CommandType.UPDATE_RISK]
    assert len(risk_update_commands) == 1, "Should update risk status"
    
    risk_cmd = risk_update_commands[0]
    assert risk_cmd.rule_name == "rule_2_accept_risk_approved"
    assert risk_cmd.payload["status"] == "accepted"
    assert "accepted_at" in risk_cmd.payload
    
    # Verify next_date command
    next_date_commands = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    assert len(next_date_commands) == 1, "Should set next_date for owner"
    
    next_date_cmd = next_date_commands[0]
    assert next_date_cmd.rule_name == "rule_2_accept_risk_approved"
    assert "suppress_escalation_until" in next_date_cmd.payload


# ============================================================================
# TEST CASE 3: Mitigate Risk Decision Approved
# ============================================================================

def test_mitigate_risk_decision_transitions_status(
    engine: DecisionRiskEngine,
    state_with_mitigation_decision: StateSnapshot
):
    """
    Test Case: Mitigate risk decision approved
    
    Given: A decision to mitigate a risk is approved
    When: A DECISION_APPROVED event is processed
    Then:
        - Risk status transitions to MITIGATING
        - Mitigation due_date is tracked
        - Forecast recomputation is scheduled
    """
    # Given: A decision approved event
    event = Event(
        event_id="evt_003",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_002",
        timestamp=datetime.now()
    )
    
    # When: Engine processes the event
    commands = engine.process_event(event, state_with_mitigation_decision)
    
    # Then: Commands are emitted
    assert len(commands) > 0, "Engine should emit commands"
    
    # Verify risk update command
    risk_update_commands = [c for c in commands if c.command_type == CommandType.UPDATE_RISK]
    assert len(risk_update_commands) == 1, "Should update risk status"
    
    risk_cmd = risk_update_commands[0]
    assert risk_cmd.rule_name == "rule_3_mitigate_risk_approved"
    assert risk_cmd.payload["status"] == "mitigating"
    assert "mitigation_started_at" in risk_cmd.payload
    
    # Verify next_date command for mitigation due date
    next_date_commands = [c for c in commands if c.command_type == CommandType.SET_NEXT_DATE]
    assert len(next_date_commands) == 1, "Should set mitigation due date"
    
    next_date_cmd = next_date_commands[0]
    assert next_date_cmd.rule_name == "rule_3_mitigate_risk_approved"
    assert "next_date" in next_date_cmd.payload
    
    # Verify forecast update command
    forecast_commands = [c for c in commands if c.command_type == CommandType.UPDATE_FORECAST]
    assert len(forecast_commands) == 1, "Should schedule forecast recomputation"


# ============================================================================
# ENGINE BEHAVIOR TESTS
# ============================================================================

def test_engine_returns_empty_for_no_matching_rules(
    engine: DecisionRiskEngine,
    empty_state: StateSnapshot
):
    """Test that engine returns empty list when no rules match"""
    event = Event(
        event_id="evt_999",
        event_type=EventType.MILESTONE_AT_RISK,  # No rules for this yet
        milestone_id="milestone_001",
        timestamp=datetime.now()
    )
    
    commands = engine.process_event(event, empty_state)
    assert len(commands) == 0, "No commands should be emitted for unhandled events"


def test_engine_is_deterministic(
    engine: DecisionRiskEngine,
    state_with_dependency: StateSnapshot
):
    """Test that engine produces same output for same input"""
    event = Event(
        event_id="evt_det_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime(2026, 1, 1, 12, 0, 0)  # Fixed timestamp
    )
    
    # Run twice
    commands_1 = engine.process_event(event, state_with_dependency)
    commands_2 = engine.process_event(event, state_with_dependency)
    
    # Should produce same number of commands
    assert len(commands_1) == len(commands_2)
    
    # Commands should have same types and targets
    for c1, c2 in zip(commands_1, commands_2):
        assert c1.command_type == c2.command_type
        assert c1.target_id == c2.target_id
        assert c1.rule_name == c2.rule_name


def test_engine_does_not_mutate_state(
    engine: DecisionRiskEngine,
    state_with_dependency: StateSnapshot
):
    """Test that engine never mutates the state snapshot"""
    event = Event(
        event_id="evt_mut_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime.now()
    )
    
    # Capture original state
    original_deps_count = len(state_with_dependency.dependencies)
    original_issues_count = len(state_with_dependency.issues)
    
    # Process event
    commands = engine.process_event(event, state_with_dependency)
    
    # Verify state unchanged
    assert len(state_with_dependency.dependencies) == original_deps_count
    assert len(state_with_dependency.issues) == original_issues_count


# ============================================================================
# RULE MATCHING TESTS
# ============================================================================

def test_rule_1_matches_dependency_blocked_only():
    """Test Rule 1 only matches DEPENDENCY_BLOCKED events"""
    rule = Rule1_DependencyBlocked()
    state = StateSnapshot()
    
    # Should match
    event_match = Event(
        event_id="evt_r1_1",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001"
    )
    assert rule.matches(event_match, state) is True
    
    # Should not match
    event_no_match = Event(
        event_id="evt_r1_2",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_001"
    )
    assert rule.matches(event_no_match, state) is False


def test_rule_2_matches_accept_risk_decision_only():
    """Test Rule 2 only matches ACCEPT_RISK decisions"""
    rule = Rule2_AcceptRiskDecisionApproved()
    
    # State with accept_risk decision
    state_accept = StateSnapshot(
        decisions={
            "dec_001": {
                "id": "dec_001",
                "decision_type": "accept_risk",
                "status": "approved",
                "risk_id": "risk_001"
            }
        }
    )
    
    event = Event(
        event_id="evt_r2_1",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_001"
    )
    
    assert rule.matches(event, state_accept) is True
    
    # State with different decision type
    state_other = StateSnapshot(
        decisions={
            "dec_002": {
                "id": "dec_002",
                "decision_type": "mitigate_risk",
                "status": "approved",
                "risk_id": "risk_002"
            }
        }
    )
    
    event_other = Event(
        event_id="evt_r2_2",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_002"
    )
    
    assert rule.matches(event_other, state_other) is False


def test_rule_3_matches_mitigate_risk_decision_only():
    """Test Rule 3 only matches MITIGATE_RISK decisions"""
    rule = Rule3_MitigateRiskDecisionApproved()
    
    # State with mitigate_risk decision
    state_mitigate = StateSnapshot(
        decisions={
            "dec_001": {
                "id": "dec_001",
                "decision_type": "mitigate_risk",
                "status": "approved",
                "risk_id": "risk_001"
            }
        }
    )
    
    event = Event(
        event_id="evt_r3_1",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_001"
    )
    
    assert rule.matches(event, state_mitigate) is True
    
    # State with different decision type
    state_other = StateSnapshot(
        decisions={
            "dec_002": {
                "id": "dec_002",
                "decision_type": "accept_risk",
                "status": "approved",
                "risk_id": "risk_002"
            }
        }
    )
    
    event_other = Event(
        event_id="evt_r3_2",
        event_type=EventType.DECISION_APPROVED,
        decision_id="dec_002"
    )
    
    assert rule.matches(event_other, state_other) is False


# ============================================================================
# COMMAND VALIDATION TESTS
# ============================================================================

def test_all_commands_have_required_metadata(
    engine: DecisionRiskEngine,
    state_with_dependency: StateSnapshot
):
    """Test that all commands have reason and rule_name"""
    event = Event(
        event_id="evt_meta_001",
        event_type=EventType.DEPENDENCY_BLOCKED,
        dependency_id="dep_001",
        timestamp=datetime.now()
    )
    
    commands = engine.process_event(event, state_with_dependency)
    
    for cmd in commands:
        assert cmd.reason, f"Command {cmd.command_id} missing reason"
        assert cmd.rule_name, f"Command {cmd.command_id} missing rule_name"
        assert cmd.target_id, f"Command {cmd.command_id} missing target_id"


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

