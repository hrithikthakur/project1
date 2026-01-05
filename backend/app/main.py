from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import forecast, decisions, risks, metadata, work_items, actors, ownership, roles, risk_detection, decision_risk_events

app = FastAPI(
    title="Decision Risk Engine",
    description="Monte Carlo simulation engine for forecasting work items with decisions and risks",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(forecast.router, prefix="/api", tags=["forecast"])
app.include_router(decisions.router, prefix="/api", tags=["decisions"])
app.include_router(risks.router, prefix="/api", tags=["risks"])
app.include_router(risk_detection.router, prefix="/api", tags=["risk_detection"])
app.include_router(metadata.router, prefix="/api", tags=["metadata"])
app.include_router(work_items.router, prefix="/api", tags=["work_items"])
app.include_router(actors.router, prefix="/api", tags=["actors"])
app.include_router(ownership.router, prefix="/api", tags=["ownership"])
app.include_router(roles.router, prefix="/api", tags=["roles"])
app.include_router(decision_risk_events.router, tags=["decision-risk-engine"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Decision Risk Engine API",
        "version": "1.0.0",
        "endpoints": {
            "forecast": "/api/forecast",
            "decisions": "/api/decisions",
            "risks": "/api/risks",
            "decision_risk_engine": "/api/decision-risk-engine"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/debug/data-check")
async def debug_data_check():
    """Debug endpoint to check if data is loading"""
    try:
        from .data.loader import load_mock_world
        import os
        from pathlib import Path
        
        world = load_mock_world()
        
        return {
            "status": "ok",
            "data_loaded": bool(world.get("milestones")),
            "milestone_count": len(world.get("milestones", [])),
            "work_item_count": len(world.get("work_items", [])),
            "cwd": str(Path.cwd()),
            "file_location": str(Path(__file__)),
            "env_project_root": os.environ.get("PROJECT_ROOT", "not set")
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }


