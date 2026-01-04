import sys
import os
from pathlib import Path

# Get the project root (parent of api folder)
project_root = Path(__file__).parent.parent.absolute()

# Add backend to path so we can import 'app'
sys.path.insert(0, str(project_root / "backend"))

# Set environment variable for the loader to find data
os.environ["PROJECT_ROOT"] = str(project_root)

from app.main import app

# This is the entry point for Vercel
handler = app

