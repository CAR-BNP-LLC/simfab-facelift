# 🐳 Docker Quick Start - SimFab

## The EASY Way to Run Everything!

No PostgreSQL setup, no database configuration, no headaches. Just Docker! 🎉

---

## ✅ Prerequisites

Install Docker Desktop:
- **Windows**: https://docs.docker.com/desktop/install/windows-install/
- **Mac**: https://docs.docker.com/desktop/install/mac-install/
- **Linux**: https://docs.docker.com/desktop/install/linux-install/

That's it! Docker will handle PostgreSQL, the backend, and everything else.

---

## 🚀 Start Everything (One Command!)

```bash
# Start PostgreSQL + Backend + Frontend
docker-compose up
```

That's it! 🎉

This will:
- ✅ Start PostgreSQL database
- ✅ Create the `simfab_dev` database
- ✅ Run all migrations automatically
- ✅ Start the backend server
- ✅ Start the frontend dev server

### What's Running:

| Service | URL | Container |
|---------|-----|-----------|
| **Frontend** | http://localhost:5173 | simfab-frontend |
| **Backend** | http://localhost:3001 | simfab-server |
| **PostgreSQL** | localhost:5432 | simfab-db |

---

## 🛑 Stop Everything

```bash
# Stop all containers
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

---

## 📊 View Logs

```bash
# See all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# See only backend logs
docker-compose logs -f server

# See only database logs
docker-compose logs -f postgres
```

---

## 🔧 Useful Commands

### Rebuild Containers (after code changes)
```bash
docker-compose up --build
```

### Run Backend Only (no frontend)
```bash
docker-compose up postgres server
```

### Access PostgreSQL Database
```bash
# Connect to database from your machine
docker exec -it simfab-db psql -U postgres -d simfab_dev

# Inside PostgreSQL, try:
\dt                    # List all tables (should see 35 tables)
\q                     # Quit
```

### Check Database Tables
```bash
docker exec -it simfab-db psql -U postgres -d simfab_dev -c "\dt"
```

### Run Migrations Manually
```bash
docker exec -it simfab-server npm run migrate:up
```

### Check Migration Status
```bash
docker exec -it simfab-server npm run migrate:status
```

---

## 🧪 Test the Setup

### 1. Check Services are Running

```bash
# Check backend health
curl http://localhost:3001/health

# Expected: {"success":true,"message":"Server is running",...}
```

### 2. Test in Browser

1. **Frontend**: http://localhost:5173
2. **Register**: http://localhost:5173/register
3. **Login**: http://localhost:5173/login

### 3. Check Database

```bash
# Connect to database
docker exec -it simfab-db psql -U postgres -d simfab_dev

# Check tables exist
\dt

# Check users table
SELECT * FROM users;

# Exit
\q
```

---

## 🐛 Troubleshooting

### Containers won't start
```bash
# Clean everything and start fresh
docker-compose down -v
docker-compose up --build
```

### Port already in use
```bash
# Check what's using the port
netstat -ano | findstr :5432    # PostgreSQL
netstat -ano | findstr :3001    # Backend
netstat -ano | findstr :5173    # Frontend

# Kill the process or change ports in docker-compose.yml
```

### Database connection fails
```bash
# Restart just the database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

### Migrations not running
```bash
# Run manually
docker exec -it simfab-server npm run migrate:up

# Check status
docker exec -it simfab-server npm run migrate:status
```

---

## 🔄 Development Workflow

### Option 1: Run Everything in Docker
```bash
docker-compose up
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Database: Handled by Docker

### Option 2: Run Only Database + Backend in Docker
```bash
# Start just database and backend
docker-compose up postgres server

# Then run frontend locally (in another terminal)
npm run dev
```

### Option 3: Run Only Database in Docker
```bash
# Start just database
docker-compose up postgres

# Then run backend locally (in server directory)
cd server
npm run dev

# Then run frontend locally
npm run dev
```

---

## 📝 What Docker is Doing

1. **PostgreSQL Container**:
   - Creates PostgreSQL 15 database
   - Database name: `simfab_dev`
   - Username: `postgres`
   - Password: `postgres`
   - Port: 5432
   - Data persists in Docker volume

2. **Backend Container**:
   - Installs Node.js dependencies
   - Runs database migrations automatically
   - Starts Express server on port 3001
   - Hot-reload enabled (changes to `src/` reflect immediately)

3. **Frontend Container** (optional):
   - Installs Node.js dependencies
   - Starts Vite dev server on port 5173
   - Hot-reload enabled

---

## 🎯 Quick Test Checklist

- [ ] Run `docker-compose up`
- [ ] Wait for "Server is running" message
- [ ] Open http://localhost:5173
- [ ] Register a new user
- [ ] Login with the user
- [ ] Check backend logs show the API calls
- [ ] Verify user in database:
  ```bash
  docker exec -it simfab-db psql -U postgres -d simfab_dev -c "SELECT * FROM users;"
  ```

---

## 🌟 Advantages of Docker

✅ **No PostgreSQL installation needed**  
✅ **No database configuration needed**  
✅ **Automatic migrations**  
✅ **Consistent environment**  
✅ **Easy cleanup** (`docker-compose down -v`)  
✅ **Works on Windows, Mac, Linux**  
✅ **One command to start everything**  

---

## 📚 Additional Commands

### View Running Containers
```bash
docker ps
```

### Stop a Specific Container
```bash
docker stop simfab-server
docker stop simfab-db
```

### Restart a Container
```bash
docker restart simfab-server
```

### Remove All Containers and Start Fresh
```bash
docker-compose down -v
docker-compose up --build
```

### Access Container Shell
```bash
# Backend container
docker exec -it simfab-server sh

# Database container
docker exec -it simfab-db sh
```

---

## 🎊 Success!

**You now have a fully Dockerized development environment!**

Just run:
```bash
docker-compose up
```

And everything works! 🚀

- ✅ Database automatically created
- ✅ Migrations automatically run
- ✅ Backend server started
- ✅ Frontend server started
- ✅ Everything connected

**Go to**: http://localhost:5173 and start testing!

---

## 🔑 Database Credentials

If you need to connect from a GUI tool (like pgAdmin or DBeaver):

```
Host: localhost
Port: 5432
Database: simfab_dev
Username: postgres
Password: postgres
```

---

**That's it! No more database setup headaches!** 🎉

