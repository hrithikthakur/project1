#!/bin/bash
# Start script for frontend development server

echo "📦 Installing dependencies (if needed)..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "🚀 Starting frontend development server..."
echo "📍 Frontend will be available at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

