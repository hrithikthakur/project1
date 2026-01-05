"""
Improved Dependency Delay Examples

This demonstrates the enhanced dependency delay functionality that goes beyond
simple "add X days" to provide realistic, nuanced forecasting.

Key Improvements:
1. Progress-based delays (completion %, remaining effort)
2. Date-based delays (actual expected vs needed dates)
3. External team slip rate tracking (historical reliability)
4. Probabilistic delay modeling (probability-weighted)
5. Criticality and slack time consideration
"""

from datetime import datetime, timedelta
from app.engine.forecast import (
    forecastMilestone,
    ForecastOptions,
    ExternalTeamHistory,
)


# ============================================================================
# Example 1: Progress-Based Delays
# ============================================================================

def example_progress_based_delays():
    """
    BEFORE: Fixed 2-3 days delay regardless of actual progress
    AFTER: Realistic delay based on remaining effort and completion %
    """
    print("=" * 70)
    print("Example 1: Progress-Based Delays")
    print("=" * 70)
    
    # Scenario: Backend API depends on Database Schema work
    # Database Schema is 80% complete with only 2 days remaining
    
    state = {
        "milestones": [
            {
                "id": "m1",
                "name": "Backend API v1",
                "target_date": "2026-02-01T00:00:00Z"
            }
        ],
        "work_items": [
            {
                "id": "wi_api",
                "title": "Build API Endpoints",
                "status": "not_started",
                "estimated_days": 10.0,
                "milestone_id": "m1",
                "dependencies": ["wi_schema"]
            },
            {
                "id": "wi_schema",
                "title": "Database Schema Design",
                "status": "in_progress",
                "estimated_days": 10.0,
                "milestone_id": "m1",
                "dependencies": [],
                # NEW: Progress tracking
                "completion_percentage": 0.8,  # 80% done
                "remaining_days": 2.0  # Only 2 days left (not the full 10!)
            }
        ],
        "dependencies": [
            {
                "from_id": "wi_api",
                "to_id": "wi_schema",
                "type": "finish_to_start",
                "criticality": "high",  # This is a critical dependency
                "slack_days": 0.0  # No slack time available
            }
        ],
        "risks": [],
        "decisions": []
    }
    
    result = forecastMilestone("m1", state)
    
    print(f"\nOLD BEHAVIOR: Would add ~2-3 days (fixed)")
    print(f"NEW BEHAVIOR: Adds {result.delta_p50_days:.1f} days based on actual 2.0 days remaining")
    print(f"\nContributions:")
    for contrib in result.contribution_breakdown:
        print(f"  - {contrib['cause']}: {contrib['days']:+.1f} days")
    print("\n")


# ============================================================================
# Example 2: Date-Based Delays
# ============================================================================

def example_date_based_delays():
    """
    BEFORE: No consideration of actual dates, just status-based
    AFTER: Calculate delay based on when dependency will be ready vs when needed
    """
    print("=" * 70)
    print("Example 2: Date-Based Delays")
    print("=" * 70)
    
    # Scenario: Frontend depends on API which won't be ready until Feb 15
    # But frontend needs to start Feb 1
    
    state = {
        "milestones": [
            {
                "id": "m1",
                "name": "Frontend v1",
                "target_date": "2026-02-20T00:00:00Z"
            }
        ],
        "work_items": [
            {
                "id": "wi_frontend",
                "title": "Build UI Components",
                "status": "not_started",
                "estimated_days": 15.0,
                "milestone_id": "m1",
                "start_date": "2026-02-01T00:00:00Z",
                "dependencies": ["wi_api"]
            },
            {
                "id": "wi_api",
                "title": "Backend API (External Team)",
                "status": "in_progress",
                "estimated_days": 20.0,
                "milestone_id": None,  # Different milestone
                "dependencies": [],
                # NEW: Expected completion date
                "expected_completion_date": "2026-02-15T00:00:00Z",
                "confidence_level": 0.6  # 60% confident they'll hit this date
            }
        ],
        "dependencies": [
            {
                "from_id": "wi_frontend",
                "to_id": "wi_api",
                "type": "finish_to_start",
                "criticality": "critical"
            }
        ],
        "risks": [],
        "decisions": []
    }
    
    result = forecastMilestone("m1", state)
    
    # Frontend needs API by Feb 1, but API won't be ready until Feb 15 = 14 days delay
    print(f"\nOLD BEHAVIOR: Would add ~2 days (fixed external dependency)")
    print(f"NEW BEHAVIOR: Calculates ~14 days based on actual dates")
    print(f"  - Frontend needs API by: Feb 1")
    print(f"  - API expected ready: Feb 15")
    print(f"  - Realistic delay: {result.delta_p50_days:.1f} days")
    print(f"\nContributions:")
    for contrib in result.contribution_breakdown:
        print(f"  - {contrib['cause']}: {contrib['days']:+.1f} days")
    print("\n")


# ============================================================================
# Example 3: External Team Historical Slip Rates
# ============================================================================

