# Database Disappearance - Root Cause Analysis

## Problem Summary
The database `simfab_dev` disappeared overnight on the VPS, causing application errors.

## Error Evidence
```
Error during cleanup: error: database "simfab_dev" does not exist
code: '3D000'
```

The error occurs during cron job cleanup, which means:
- PostgreSQL is running
- The connection is working
- But the database `simfab_dev` doesn't exist

## Root Cause Analysis

### Most Likely Causes (in order of probability):

#### 1. **Docker Volume Was Removed** ⚠️ MOST LIKELY
**What happened:**
- Someone ran `docker-compose down -v` (removes volumes)
- Or Docker volume was manually deleted
- Or VPS disk space issue caused Docker to clean up volumes

**Why it happened:**
- The `docker-compose.yml` uses named volumes: `postgres_data:/var/lib/postgresql/data`
- If the volume is removed, all database data is lost
- PostgreSQL container will start fresh, but `POSTGRES_DB` only creates the database on **first initialization**

**Evidence:**
- Database was working yesterday
- Disappeared overnight (likely during maintenance/restart)
- PostgreSQL is still running (container exists)

**Prevention:**
- Never run `docker-compose down -v` in production
- Set up volume backups
- Monitor disk space

#### 2. **PostgreSQL Container Recreated Without Volume**
**What happened:**
- Container was removed: `docker rm simfab-db`
- New container created without attaching the volume
- Or volume path changed

**Why it happened:**
- Manual container management
- Docker Compose restart issues
- Volume mount path mismatch

**Prevention:**
- Always use `docker-compose` commands, not manual `docker` commands
- Verify volume mounts after container recreation

#### 3. **PostgreSQL Initialization Issue**
**What happened:**
- PostgreSQL's `POSTGRES_DB` environment variable creates the database only on **first container start**
- If the data directory exists but is empty/corrupted, PostgreSQL won't recreate the database

**Why it happened:**
- Volume exists but data directory is empty
- PostgreSQL initialization didn't run properly
- Container restart with corrupted volume

**Prevention:**
- Ensure proper initialization on first run
- Add database creation check in startup scripts

#### 4. **Manual Database Deletion**
**What happened:**
- Someone connected to PostgreSQL and ran: `DROP DATABASE simfab_dev;`

**Why it happened:**
- Accidental deletion
- Manual cleanup gone wrong
- Testing/debugging mistake

**Prevention:**
- Restrict database access
- Add database protection scripts
- Audit database access logs

#### 5. **VPS Disk Space Issue**
**What happened:**
- Disk filled up
- Docker/PostgreSQL couldn't write
- Data corruption or cleanup

**Why it happened:**
- Logs filling up disk
- No disk space monitoring
- Automatic cleanup scripts

**Prevention:**
- Monitor disk usage
- Set up log rotation
- Alert on low disk space

## Current Configuration Issues

### Issue 1: No Database Creation Check
**Problem:**
- Server startup command: `npm run migrate:up && npm run dev`
- Migrations fail if database doesn't exist
- No automatic database creation

**Fix:**
- Add database creation check before migrations
- Use the new `db:setup` script

### Issue 2: PostgreSQL Only Creates DB on First Init
**Problem:**
- `POSTGRES_DB: simfab_dev` only works on first container start
- If volume is lost, database won't be recreated automatically

**Fix:**
- Add startup script to check and create database
- Or use init scripts in PostgreSQL

### Issue 3: No Volume Backup Strategy
**Problem:**
- No automated backups of Docker volumes
- Data loss is permanent

**Fix:**
- Set up daily volume backups
- Store backups off-server

## Immediate Fixes Needed

### 1. Add Database Creation to Startup
Update `docker-compose.yml` server command:
```yaml
command: sh -c "npm run db:create && npm run migrate:up && npm run dev"
```

### 2. Add PostgreSQL Init Script
Create `/server/docker-entrypoint-initdb.d/01-create-database.sh`:
```bash
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE simfab_dev'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'simfab_dev')\gexec
EOSQL
```

### 3. Add Health Check for Database
Add to server startup:
- Check if database exists before starting
- Create if missing
- Then run migrations

### 4. Set Up Volume Backups
Create backup script:
```bash
#!/bin/bash
# Backup PostgreSQL volume
docker run --rm \
  -v simfab-facelift_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-$(date +%Y%m%d).tar.gz /data
```

## Long-Term Prevention

### 1. Database Protection Script
Create a script that:
- Checks database exists on startup
- Creates if missing
- Logs all database operations

### 2. Monitoring & Alerts
- Monitor database health
- Alert on database connection failures
- Track database size and growth

### 3. Backup Strategy
- Daily automated backups
- Weekly off-server backups
- Test restore procedures

### 4. Documentation
- Document all database operations
- Create runbooks for common issues
- Train team on proper procedures

## Recommended Actions

1. ✅ **Immediate:** Fix database creation (use `db:setup` script)
2. ✅ **Short-term:** Add database check to startup scripts
3. ✅ **Medium-term:** Set up automated backups
4. ✅ **Long-term:** Add monitoring and alerting

## Questions to Investigate

1. **Was Docker restarted overnight?**
   ```bash
   docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"
   ```

2. **Is the volume still there?**
   ```bash
   docker volume ls | grep postgres
   docker volume inspect simfab-facelift_postgres_data
   ```

3. **What's the disk space?**
   ```bash
   df -h
   docker system df
   ```

4. **Are there any logs about volume removal?**
   ```bash
   journalctl -u docker
   docker logs simfab-db
   ```

5. **Was there a system update/reboot?**
   ```bash
   last reboot
   uptime
   ```

## Conclusion

The most likely cause is **Docker volume removal** or **container recreation without volume**. The fix is to:
1. Add automatic database creation on startup
2. Set up proper backups
3. Add monitoring to detect this early

The new `db:create` and `db:setup` scripts will prevent this from happening again by ensuring the database exists before migrations run.

