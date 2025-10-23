#!/bin/bash

# Migration script for unpaid order fixes
# Run this after Docker containers are up and running

echo "Running migration for unpaid order fixes..."

# Check if database is accessible
if ! docker exec simfab-db pg_isready -U postgres; then
    echo "Database is not ready. Please start Docker containers first."
    echo "Run: docker-compose up -d"
    exit 1
fi

# Run the migration
echo "Executing migration 023_fix_unpaid_orders.sql..."
docker exec simfab-db psql -U postgres -d simfab_dev -f /tmp/migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "New tables created:"
    echo "- stock_reservations (for temporary stock reservations)"
    echo "- webhook_events (for PayPal webhook logging)"
    echo ""
    echo "Enhanced orders table with:"
    echo "- payment_expires_at (30-minute payment timeout)"
    echo "- stock_reserved (tracks if stock is reserved)"
    echo ""
    echo "🎉 Unpaid order fixes are now active!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
