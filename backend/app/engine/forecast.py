"""
Forecast Engine v1

A single, unified forecast engine that supports:
1. Baseline forecasting
2. What-if scenario forecasting
3. Contribution breakdown (causal attribution)
4. Mitigation impact preview

Design constraint: ONE forecast function, advanced features via multiple runs with modified inputs.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum


# ============================================================================
# Types and Data Structures
# ============================================================================

class ScenarioType(str, Enum):
    DEPENDENCY_DELAY = "dependency_delay"
    SCOPE_CHANGE = "scope_change"
    CAPACITY_CHANGE = "capacity_change"


@dataclass
class Contribution:
    """A single contribution to forecast delay"""
    cause: str
    days: float
    
    def __repr__(self):
        return f"Contribution(cause='{self.cause}', days={self.days:+.1f})"


@dataclass
class ContributionTracker:
    """Tracks causes and their impact during forecast computation"""
    contributions: List[Contribution] = field(default_factory=list)
    
    def add(self, cause: str, days: float):
        """Add a contribution (only if meaningful)"""
        if days > 0:
            self.contributions.append(Contribution(cause=cause, days=days))
    
    def get_sorted(self) -> List[Dict[str, Any]]:
        """Return contributions sorted by impact (descending)"""
        sorted_contribs = sorted(self.contributions, key=lambda c: c.days, reverse=True)
        return [{"cause": c.cause, "days": round(c.days, 1)} for c in sorted_contribs]
    
    def total_delay(self) -> float:
        """Total delay from all contributions"""
        return sum(c.days for c in self.contributions)


@dataclass
class Scenario:
    """What-if scenario parameters"""
    type: ScenarioType
    params: Dict[str, Any]


@dataclass
class HypotheticalMitigation:
    """Hypothetical mitigation for preview"""
    risk_id: str
    expected_impact_reduction_days: Optional[float] = None


@dataclass
class ForecastOptions:
    """Options for forecast computation"""
    scenario: Optional[Scenario] = None
    hypothetical_mitigation: Optional[HypotheticalMitigation] = None


@dataclass
class ForecastResult:
    """Result of a forecast computation"""
    p50_date: datetime
    p80_date: datetime
    delta_p50_days: float
    delta_p80_days: float
    confidence_level: str
    contribution_breakdown: List[Dict[str, Any]]
    explanation: str


# ============================================================================
# Core Forecast Function
# ============================================================================

def forecastMilestone(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    options: Optional[ForecastOptions] = None
) -> ForecastResult:
    """
    Main forecast function - computes P50/P80 dates with contribution breakdown.
    
    Args:
        milestone_id: ID of milestone to forecast
        state_snapshot: Current state (milestones, work_items, dependencies, risks, decisions)
        options: Optional scenario or mitigation parameters
    
    Returns:
        ForecastResult with dates, deltas, contributions, and explanation
    """
    options = options or ForecastOptions()
    tracker = ContributionTracker()
    
    # Get milestone
    milestone = _get_milestone(milestone_id, state_snapshot)
    if not milestone:
        raise ValueError(f"Milestone {milestone_id} not found")
    
    baseline_date = milestone["target_date"]
    if isinstance(baseline_date, str):
        baseline_date = datetime.fromisoformat(baseline_date.replace("Z", "+00:00"))
    
    # Apply scenario perturbations if present
    state_snapshot = _apply_scenario_perturbations(
        state_snapshot, milestone_id, options.scenario, tracker
    )
    
    # Apply hypothetical mitigation if present
    state_snapshot = _apply_hypothetical_mitigation(
        state_snapshot, options.hypothetical_mitigation, tracker
    )
    
    # Calculate dependency delays
    dep_delay_days = _calculate_dependency_delays(
        milestone, state_snapshot, tracker
    )
    
    # Calculate risk delays
    risk_delay_days = _calculate_risk_delays(
        milestone_id, state_snapshot, tracker
    )
    
    # Calculate scope change delays from recent decisions
    scope_delay_days = _calculate_scope_change_delays(
        milestone_id, state_snapshot, tracker
    )
    
    # Calculate capacity change delays (from scenarios)
    capacity_delay_days = _calculate_capacity_change_delays(
        milestone_id, state_snapshot, tracker
    )
    
    # Total delay
    total_delay_days = dep_delay_days + risk_delay_days + scope_delay_days + capacity_delay_days
    
    # P50 = baseline + total delay
    p50_date = baseline_date + timedelta(days=total_delay_days)
    
    # P80 = P50 + uncertainty buffer
    # Buffer based on risk profile (simple heuristic)
    uncertainty_buffer = _calculate_uncertainty_buffer(
        milestone_id, state_snapshot, tracker
    )
    p80_date = p50_date + timedelta(days=uncertainty_buffer)
    
    # Calculate deltas from baseline
    delta_p50_days = (p50_date - baseline_date).days
    delta_p80_days = (p80_date - baseline_date).days
    
    # Build explanation
    explanation = _build_explanation(
        milestone, baseline_date, p50_date, p80_date, tracker, options
    )
    
    return ForecastResult(
        p50_date=p50_date,
        p80_date=p80_date,
        delta_p50_days=delta_p50_days,
        delta_p80_days=delta_p80_days,
        confidence_level="LOW",  # Honest about accuracy
        contribution_breakdown=tracker.get_sorted(),
        explanation=explanation
    )


# ============================================================================
# Helper Functions: State Access
# ============================================================================

def _get_milestone(milestone_id: str, state: Dict[str, Any]) -> Optional[Dict]:
    """Get milestone by ID"""
    milestones = state.get("milestones", [])
    for m in milestones:
        if m["id"] == milestone_id:
            return m
    return None


def _get_work_items_for_milestone(milestone_id: str, state: Dict[str, Any]) -> List[Dict]:
    """Get all work items for a milestone"""
    work_items = state.get("work_items", [])
    return [wi for wi in work_items if wi.get("milestone_id") == milestone_id]


def _get_risks_for_milestone(milestone_id: str, state: Dict[str, Any]) -> List[Dict]:
    """Get all risks affecting a milestone"""
    risks = state.get("risks", [])
    return [r for r in risks if r.get("milestone_id") == milestone_id]


def _get_dependencies(state: Dict[str, Any]) -> List[Dict]:
    """Get all dependencies"""
    return state.get("dependencies", [])


# ============================================================================
# Helper Functions: Scenario Perturbations
# ============================================================================

def _apply_scenario_perturbations(
    state: Dict[str, Any],
    milestone_id: str,
    scenario: Optional[Scenario],
    tracker: ContributionTracker
) -> Dict[str, Any]:
    """
    Apply scenario perturbations to state (creates modified copy).
    This is how what-if scenarios work - perturb inputs, rerun forecast.
    """
    if not scenario:
        return state
    
    # Create a shallow copy to avoid mutating original
    state = dict(state)
    
    if scenario.type == ScenarioType.DEPENDENCY_DELAY:
        state = _perturb_dependency_delay(state, scenario.params, tracker)
    
    elif scenario.type == ScenarioType.SCOPE_CHANGE:
        state = _perturb_scope_change(state, milestone_id, scenario.params, tracker)
    
    elif scenario.type == ScenarioType.CAPACITY_CHANGE:
        state = _perturb_capacity_change(state, milestone_id, scenario.params, tracker)
    
    return state


def _perturb_dependency_delay(
    state: Dict[str, Any],
    params: Dict[str, Any],
    tracker: ContributionTracker
) -> Dict[str, Any]:
    """
    Simulate a dependency delay by adding days to a specific work item.
    
    Params:
        - work_item_id: ID of work item to delay
        - delay_days: Number of days to add
    """
    work_item_id = params.get("work_item_id")
    delay_days = params.get("delay_days", 0)
    
    if work_item_id and delay_days > 0:
        # Mark this work item as delayed in metadata
        # In a real system, we'd adjust end_date or estimated_days
        # For simplicity, we'll track it separately
        if "scenario_delays" not in state:
            state["scenario_delays"] = {}
        state["scenario_delays"][work_item_id] = delay_days
        
        # Don't add to tracker yet - will be picked up in dependency calculation
    
    return state


def _perturb_scope_change(
    state: Dict[str, Any],
    milestone_id: str,
    params: Dict[str, Any],
    tracker: ContributionTracker
) -> Dict[str, Any]:
    """
    Simulate scope change by adding/removing fixed effort.
    
    Params:
        - effort_delta_days: Positive = add scope, negative = remove scope
    """
    effort_delta_days = params.get("effort_delta_days", 0)
    
    if effort_delta_days != 0:
        # Track scenario scope change separately
        if "scenario_scope_changes" not in state:
            state["scenario_scope_changes"] = {}
        state["scenario_scope_changes"][milestone_id] = effort_delta_days
        
        # Add contribution immediately (scope changes directly impact timeline)
        action = "add" if effort_delta_days > 0 else "remove"
        tracker.add(
            f"Scenario: {action} {abs(effort_delta_days):.0f} days of scope",
            abs(effort_delta_days)
        )
    
    return state


def _perturb_capacity_change(
    state: Dict[str, Any],
    milestone_id: str,
    params: Dict[str, Any],
    tracker: ContributionTracker
) -> Dict[str, Any]:
    """
    Simulate capacity change via proportional timeline adjustment.
    
    Params:
        - capacity_multiplier: e.g. 0.8 = 20% reduction, 1.2 = 20% increase
    """
    capacity_multiplier = params.get("capacity_multiplier", 1.0)
    
    if capacity_multiplier != 1.0:
        # Track scenario capacity change
        if "scenario_capacity_changes" not in state:
            state["scenario_capacity_changes"] = {}
        state["scenario_capacity_changes"][milestone_id] = capacity_multiplier
        
        # For reduced capacity, remaining work takes longer
        # Rough heuristic: if capacity drops 20%, timeline extends by ~25%
        if capacity_multiplier < 1.0:
            # Get remaining effort
            work_items = _get_work_items_for_milestone(milestone_id, state)
            total_remaining_days = sum(
                wi.get("estimated_days", 0) for wi in work_items
                if wi.get("status") != "completed"
            )
            
            # Calculate extension
            extension = total_remaining_days * (1 / capacity_multiplier - 1)
            tracker.add(
                f"Scenario: {int((1 - capacity_multiplier) * 100)}% capacity reduction",
                extension
            )
    
    return state


# ============================================================================
# Helper Functions: Hypothetical Mitigation
# ============================================================================

def _apply_hypothetical_mitigation(
    state: Dict[str, Any],
    mitigation: Optional[HypotheticalMitigation],
    tracker: ContributionTracker
) -> Dict[str, Any]:
    """
    Apply hypothetical mitigation without mutating state.
    This simulates what would happen if a mitigation succeeds.
    """
    if not mitigation:
        return state
    
    # Create modified copy with mitigation applied
    state = dict(state)
    state["risks"] = [dict(r) for r in state.get("risks", [])]
    
    for risk in state["risks"]:
        if risk["id"] == mitigation.risk_id:
            # Simulate mitigation effect
            if mitigation.expected_impact_reduction_days:
                # Reduce impact by specified days
                if "hypothetical_mitigation" not in risk:
                    risk["hypothetical_mitigation"] = {}
                risk["hypothetical_mitigation"]["impact_reduction_days"] = (
                    mitigation.expected_impact_reduction_days
                )
                
                tracker.add(
                    f"Hypothetical mitigation: {risk.get('title', 'Risk')}",
                    -mitigation.expected_impact_reduction_days  # Negative = improvement
                )
            else:
                # Default: assume mitigation moves OPEN -> MITIGATING
                # This reduces the buffer
                original_status = risk.get("status")
                risk["status"] = "mitigating"
                
                # Don't add to tracker here - will be reflected in risk delay calculation
    
    return state


# ============================================================================
# Helper Functions: Delay Calculations
# ============================================================================

def _calculate_dependency_delays(
    milestone: Dict,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Calculate delays from external dependencies (max ripple downstream).
    
    Approximation: Look for work items in this milestone that depend on
    work items in OTHER milestones. If those are delayed, it ripples here.
    """
    total_delay = 0.0
    milestone_id = milestone["id"]
    work_items = _get_work_items_for_milestone(milestone_id, state)
    all_work_items = state.get("work_items", [])
    dependencies = _get_dependencies(state)
    scenario_delays = state.get("scenario_delays", {})
    
    # Build dependency map
    dep_map = {}  # from_id -> [to_id, ...]
    for dep in dependencies:
        from_id = dep.get("from_id")
        to_id = dep.get("to_id")
        if from_id not in dep_map:
            dep_map[from_id] = []
        dep_map[from_id].append(to_id)
    
    # For each work item in this milestone
    for wi in work_items:
        if wi.get("status") == "completed":
            continue
        
        wi_id = wi["id"]
        dependencies_of_wi = dep_map.get(wi_id, [])
        
        for dep_id in dependencies_of_wi:
            # Find the dependency work item
            dep_wi = next((w for w in all_work_items if w["id"] == dep_id), None)
            if not dep_wi:
                continue
            
            # Check if it's in a different milestone or blocked/delayed
            dep_milestone_id = dep_wi.get("milestone_id")
            dep_status = dep_wi.get("status")
            
            # External dependency delay
            if dep_milestone_id and dep_milestone_id != milestone_id:
                # Rough heuristic: if dependency is not completed, assume 2-day delay per external dep
                if dep_status != "completed":
                    delay = 2.0
                    total_delay = max(total_delay, delay)  # Max ripple
                    
                    dep_name = dep_wi.get("title", dep_id)
                    tracker.add(f"External dependency: {dep_name}", delay)
            
            # Scenario-induced delay
            if dep_id in scenario_delays:
                delay = scenario_delays[dep_id]
                total_delay = max(total_delay, delay)
                tracker.add(f"Scenario: delay in {dep_wi.get('title', dep_id)}", delay)
            
            # Blocked status
            if dep_status == "blocked":
                delay = 3.0  # Assume 3 days for blocked items
                total_delay = max(total_delay, delay)
                tracker.add(f"Blocked dependency: {dep_wi.get('title', dep_id)}", delay)
    
    return total_delay


