import sys
import os
from pathlib import Path

# Get the project root (parent of api folder)
project_root = Path(__file__).parent.parent.absolute()
api_dir = Path(__file__).parent.absolute()

# Add backend to path so we can import 'app'
sys.path.insert(0, str(project_root / "backend"))

# Set environment variable for the loader to find data
os.environ["PROJECT_ROOT"] = str(project_root)
os.environ["API_DIR"] = str(api_dir)

# Debug: Print paths for Vercel logs
print(f"API Entry Point - Project Root: {project_root}")
print(f"API Entry Point - API Dir: {api_dir}")
print(f"API Entry Point - mock_world.json exists: {(api_dir / 'mock_world.json').exists()}")

from app.main import app

# This is the entry point for Vercel
handler = app

