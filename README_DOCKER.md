# 🐳 SimFab - Docker Setup (The Easy Way!)

## Step 1: Install Docker Desktop

Download and install: https://www.docker.com/products/docker-desktop/

**That's the only thing you need to install!** No PostgreSQL, no database setup, nothing else.

---

## Step 2: Start Everything

Open a terminal in the project folder and run:

```bash
docker-compose up
```

**That's it!** 🎉

Wait 1-2 minutes for everything to build and start.

---

## What's Happening?

Docker is:
1. ✅ Downloading PostgreSQL
2. ✅ Creating the database
3. ✅ Running all 16 migrations (creating 35 tables)
4. ✅ Starting the backend server
5. ✅ Starting the frontend server

---

## When It's Ready

You'll see:
```
simfab-server    | 🚀 Server is running on 0.0.0.0:3001
simfab-frontend  | VITE ... ready in ... ms
```

Then open: **http://localhost:5173**

---

## Test It!

1. Go to: http://localhost:5173/register
2. Create an account:
   - First Name: John
   - Last Name: Doe  
   - Email: test@test.com
   - Password: Test123!
3. Login with those credentials
4. Done! ✅

---

## Stop Everything

```bash
docker-compose down
```

---

## Fresh Start (Delete All Data)

```bash
docker-compose down -v
docker-compose up
```

---

## View Logs

```bash
# See everything
docker-compose logs -f

# Just backend
docker-compose logs -f server

# Just database
docker-compose logs -f postgres
```

---

## Access Database

```bash
docker exec -it simfab-db psql -U postgres -d simfab_dev
```

Then:
```sql
\dt              -- List all tables (should show 35)
SELECT * FROM users;  -- See registered users
\q              -- Quit
```

---

## Database Credentials

If you want to use a GUI tool (pgAdmin, DBeaver):

```
Host: localhost
Port: 5432
Database: simfab_dev
Username: postgres
Password: postgres
```

---

## Common Issues

### Port already in use?

```bash
# Check what's using the port
netstat -ano | findstr :5432
netstat -ano | findstr :3001
netstat -ano | findstr :5173

# Stop other services or change ports in docker-compose.yml
```

### Containers won't start?

```bash
# Clean everything and rebuild
docker-compose down -v
docker-compose up --build
```

### See what's running?

```bash
docker ps
```

---

## That's It!

Just run `docker-compose up` and everything works!

No PostgreSQL setup, no database config, no `.env` files to manage.

**See also**: `DOCKER_QUICKSTART.md` for more details.

