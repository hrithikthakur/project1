#!/bin/bash
# Start script for frontend development server

echo "📦 Installing dependencies (if needed)..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "🚀 Starting frontend development server..."
echo "📍 Local access: http://localhost:3000"
echo "📍 Network access: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo '[your-ip]'):3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

