"""
Vercel serverless function entry point for FastAPI backend.
"""
import sys
import os
from pathlib import Path

# Get the project root (parent of api folder)
project_root = Path(__file__).parent.parent

# Add backend to path
sys.path.insert(0, str(project_root / "backend"))

# Set working directory for data file access
os.chdir(project_root)

from app.main import app

# Vercel expects the app to be named 'app' or 'handler'
handler = app

