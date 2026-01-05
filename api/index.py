"""
Vercel serverless function entry point for FastAPI backend.
"""
import sys
import os
from pathlib import Path

# Get the project root (parent of api folder)
project_root = Path(__file__).parent.parent.absolute()

# Add backend to path
sys.path.insert(0, str(project_root / "backend"))

# Set environment variable for the app to know where the root is
os.environ["PROJECT_ROOT"] = str(project_root)

# Set working directory
os.chdir(str(project_root))

from app.main import app

# Vercel expects the app to be named 'app' or 'handler'
handler = app

