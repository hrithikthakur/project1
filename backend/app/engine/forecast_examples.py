"""
Forecast Engine v1 - Example Usage

Demonstrates:
1. Baseline forecasting
2. What-if scenario forecasting
3. Mitigation impact preview
4. Contribution breakdown

Run this file to see all features in action.
"""

from datetime import datetime, timedelta
from app.engine.forecast import (
    forecastMilestone,
    forecast_with_scenario,
    forecast_mitigation_impact,
    ScenarioType,
    ForecastOptions,
    Scenario,
    HypotheticalMitigation,
)


# ============================================================================
# Mock State Setup
# ============================================================================

def create_mock_state():
    """Create a simple mock state for examples"""
    now = datetime.now()
    target_date = now + timedelta(days=30)
    
    return {
        "milestones": [
            {
                "id": "milestone_001",
                "name": "Authentication MVP",
                "description": "Complete authentication system",
                "target_date": target_date.isoformat(),
                "work_items": ["wi_001", "wi_002", "wi_003"],
                "status": "pending"
            }
        ],
        "work_items": [
            {
                "id": "wi_001",
                "title": "OAuth integration",
                "description": "Integrate with OAuth provider",
                "status": "in_progress",
                "estimated_days": 5.0,
                "milestone_id": "milestone_001",
                "dependencies": ["wi_external"]  # OAuth depends on API Gateway
            },
            {
                "id": "wi_002",
                "title": "User database schema",
                "description": "Design and implement user tables",
                "status": "completed",
                "estimated_days": 3.0,
                "milestone_id": "milestone_001",
                "dependencies": []
            },
            {
                "id": "wi_003",
                "title": "Frontend login flow",
                "description": "Build login UI components",
                "status": "not_started",
                "estimated_days": 4.0,
                "milestone_id": "milestone_001",
                "dependencies": ["wi_001"]  # Frontend depends on OAuth
            },
            # External dependency (different milestone)
            {
                "id": "wi_external",
                "title": "API Gateway setup",
                "description": "Infrastructure work",
                "status": "in_progress",
                "estimated_days": 7.0,
                "remaining_days": 3.0,  # 3 days of work remaining
                "milestone_id": "milestone_000",  # Different milestone
                "dependencies": []
            }
        ],
        "dependencies": [
            {
                "from_id": "wi_003",
                "to_id": "wi_001",
                "type": "finish_to_start"
            },
            {
                "from_id": "wi_001",
                "to_id": "wi_external",
                "type": "finish_to_start"
            }
        ],
        "risks": [
            {
                "id": "risk_001",
                "title": "OAuth provider API instability",
                "description": "Third-party API has been flaky",
                "severity": "medium",
                "status": "open",
                "probability": 0.4,
                "impact": {
                    "impact_days": 5.0,
                    "delay_days": 5.0
                },
                "milestone_id": "milestone_001",
                "affected_items": ["wi_001"],
                "detected_at": (now - timedelta(days=2)).isoformat()
            },
            {
                "id": "risk_002",
                "title": "Security review delay",
                "description": "Security team is overloaded",
                "severity": "high",
                "status": "materialised",
                "probability": 0.8,
                "impact": {
                    "impact_days": 3.0
                },
                "milestone_id": "milestone_001",
                "affected_items": ["wi_001", "wi_003"],
                "detected_at": (now - timedelta(days=5)).isoformat()
            },
            {
                "id": "risk_003",
                "title": "Design system not finalized",
                "description": "UI components may need rework",
                "severity": "low",
                "status": "mitigating",
                "probability": 0.3,
                "impact": {
                    "impact_days": 2.0
                },
                "milestone_id": "milestone_001",
                "affected_items": ["wi_003"],
                "detected_at": (now - timedelta(days=1)).isoformat(),
                "mitigation_started_at": now.isoformat()
            }
        ],
        "decisions": [
            {
                "id": "dec_001",
                "decision_type": "change_scope",
                "subtype": "ADD",
                "status": "approved",
                "milestone_name": "Authentication MVP",
                "reason": "Added two-factor authentication requirement",
                "effort_delta_days": 3.0,
                "created_at": (now - timedelta(days=3)).isoformat()
            }
        ]
    }


# ============================================================================
# Example 1: Baseline Forecast
# ============================================================================

def example_1_baseline_forecast():
    """Basic baseline forecast with contribution breakdown"""
    print("=" * 80)
    print("EXAMPLE 1: BASELINE FORECAST")
    print("=" * 80)
    print()
    
    state = create_mock_state()
    result = forecastMilestone("milestone_001", state)
    
    print(result.explanation)
    print()
    print("Full contribution breakdown:")
    for i, contrib in enumerate(result.contribution_breakdown, 1):
        print(f"  {i}. {contrib['cause']}: {contrib['days']:+.1f} days")
    print()
    print(f"Result object:")
    print(f"  P50 date: {result.p50_date}")
    print(f"  P80 date: {result.p80_date}")
    print(f"  Delta P50: {result.delta_p50_days} days")
    print(f"  Delta P80: {result.delta_p80_days} days")
    print(f"  Confidence: {result.confidence_level}")
    print()


