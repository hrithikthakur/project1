from pydantic import BaseModel
from typing import Optional


class Dependency(BaseModel):
    """Dependency relationship between work items"""
    from_id: str  # ID of the dependent work item
    to_id: str    # ID of the work item it depends on
    type: str = "finish_to_start"  # Dependency type
    
    class Config:
        json_schema_extra = {
            "example": {
                "from_id": "work_item_002",
                "to_id": "work_item_001",
                "type": "finish_to_start"
            }
        }

