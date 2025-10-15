#!/bin/bash

# SimFab Development Environment with Hot Reload
# This script starts the development environment with hot reload enabled

echo "🚀 Starting SimFab Development Environment with Hot Reload..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo ""
echo "📱 Frontend: http://localhost:5173 (with hot reload)"
echo "🔧 Backend:  http://localhost:3001 (with hot reload)"
echo "🗄️  Database: localhost:5432"
echo ""
echo "💡 Hot reload is enabled for both frontend and backend!"
echo "   - Edit files in ./src/ and see changes instantly"
echo "   - Edit files in ./server/src/ and see changes instantly"
echo ""
echo "🛑 To stop: Ctrl+C or run 'docker-compose -f docker-compose.dev.yml down'"


