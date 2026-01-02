from typing import Dict, Any
from ..models.decision import DecisionType


def get_decision_effects(decision_type: str, target_id: str, custom_effects: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Map decision_type to effects on work items and resources.
    Returns a dictionary of effect modifiers.
    """
    effects = custom_effects or {}
    
    # Base effects by decision type
    base_effects = {
        DecisionType.HIRE: {
            "velocity_multiplier": 1.2,  # Increase velocity by 20%
            "resource_change": 1  # Add 1 resource
        },
        DecisionType.FIRE: {
            "velocity_multiplier": 0.8,  # Decrease velocity by 20%
            "resource_change": -1  # Remove 1 resource
        },
        DecisionType.DELAY: {
            "delay_days": 5,  # Delay by 5 days
            "velocity_multiplier": 1.0
        },
        DecisionType.ACCELERATE: {
            "velocity_multiplier": 1.3,  # Increase velocity by 30%
            "delay_days": -3  # Reduce time by 3 days
        },
        DecisionType.CHANGE_SCOPE: {
            "scope_change": -0.1,  # Reduce scope by 10%
            "velocity_multiplier": 1.0
        },
        DecisionType.ADD_RESOURCE: {
            "velocity_multiplier": 1.15,
            "resource_change": 1
        },
        DecisionType.REMOVE_RESOURCE: {
            "velocity_multiplier": 0.85,
            "resource_change": -1
        }
    }
    
    # Merge base effects with custom effects
    decision_effects = base_effects.get(decision_type, {})
    if custom_effects:
        decision_effects.update(custom_effects)
    
    return decision_effects


def apply_decision_to_item(item_id: str, decision_type: str, effects: Dict[str, Any]) -> Dict[str, Any]:
    """Apply decision effects to a specific work item"""
    item_effects = {}
    
    # Apply velocity multiplier
    if "velocity_multiplier" in effects:
        item_effects["velocity_multiplier"] = effects["velocity_multiplier"]
    
    # Apply delay
    if "delay_days" in effects:
        item_effects["delay_days"] = effects["delay_days"]
    
    # Apply scope change
    if "scope_change" in effects:
        item_effects["scope_change"] = effects["scope_change"]
    
    return item_effects

