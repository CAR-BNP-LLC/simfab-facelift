# Database Investigation Commands

Run these commands on your VPS to investigate what happened to the database.

## Quick Investigation (Run All)

```bash
# Make script executable and run
chmod +x investigate-database.sh
./investigate-database.sh
```

## Manual Investigation Commands

### 1. Check Docker Containers Status
```bash
# List all containers with details
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}\t{{.Image}}"

# Check specific containers
docker ps -a | grep -E "simfab|postgres"
```

### 2. Check Docker Volumes
```bash
# List all volumes
docker volume ls

# Check volume details (try both possible names)
docker volume inspect simfab-facelift_postgres_data
docker volume inspect simfab_postgres_data

# Check if volume is mounted
docker inspect simfab-db | grep -A 10 Mounts
```

### 3. Check Disk Space
```bash
# System disk usage
df -h

# Docker disk usage
docker system df

# Detailed Docker disk usage
docker system df -v
```

### 4. Check System Reboots
```bash
# System uptime
uptime

# Recent reboots
last reboot | head -10

# System boot time
who -b

# Check if system was rebooted recently
journalctl --list-boots | tail -5
```

### 5. Check Docker Logs
```bash
# Docker daemon logs (last 24 hours)
journalctl -u docker.service --since "24 hours ago" --no-pager | tail -100

# Or if using systemd
systemctl status docker --no-pager -l

# Docker daemon errors
journalctl -u docker.service --priority=err --since "24 hours ago"
```

### 6. Check PostgreSQL Container Logs
```bash
# Find PostgreSQL container name
docker ps -a | grep postgres

# View logs (replace CONTAINER_NAME)
docker logs --tail 100 CONTAINER_NAME

# View logs with timestamps
docker logs --tail 100 --timestamps CONTAINER_NAME

# Follow logs in real-time
docker logs -f CONTAINER_NAME
```

### 7. Check Server Container Logs
```bash
# Find server container
docker ps -a | grep simfab-server

# View logs
docker logs --tail 100 simfab-server

# Check for database errors
docker logs simfab-server 2>&1 | grep -i "database\|error\|3D000"
```

### 8. Check Database Existence
```bash
# Connect to PostgreSQL container
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-db|postgres" | head -1)

# List all databases
docker exec $CONTAINER_NAME psql -U postgres -c "\l"

# Check if simfab_dev exists
docker exec $CONTAINER_NAME psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='simfab_dev'"

# Check PostgreSQL version and status
docker exec $CONTAINER_NAME psql -U postgres -c "SELECT version();"
```

### 9. Check Docker Compose Status
```bash
# Current status
docker-compose ps

# Check which compose file is being used
ls -la docker-compose*.yml

# Check environment
docker-compose config
```

### 10. Check System Logs for Errors
```bash
# System errors in last 24 hours
journalctl --since "24 hours ago" --priority=err --no-pager

# Kernel messages
dmesg | tail -50

# Check for OOM (Out of Memory) kills
dmesg | grep -i "oom\|killed"

# Check for disk errors
dmesg | grep -i "disk\|i/o error"
```

### 11. Check Docker Events
```bash
# Recent Docker events (last 24 hours)
docker events --since "24h ago" --until "now" --format "{{.Time}} {{.Type}} {{.Action}} {{.Actor.Attributes.name}}"

# Filter for container events
docker events --since "24h ago" --filter 'type=container' --format "{{.Time}} {{.Action}} {{.Actor.Attributes.name}}"
```

### 12. Check Cron Jobs
```bash
# Current user's cron jobs
crontab -l

# Root cron jobs
sudo crontab -l

# System cron jobs
ls -la /etc/cron.d/
ls -la /etc/cron.hourly/
ls -la /etc/cron.daily/

# Check for Docker-related cron jobs
grep -r "docker\|compose\|postgres" /etc/cron.* 2>/dev/null
```

