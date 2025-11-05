#!/bin/bash

# Script to fix missing simfab_dev database in Docker
# This recreates the database if it doesn't exist

set -e

echo "🔍 Checking Docker container status..."

# Check if postgres container is running
if ! docker ps | grep -q "simfab-db\|simfab-db-dev"; then
    echo "❌ PostgreSQL container is not running!"
    echo "💡 Starting Docker containers..."
    docker-compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Determine which container name is being used
CONTAINER_NAME=""
if docker ps | grep -q "simfab-db$"; then
    CONTAINER_NAME="simfab-db"
elif docker ps | grep -q "simfab-db-dev"; then
    CONTAINER_NAME="simfab-db-dev"
else
    echo "❌ Could not find PostgreSQL container (simfab-db or simfab-db-dev)"
    exit 1
fi

echo "✅ Found PostgreSQL container: $CONTAINER_NAME"

# Check if database exists
DB_EXISTS=$(docker exec $CONTAINER_NAME psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='simfab_dev'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database 'simfab_dev' already exists"
else
    echo "🔧 Database 'simfab_dev' does not exist. Creating it..."
    docker exec $CONTAINER_NAME psql -U postgres -c "CREATE DATABASE simfab_dev;"
    echo "✅ Database 'simfab_dev' created successfully"
fi

# Verify the database exists and is accessible
echo "🔍 Verifying database connection..."
if docker exec $CONTAINER_NAME psql -U postgres -d simfab_dev -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database exists but is not accessible"
    exit 1
fi

echo ""
echo "✅ Database fix complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Run migrations: docker exec $CONTAINER_NAME psql -U postgres -d simfab_dev -f /path/to/migrations"
echo "   2. Or restart the server container to run migrations automatically"
echo "   3. Or run: docker-compose restart server"
echo ""