def example_external_team_slip_rates():
    """
    BEFORE: All external teams treated the same
    AFTER: Apply historical slip rates based on team's track record
    """
    print("=" * 70)
    print("Example 3: External Team Historical Slip Rates")
    print("=" * 70)
    
    # Scenario: Two external dependencies with different reliability
    
    state = {
        "milestones": [
            {
                "id": "m1",
                "name": "Integration Project",
                "target_date": "2026-03-01T00:00:00Z"
            }
        ],
        "work_items": [
            {
                "id": "wi_integration",
                "title": "System Integration",
                "status": "not_started",
                "estimated_days": 5.0,
                "milestone_id": "m1",
                "dependencies": ["wi_reliable_team", "wi_unreliable_team"]
            },
            {
                "id": "wi_reliable_team",
                "title": "Reliable Team API (10-day estimate)",
                "status": "in_progress",
                "estimated_days": 10.0,
                "milestone_id": None,
                "dependencies": [],
                # NEW: External team tracking
                "external_team_id": "team_platform",
                "confidence_level": 0.9
            },
            {
                "id": "wi_unreliable_team",
                "title": "Unreliable Team Service (10-day estimate)",
                "status": "in_progress",
                "estimated_days": 10.0,
                "milestone_id": None,
                "dependencies": [],
                # NEW: External team tracking
                "external_team_id": "team_legacy",
                "confidence_level": 0.5
            }
        ],
        "dependencies": [],
        "risks": [],
        "decisions": []
    }
    
    # NEW: Provide historical slip rate data for external teams
    external_team_history = {
        "team_platform": ExternalTeamHistory(
            team_id="team_platform",
            avg_slip_days=1.0,
            slip_probability=0.2,  # Only 20% chance of slipping
            reliability_score=0.9  # 90% reliable
        ),
        "team_legacy": ExternalTeamHistory(
            team_id="team_legacy",
            avg_slip_days=8.0,
            slip_probability=0.7,  # 70% chance of slipping
            reliability_score=0.5  # Only 50% reliable
        )
    }
    
    options = ForecastOptions(external_team_history=external_team_history)
    result = forecastMilestone("m1", state, options)
    
    print(f"\nOLD BEHAVIOR: Both teams treated equally (~2 days each)")
    print(f"\nNEW BEHAVIOR: Differentiated based on track record")
    print(f"  - Reliable team (Platform): ~{10.0 * (1 - 0.9):.1f} days delay expected")
    print(f"  - Unreliable team (Legacy): ~{10.0 * (1 - 0.5):.1f} days delay expected")
    print(f"\nActual forecast delay: {result.delta_p50_days:.1f} days")
    print(f"\nContributions:")
    for contrib in result.contribution_breakdown:
        print(f"  - {contrib['cause']}: {contrib['days']:+.1f} days")
    print("\n")


# ============================================================================
# Example 4: Probabilistic Delays with Criticality
# ============================================================================

def example_probabilistic_delays():
    """
    BEFORE: Binary - dependency either delays or doesn't
    AFTER: Probabilistic delays weighted by likelihood and criticality
    """
    print("=" * 70)
    print("Example 4: Probabilistic Delays with Criticality")
    print("=" * 70)
    
    # Scenario: Multiple dependencies with varying probability of causing delays
    
    state = {
        "milestones": [
            {
                "id": "m1",
                "name": "Product Launch",
                "target_date": "2026-04-01T00:00:00Z"
            }
        ],
        "work_items": [
            {
                "id": "wi_launch",
                "title": "Launch Product",
                "status": "not_started",
                "estimated_days": 3.0,
                "milestone_id": "m1",
                "dependencies": ["wi_critical_feature", "wi_nice_to_have"]
            },
            {
                "id": "wi_critical_feature",
                "title": "Critical Payment Integration",
                "status": "in_progress",
                "estimated_days": 15.0,
                "milestone_id": "m1",
                "dependencies": [],
                "remaining_days": 8.0
            },
            {
                "id": "wi_nice_to_have",
                "title": "Optional Analytics Dashboard",
                "status": "in_progress",
                "estimated_days": 10.0,
                "milestone_id": "m1",
                "dependencies": [],
                "remaining_days": 6.0
            }
        ],
        "dependencies": [
            {
                "from_id": "wi_launch",
                "to_id": "wi_critical_feature",
                "type": "finish_to_start",
                "criticality": "critical",  # Can't launch without this
                "slack_days": 0.0,
                "probability_delay": 0.8  # 80% chance of causing delay
            },
            {
                "from_id": "wi_launch",
                "to_id": "wi_nice_to_have",
                "type": "finish_to_start",
                "criticality": "low",  # Nice to have, can launch without
                "slack_days": 5.0,  # 5 days of slack
                "probability_delay": 0.3  # 30% chance of causing delay
            }
        ],
        "risks": [],
        "decisions": []
    }
    
    result = forecastMilestone("m1", state)
    
    print(f"\nOLD BEHAVIOR: Both dependencies add roughly equal delays")
    print(f"\nNEW BEHAVIOR: Weighted by criticality and probability")
    print(f"  - Critical Payment (8d remaining, critical, 80% prob):")
    print(f"    Impact: 8d × 2.0 (critical) × 0.8 (prob) = ~12.8 days")
    print(f"  - Analytics Dashboard (6d remaining, low, 30% prob, 5d slack):")
    print(f"    Impact: max(0, 6d × 0.5 (low) - 5d slack) × 0.3 (prob) = ~0 days")
    print(f"\nActual forecast delay: {result.delta_p50_days:.1f} days")
    print(f"\nContributions:")
    for contrib in result.contribution_breakdown:
        print(f"  - {contrib['cause']}: {contrib['days']:+.1f} days")
    print("\n")


