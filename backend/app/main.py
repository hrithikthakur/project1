from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import forecast, decisions, risks

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


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Decision Risk Engine API",
        "version": "1.0.0",
        "endpoints": {
            "forecast": "/api/forecast",
            "decisions": "/api/decisions",
            "risks": "/api/risks"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

