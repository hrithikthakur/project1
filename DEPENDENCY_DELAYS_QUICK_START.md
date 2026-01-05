# Dependency Delays - Quick Start Guide

## TL;DR - What Changed?

**Before:** Dependencies just added fixed days (2 days for external, 3 days for blocked)  
**After:** Smart calculation based on actual progress, dates, team reliability, and criticality

## Quick Examples

### 1. Add Progress Tracking (Easiest Win!)

```python
# Instead of this:
work_item = {
    "id": "wi_001",
    "status": "in_progress",
    "estimated_days": 10.0
}

# Do this:
work_item = {
    "id": "wi_001",
    "status": "in_progress",
    "estimated_days": 10.0,
    "completion_percentage": 0.8,  # 80% done
    "remaining_days": 2.0  # Only 2 days left!
}
```

**Impact:** Instead of adding ~2-3 days, now adds actual 2 days remaining

### 2. Track External Team Reliability

```python
# Mark work items from external teams:
work_item = {
    "id": "wi_vendor",
    "title": "Vendor API",
    "external_team_id": "team_acme",
    "expected_completion_date": "2026-02-15T00:00:00Z"
}

# Provide historical data:
from app.engine.forecast import ExternalTeamHistory, ForecastOptions

external_teams = {
    "team_acme": ExternalTeamHistory(
        team_id="team_acme",
        avg_slip_days=5.0,  # Usually 5 days late
        slip_probability=0.6,  # Late 60% of the time
        reliability_score=0.65  # 65% reliable
    )
}

options = ForecastOptions(external_team_history=external_teams)
result = forecastMilestone(milestone_id, state, options)
```

**Impact:** Unreliable teams properly show higher risk

### 3. Set Dependency Criticality

```python
# Instead of this:
dependency = {
    "from_id": "wi_launch",
    "to_id": "wi_payment"
}

# Do this:
dependency = {
    "from_id": "wi_launch",
    "to_id": "wi_payment",
    "criticality": "critical",  # vs "high", "medium", "low"
    "slack_days": 0.0,  # No slack time
    "probability_delay": 0.8  # 80% chance of delay
}
```

**Impact:** Critical dependencies have 2x impact, low-priority items have 0.5x

## Priority Order (Implement These First)

### Priority 1: Add `remaining_days` to in-progress items
- **Effort:** Low (just track remaining work)
- **Impact:** High (most realistic improvement)
- **Example:** 95% complete task now shows 1 day delay, not 3

### Priority 2: Add `expected_completion_date` to external dependencies
- **Effort:** Medium (coordinate with external teams)
- **Impact:** High (catches date-based delays)
- **Example:** API late by 14 days now shows 14 day delay, not 2

### Priority 3: Track external teams with `ExternalTeamHistory`
- **Effort:** Medium (one-time setup per team)
- **Impact:** Medium-High (improves over time)
- **Example:** Unreliable vendor shows 5 day delay, reliable partner shows 1 day

### Priority 4: Set dependency `criticality` levels
- **Effort:** Low (classify dependencies)
- **Impact:** Medium (differentiates must-haves from nice-to-haves)
- **Example:** Nice-to-have with slack doesn't block launch

## What Delays Are Calculated?

The new system considers **6 factors** in order:

1. **Scenario delays** (explicit what-if overrides)
2. **Progress-based** → `remaining_days × criticality_multiplier`
3. **Date-based** → `expected_completion - needed_date`
4. **Team history** → `base_estimate × (1 - reliability_score) × slip_probability`
5. **Status-based** (fallback for items without tracking)
6. **Probabilistic** → All delays multiplied by `probability_delay`

## Backward Compatibility

✅ **No breaking changes!** If you don't add the new fields, it falls back to the old behavior (with slight improvements).

## See More

- **Full documentation:** `IMPROVED_DEPENDENCY_DELAYS.md`
- **Working examples:** `backend/app/engine/improved_dependency_examples.py`
- **Run examples:** `cd backend && python -m app.engine.improved_dependency_examples`

## One-Minute Test

Want to see the difference? Try this:

```python
# Create two work items - one with old fields, one with new
state = {
    "milestones": [{"id": "m1", "name": "Test", "target_date": "2026-02-01T00:00:00Z"}],
    "work_items": [
        {
            "id": "wi_old",
            "status": "blocked",
            "estimated_days": 10.0,
            "milestone_id": "m1",
            "dependencies": []
        },
        {
            "id": "wi_new",
            "status": "blocked",
            "estimated_days": 10.0,
            "remaining_days": 1.0,  # Only 1 day left!
            "milestone_id": "m1",
            "dependencies": []
        }
    ],
    "risks": [],
    "decisions": [],
    "dependencies": []
}

# Old style: Both add ~3 days (blocked = 3 days)
# New style: First adds ~5 days (blocked fallback), second adds ~1 day (actual remaining)
```

## Key Takeaway

**Stop guessing with fixed delays. Use real data for real forecasts.**

Instead of:
- Blocked = 3 days
- External = 2 days  
- In Progress = 2 days

Get:
- Blocked with 1 day remaining = 1 day
- External team that's always late = 10+ days
- In Progress 95% done = < 1 day

