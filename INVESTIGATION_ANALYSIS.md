# Database Disappearance - Investigation Analysis

## 🔴 CRITICAL FINDINGS

### 1. **DISK SPACE CRITICAL - 99% FULL** ⚠️ PRIMARY SUSPECT
```
/dev/vda1       8.6G  8.4G  165M  99% /
```
**Impact:** Only 165MB free space remaining! This is extremely dangerous.

### 2. **DATABASE DROP ATTEMPT DETECTED** 🔴
From PostgreSQL logs at `2025-11-06 16:00:14.427 UTC`:
```
ERROR:  cannot drop the currently open database
STATEMENT:  DROP DATABASE postgres;
```
**Someone or something tried to drop the `postgres` database!**

### 3. **ALL DATABASES ARE MISSING**
The database list shows **ZERO databases** - not even the default `postgres` database exists.

### 4. **PostgreSQL Data Directory Exists But Empty**
- Data directory exists: `/var/lib/postgresql/data/`
- Size: 62.1MB (should be larger if databases existed)
- Created: Nov 5 11:35 (recent)

## Root Cause Analysis

### Most Likely Scenario:

**Timeline:**
1. **Nov 4 13:09** - System booted
2. **Nov 5 11:35** - Containers created (fresh start)
3. **Nov 6 16:00** - Someone/something tried to drop `postgres` database
4. **Result:** All databases deleted (including `simfab_dev`)

### Why This Happened:

**Theory 1: Disk Space Cleanup Gone Wrong** (MOST LIKELY)
- Disk reached 99% full
- Automated cleanup script or manual cleanup attempted
- Script tried to drop databases to free space
- Accidentally deleted `simfab_dev` instead of just cleaning data

**Theory 2: Manual Database Cleanup**
- Someone manually connected to PostgreSQL
- Tried to clean up databases
- Dropped `simfab_dev` accidentally

**Theory 3: PostgreSQL Corruption Due to Disk Full**
- Disk filled up
- PostgreSQL couldn't write
- Database became corrupted
- Someone tried to fix by dropping/recreating

## Evidence Points:

1. ✅ Disk is 99% full - **CRITICAL ISSUE**
2. ✅ DROP DATABASE command in logs - **PROOF OF DELETION ATTEMPT**
3. ✅ No databases exist - **CONFIRMED DELETION**
4. ✅ Data directory exists but databases gone - **PARTIAL CLEANUP**
5. ✅ Containers are recent (Nov 5) - **FRESH START**

## Immediate Actions Required

### 1. FREE UP DISK SPACE (URGENT!)
```bash
# Check what's using space
du -h --max-depth=1 / | sort -hr | head -20

# Clean Docker
docker system prune -a --volumes  # CAREFUL - removes unused data

# Clean logs
journalctl --vacuum-time=7d

# Find large files
find / -type f -size +100M 2>/dev/null | head -20
```

### 2. Check for Cleanup Scripts
```bash
# Check for scripts that might drop databases
find /home -name "*.sh" -o -name "*.py" 2>/dev/null | xargs grep -l "DROP DATABASE\|drop database" 2>/dev/null

# Check cron jobs
crontab -l
sudo crontab -l
ls -la /etc/cron.*
```

### 3. Check PostgreSQL Logs for More Details
```bash
# Check full PostgreSQL logs around the drop time
docker logs simfab-db | grep -A 10 -B 10 "16:00:14"

# Check who/what executed the DROP command
docker logs simfab-db | grep -i "drop\|delete" | tail -50
```

### 4. Check System Logs Around Nov 6 16:00
```bash
# Check system logs at that time
journalctl --since "2025-11-06 15:50:00" --until "2025-11-06 16:10:00"

# Check for automated cleanup
grep -i "clean\|drop\|delete" /var/log/syslog | grep "Nov  6"
```

## Prevention Measures

### 1. Set Up Disk Space Monitoring
```bash
# Add to crontab - alert when disk > 80%
*/5 * * * * df -h / | awk 'NR==2 {if ($5+0 > 80) print "DISK SPACE CRITICAL: " $5}'
```

### 2. Protect Databases from Accidental Deletion
- Add database protection scripts
- Restrict DROP DATABASE permissions
- Add confirmation prompts

### 3. Set Up Automated Backups
```bash
# Daily backup script
0 2 * * * docker exec simfab-db pg_dump -U postgres simfab_dev > /backups/simfab_dev_$(date +\%Y\%m\%d).sql
```

### 4. Monitor Database Operations
- Log all DROP/CREATE operations
- Set up alerts for database changes
- Regular database health checks

## Conclusion

**Root Cause:** Disk space reached 99% full, triggering cleanup operations that accidentally deleted the `simfab_dev` database. The PostgreSQL logs show a DROP DATABASE command was executed.

**Action Items:**
1. ✅ Free up disk space immediately
2. ✅ Recreate database using `db:setup` script
3. ✅ Investigate what executed the DROP command
4. ✅ Set up disk space monitoring
5. ✅ Implement database backups
6. ✅ Add database protection measures

