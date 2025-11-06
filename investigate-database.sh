#!/bin/bash

# Database Investigation Script
# Run this on your VPS to investigate why the database disappeared

echo "=========================================="
echo "🔍 Database Disappearance Investigation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking Docker containers status and history...${NC}"
echo "----------------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}\t{{.Image}}" | grep -E "simfab|postgres|NAMES"
echo ""

echo -e "${YELLOW}2. Checking Docker volumes...${NC}"
echo "----------------------------------------"
docker volume ls | grep -E "postgres|simfab"
echo ""
echo "Checking volume details:"
docker volume inspect simfab-facelift_postgres_data 2>/dev/null || docker volume inspect simfab_postgres_data 2>/dev/null || echo "Volume not found with expected names"
echo ""

echo -e "${YELLOW}3. Checking disk space...${NC}"
echo "----------------------------------------"
df -h
echo ""
echo "Docker disk usage:"
docker system df
echo ""

echo -e "${YELLOW}4. Checking system uptime and reboots...${NC}"
echo "----------------------------------------"
echo "System uptime:"
uptime
echo ""
echo "Recent reboots:"
last reboot | head -5
echo ""
echo "System boot time:"
who -b
echo ""

echo -e "${YELLOW}5. Checking Docker daemon logs (last 100 lines)...${NC}"
echo "----------------------------------------"
journalctl -u docker.service --since "24 hours ago" --no-pager | tail -50 || systemctl status docker --no-pager -l | tail -30
echo ""

echo -e "${YELLOW}6. Checking PostgreSQL container logs...${NC}"
echo "----------------------------------------"
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-db|postgres" | head -1)
if [ -n "$CONTAINER_NAME" ]; then
    echo "Found container: $CONTAINER_NAME"
    echo "Last 50 lines of logs:"
    docker logs --tail 50 "$CONTAINER_NAME" 2>&1 | tail -50
else
    echo "No PostgreSQL container found"
fi
echo ""

echo -e "${YELLOW}7. Checking server container logs (last 50 lines)...${NC}"
echo "----------------------------------------"
SERVER_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-server" | head -1)
if [ -n "$SERVER_CONTAINER" ]; then
    echo "Found container: $SERVER_CONTAINER"
    echo "Last 50 lines of logs:"
    docker logs --tail 50 "$SERVER_CONTAINER" 2>&1 | tail -50
else
    echo "No server container found"
fi
echo ""

echo -e "${YELLOW}8. Checking if database exists in PostgreSQL...${NC}"
echo "----------------------------------------"
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-db|postgres" | head -1)
if [ -n "$CONTAINER_NAME" ]; then
    echo "Checking databases in container: $CONTAINER_NAME"
    docker exec "$CONTAINER_NAME" psql -U postgres -c "\l" 2>&1 | grep -E "simfab|Name|----"
    echo ""
    echo "Checking if simfab_dev exists:"
    docker exec "$CONTAINER_NAME" psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='simfab_dev'" 2>&1
else
    echo "Cannot check - no PostgreSQL container found"
fi
echo ""

echo -e "${YELLOW}9. Checking Docker Compose status...${NC}"
echo "----------------------------------------"
if [ -f "docker-compose.yml" ]; then
    docker-compose ps
else
    echo "docker-compose.yml not found in current directory"
fi
echo ""

echo -e "${YELLOW}10. Checking system logs for errors (last 2 hours)...${NC}"
echo "----------------------------------------"
journalctl --since "2 hours ago" --priority=err --no-pager | tail -20 || dmesg | tail -50
echo ""

echo -e "${YELLOW}11. Checking Docker events (last 24 hours)...${NC}"
echo "----------------------------------------"
docker events --since "24h ago" --until "now" --format "{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}" 2>/dev/null | tail -30 || echo "Docker events not available"
echo ""

echo -e "${YELLOW}12. Checking cron jobs that might affect Docker...${NC}"
echo "----------------------------------------"
crontab -l 2>/dev/null | grep -E "docker|compose|postgres" || echo "No relevant cron jobs found"
echo ""

echo -e "${YELLOW}13. Checking if PostgreSQL data directory exists and size...${NC}"
echo "----------------------------------------"
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-db|postgres" | head -1)
if [ -n "$CONTAINER_NAME" ]; then
    echo "Checking data directory in container: $CONTAINER_NAME"
    docker exec "$CONTAINER_NAME" ls -lah /var/lib/postgresql/data/ 2>&1 | head -20
    echo ""
    echo "Data directory size:"
    docker exec "$CONTAINER_NAME" du -sh /var/lib/postgresql/data/ 2>&1
else
    echo "Cannot check - no PostgreSQL container found"
fi
echo ""

echo -e "${YELLOW}14. Checking Docker container restart count...${NC}"
echo "----------------------------------------"
docker ps -a --format "table {{.Names}}\t{{.RestartCount}}\t{{.Status}}" | grep -E "simfab|postgres|NAMES"
echo ""

echo -e "${YELLOW}15. Checking memory and resource usage...${NC}"
echo "----------------------------------------"
free -h
echo ""
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null | head -5
echo ""

echo "=========================================="
echo "✅ Investigation complete!"
echo "=========================================="
echo ""
echo "Key things to look for:"
echo "1. Container restart times (check CreatedAt vs current time)"
echo "2. Volume existence and size"
echo "3. Disk space issues"
echo "4. System reboots"
echo "5. Docker daemon restarts"
echo "6. OOM (Out of Memory) kills"
echo ""

