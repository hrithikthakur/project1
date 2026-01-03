#!/bin/bash
# Start script for backend server

# Check if venv is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "⚠️  Virtual environment not activated!"
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

echo "🚀 Starting FastAPI server..."
echo "📍 Local access: http://localhost:8000"
echo "📍 Network access: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo '[your-ip]'):8000"
echo "📚 API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

