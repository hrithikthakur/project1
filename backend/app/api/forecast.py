from fastapi import APIRouter, HTTPException
from typing import List
from ..models.forecast import ForecastRequest, ForecastResult
from ..engine.graph import DependencyGraph
from ..engine.ripple import RippleEffectEngine
from ..engine.simulator import MonteCarloSimulator

router = APIRouter()


@router.post("/forecast", response_model=List[ForecastResult])
async def forecast(request: ForecastRequest):
    """
    Generate forecast for work items using Monte Carlo simulation.
    Applies decisions and risks before simulation.
    """
    try:
        # Initialize engines
        graph = DependencyGraph()
        ripple_engine = RippleEffectEngine(graph)
        simulator = MonteCarloSimulator(graph, ripple_engine)
        
        # Run simulation
        results = simulator.simulate(
            num_simulations=request.num_simulations,
            decisions=request.decisions or [],
            risks=request.risks or []
        )
        
        # Convert to response model
        forecast_results = [
            ForecastResult(**result) 
            for result in results.values()
        ]
        
        return forecast_results
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

