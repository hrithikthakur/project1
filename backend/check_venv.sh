#!/bin/bash
# Script to check if virtual environment is properly activated

echo "🔍 Virtual Environment Status Check"
echo "=================================="
echo ""

# Check if VIRTUAL_ENV is set
if [ -z "$VIRTUAL_ENV" ]; then
    echo "❌ VIRTUAL_ENV is not set - virtual environment is NOT activated"
    echo ""
    echo "To activate, run:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
else
    echo "✅ VIRTUAL_ENV is set to: $VIRTUAL_ENV"
fi

echo ""
echo "📍 Python executable:"
which python
which python3

echo ""
echo "📍 Pip executable:"
which pip
which pip3

echo ""
echo "🔍 Checking if pip points to venv:"
PIP_PATH=$(which pip)
if [[ "$PIP_PATH" == *"venv"* ]]; then
    echo "✅ Pip is using virtual environment: $PIP_PATH"
else
    echo "❌ Pip is NOT using virtual environment: $PIP_PATH"
    echo "   This will cause global package conflicts!"
    echo ""
    echo "Solution:"
    echo "  1. Deactivate current environment: deactivate"
    echo "  2. Remove venv: rm -rf venv"
    echo "  3. Run: bash setup.sh"
fi

echo ""
echo "📦 Installed packages location:"
python -c "import sys; print('Site-packages:', [p for p in sys.path if 'site-packages' in p])"

echo ""
echo "💡 Tip: Always use 'python -m pip' instead of 'pip' to ensure you're using the correct Python"

