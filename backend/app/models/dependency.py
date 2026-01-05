from pydantic import BaseModel
from typing import Optional


class Dependency(BaseModel):
    """Dependency relationship between work items"""
    from_id: str  # ID of the dependent work item
    to_id: str    # ID of the work item it depends on
    type: str = "finish_to_start"  # Dependency type (finish_to_start, start_to_start, etc.)
    
    # Advanced dependency properties
    criticality: Optional[str] = "medium"  # low, medium, high, critical
    slack_days: Optional[float] = 0.0  # How many days of slack/float exist
    probability_delay: Optional[float] = 0.3  # Probability this dependency will cause delay (0-1)
    expected_delay_if_late: Optional[float] = None  # Expected days of delay if dependency slips
    
    class Config:
        json_schema_extra = {
            "example": {
                "from_id": "work_item_002",
                "to_id": "work_item_001",
                "type": "finish_to_start"
            }
        }

