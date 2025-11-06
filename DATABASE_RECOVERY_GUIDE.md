# Database Recovery Guide for VPS

## Problem
The database `simfab_dev` was deleted or doesn't exist, causing errors like:
```
error: database "simfab_dev" does not exist
code: '3D000'
```

## Quick Fix

### Option 1: Using Node.js Script (Recommended)

This is the easiest method and works for all deployment types:

```bash
cd server
npm run db:create
npm run migrate:up
```

Or use the combined command:
```bash
cd server
npm run db:setup
```

### Option 2: Using Bash Script

If you have shell access and psql installed:

```bash
./fix-vps-database.sh
cd server
npm run migrate:up
```

### Option 3: Manual PostgreSQL Commands

If you have direct PostgreSQL access:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE simfab_dev;

# Exit psql
\q

# Run migrations
cd server
npm run migrate:up
```

### Option 4: Docker (if using Docker)

If you're using Docker on your VPS:

```bash
# Create the database
docker exec simfab-db psql -U postgres -c "CREATE DATABASE simfab_dev;"

# Or use the fix script
./fix-database.sh

# Run migrations
docker exec simfab-server npm run migrate:up
# Or restart the container (if migrations run on startup)
docker restart simfab-server
```

## Verification

After creating the database and running migrations, verify everything works:

```bash
cd server
npm run db:test
npm run migrate:status
```

You should see:
- ✅ Database connection established successfully
- All migrations listed as "Executed"

## Common Issues

### Issue: Permission Denied
**Error:** `permission denied to create database`

**Solution:** Make sure your PostgreSQL user has CREATEDB privilege:
```sql
ALTER USER your_user WITH CREATEDB;
```

### Issue: Connection Refused
**Error:** `ECONNREFUSED` or `could not connect to server`

**Solution:** 
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Check DATABASE_URL environment variable is correct
3. Verify firewall allows connections on port 5432

### Issue: Authentication Failed
**Error:** `password authentication failed`

**Solution:**
1. Check DATABASE_URL credentials
2. Verify PostgreSQL user exists and password is correct
3. Check pg_hba.conf configuration

## Prevention

To prevent this from happening again:

1. **Set up automated backups:**
   ```bash
   # Add to crontab
   0 2 * * * pg_dump -U postgres simfab_dev > /backups/simfab_dev_$(date +\%Y\%m\%d).sql
   ```

2. **Use persistent volumes in Docker:**
   Make sure your docker-compose.yml has:
   ```yaml
   volumes:
     postgres_data:/var/lib/postgresql/data
   ```

3. **Monitor database health:**
   Set up monitoring to alert if database becomes unavailable

## Environment Variables

Make sure your `DATABASE_URL` is set correctly:

```bash
# Check current value
echo $DATABASE_URL

# Set if needed (example)
export DATABASE_URL="postgresql://user:password@host:5432/simfab_dev"
```

For production, set this in your environment or `.env` file.

