#!/bin/bash

# Email Service Testing Script
# Quick test of email service functionality

echo "🧪 Testing Email Service..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📊 Checking Database..."
TEMPLATE_COUNT=$(docker-compose exec -T postgres psql -U postgres -d simfab_dev -t -c "SELECT COUNT(*) FROM email_templates;" 2>/dev/null | tr -d ' ')
echo "  Templates in database: ${GREEN}${TEMPLATE_COUNT}${NC}"

echo ""
echo "🔍 Checking Server Health..."
curl -s http://localhost:3001/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  Server status: ${GREEN}Running${NC}"
else
  echo "  Server status: ${YELLOW}Not responding${NC}"
fi

echo ""
echo "📧 Checking Email Settings..."
SETTINGS=$(docker-compose exec -T postgres psql -U postgres -d simfab_dev -t -c "SELECT test_mode, enabled FROM email_settings LIMIT 1;" 2>/dev/null)
echo "  Settings: $SETTINGS"

echo ""
echo "📝 Recent Email Logs..."
LOG_COUNT=$(docker-compose exec -T postgres psql -U postgres -d simfab_dev -t -c "SELECT COUNT(*) FROM email_logs;" 2>/dev/null | tr -d ' ')
echo "  Email logs count: ${GREEN}${LOG_COUNT}${NC}"

echo ""
echo "✅ Testing Complete!"
echo ""
echo "📚 Manual Testing:"
echo "  1. Go to http://localhost:5173/admin"
echo "  2. Click 'Emails' tab"
echo "  3. Select a template and click 'Send Test'"
echo ""
echo "📖 See docs/email-service/TESTING_GUIDE.md for full instructions"

