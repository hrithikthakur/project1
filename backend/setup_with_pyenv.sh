#!/bin/bash
# Setup script for backend virtual environment with pyenv support

set -e

echo "🔍 Checking Python installation..."

# Initialize pyenv if available
if command -v pyenv &> /dev/null; then
    echo "✅ pyenv detected"
    # Initialize pyenv for this script
    eval "$(pyenv init -)"
    
    # Check if Python 3.11.8 is installed
    if pyenv versions --bare | grep -q "3.11.8"; then
        echo "✅ Python 3.11.8 found in pyenv"
        echo "📌 Setting local Python version to 3.11.8..."
        pyenv local 3.11.8
        # Refresh pyenv shims
        eval "$(pyenv init -)"
        # Get the full path to Python executable
        PYENV_PYTHON=$(pyenv which python 2>/dev/null)
        if [ -n "$PYENV_PYTHON" ] && [ -f "$PYENV_PYTHON" ]; then
            PYTHON_CMD="$PYENV_PYTHON"
        elif command -v python &> /dev/null; then
            PYTHON_CMD="python"
        else
            PYTHON_CMD="pyenv exec python"
        fi
    else
        echo "⚠️  Python 3.11.8 not found in pyenv"
        echo "   Install it with: pyenv install 3.11.8"
        echo "   Falling back to system python3..."
        PYTHON_CMD="python3"
    fi
else
    echo "ℹ️  pyenv not found, using system python3"
    PYTHON_CMD="python3"
fi

# Verify Python is available
if [[ "$PYTHON_CMD" == "pyenv exec python" ]]; then
    # Test if pyenv exec works
    if ! pyenv exec python --version &> /dev/null; then
        echo "❌ Python not found via pyenv. Please check pyenv setup."
        exit 1
    fi
elif ! command -v $PYTHON_CMD &> /dev/null && [ ! -f "$PYTHON_CMD" ]; then
    echo "❌ $PYTHON_CMD not found. Please install Python 3.8+ first."
    if command -v pyenv &> /dev/null; then
        echo ""
        echo "💡 Try running in your shell:"
        echo "   eval \"\$(pyenv init -)\""
        echo "   cd backend"
        echo "   pyenv local 3.11.8"
        echo "   python --version"
    fi
    exit 1
fi

# Get Python version (handle both regular command and pyenv exec)
if [[ "$PYTHON_CMD" == "pyenv exec python" ]]; then
    PYTHON_VERSION=$(pyenv exec python --version)
else
    PYTHON_VERSION=$($PYTHON_CMD --version)
fi
# Get Python version info
if [[ "$PYTHON_CMD" == "pyenv exec python" ]]; then
    PYTHON_MAJOR_MINOR=$(pyenv exec python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
else
    PYTHON_MAJOR_MINOR=$($PYTHON_CMD -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
fi
echo "✅ Using: $PYTHON_VERSION"

# Check for Python 3.13 compatibility warning
if [[ "$PYTHON_MAJOR_MINOR" == "3.13" ]]; then
    echo "⚠️  Note: Python 3.13 detected. Consider using Python 3.11.8 for better compatibility."
    echo "   Install with: pyenv install 3.11.8 && pyenv local 3.11.8"
fi

echo ""
echo "🧹 Cleaning up existing virtual environment (if any)..."
if [ -d "venv" ]; then
    rm -rf venv
    echo "✅ Removed old venv"
fi

echo ""
echo "📦 Creating new virtual environment with $PYTHON_CMD..."
if [[ "$PYTHON_CMD" == "pyenv exec python" ]]; then
    pyenv exec python -m venv venv
else
    $PYTHON_CMD -m venv venv
fi

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

