# 🔥 Hot Reload Development Guide

## Overview
This guide explains how to set up and use hot reload for both frontend and backend development in Docker containers.

## 🚀 Quick Start

### Windows Users
```cmd
# Double-click or run in Command Prompt
dev-start.bat
```

### Linux/Mac Users
```bash
# Make executable and run
chmod +x dev-start.sh
./dev-start.sh
```

### Manual Start
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Stop when done
docker-compose -f docker-compose.dev.yml down
```

## 🔧 Hot Reload Configuration

### Frontend Hot Reload
- **Technology**: Vite with HMR (Hot Module Replacement)
- **Port**: 5173
- **URL**: http://localhost:5173
- **Features**:
  - Instant CSS updates
  - Component state preservation
  - Fast refresh for React components
  - File watching with polling (Docker-optimized)

### Backend Hot Reload
- **Technology**: Node.js with nodemon
- **Port**: 3001
- **URL**: http://localhost:3001
- **Features**:
  - Automatic server restart on file changes
  - Database migrations on startup
  - Source code volume mounting

### Database
- **Technology**: PostgreSQL 15
- **Port**: 5432
- **Features**:
  - Persistent data storage
  - Health checks
  - Automatic migrations

## 📁 Volume Mounts

### Frontend Volumes
```yaml
volumes:
  - ./src:/app/src                    # Source code (hot reload)
  - ./public:/app/public              # Static assets
  - ./index.html:/app/index.html      # HTML template
  - ./package.json:/app/package.json  # Dependencies
  - ./vite.config.ts:/app/vite.config.ts  # Vite config
  - ./tailwind.config.ts:/app/tailwind.config.ts  # Tailwind config
  - /app/node_modules                 # Cached dependencies
```

### Backend Volumes
```yaml
volumes:
  - ./server/src:/app/src             # Source code (hot reload)
  - ./server/uploads:/app/uploads    # File uploads
  - ./server/package.json:/app/package.json  # Dependencies
  - ./server/tsconfig.json:/app/tsconfig.json  # TypeScript config
```

## ⚙️ Environment Variables

### Frontend
```bash
VITE_API_URL=http://localhost:3001    # Backend API URL
CHOKIDAR_USEPOLLING=true             # Enable file watching
WATCHPACK_POLLING=true               # Enable webpack polling
```

### Backend
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/simfab_dev
NODE_ENV=development
SESSION_SECRET=docker-dev-secret-key
PORT=3001
```

## 🔍 Troubleshooting

### Hot Reload Not Working
1. **Check file permissions**: Ensure files are writable
2. **Restart containers**: `docker-compose -f docker-compose.dev.yml restart`
3. **Check volume mounts**: Verify files are being mounted correctly
4. **Check polling**: Ensure `CHOKIDAR_USEPOLLING=true` is set

### Performance Issues
1. **Node modules caching**: Use volume mount for `/app/node_modules`
2. **Polling interval**: Adjust `interval: 1000` in `vite.config.ts`
3. **File watching**: Check if too many files are being watched

### Port Conflicts
1. **Frontend (5173)**: Change port in `vite.config.ts` and docker-compose
2. **Backend (3001)**: Change `PORT` environment variable
3. **Database (5432)**: Change port mapping in docker-compose

## 📝 Development Workflow

### 1. Start Development Environment
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Make Changes
- Edit files in `./src/` (frontend)
- Edit files in `./server/src/` (backend)
- Changes appear instantly in browser/API

### 3. View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f server
```

### 4. Stop Development Environment
```bash
docker-compose -f docker-compose.dev.yml down
```

## 🎯 Best Practices

### File Organization
- Keep source files in mounted volumes
- Use `.dockerignore` to exclude unnecessary files
- Separate development and production configurations

### Performance
- Use volume mounts for `node_modules` to avoid reinstalling
- Enable polling only when necessary
- Monitor container resource usage

### Debugging
- Use browser dev tools for frontend debugging
- Check container logs for backend issues
- Use database tools to inspect data

## 🔄 Hot Reload Features

### Frontend (Vite + React)
- ✅ CSS changes (instant)
- ✅ Component updates (preserves state)
- ✅ TypeScript compilation
- ✅ Asset updates
- ✅ Environment variable changes

### Backend (Node.js + TypeScript)
- ✅ TypeScript compilation
- ✅ Server restart on changes
- ✅ Database connection handling
- ✅ API endpoint updates
- ✅ Middleware changes

## 📊 Monitoring

### Container Status
```bash
docker-compose -f docker-compose.dev.yml ps
```

### Resource Usage
```bash
docker stats simfab-frontend-dev simfab-server-dev simfab-db-dev
```

### Logs
```bash
# Real-time logs
docker-compose -f docker-compose.dev.yml logs -f

# Specific service logs
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f server
docker-compose -f docker-compose.dev.yml logs -f postgres
```

## 🚀 Production vs Development

### Development (docker-compose.dev.yml)
- Hot reload enabled
- Source code volume mounted
- Debug logging enabled
- Development database
- Polling file watching

### Production (docker-compose.yml)
- Optimized builds
- No volume mounts
- Production logging
- Production database
- Optimized file watching

---

**Happy coding with hot reload! 🔥**