def _calculate_risk_delays(
    milestone_id: str,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Calculate delays from risks based on status.
    
    Risk impact logic:
    - OPEN: Small probability-weighted buffer (precautionary)
    - MATERIALISED: Full impact hits (hard delay)
    - MITIGATING: Reduced buffer (active work to resolve)
    - ACCEPTED/CLOSED: No delay
    """
    total_delay = 0.0
    risks = _get_risks_for_milestone(milestone_id, state)
    
    for risk in risks:
        status = risk.get("status")
        title = risk.get("title", risk.get("id"))
        impact = risk.get("impact", {})
        probability = risk.get("probability", 0.5)
        
        # Extract impact days from impact dict
        # Common patterns: impact_days, delay_days, schedule_delay_days
        impact_days = (
            impact.get("impact_days") or
            impact.get("delay_days") or
            impact.get("schedule_delay_days") or
            3.0  # Default assumption: 3 days
        )
        
        # Apply hypothetical mitigation reduction if present
        if "hypothetical_mitigation" in risk:
            reduction = risk["hypothetical_mitigation"].get("impact_reduction_days", 0)
            impact_days = max(0, impact_days - reduction)
        
        delay = 0.0
        
        if status == "materialised":
            # Risk has occurred - full impact
            delay = impact_days
            tracker.add(f"Materialised risk: {title}", delay)
        
        elif status == "open":
            # Risk is open - add small probability-weighted buffer
            delay = impact_days * probability * 0.5  # 50% precautionary discount
            if delay >= 0.5:  # Only track meaningful contributions
                tracker.add(f"Open risk: {title} (probability-weighted)", delay)
        
        elif status == "mitigating":
            # Mitigation in progress - reduced buffer
            delay = impact_days * 0.3  # 30% of full impact
            if delay >= 0.5:
                tracker.add(f"Mitigating risk: {title} (reduced buffer)", delay)
        
        # ACCEPTED and CLOSED contribute nothing
        
        total_delay += delay
    
    return total_delay


def _calculate_scope_change_delays(
    milestone_id: str,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Calculate delays from recent scope change decisions.
    
    Looks for approved CHANGE_SCOPE decisions and applies effort_delta_days.
    """
    total_delay = 0.0
    decisions = state.get("decisions", [])
    
    # Check scenario scope changes - add the delay but don't double-track in contributions
    # (contribution was already added in _perturb_scope_change)
    scenario_scope_changes = state.get("scenario_scope_changes", {})
    if milestone_id in scenario_scope_changes:
        scenario_delay = abs(scenario_scope_changes[milestone_id])
        total_delay += scenario_delay
    
    # Look for recent CHANGE_SCOPE decisions
    for decision in decisions:
        if decision.get("decision_type") != "change_scope":
            continue
        if decision.get("status") != "approved":
            continue
        
        # Check if this decision affects our milestone
        # (In a real system, decisions would have milestone_id field)
        milestone_name = decision.get("milestone_name", "")
        
        # For now, apply to all milestones (conservative)
        effort_delta = decision.get("effort_delta_days", 0)
        if effort_delta > 0:
            delay = effort_delta * 0.8  # 80% of scope addition becomes delay (rough heuristic)
            total_delay += delay
            
            reason = decision.get("reason", "scope change")
            tracker.add(f"Recent scope change: {reason}", delay)
    
    return total_delay


def _calculate_capacity_change_delays(
    milestone_id: str,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Calculate delays from capacity change scenarios.
    
    Note: Contribution is already tracked in _perturb_capacity_change,
    this just returns the delay value for the total calculation.
    """
    total_delay = 0.0
    
    scenario_capacity_changes = state.get("scenario_capacity_changes", {})
    if milestone_id in scenario_capacity_changes:
        capacity_multiplier = scenario_capacity_changes[milestone_id]
        
        # For reduced capacity, calculate the extension
        if capacity_multiplier < 1.0:
            work_items = _get_work_items_for_milestone(milestone_id, state)
            total_remaining_days = sum(
                wi.get("estimated_days", 0) for wi in work_items
                if wi.get("status") != "completed"
            )
            
            # Calculate extension (same formula as in perturbation)
            extension = total_remaining_days * (1 / capacity_multiplier - 1)
            total_delay = extension
    
    return total_delay


def _calculate_uncertainty_buffer(
    milestone_id: str,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Calculate uncertainty buffer for P80 (simple heuristic).
    
    Buffer based on:
    - Number of open risks
    - Work item volatility
    - General uncertainty
    
    TODO: Improve with historical variance, complexity metrics
    """
    risks = _get_risks_for_milestone(milestone_id, state)
    open_risks = [r for r in risks if r.get("status") in ["open", "mitigating"]]
    
    # Base buffer: 2 days per open/mitigating risk
    buffer = len(open_risks) * 2.0
    
    # Add general uncertainty buffer
    buffer += 3.0  # Baseline uncertainty
    
    if buffer > 0:
        tracker.add("Uncertainty buffer (P80)", buffer)
    
    return buffer


# ============================================================================
# Helper Functions: Explanation
# ============================================================================

def _build_explanation(
    milestone: Dict,
    baseline_date: datetime,
    p50_date: datetime,
    p80_date: datetime,
    tracker: ContributionTracker,
    options: ForecastOptions
) -> str:
    """Build human-readable explanation"""
    lines = []
    
    milestone_name = milestone.get("name", milestone.get("id"))
    
    if options.scenario:
        lines.append(f"Scenario forecast for '{milestone_name}':")
        lines.append(f"  Scenario type: {options.scenario.type.value}")
    elif options.hypothetical_mitigation:
        lines.append(f"Mitigation impact preview for '{milestone_name}':")
    else:
        lines.append(f"Baseline forecast for '{milestone_name}':")
    
    lines.append(f"  Baseline target: {baseline_date.strftime('%Y-%m-%d')}")
    lines.append(f"  Forecast P50: {p50_date.strftime('%Y-%m-%d')} ({(p50_date - baseline_date).days:+d} days)")
    lines.append(f"  Forecast P80: {p80_date.strftime('%Y-%m-%d')} ({(p80_date - baseline_date).days:+d} days)")
    lines.append("")
    lines.append("Top contributors:")
    
    for contrib in tracker.get_sorted()[:5]:  # Top 5
        lines.append(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
    
    lines.append("")
    lines.append("Confidence: LOW (simple heuristics, no historical data)")
    
    return "\n".join(lines)


# ============================================================================
# Advanced Feature Functions (built on top of core forecast)
# ============================================================================

def forecast_with_scenario(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    scenario_type: ScenarioType,
    scenario_params: Dict[str, Any]
) -> Tuple[ForecastResult, ForecastResult]:
    """
    Run what-if scenario forecast.
    Returns (baseline_result, scenario_result).
    """
    # Run baseline
    baseline = forecastMilestone(milestone_id, state_snapshot)
    
    # Run with scenario
    scenario = forecastMilestone(
        milestone_id,
        state_snapshot,
        ForecastOptions(scenario=Scenario(type=scenario_type, params=scenario_params))
    )
    
    return baseline, scenario


def forecast_mitigation_impact(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    risk_id: str,
    expected_impact_reduction_days: Optional[float] = None
) -> Tuple[ForecastResult, ForecastResult, float]:
    """
    Preview mitigation impact on forecast.
    Returns (current_result, with_mitigation_result, improvement_days).
    """
    # Run without mitigation
    current = forecastMilestone(milestone_id, state_snapshot)
    
    # Run with hypothetical mitigation
    with_mitigation = forecastMilestone(
        milestone_id,
        state_snapshot,
        ForecastOptions(
            hypothetical_mitigation=HypotheticalMitigation(
                risk_id=risk_id,
                expected_impact_reduction_days=expected_impact_reduction_days
            )
        )
    )
    
    # Calculate improvement
    improvement_days = current.delta_p80_days - with_mitigation.delta_p80_days
    
    return current, with_mitigation, improvement_days


def explain_forecast_change(
    milestone_id: str,
    state_snapshot: Dict[str, Any],
    previous_result: ForecastResult,
    current_result: ForecastResult
) -> str:
    """
    Explain what changed between two forecasts.
    Useful for understanding forecast drift.
    """
    p80_delta = current_result.delta_p80_days - previous_result.delta_p80_days
    
    lines = []
    lines.append(f"Forecast change analysis:")
    lines.append(f"  Previous P80: {previous_result.p80_date.strftime('%Y-%m-%d')} ({previous_result.delta_p80_days:+d} days)")
    lines.append(f"  Current P80: {current_result.p80_date.strftime('%Y-%m-%d')} ({current_result.delta_p80_days:+d} days)")
    lines.append(f"  Net change: {p80_delta:+.1f} days")
    lines.append("")
    
    if abs(p80_delta) < 1:
        lines.append("Forecast is stable (< 1 day change)")
    else:
        direction = "slipped" if p80_delta > 0 else "improved"
        lines.append(f"Forecast has {direction} by {abs(p80_delta):.1f} days")
        lines.append("")
        lines.append("Current contributors:")
        for contrib in current_result.contribution_breakdown[:3]:
            lines.append(f"  • {contrib['cause']}: {contrib['days']:+.1f} days")
    
    return "\n".join(lines)