# ============================================================================
# Example 5: Comprehensive Comparison
# ============================================================================

def example_comprehensive_comparison():
    """
    Side-by-side comparison showing OLD vs NEW behavior
    """
    print("=" * 70)
    print("Example 5: Comprehensive Comparison (OLD vs NEW)")
    print("=" * 70)
    
    # Complex scenario with multiple dependency types
    
    state = {
        "milestones": [
            {
                "id": "m1",
                "name": "Major Release v2.0",
                "target_date": "2026-05-01T00:00:00Z"
            }
        ],
        "work_items": [
            {
                "id": "wi_release",
                "title": "Release v2.0",
                "status": "not_started",
                "estimated_days": 2.0,
                "milestone_id": "m1",
                "dependencies": ["wi_feature_a", "wi_feature_b", "wi_external"]
            },
            {
                "id": "wi_feature_a",
                "title": "Feature A (nearly done)",
                "status": "in_progress",
                "estimated_days": 20.0,
                "milestone_id": "m1",
                "dependencies": [],
                "completion_percentage": 0.95,  # 95% complete!
                "remaining_days": 1.0  # Just 1 day left
            },
            {
                "id": "wi_feature_b",
                "title": "Feature B (blocked)",
                "status": "blocked",
                "estimated_days": 15.0,
                "milestone_id": "m1",
                "dependencies": [],
                "remaining_days": 12.0  # Still 12 days of work
            },
            {
                "id": "wi_external",
                "title": "External API (unreliable team)",
                "status": "in_progress",
                "estimated_days": 10.0,
                "milestone_id": None,
                "dependencies": [],
                "external_team_id": "team_vendor",
                "expected_completion_date": "2026-05-10T00:00:00Z",  # 9 days late!
                "confidence_level": 0.4
            }
        ],
        "dependencies": [
            {
                "from_id": "wi_release",
                "to_id": "wi_feature_a",
                "criticality": "medium",
                "slack_days": 2.0
            },
            {
                "from_id": "wi_release",
                "to_id": "wi_feature_b",
                "criticality": "high",
                "slack_days": 0.0
            },
            {
                "from_id": "wi_release",
                "to_id": "wi_external",
                "criticality": "critical",
                "probability_delay": 0.9
            }
        ],
        "risks": [],
        "decisions": []
    }
    
    external_team_history = {
        "team_vendor": ExternalTeamHistory(
            team_id="team_vendor",
            avg_slip_days=10.0,
            slip_probability=0.8,
            reliability_score=0.4
        )
    }
    
    options = ForecastOptions(external_team_history=external_team_history)
    result = forecastMilestone("m1", state, options)
    
    print(f"\n{'Dependency':<30} | OLD Behavior | NEW Behavior")
    print("-" * 70)
    print(f"{'Feature A (95% done)':<30} | ~2-3 days   | ~1 day (actual remaining)")
    print(f"{'Feature B (blocked)':<30} | ~3 days     | ~12 days (remaining work)")
    print(f"{'External API (late)':<30} | ~2 days     | ~9+ days (actual delay)")
    print()
    print(f"OLD Total (simple sum):        ~7-8 days")
    print(f"NEW Total (realistic):         {result.delta_p50_days:.1f} days")
    print()
    print("Detailed Contributions:")
    for contrib in result.contribution_breakdown[:8]:
        print(f"  - {contrib['cause']}: {contrib['days']:+.1f} days")
    print("\n")


# ============================================================================
# Run All Examples
# ============================================================================

if __name__ == "__main__":
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "IMPROVED DEPENDENCY DELAY EXAMPLES" + " " * 19 + "║")
    print("╚" + "=" * 68 + "╝")
    print()
    
    example_progress_based_delays()
    example_date_based_delays()
    example_external_team_slip_rates()
    example_probabilistic_delays()
    example_comprehensive_comparison()
    
    print("=" * 70)
    print("SUMMARY OF IMPROVEMENTS")
    print("=" * 70)
    print("""
The new dependency delay calculation provides:

1. ✓ Progress-Based Delays
   - Uses actual completion % and remaining effort
   - Not just "blocked = 3 days"

2. ✓ Date-Based Delays
   - Calculates based on expected vs needed dates
   - Accounts for real calendar delays

3. ✓ External Team Historical Slip Rates
   - Applies team-specific reliability scores
   - Uses historical data to improve predictions

4. ✓ Probabilistic Modeling
   - Weights delays by probability of occurrence
   - More realistic than binary yes/no

5. ✓ Criticality & Slack Time
   - Critical dependencies have higher impact
   - Slack time reduces pressure
   - Nice-to-have items don't block as much

RESULT: Much more accurate and useful forecasts!
    """)

