#!/bin/bash
# Setup script for backend virtual environment

set -e

echo "🔍 Checking Python installation..."

# Check if pyenv is available and has a local version set
if command -v pyenv &> /dev/null; then
    if [ -f ".python-version" ]; then
        LOCAL_VERSION=$(cat .python-version)
        echo "✅ pyenv detected with local version: $LOCAL_VERSION"
        PYTHON_CMD="python"
    else
        echo "ℹ️  pyenv detected but no local version set"
        PYTHON_CMD="python3"
    fi
else
    PYTHON_CMD="python3"
fi

if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "❌ $PYTHON_CMD not found. Please install Python 3.8+ first."
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version)
PYTHON_MAJOR_MINOR=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅ Found: $PYTHON_VERSION"

# Check for Python 3.13 compatibility warning
if [[ "$PYTHON_MAJOR_MINOR" == "3.13" ]]; then
    echo "⚠️  Note: Python 3.13 detected. Using latest package versions for compatibility."
fi

echo ""
echo "🧹 Cleaning up existing virtual environment (if any)..."
if [ -d "venv" ]; then
    rm -rf venv
    echo "✅ Removed old venv"
fi

echo ""
echo "📦 Creating new virtual environment..."
$PYTHON_CMD -m venv venv

echo ""
echo "✅ Virtual environment created!"
echo ""
echo "🔧 Activating virtual environment..."
source venv/bin/activate

echo ""
echo "📍 Verifying virtual environment is active..."
echo "Python location: $(which python)"
echo "Pip location: $(which pip)"

# Check if we're using venv's pip
if [[ "$(which pip)" != *"venv"* ]]; then
    echo "⚠️  WARNING: Not using venv's pip! This may cause conflicts."
    echo "   Using: $(which pip)"
    echo "   Try: source venv/bin/activate"
    exit 1
fi

echo ""
echo "📥 Upgrading pip..."
python -m pip install --upgrade pip

echo ""
echo "📚 Installing requirements..."
python -m pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
echo ""
echo "To verify it's active, check that 'which python' shows the venv path."

