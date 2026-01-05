#!/usr/bin/env python3
"""
Quick test to demonstrate the dependency delay scenario fix.

This script creates a simple test case and shows that the scenario now works correctly.
"""

from datetime import datetime, timedelta
import sys
sys.path.insert(0, 'backend')

from app.engine.forecast import forecast_with_scenario, ScenarioType

def test_dependency_delay_scenario():
    """Test that dependency delay scenarios properly propagate delays"""
    
    print("=" * 80)
    print("TESTING DEPENDENCY DELAY SCENARIO FIX")
    print("=" * 80)
    print()
    
    # Create a simple test state with a proper dependency chain
    now = datetime.now()
    target_date = now + timedelta(days=30)
    
    state = {
        "milestones": [
            {
                "id": "milestone_test",
                "name": "Test Milestone",
                "target_date": target_date.isoformat(),
                "status": "pending"
            }
        ],
        "work_items": [
            # Upstream dependency (external team)
            {
                "id": "wi_upstream",
                "title": "External API Setup",
                "status": "in_progress",
                "estimated_days": 5.0,
                "remaining_days": 3.0,
                "milestone_id": "milestone_external",
                "dependencies": []
            },
            # Middle item that depends on upstream
            {
                "id": "wi_middle",
                "title": "Backend Integration",
                "status": "not_started",
                "estimated_days": 4.0,
                "milestone_id": "milestone_test",
                "dependencies": ["wi_upstream"]  # Depends on external API
            },
            # Final item that depends on middle
            {
                "id": "wi_final",
                "title": "Frontend UI",
                "status": "not_started",
                "estimated_days": 3.0,
                "milestone_id": "milestone_test",
                "dependencies": ["wi_middle"]  # Depends on backend
            }
        ],
        "risks": [],
        "decisions": [],
        "dependencies": []
    }
    
    print("Test Setup:")
    print("  • External API Setup (3d remaining)")
    print("    ↓ depends on")
    print("  • Backend Integration (4d estimated)")
    print("    ↓ depends on")
    print("  • Frontend UI (3d estimated)")
    print()
    
    # Run baseline forecast
    print("1. Running BASELINE forecast...")
    baseline, _ = forecast_with_scenario(
        "milestone_test",
        state,
        ScenarioType.DEPENDENCY_DELAY,
        {"work_item_id": "wi_upstream", "delay_days": 0}  # No delay
    )
    
    print(f"   P50: {baseline.p50_date.strftime('%Y-%m-%d')} ({baseline.delta_p50_days:+.0f}d from target)")
    print(f"   P80: {baseline.p80_date.strftime('%Y-%m-%d')} ({baseline.delta_p80_days:+.0f}d from target)")
    print()
    
    # Run scenario with delay
    print("2. Running SCENARIO forecast (delay External API by 7 days)...")
    _, scenario = forecast_with_scenario(
        "milestone_test",
        state,
        ScenarioType.DEPENDENCY_DELAY,
        {"work_item_id": "wi_upstream", "delay_days": 7}
    )
    
    print(f"   P50: {scenario.p50_date.strftime('%Y-%m-%d')} ({scenario.delta_p50_days:+.0f}d from target)")
    print(f"   P80: {scenario.p80_date.strftime('%Y-%m-%d')} ({scenario.delta_p80_days:+.0f}d from target)")
    print()
    
    # Calculate impact
    impact = scenario.delta_p80_days - baseline.delta_p80_days
    print("3. IMPACT ANALYSIS:")
    print(f"   P80 impact: {impact:+.0f} days")
    print()
    
    # Show contributions
    print("4. SCENARIO CONTRIBUTIONS:")
    for i, contrib in enumerate(scenario.contribution_breakdown[:5], 1):
        marker = "✅" if "Scenario" in contrib["cause"] else "  "
        print(f"   {marker} {i}. {contrib['cause']}: {contrib['days']:+.1f}d")
    print()
    
    # Verify the fix worked
    if impact > 5:
        print("✅ SUCCESS! Dependency delay scenario is working correctly!")
        print(f"   The 7-day delay to the upstream work item caused a {impact:.0f}-day slip.")
        print()
        return True
    else:
        print("❌ FAILED! Dependency delay scenario is not working.")
        print(f"   Expected impact > 5 days, but got {impact:.0f} days.")
        print()
        return False


if __name__ == "__main__":
    success = test_dependency_delay_scenario()
    sys.exit(0 if success else 1)