### 13. Check PostgreSQL Data Directory
```bash
# Find container
CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep -E "simfab-db|postgres" | head -1)

# Check data directory contents
docker exec $CONTAINER_NAME ls -lah /var/lib/postgresql/data/

# Check data directory size
docker exec $CONTAINER_NAME du -sh /var/lib/postgresql/data/

# Check if data directory is empty
docker exec $CONTAINER_NAME find /var/lib/postgresql/data/ -type f | wc -l
```

### 14. Check Container Restart History
```bash
# Restart counts
docker ps -a --format "table {{.Names}}\t{{.RestartCount}}\t{{.Status}}"

# Check restart policy
docker inspect simfab-db | grep -A 5 RestartPolicy
```

### 15. Check Resource Usage
```bash
# Memory usage
free -h

# Current Docker stats
docker stats --no-stream

# Check for memory pressure
cat /proc/meminfo | grep -E "MemAvailable|MemFree|Swap"

# Check for OOM killer activity
grep -i "oom" /var/log/kern.log 2>/dev/null | tail -20
```

### 16. Check Network Issues
```bash
# Docker network status
docker network ls

# Check if containers can communicate
docker exec simfab-server ping -c 2 postgres

# Check DNS resolution
docker exec simfab-server nslookup postgres
```

### 17. Check for Automatic Updates
```bash
# Check if unattended-upgrades ran
grep -i "unattended" /var/log/apt/history.log 2>/dev/null | tail -20

# Check package updates
grep -i "docker\|postgres" /var/log/apt/history.log 2>/dev/null | tail -20

# Check system updates
journalctl --since "24 hours ago" | grep -i "update\|upgrade" | tail -20
```

### 18. Check Docker Compose File Changes
```bash
# Check git history (if using git)
git log --since "24 hours ago" --oneline docker-compose.yml

# Check file modification time
ls -la docker-compose.yml
stat docker-compose.yml
```

### 19. Check Environment Variables
```bash
# Check server container environment
docker exec simfab-server env | grep -E "DATABASE|POSTGRES"

# Check docker-compose environment
docker-compose config | grep -A 10 DATABASE_URL
```

### 20. Check for Backup/Restore Operations
```bash
# Check for backup scripts
find /home -name "*backup*" -o -name "*restore*" 2>/dev/null

# Check for recent file operations in Docker volumes
docker volume inspect simfab-facelift_postgres_data | grep Mountpoint
# Then check that mountpoint (requires root)
```

## What to Look For

### Red Flags:
1. **Container Created Recently** - If CreatedAt is recent, container was recreated
2. **Volume Missing** - If volume doesn't exist, data was lost
3. **Empty Data Directory** - Volume exists but is empty
4. **High Restart Count** - Container keeps restarting
5. **Disk Full** - No space for database writes
6. **System Reboot** - Server rebooted, containers restarted
7. **OOM Kills** - Out of memory killed processes
8. **Docker Daemon Restart** - Docker service restarted

### Common Scenarios:

**Scenario 1: Volume Removed**
- Volume doesn't exist or is empty
- Container was recreated
- Solution: Volume was deleted, need to recreate database

**Scenario 2: Container Recreated**
- Container CreatedAt is recent
- Volume exists but database doesn't
- Solution: Container recreated but POSTGRES_DB only works on first init

**Scenario 3: Disk Full**
- df -h shows 100% or near 100%
- Docker logs show write errors
- Solution: Free up disk space, restore from backup

**Scenario 4: System Reboot**
- last reboot shows recent reboot
- Containers restarted but volume wasn't mounted properly
- Solution: Check docker-compose startup, ensure volumes mount

**Scenario 5: Docker Daemon Restart**
- journalctl shows docker.service restarted
- Containers recreated without volumes
- Solution: Check Docker daemon logs, ensure proper startup

## Save Investigation Results

```bash
# Run investigation and save to file
./investigate-database.sh > investigation-$(date +%Y%m%d-%H%M%S).log 2>&1

# Or run individual commands and save
docker ps -a > containers-status.txt
docker volume ls > volumes-list.txt
df -h > disk-space.txt
journalctl -u docker.service --since "24 hours ago" > docker-logs.txt
```

