#!/bin/bash

# Migration script for analytics performance indexes
# Run this after Docker containers are up and running

echo "Running migration for analytics performance indexes..."

# Check if database is accessible
if ! docker exec simfab-db pg_isready -U postgres; then
    echo "Database is not ready. Please start Docker containers first."
    echo "Run: docker-compose up -d"
    exit 1
fi

# Copy migration file to container
echo "Copying migration file to container..."
docker cp server/src/migrations/sql/038_add_analytics_indexes.sql simfab-db:/tmp/analytics-migration.sql

# Run the migration
echo "Executing migration 038_add_analytics_indexes.sql..."
docker exec simfab-db psql -U postgres -d simfab_dev -f /tmp/analytics-migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Analytics migration completed successfully!"
    echo ""
    echo "New indexes created:"
    echo "- idx_orders_created_at_payment_status (revenue time-series)"
    echo "- idx_order_items_created_at (product analytics)"
    echo "- idx_orders_status_created_at (order status distribution)"
    echo "- idx_orders_user_id_created_at (customer analytics)"
    echo "- idx_orders_payment_status_created_at (payment analytics)"
    echo "- idx_order_items_order_id_product_name (top products)"
    echo "- idx_products_status_created_at (product inventory)"
    echo "- idx_products_stock_status (low stock alerts)"
    echo ""
    echo "🎉 Analytics performance optimization complete!"
    echo "Your dashboard queries will now be significantly faster!"
else
    echo "❌ Migration failed. Check the error above."
    exit 1
fi
