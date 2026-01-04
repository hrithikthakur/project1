"""
Forecast API Endpoints

Provides REST API for the Forecast Engine v1.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from app.engine.forecast import (
    forecastMilestone,
    forecast_with_scenario,
    forecast_mitigation_impact,
    ScenarioType,
    ForecastOptions,
    Scenario,
    HypotheticalMitigation,
)
from app.data.loader import load_mock_world


router = APIRouter(prefix="/api/forecast", tags=["forecast"])


# ============================================================================
# Request/Response Models
# ============================================================================

class ForecastResponse(BaseModel):
    """Standard forecast response"""
    p50_date: str
    p80_date: str
    delta_p50_days: float
    delta_p80_days: float
    confidence_level: str
    contribution_breakdown: List[Dict[str, Any]]
    explanation: str


class ScenarioRequest(BaseModel):
    """What-if scenario request"""
    scenario_type: str  # "dependency_delay", "scope_change", "capacity_change"
    params: Dict[str, Any]


class ScenarioComparisonResponse(BaseModel):
    """Scenario comparison response"""
    baseline: ForecastResponse
    scenario: ForecastResponse
    impact_days: float
    impact_description: str


class MitigationPreviewRequest(BaseModel):
    """Mitigation impact preview request"""
    risk_id: str
    expected_impact_reduction_days: Optional[float] = None


class MitigationPreviewResponse(BaseModel):
    """Mitigation preview response"""
    current: ForecastResponse
    with_mitigation: ForecastResponse
    improvement_days: float
    recommendation: str
    reasoning: str


# ============================================================================
# Helper Functions
# ============================================================================

def _serialize_forecast_result(result) -> ForecastResponse:
    """Convert ForecastResult to API response"""
    return ForecastResponse(
        p50_date=result.p50_date.isoformat(),
        p80_date=result.p80_date.isoformat(),
        delta_p50_days=result.delta_p50_days,
        delta_p80_days=result.delta_p80_days,
        confidence_level=result.confidence_level,
        contribution_breakdown=result.contribution_breakdown,
        explanation=result.explanation
    )


def _get_state_snapshot() -> Dict[str, Any]:
    """Load current state snapshot"""
    # In production, this would aggregate from DB/cache
    # For now, load from mock data
    return load_mock_world()


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/{milestone_id}", response_model=ForecastResponse)
def get_baseline_forecast(milestone_id: str):
    """
    Get baseline forecast for a milestone.
    
    Returns P50/P80 dates with contribution breakdown.
    """
    try:
        state = _get_state_snapshot()
        result = forecastMilestone(milestone_id, state)
        return _serialize_forecast_result(result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


@router.post("/{milestone_id}/scenario", response_model=ScenarioComparisonResponse)
def get_scenario_forecast(milestone_id: str, scenario_request: ScenarioRequest):
    """
    Run what-if scenario forecast.
    
    Returns baseline vs scenario comparison.
    
    Example scenarios:
    - {"scenario_type": "dependency_delay", "params": {"work_item_id": "wi_001", "delay_days": 5}}
    - {"scenario_type": "scope_change", "params": {"effort_delta_days": 8}}
    - {"scenario_type": "capacity_change", "params": {"capacity_multiplier": 0.7}}
    """
    try:
        state = _get_state_snapshot()
        
        # Validate and parse scenario type
        try:
            scenario_type = ScenarioType(scenario_request.scenario_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid scenario_type. Must be one of: {[t.value for t in ScenarioType]}"
            )
        
        # Run scenario forecast
        baseline, scenario = forecast_with_scenario(
            milestone_id,
            state,
            scenario_type,
            scenario_request.params
        )
        
        # Calculate impact
        impact_days = scenario.delta_p80_days - baseline.delta_p80_days
        
        # Generate description
        if abs(impact_days) < 0.5:
            impact_desc = "Minimal impact on forecast"
        elif impact_days > 0:
            impact_desc = f"P80 slips by {impact_days:.0f} days"
        else:
            impact_desc = f"P80 improves by {abs(impact_days):.0f} days"
        
        return ScenarioComparisonResponse(
            baseline=_serialize_forecast_result(baseline),
            scenario=_serialize_forecast_result(scenario),
            impact_days=impact_days,
            impact_description=impact_desc
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario forecast failed: {str(e)}")


@router.post("/{milestone_id}/mitigation-preview", response_model=MitigationPreviewResponse)
def get_mitigation_preview(milestone_id: str, request: MitigationPreviewRequest):
    """
    Preview impact of a mitigation before approving MITIGATE_RISK decision.
    
    Shows how forecast would improve if mitigation succeeds.
    """
    try:
        state = _get_state_snapshot()
        
        # Run mitigation preview
        current, with_mitigation, improvement_days = forecast_mitigation_impact(
            milestone_id,
            state,
            request.risk_id,
            request.expected_impact_reduction_days
        )
        
        # Generate recommendation
        if improvement_days > 3:
            recommendation = "approve"
            reasoning = f"Strong ROI: Mitigation improves P80 by ~{improvement_days:.0f} days. Recommend proceeding."
        elif improvement_days > 1:
            recommendation = "evaluate"
            reasoning = f"Moderate ROI: Mitigation improves P80 by ~{improvement_days:.0f} days. Evaluate cost vs. benefit."
        else:
            recommendation = "reject"
            reasoning = f"Low ROI: Mitigation improves P80 by only ~{improvement_days:.0f} day(s). Consider accepting risk instead."
        
        return MitigationPreviewResponse(
            current=_serialize_forecast_result(current),
            with_mitigation=_serialize_forecast_result(with_mitigation),
            improvement_days=improvement_days,
            recommendation=recommendation,
            reasoning=reasoning
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mitigation preview failed: {str(e)}")


@router.get("/{milestone_id}/summary")
def get_forecast_summary(milestone_id: str):
    """
    Get a simplified forecast summary for quick display.
    
    Returns only the key dates and top 3 contributors.
    """
    try:
        state = _get_state_snapshot()
        result = forecastMilestone(milestone_id, state)
        
        # Get milestone for baseline
        milestone = next(
            (m for m in state.get("milestones", []) if m["id"] == milestone_id),
            None
        )
        
        baseline_date = milestone["target_date"] if milestone else None
        
        return {
            "milestone_id": milestone_id,
            "baseline_date": baseline_date,
            "p50_date": result.p50_date.isoformat(),
            "p80_date": result.p80_date.isoformat(),
            "days_from_target": result.delta_p80_days,
            "status": "at_risk" if result.delta_p80_days > 7 else "on_track",
            "top_contributors": result.contribution_breakdown[:3],
            "confidence": result.confidence_level
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast summary failed: {str(e)}")
