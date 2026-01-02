#!/bin/bash
# Start script for backend server

# Check if venv is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

echo "🚀 Starting FastAPI server..."
echo "📍 API will be available at: http://localhost:8000"
echo "📚 API docs will be available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

