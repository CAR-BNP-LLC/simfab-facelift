#!/bin/bash

# Script to fix missing simfab_dev database on VPS
# This script works for both Docker and direct PostgreSQL installations

set -e

echo "🔍 Checking database setup..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set, using default: postgresql://localhost:5432/simfab_dev"
    DATABASE_URL="postgresql://localhost:5432/simfab_dev"
fi

# Parse DATABASE_URL to extract connection details
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
elif [[ $DATABASE_URL =~ postgresql://([^:]+)@([^:]+):([^/]+)/(.+) ]]; then
    # No password case
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS=""
    DB_HOST="${BASH_REMATCH[2]}"
    DB_PORT="${BASH_REMATCH[3]}"
    DB_NAME="${BASH_REMATCH[4]}"
elif [[ $DATABASE_URL =~ postgresql://([^/]+)/(.+) ]]; then
    # Minimal format: postgresql://host/database
    DB_USER="postgres"
    DB_PASS=""
    DB_HOST="${BASH_REMATCH[1]}"
    DB_PORT="5432"
    DB_NAME="${BASH_REMATCH[2]}"
else
    echo "❌ Could not parse DATABASE_URL: $DATABASE_URL"
    echo "Expected format: postgresql://user:password@host:port/database"
    exit 1
fi

echo "📋 Database connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   User: $DB_USER"
echo "   Database: $DB_NAME"
echo ""

# Check if we're using Docker
if docker ps 2>/dev/null | grep -q "simfab-db\|simfab-db-dev\|postgres"; then
    echo "🐳 Docker detected, using Docker commands..."
    
    # Find PostgreSQL container
    CONTAINER_NAME=""
    if docker ps | grep -q "simfab-db$"; then
        CONTAINER_NAME="simfab-db"
    elif docker ps | grep -q "simfab-db-dev"; then
        CONTAINER_NAME="simfab-db-dev"
    elif docker ps | grep -q "postgres"; then
        CONTAINER_NAME=$(docker ps | grep postgres | awk '{print $1}' | head -1)
    fi
    
    if [ -z "$CONTAINER_NAME" ]; then
        echo "❌ Could not find PostgreSQL container"
        exit 1
    fi
    
    echo "✅ Found PostgreSQL container: $CONTAINER_NAME"
    
    # Check if database exists
    DB_EXISTS=$(docker exec $CONTAINER_NAME psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
    
    if [ "$DB_EXISTS" = "1" ]; then
        echo "✅ Database '$DB_NAME' already exists"
    else
        echo "🔧 Database '$DB_NAME' does not exist. Creating it..."
        docker exec $CONTAINER_NAME psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" || {
            echo "❌ Failed to create database"
            exit 1
        }
        echo "✅ Database '$DB_NAME' created successfully"
    fi
    
    # Verify the database exists and is accessible
    echo "🔍 Verifying database connection..."
    if docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
        echo "✅ Database is accessible"
    else
        echo "❌ Database exists but is not accessible"
        exit 1
    fi
    
    echo ""
    echo "✅ Database fix complete!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Run migrations: cd server && npm run migrate:up"
    echo "   2. Or restart the server container to run migrations automatically"
    echo ""
    
else
    echo "💻 Direct PostgreSQL installation detected..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        echo "❌ psql command not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Build connection string for postgres database (to create simfab_dev)
    if [ -n "$DB_PASS" ]; then
        export PGPASSWORD="$DB_PASS"
    fi
    
    # Connect to postgres database to create simfab_dev
    echo "🔧 Checking if database '$DB_NAME' exists..."
    
    DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
    
    if [ "$DB_EXISTS" = "1" ]; then
        echo "✅ Database '$DB_NAME' already exists"
    else
        echo "🔧 Database '$DB_NAME' does not exist. Creating it..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" || {
            echo "❌ Failed to create database"
            echo "💡 Make sure PostgreSQL is running and credentials are correct"
            exit 1
        }
        echo "✅ Database '$DB_NAME' created successfully"
    fi
    
    # Verify the database exists and is accessible
    echo "🔍 Verifying database connection..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        echo "✅ Database is accessible"
    else
        echo "❌ Database exists but is not accessible"
        exit 1
    fi
    
    unset PGPASSWORD
    
    echo ""
    echo "✅ Database fix complete!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Run migrations: cd server && npm run migrate:up"
    echo "   2. Or restart the server to run migrations automatically"
    echo ""
fi

