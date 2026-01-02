from typing import Dict, List, Any
from datetime import datetime, timedelta
from ..engine.graph import DependencyGraph
from ..engine.decision_effects import apply_decision_to_item
from ..data.loader import get_work_items
from ..utils.dates import add_business_days


class RippleEffectEngine:
    """Applies decision effects and calculates ripple effects through dependencies"""
    
    def __init__(self, graph: DependencyGraph):
        self.graph = graph
        self.work_items = {item["id"]: item for item in get_work_items()}
        self.item_effects: Dict[str, Dict[str, Any]] = {}
    
    def apply_decisions(self, decisions: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Apply decisions and calculate ripple effects.
        Returns a dictionary mapping work_item_id to its modified properties.
        """
        self.item_effects = {}
        
        # First pass: apply direct effects
        for decision in decisions:
            decision_type = decision.get("decision_type")
            target_id = decision.get("target_id")
            effects = decision.get("effects", {})
            
            if target_id in self.work_items:
                # Apply to the target item
                item_effect = apply_decision_to_item(target_id, decision_type, effects)
                self._merge_effects(target_id, item_effect)
                
                # Propagate to dependents
                self._propagate_effects(target_id, item_effect)
        
        return self.item_effects
    
    def _merge_effects(self, item_id: str, new_effects: Dict[str, Any]):
        """Merge new effects with existing effects for an item"""
        if item_id not in self.item_effects:
            self.item_effects[item_id] = {}
        
        current = self.item_effects[item_id]
        
        # Merge velocity multipliers (multiply them)
        if "velocity_multiplier" in new_effects:
            current["velocity_multiplier"] = current.get("velocity_multiplier", 1.0) * new_effects["velocity_multiplier"]
        
        # Merge delays (add them)
        if "delay_days" in new_effects:
            current["delay_days"] = current.get("delay_days", 0.0) + new_effects["delay_days"]
        
        # Merge scope changes (add them)
        if "scope_change" in new_effects:
            current["scope_change"] = current.get("scope_change", 0.0) + new_effects["scope_change"]
    
    def _propagate_effects(self, item_id: str, effects: Dict[str, Any], visited: set = None):
        """Propagate effects to dependent items (with attenuation)"""
        if visited is None:
            visited = set()
        
        if item_id in visited:
            return
        
        visited.add(item_id)
        
        # Get all items that depend on this one
        dependents = self.graph.get_dependents(item_id)
        
        for dependent_id in dependents:
            # Attenuate effects (reduce by 20% per level)
            attenuated_effects = {}
            if "velocity_multiplier" in effects:
                # Velocity effects attenuate less
                attenuated_effects["velocity_multiplier"] = 1.0 + (effects["velocity_multiplier"] - 1.0) * 0.8
            if "delay_days" in effects:
                # Delays propagate fully
                attenuated_effects["delay_days"] = effects["delay_days"]
            
            self._merge_effects(dependent_id, attenuated_effects)
            
            # Recursively propagate
            self._propagate_effects(dependent_id, attenuated_effects, visited)
    
    def apply_risks(self, risks: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Apply risk effects to work items"""
        for risk in risks:
            probability = risk.get("probability", 0.0)
            impact = risk.get("impact", {})
            affected_items = risk.get("affected_items", [])
            
            # Apply risk impact weighted by probability
            for item_id in affected_items:
                if item_id in self.work_items:
                    risk_effects = {}
                    
                    # Apply velocity impact weighted by probability
                    if "velocity_multiplier" in impact:
                        # Expected impact = base * (1 - probability * (1 - impact_multiplier))
                        base_multiplier = impact["velocity_multiplier"]
                        expected_multiplier = 1.0 - probability * (1.0 - base_multiplier)
                        risk_effects["velocity_multiplier"] = expected_multiplier
                    
                    self._merge_effects(item_id, risk_effects)
        
        return self.item_effects
    
    def get_modified_item(self, item_id: str) -> Dict[str, Any]:
        """Get work item with all effects applied"""
        item = self.work_items.get(item_id, {}).copy()
        effects = self.item_effects.get(item_id, {})
        
        # Apply velocity multiplier to estimated days
        if "velocity_multiplier" in effects:
            original_days = item.get("estimated_days", 0.0)
            item["estimated_days"] = original_days / effects["velocity_multiplier"]
        
        # Apply scope change
        if "scope_change" in effects:
            original_days = item.get("estimated_days", 0.0)
            item["estimated_days"] = original_days * (1.0 + effects["scope_change"])
        
        return item

