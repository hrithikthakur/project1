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
        if abs(days) >= 0.1:  # Allow positive delays and negative improvements
            self.contributions.append(Contribution(cause=cause, days=days))
    
    def get_sorted(self) -> List[Dict[str, Any]]:
        """Return contributions sorted by magnitude of impact (descending)"""
        sorted_contribs = sorted(self.contributions, key=lambda c: abs(c.days), reverse=True)
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
class ExternalTeamHistory:
    """Historical slip rate for external teams"""
    team_id: str
    avg_slip_days: float = 0.0  # Average historical slip in days
    slip_probability: float = 0.3  # Probability of slipping (0-1)
    reliability_score: float = 0.7  # Overall reliability (0-1, higher is better)


@dataclass
class ForecastOptions:
    """Options for forecast computation"""
    scenario: Optional[Scenario] = None
    hypothetical_mitigation: Optional[HypotheticalMitigation] = None
    external_team_history: Optional[Dict[str, ExternalTeamHistory]] = None  # team_id -> history


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
    
    # Calculate dependency delays (critical-path-ish) and external dependency count
    dep_delay_days, external_dep_count = _calculate_dependency_delays(
        milestone, state_snapshot, tracker, options.external_team_history
    )
    
    # Calculate risk delays
    risk_delay_days = _calculate_risk_delays(
        milestone_id, state_snapshot, tracker
    )
    
    # Calculate scope change delays from recent decisions
    scope_delay_days = _calculate_scope_change_delays(
        milestone_id, state_snapshot, tracker
    )

    # Calculate capacity change impact (scenario-based)
    capacity_delay_days = _calculate_capacity_change_delay(
        milestone_id, state_snapshot, tracker
    )
    
    # Total delay
    total_delay_days = dep_delay_days + risk_delay_days + scope_delay_days + capacity_delay_days
    
    # P50 = baseline + total delay
    p50_date = baseline_date + timedelta(days=total_delay_days)
    
    # P80 = P50 + uncertainty buffer
    data_quality = _calculate_data_quality(milestone_id, state_snapshot)
    uncertainty_buffer = _calculate_uncertainty_buffer(
        milestone_id, state_snapshot, external_dep_count, data_quality, tracker
    )
    p80_date = p50_date + timedelta(days=uncertainty_buffer)
    
    # Calculate deltas from baseline
    delta_p50_days = (p50_date - baseline_date).days
    delta_p80_days = (p80_date - baseline_date).days
    
    # Confidence derived from data quality
    confidence = _confidence_level(data_quality)

    # Build explanation
    explanation = _build_explanation(
        milestone, baseline_date, p50_date, p80_date, tracker, options, confidence, data_quality
    )
    
    return ForecastResult(
        p50_date=p50_date,
        p80_date=p80_date,
        delta_p50_days=delta_p50_days,
        delta_p80_days=delta_p80_days,
        confidence_level=confidence,
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
    """Get all risks affecting a milestone (directly or via work items)"""
    risks = state.get("risks", [])
    work_items = _get_work_items_for_milestone(milestone_id, state)
    work_item_ids = {wi["id"] for wi in work_items}
    
    affected_risks = []
    for r in risks:
        # Direct association
        if r.get("milestone_id") == milestone_id:
            affected_risks.append(r)
            continue
            
        # Indirect association via affected items
        affected_items = r.get("affected_items", [])
        if any(item_id in work_item_ids for item_id in affected_items):
            affected_risks.append(r)
            
    return affected_risks


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
                
                # Note: We don't add to tracker here. 
                # The improvement will be reflected when _calculate_risk_delays 
                # processes this modified risk.
            else:
                # Default: assume mitigation moves OPEN -> MITIGATING
                # This reduces the buffer
                risk["status"] = "mitigating"
    
    return state


# ============================================================================
# Helper Functions: Delay Calculations
# ============================================================================

def _calculate_dependency_delays(
    milestone: Dict,
    state: Dict[str, Any],
    tracker: ContributionTracker,
    external_team_history: Optional[Dict[str, ExternalTeamHistory]] = None
) -> Tuple[float, int]:
    """
    Calculate delays from dependencies using realistic estimation:
    
    1. Progress-based delays: Use completion % and remaining effort
    2. Date-based delays: Calculate based on expected vs needed dates
    3. External team slip rates: Apply historical slip rates
    4. Probabilistic delays: Weight delays by probability
    5. Criticality: Factor in dependency criticality and slack
    
    Returns: (total_delay_days, external_dep_count)
    """
    total_delay = 0.0
    external_dep_count = 0
    milestone_id = milestone["id"]
    work_items = _get_work_items_for_milestone(milestone_id, state)
    all_work_items = state.get("work_items", [])
    scenario_delays = state.get("scenario_delays", {})
    external_team_history = external_team_history or {}
    current_date = datetime.now()

    # Build incoming dependency map from work item dependency lists (authoritative)
    incoming_map: Dict[str, List[str]] = {}
    for wi in all_work_items:
        for dep_id in wi.get("dependencies", []):
            if dep_id:
                incoming_map.setdefault(wi["id"], []).append(dep_id)

    # Also get explicit Dependency objects for advanced properties
    dependencies = state.get("dependencies", [])
    dep_props: Dict[Tuple[str, str], Dict] = {}
    for dep in dependencies:
        key = (dep.get("from_id"), dep.get("to_id"))
        dep_props[key] = dep

    wi_lookup = {wi["id"]: wi for wi in all_work_items}
    memo: Dict[str, float] = {}

    def _calculate_realistic_delay(wi: Dict, dep_wi: Dict, dep_properties: Optional[Dict] = None) -> Tuple[float, bool]:
        """Calculate realistic delay for a single dependency edge.
        
        Returns: (delay_days, is_scenario_delay)
        
        Note: Scenario delays are NOT calculated here - they're applied as own_delay
        in _delay_for_work_item and propagate naturally through the dependency graph.
        """
        delay = 0.0
        is_scenario = False
        
        # Skip scenario delay calculation here to avoid double-counting
        # Scenario delays are applied in _delay_for_work_item as own_delay
        
        # 1. Progress-based delay calculation
        if dep_wi.get("status") == "completed":
            return (delay, is_scenario)  # No delay from completed items
        
        # Check if we have progress tracking
        completion_pct = dep_wi.get("completion_percentage")
        remaining_days = dep_wi.get("remaining_days")
        
        if remaining_days is not None and remaining_days > 0:
            # We have explicit remaining effort - use it
            # Apply criticality factor
            criticality_multiplier = 1.0
            if dep_properties:
                crit = dep_properties.get("criticality", "medium")
                criticality_multiplier = {"low": 0.5, "medium": 1.0, "high": 1.5, "critical": 2.0}.get(crit, 1.0)
            
            potential_delay = remaining_days * criticality_multiplier
            
            # Apply slack - if there's slack, reduce the delay
            slack = dep_properties.get("slack_days", 0.0) if dep_properties else 0.0
            potential_delay = max(0, potential_delay - slack)
            
            if potential_delay > delay:
                delay = potential_delay
                is_scenario = False  # Real delay, not scenario
        
        elif completion_pct is not None:
            # Use completion percentage to estimate remaining work
            estimated_days = dep_wi.get("estimated_days", 5.0)
            remaining = estimated_days * (1.0 - completion_pct)
            potential_delay = remaining * 0.7  # Conservative multiplier
            if potential_delay > delay:
                delay = potential_delay
                is_scenario = False  # Real delay, not scenario
        
        # 3. Date-based delay calculation
        expected_completion = dep_wi.get("expected_completion_date")
        if expected_completion:
            if isinstance(expected_completion, str):
                expected_completion = datetime.fromisoformat(expected_completion.replace("Z", "+00:00"))
            
            # When do we need this dependency? (Conservative: assume we need it now)
            needed_date = current_date
            if wi.get("start_date"):
                needed_date = wi["start_date"]
                if isinstance(needed_date, str):
                    needed_date = datetime.fromisoformat(needed_date.replace("Z", "+00:00"))
            
            date_based_delay = (expected_completion - needed_date).days
            if date_based_delay > 0 and date_based_delay > delay:
                delay = date_based_delay
                is_scenario = False  # Real delay, not scenario
        
        # 4. External team historical slip rate
        external_team_id = dep_wi.get("external_team_id")
        if external_team_id and external_team_id in external_team_history:
            team_history = external_team_history[external_team_id]
            
            # Apply historical slip rate
            base_estimate = dep_wi.get("estimated_days", 5.0)
            expected_slip = base_estimate * (1 - team_history.reliability_score)
            
            # Weight by probability of slip
            probabilistic_slip = expected_slip * team_history.slip_probability
            
            if probabilistic_slip > delay:
                delay = probabilistic_slip
                is_scenario = False  # Real delay, not scenario
        
        # 5. Status-based delays (fallback for items without detailed tracking)
        if delay == 0.0 or not is_scenario:  # Only apply if we haven't calculated a better estimate
            if dep_wi.get("milestone_id") and dep_wi.get("milestone_id") != milestone_id:
                if dep_wi.get("status") != "completed":
                    # External milestone dependency - use confidence level if available
                    confidence = dep_wi.get("confidence_level", 0.7)
                    base_delay = dep_wi.get("estimated_days", 5.0) * (1.0 - confidence)
                    if base_delay > delay:
                        delay = base_delay
                        is_scenario = False
            
            if dep_wi.get("status") == "blocked" and 5.0 > delay:
                # Blocked items - estimate time to unblock
                delay = 5.0  # More realistic than flat 3 days
                is_scenario = False
            
            if dep_wi.get("status") == "in_progress" and delay == 0.0:
                # In-progress items without other tracking - use estimated remaining
                estimated_days = dep_wi.get("estimated_days", 0)
                if estimated_days > 0:
                    # Assume 50% complete if no other info
                    potential_delay = estimated_days * 0.5
                    if potential_delay > delay:
                        delay = potential_delay
                        is_scenario = False
        
        # 6. Probabilistic weighting
        if dep_properties and dep_properties.get("probability_delay") is not None:
            prob = dep_properties.get("probability_delay", 0.3)
            delay = delay * prob
        
        return (delay, is_scenario)

    def _delay_for_work_item(wi_id: str) -> float:
        """Recursive critical-path delay accumulation for a work item."""
        if wi_id in memo:
            return memo[wi_id]

        wi = wi_lookup.get(wi_id)
        if not wi:
            memo[wi_id] = 0.0
            return 0.0

        # Calculate this item's own delay (from its status/progress)
        own_delay = 0.0
        
        # IMPORTANT: Check for scenario delays FIRST (before completion check)
        # Scenario delays represent "what if" hypotheticals that override current status
        if wi_id in scenario_delays:
            own_delay = max(own_delay, float(scenario_delays[wi_id]))
        
        # If no scenario delay and item is completed, return 0
        if wi.get("status") == "completed" and wi_id not in scenario_delays:
            memo[wi_id] = 0.0
            return 0.0
        
        # Check for remaining work
        remaining_days = wi.get("remaining_days")
        if remaining_days is not None and remaining_days > 0:
            own_delay = max(own_delay, remaining_days)
        elif wi.get("completion_percentage") is not None:
            estimated_days = wi.get("estimated_days", 0)
            completion_pct = wi.get("completion_percentage")
            own_delay = max(own_delay, estimated_days * (1.0 - completion_pct))
        elif wi.get("status") == "blocked":
            own_delay = max(own_delay, 5.0)  # Blocked items
        elif wi.get("status") == "in_progress":
            estimated_days = wi.get("estimated_days", 0)
            if estimated_days > 0:
                own_delay = max(own_delay, estimated_days * 0.5)  # Assume 50% remaining

        # Calculate delay from direct dependencies
        max_upstream_delay = 0.0
        for upstream_id in incoming_map.get(wi_id, []):
            upstream_wi = wi_lookup.get(upstream_id)
            if not upstream_wi:
                continue
            
            # Get dependency properties if available
            dep_key = (wi_id, upstream_id)
            dep_properties = dep_props.get(dep_key)
            
            # Calculate realistic delay for this edge
            edge_delay, _ = _calculate_realistic_delay(wi, upstream_wi, dep_properties)
            
            # Recursively get upstream delays
            upstream_delay = _delay_for_work_item(upstream_id)
            
            # Accumulate along critical path
            total_path_delay = upstream_delay + edge_delay
            max_upstream_delay = max(max_upstream_delay, total_path_delay)

        # Total delay is the max of own delay and upstream delays
        total_delay = max(own_delay, max_upstream_delay)
        memo[wi_id] = total_delay
        return total_delay

    # Evaluate delays for milestone work items
    for wi in work_items:
        if wi.get("status") == "completed":
            continue
        
        wi_id = wi["id"]
        wi_max_delay = 0.0
        
        for upstream_id in incoming_map.get(wi_id, []):
            upstream_wi = wi_lookup.get(upstream_id)
            if not upstream_wi:
                continue
            
            upstream_delay = _delay_for_work_item(upstream_id)
            
            if upstream_delay > 0.5:  # Only track meaningful delays
                upstream_name = upstream_wi.get("title", upstream_id)
                
                # Check if this is a scenario delay
                if upstream_id in scenario_delays:
                    # This is an explicit what-if scenario
                    tracker.add(f"Scenario: {upstream_name} delayed by {scenario_delays[upstream_id]:.0f}d", upstream_delay)
                else:
                    # Add context about why there's a delay
                    reason_parts = []
                    if upstream_wi.get("remaining_days"):
                        reason_parts.append(f"{upstream_wi['remaining_days']:.1f}d remaining")
                    if upstream_wi.get("external_team_id"):
                        reason_parts.append("external team")
                    if upstream_wi.get("status") == "blocked":
                        reason_parts.append("blocked")
                    
                    reason = f" ({', '.join(reason_parts)})" if reason_parts else ""
                    tracker.add(f"Dependency: {upstream_name}{reason}", upstream_delay)
            
            wi_max_delay = max(wi_max_delay, upstream_delay)
            
            # Count external dependencies
            if upstream_wi.get("milestone_id") and upstream_wi.get("milestone_id") != milestone_id:
                external_dep_count += 1
        
        total_delay = max(total_delay, wi_max_delay)

    return total_delay, external_dep_count


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
        
        impact_days = (
            impact.get("impact_days")
            or impact.get("delay_days")
            or impact.get("schedule_delay_days")
            or 3.0
        )
        
        # Apply hypothetical mitigation reduction if present
        if "hypothetical_mitigation" in risk:
            reduction = risk["hypothetical_mitigation"].get("impact_reduction_days", 0)
            impact_days = max(0, impact_days - reduction)
        
        delay = 0.0
        
        if status == "materialised":
            delay = impact_days
            tracker.add(f"Materialised risk: {title}", delay)
        
        elif status == "open":
            delay = impact_days * probability * 0.6
            if delay >= 0.5:
                tracker.add(f"Open risk: {title} (p={probability:.2f})", delay)
        
        elif status == "mitigating":
            delay = impact_days * 0.25
            if delay >= 0.5:
                tracker.add(f"Mitigating risk: {title}", delay)
        
        delay = min(delay, 15.0)  # Prevent runaway impact
        
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
    
    # Scenario scope changes (what-if)
    scenario_scope_changes = state.get("scenario_scope_changes", {})
    if milestone_id in scenario_scope_changes:
        effort_delta = scenario_scope_changes[milestone_id]
        if effort_delta > 0:
            delay = effort_delta  # take full delta to make scenario visible
            total_delay += delay
            tracker.add(f"Scenario scope increase: +{effort_delta:.0f}d", delay)
        elif effort_delta < 0:
            # scope reduction improves timeline; treat as negative delay
            improvement = min(0, effort_delta * 0.8)  # small optimism
            total_delay += improvement
            tracker.add(f"Scenario scope reduction: {effort_delta:.0f}d", improvement)
    
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


def _calculate_uncertainty_buffer(
    milestone_id: str,
    state: Dict[str, Any],
    external_dep_count: int,
    data_quality: Dict[str, Any],
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
    
    buffer = 1.5  # base
    buffer += len(open_risks) * 1.5
    buffer += external_dep_count * 0.75

    data_penalty = data_quality.get("penalty", 0.0)
    buffer += data_penalty

    buffer = min(buffer, 12.0)  # cap to avoid runaway buffers
    
    if buffer > 0:
        tracker.add("Uncertainty buffer (P80)", buffer)
    
    return buffer


def _calculate_capacity_change_delay(
    milestone_id: str,
    state: Dict[str, Any],
    tracker: ContributionTracker
) -> float:
    """
    Compute delay from scenario capacity changes.
    Multiplier < 1 stretches remaining effort; >1 provides improvement.
    """
    scenario_capacity = state.get("scenario_capacity_changes", {})
    multiplier = scenario_capacity.get(milestone_id)
    if multiplier is None or multiplier == 1.0:
        return 0.0

    work_items = _get_work_items_for_milestone(milestone_id, state)
    remaining_effort = sum(
        wi.get("estimated_days", 0) for wi in work_items
        if wi.get("status") != "completed"
    )

    if remaining_effort <= 0:
        return 0.0

    # Delay (or improvement if >1)
    delta = remaining_effort * (1 / multiplier - 1)
    tracker.add(
        f"Scenario capacity change ({multiplier:.2f}x)",
        delta
    )
    return delta


def _calculate_data_quality(
    milestone_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """Assess data coverage to inform confidence and buffer penalties."""
    work_items = _get_work_items_for_milestone(milestone_id, state)

    total_items = len(work_items)
    with_estimates = len([wi for wi in work_items if wi.get("estimated_days") is not None])
    estimate_coverage = with_estimates / total_items if total_items else 1.0

    # External dependencies based on work item dependency lists (authoritative)
    all_work_items = state.get("work_items", [])
    wi_lookup = {wi["id"]: wi for wi in all_work_items}
    external_dep_count = 0
    for wi in work_items:
        for dep_id in wi.get("dependencies", []):
            dep_wi = wi_lookup.get(dep_id)
            if dep_wi and dep_wi.get("milestone_id") and dep_wi.get("milestone_id") != milestone_id:
                external_dep_count += 1

    penalty = 0.0
    if estimate_coverage < 0.5:
        penalty += 2.0
    elif estimate_coverage < 0.8:
        penalty += 1.0

    return {
        "estimate_coverage": estimate_coverage,
        "external_dep_count": external_dep_count,
        "penalty": penalty
    }


def _confidence_level(data_quality: Dict[str, Any]) -> str:
    """Derive a simple confidence label from data coverage."""
    coverage = data_quality.get("estimate_coverage", 0.0)
    external_dep_count = data_quality.get("external_dep_count", 0)

    if coverage >= 0.85 and external_dep_count <= 2:
        return "MED"
    return "LOW"


# ============================================================================
# Helper Functions: Explanation
# ============================================================================

def _build_explanation(
    milestone: Dict,
    baseline_date: datetime,
    p50_date: datetime,
    p80_date: datetime,
    tracker: ContributionTracker,
    options: ForecastOptions,
    confidence: str,
    data_quality: Dict[str, Any]
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
    coverage = data_quality.get("estimate_coverage", 0.0)
    lines.append(f"Confidence: {confidence} (estimate coverage: {coverage:.0%})")
    
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

