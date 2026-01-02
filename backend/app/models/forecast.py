from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime


class ForecastResult(BaseModel):
    """Forecast result from Monte Carlo simulation"""
    work_item_id: str
    percentiles: Dict[str, float]  # e.g., {"p50": 10.5, "p90": 15.2}
    mean: float
    std_dev: float
    earliest_possible: datetime
    latest_possible: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "work_item_id": "work_item_001",
                "percentiles": {"p10": 8.0, "p50": 10.5, "p90": 15.2, "p99": 20.0},
                "mean": 11.2,
                "std_dev": 3.5,
                "earliest_possible": "2024-01-20T00:00:00Z",
                "latest_possible": "2024-02-15T00:00:00Z"
            }
        }


class ForecastRequest(BaseModel):
    """Request model for forecast endpoint"""
    decisions: Optional[List[dict]] = None  # List of decisions to apply
    risks: Optional[List[dict]] = None  # List of risks to consider
    num_simulations: int = 1000
    
    class Config:
        json_schema_extra = {
            "example": {
                "decisions": [],
                "risks": [],
                "num_simulations": 1000
            }
        }