# ============================================================================
# Example 2: What-If Scenario - Dependency Delay
# ============================================================================

def example_2_scenario_dependency_delay():
    """What-if: External dependency is delayed by 5 days"""
    print("=" * 80)
    print("EXAMPLE 2: WHAT-IF SCENARIO - DEPENDENCY DELAY")
    print("=" * 80)
    print()
    print("Question: What if the API Gateway setup is delayed by 5 days?")
    print()
    
    state = create_mock_state()
    
    baseline, scenario = forecast_with_scenario(
        "milestone_001",
        state,
        ScenarioType.DEPENDENCY_DELAY,
        {
            "work_item_id": "wi_external",
            "delay_days": 5
        }
    )
    
    print("BASELINE FORECAST:")
    print(f"  P50: {baseline.p50_date.strftime('%Y-%m-%d')} ({baseline.delta_p50_days:+d} days)")
    print(f"  P80: {baseline.p80_date.strftime('%Y-%m-%d')} ({baseline.delta_p80_days:+d} days)")
    print()
    
    print("SCENARIO FORECAST (with +5 day dependency delay):")
    print(f"  P50: {scenario.p50_date.strftime('%Y-%m-%d')} ({scenario.delta_p50_days:+d} days)")
    print(f"  P80: {scenario.p80_date.strftime('%Y-%m-%d')} ({scenario.delta_p80_days:+d} days)")
    print()
    
    impact = scenario.delta_p80_days - baseline.delta_p80_days
    print(f"SCENARIO IMPACT: P80 slips by {impact:+.0f} additional days")
    print()
    
    print("Scenario contribution breakdown:")
    for contrib in scenario.contribution_breakdown[:5]:
        print(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
    print()


# ============================================================================
# Example 3: What-If Scenario - Scope Change
# ============================================================================

def example_3_scenario_scope_change():
    """What-if: Add 8 days of scope"""
    print("=" * 80)
    print("EXAMPLE 3: WHAT-IF SCENARIO - SCOPE CHANGE")
    print("=" * 80)
    print()
    print("Question: What if we add a new feature requiring 8 days of work?")
    print()
    
    state = create_mock_state()
    
    baseline, scenario = forecast_with_scenario(
        "milestone_001",
        state,
        ScenarioType.SCOPE_CHANGE,
        {
            "effort_delta_days": 8
        }
    )
    
    print("BASELINE FORECAST:")
    print(f"  P80: {baseline.p80_date.strftime('%Y-%m-%d')} ({baseline.delta_p80_days:+d} days)")
    print()
    
    print("SCENARIO FORECAST (with +8 days of scope):")
    print(f"  P80: {scenario.p80_date.strftime('%Y-%m-%d')} ({scenario.delta_p80_days:+d} days)")
    print()
    
    impact = scenario.delta_p80_days - baseline.delta_p80_days
    print(f"SCENARIO IMPACT: P80 slips by {impact:+.0f} additional days")
    print()


# ============================================================================
# Example 4: What-If Scenario - Capacity Reduction
# ============================================================================

def example_4_scenario_capacity_change():
    """What-if: Team capacity drops by 30%"""
    print("=" * 80)
    print("EXAMPLE 4: WHAT-IF SCENARIO - CAPACITY REDUCTION")
    print("=" * 80)
    print()
    print("Question: What if team capacity drops by 30% (e.g., key person on leave)?")
    print()
    
    state = create_mock_state()
    
    baseline, scenario = forecast_with_scenario(
        "milestone_001",
        state,
        ScenarioType.CAPACITY_CHANGE,
        {
            "capacity_multiplier": 0.7  # 70% of original capacity
        }
    )
    
    print("BASELINE FORECAST:")
    print(f"  P80: {baseline.p80_date.strftime('%Y-%m-%d')} ({baseline.delta_p80_days:+d} days)")
    print()
    
    print("SCENARIO FORECAST (with 30% capacity reduction):")
    print(f"  P80: {scenario.p80_date.strftime('%Y-%m-%d')} ({scenario.delta_p80_days:+d} days)")
    print()
    
    impact = scenario.delta_p80_days - baseline.delta_p80_days
    print(f"SCENARIO IMPACT: P80 slips by {impact:+.0f} additional days")
    print()
    
    print("Scenario contribution breakdown:")
    for contrib in scenario.contribution_breakdown[:5]:
        print(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
    print()


# ============================================================================
# Example 5: Mitigation Impact Preview
# ============================================================================

def example_5_mitigation_impact_preview():
    """Preview impact of mitigating a risk"""
    print("=" * 80)
    print("EXAMPLE 5: MITIGATION IMPACT PREVIEW")
    print("=" * 80)
    print()
    print("Question: If we mitigate 'OAuth provider API instability', what's the impact?")
    print()
    
    state = create_mock_state()
    
    # Preview mitigation of risk_001 (OAuth API instability)
    # Assume mitigation would reduce impact by 4 days (from 5 to ~1)
    current, with_mitigation, improvement_days = forecast_mitigation_impact(
        "milestone_001",
        state,
        "risk_001",
        expected_impact_reduction_days=4.0
    )
    
    print("CURRENT FORECAST:")
    print(f"  P50: {current.p50_date.strftime('%Y-%m-%d')} ({current.delta_p50_days:+d} days)")
    print(f"  P80: {current.p80_date.strftime('%Y-%m-%d')} ({current.delta_p80_days:+d} days)")
    print()
    
    print("WITH MITIGATION:")
    print(f"  P50: {with_mitigation.p50_date.strftime('%Y-%m-%d')} ({with_mitigation.delta_p50_days:+d} days)")
    print(f"  P80: {with_mitigation.p80_date.strftime('%Y-%m-%d')} ({with_mitigation.delta_p80_days:+d} days)")
    print()
    
    print(f"💡 DECISION INSIGHT:")
    print(f"   If mitigation succeeds, P80 improves by ~{improvement_days:.0f} days")
    print()
    
    if improvement_days > 3:
        print("   ✅ Recommended: Mitigation has significant impact, proceed with MITIGATE_RISK decision")
    elif improvement_days > 1:
        print("   ⚠️  Moderate impact, evaluate cost vs. benefit")
    else:
        print("   ❌ Low impact, consider ACCEPT_RISK instead")
    print()


# ============================================================================
# Example 6: Combined Scenario (Multiple Perturbations)
# ============================================================================

def example_6_combined_analysis():
    """Show how to use forecast for decision surface exploration"""
    print("=" * 80)
    print("EXAMPLE 6: DECISION SURFACE - MULTIPLE SCENARIOS")
    print("=" * 80)
    print()
    print("Exploring multiple futures to find best path forward...")
    print()
    
    state = create_mock_state()
    
    # Scenario A: Do nothing (baseline)
    baseline = forecastMilestone("milestone_001", state)
    
    # Scenario B: Add scope
    _, with_scope = forecast_with_scenario(
        "milestone_001", state,
        ScenarioType.SCOPE_CHANGE,
        {"effort_delta_days": 8}
    )
    
    # Scenario C: Mitigate key risk
    _, with_mitigation, _ = forecast_mitigation_impact(
        "milestone_001", state, "risk_001", 4.0
    )
    
    # Scenario D: Reduce capacity
    _, with_reduced_capacity = forecast_with_scenario(
        "milestone_001", state,
        ScenarioType.CAPACITY_CHANGE,
        {"capacity_multiplier": 0.7}
    )
    
    print("SCENARIO COMPARISON (P80 dates):")
    print(f"  A. Baseline:              {baseline.p80_date.strftime('%Y-%m-%d')} ({baseline.delta_p80_days:+d} days)")
    print(f"  B. With +8d scope:        {with_scope.p80_date.strftime('%Y-%m-%d')} ({with_scope.delta_p80_days:+d} days)")
    print(f"  C. With risk mitigation:  {with_mitigation.p80_date.strftime('%Y-%m-%d')} ({with_mitigation.delta_p80_days:+d} days)")
    print(f"  D. With 30% less capacity:{with_reduced_capacity.p80_date.strftime('%Y-%m-%d')} ({with_reduced_capacity.delta_p80_days:+d} days)")
    print()
    
    print("INSIGHTS:")
    print(f"  • Adding scope slips date by {with_scope.delta_p80_days - baseline.delta_p80_days:.0f} days")
    print(f"  • Mitigating risk improves date by {baseline.delta_p80_days - with_mitigation.delta_p80_days:.0f} days")
    print(f"  • Capacity reduction slips date by {with_reduced_capacity.delta_p80_days - baseline.delta_p80_days:.0f} days")
    print()
    print("  🎯 This is the decision surface: see consequences before committing")
    print()


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "FORECAST ENGINE V1 - EXAMPLES" + " " * 29 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    example_1_baseline_forecast()
    example_2_scenario_dependency_delay()
    example_3_scenario_scope_change()
    example_4_scenario_capacity_change()
    example_5_mitigation_impact_preview()
    example_6_combined_analysis()
    
    print("=" * 80)
    print("END OF EXAMPLES")
    print("=" * 80)
    print()
    print("Key takeaways:")
    print("  ✓ ONE forecast function powers all features")
    print("  ✓ Scenarios = perturb inputs, rerun forecast")
    print("  ✓ Contributions tracked during computation (not inferred)")
    print("  ✓ Mitigation impact visible before approval")
    print("  ✓ Decision surface: explore → intervene → see consequences")
    print()

