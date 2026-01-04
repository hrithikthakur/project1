"""
Risk Detection Engine
Automatically detects and creates risks based on signal patterns in work items.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..models.risk import Risk, RiskSeverity, RiskStatus
from collections import defaultdict


class SignalType:
    """Types of signals that can trigger risk creation"""
    DEPENDENCY_BLOCKED = "dependency_blocked"
    BLOCKED_TIME_THRESHOLD = "blocked_time_threshold"
    HIGH_WIP_PER_DEV = "high_wip_per_dev"
    CYCLE_TIME_DRIFT = "cycle_time_drift"
    SCOPE_CHURN = "scope_churn"
    PR_REVIEW_LATENCY = "pr_review_latency"
    REOPENED_BUGS = "reopened_bugs"


class RiskDetector:
    """Detects patterns in work items and creates risks automatically"""
    
    def __init__(self, work_items: List[Dict[str, Any]], milestones: List[Dict[str, Any]]):
        self.work_items = work_items
        self.milestones = milestones
        self.detected_risks: List[Risk] = []
        
        # Configurable thresholds
        self.thresholds = {
            "max_wip_per_dev": 3,
            "blocked_days_threshold": 3,
            "pr_review_hours_threshold": 24,
            "scope_churn_rate": 0.2,  # 20% of milestone scope
            "reopened_bugs_threshold": 3,
        }
    
    def detect_all_risks(self, existing_risks: List[Dict[str, Any]] = None) -> List[Risk]:
        """Run all risk detection checks and return detected risks"""
        self.detected_risks = []
        self.existing_risk_ids = set()
        
        # Build set of existing risk IDs to avoid duplicates
        if existing_risks:
            self.existing_risk_ids = {risk.get("id") for risk in existing_risks if risk.get("id")}
        
        self._detect_blocked_dependencies()
        self._detect_high_wip()
        self._detect_blocked_time_exceeded()
        
        return self.detected_risks
    
    def _detect_blocked_dependencies(self):
        """Detect when dependencies are blocked or unavailable"""
        blocked_items = [item for item in self.work_items if item.get("status") == "blocked"]
        
        if len(blocked_items) > 0:
            # Group by milestone
            milestone_groups = defaultdict(list)
            for item in blocked_items:
                milestone_id = item.get("milestone_id")
                if milestone_id:
                    milestone_groups[milestone_id].append(item)
            
            for milestone_id, items in milestone_groups.items():
                # Use deterministic ID based on milestone and risk type
                risk_id = f"risk_auto_blocked_{milestone_id}"
                
                # Skip if this risk already exists
                if risk_id in self.existing_risk_ids:
                    continue
                
                # Find milestone name
                milestone_name = "Unknown"
                for m in self.milestones:
                    if m.get("id") == milestone_id:
                        milestone_name = m.get("name", "Unknown")
                        break
                
                # Get item names for better readability
                item_names = [item.get("title", item.get("id")) for item in items]
                items_list = ", ".join(item_names[:3])  # Show first 3 items
                if len(item_names) > 3:
                    items_list += f" and {len(item_names) - 3} more"
                
                risk = Risk(
                    id=risk_id,
                    title=f"Blocked Dependencies in {milestone_name}",
                    description=f"{len(items)} work item(s) blocked: {items_list}",
                    severity=RiskSeverity.HIGH if len(items) >= 3 else RiskSeverity.MEDIUM,
                    status=RiskStatus.MATERIALISED,
                    probability=1.0,
                    impact={
                        "delay_days": len(items) * 2,
                        "affected_milestone": milestone_id,
                        "blocked_items": [item["id"] for item in items],
                        "blocked_item_names": item_names,
                    },
                    affected_items=[item["id"] for item in items],
                    detected_at=datetime.now(),
                    mitigated_at=None
                )
                self.detected_risks.append(risk)
    
    def _detect_high_wip(self):
        """Detect when WIP (Work In Progress) per developer is too high"""
        # Calculate WIP per developer
        dev_wip = defaultdict(int)
        in_progress_items = [item for item in self.work_items if item.get("status") == "in_progress"]
        
        for item in in_progress_items:
            assigned_to = item.get("assigned_to", [])
            for dev_id in assigned_to:
                dev_wip[dev_id] += 1
        
        # Check for developers with too much WIP
        overloaded_devs = {dev_id: wip for dev_id, wip in dev_wip.items() 
                          if wip > self.thresholds["max_wip_per_dev"]}
        
        if overloaded_devs:
            # Use deterministic ID
            risk_id = "risk_auto_high_wip"
            
            # Skip if this risk already exists
            if risk_id in self.existing_risk_ids:
                return
            
            affected_items = [
                item["id"] for item in in_progress_items 
                if any(dev in item.get("assigned_to", []) for dev in overloaded_devs.keys())
            ]
            
            risk = Risk(
                id=risk_id,
                title="High WIP Per Developer",
                description=f"{len(overloaded_devs)} developer(s) have excessive work in progress, risking quality and delivery",
                severity=RiskSeverity.MEDIUM,
                status=RiskStatus.OPEN,
                probability=0.6,
                impact={
                    "velocity_multiplier": 0.7,
                    "quality_risk": "high",
                    "overloaded_devs": list(overloaded_devs.keys()),
                    "wip_counts": overloaded_devs
                },
                affected_items=affected_items,
                detected_at=datetime.now(),
                mitigated_at=None
            )
            self.detected_risks.append(risk)
    
    def _detect_blocked_time_exceeded(self):
        """Detect when items have been blocked for too long"""
        # This would need to track how long items have been blocked
        # For now, just detect any item that's been blocked
        blocked_items = [item for item in self.work_items if item.get("status") == "blocked"]
        
        if len(blocked_items) >= 2:
            # Use deterministic ID
            risk_id = "risk_auto_long_blocked"
            
            # Skip if this risk already exists
            if risk_id in self.existing_risk_ids:
                return
            
            # Get item names for better readability
            item_names = [item.get("title", item.get("id")) for item in blocked_items]
            items_list = ", ".join(item_names[:3])  # Show first 3 items
            if len(item_names) > 3:
                items_list += f" and {len(item_names) - 3} more"
            
            risk = Risk(
                id=risk_id,
                title="Extended Blocked Time",
                description=f"{len(blocked_items)} work items blocked: {items_list}",
                severity=RiskSeverity.HIGH,
                status=RiskStatus.MATERIALISED,
                probability=1.0,
                impact={
                    "delay_days": len(blocked_items) * 3,
                    "cascading_delays": True,
                    "blocked_item_names": item_names,
                },
                affected_items=[item["id"] for item in blocked_items],
                detected_at=datetime.now(),
                mitigated_at=None
            )
            self.detected_risks.append(risk)
    
    def _detect_scope_churn(self, milestone_id: str, recent_changes: List[Dict]) -> Optional[Risk]:
        """
        Detect when scope changes mid-sprint exceed threshold.
        recent_changes should be a list of scope change decisions.
        """
        # Find milestone
        milestone = None
        for m in self.milestones:
            if m.get("id") == milestone_id:
                milestone = m
                break
        
        if not milestone:
            return None
        
        milestone_items = milestone.get("work_items", [])
        total_items = len(milestone_items)
        
        if total_items == 0:
            return None
        
        # Count items added/removed in recent changes
        items_changed = len(recent_changes)
        churn_rate = items_changed / total_items
        
        if churn_rate > self.thresholds["scope_churn_rate"]:
            # Use deterministic ID based on milestone
            risk_id = f"risk_auto_scope_churn_{milestone_id}"
            
            risk = Risk(
                id=risk_id,
                title=f"High Scope Churn in {milestone.get('name', 'Unknown')}",
                description=f"Scope changes affect {int(churn_rate * 100)}% of milestone, risking team focus and delivery",
                severity=RiskSeverity.MEDIUM,
                status=RiskStatus.OPEN,
                probability=0.5,
                impact={
                    "delay_days": items_changed * 0.5,
                    "churn_rate": churn_rate,
                    "focus_degradation": True
                },
                affected_items=milestone_items,
                detected_at=datetime.now(),
                mitigated_at=None
            )
            return risk
        
        return None


def detect_risks_from_work_items(
    work_items: List[Dict[str, Any]], 
    milestones: List[Dict[str, Any]],
    existing_risks: List[Dict[str, Any]] = None
) -> List[Risk]:
    """
    Main entry point for risk detection.
    Analyzes work items and returns automatically detected risks.
    Only returns NEW risks that don't already exist.
    """
    detector = RiskDetector(work_items, milestones)
    return detector.detect_all_risks(existing_risks)

