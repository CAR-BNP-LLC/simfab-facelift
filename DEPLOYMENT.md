# Heroku Deployment Guide

## Setup Heroku Postgres Addon

1. **Add Heroku Postgres addon to your app:**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

2. **Verify the addon was added:**
   ```bash
   heroku addons
   ```

3. **Check your DATABASE_URL:**
   ```bash
   heroku config:get DATABASE_URL
   ```

## Environment Variables

The app uses PostgreSQL everywhere:
- **Production (Heroku)**: Uses PostgreSQL via `DATABASE_URL` environment variable (auto-set by Heroku)
- **Development (Local)**: Uses local PostgreSQL at `postgresql://localhost:5432/simfab_dev`

## Database Schema

The app will automatically create the required tables on first run:
- `products` table for product data
- `user_sessions` table for session storage

## Deployment Commands

1. **Deploy to Heroku:**
   ```bash
   git add .
   git commit -m "Simplify to PostgreSQL only"
   git push heroku main
   ```

2. **Check logs:**
   ```bash
   heroku logs --tail
   ```

3. **Open your app:**
   ```bash
   heroku open
   ```

## Local Development Setup

1. **Install PostgreSQL locally:**
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - macOS: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Create local database:**
   ```bash
   createdb simfab_dev
   ```

3. **Start PostgreSQL service:**
   ```bash
   # Windows (if installed as service)
   net start postgresql
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

## Troubleshooting

If you encounter issues:

1. **Check if Postgres addon is provisioned:**
   ```bash
   heroku addons:info heroku-postgresql:hobby-dev
   ```

2. **Reset database (if needed):**
   ```bash
   heroku pg:reset DATABASE_URL
   ```

3. **Check database connection:**
   ```bash
   heroku pg:psql
   ```

4. **Local PostgreSQL not running:**
   ```bash
   # Check if running
   pg_isready
   
   # Start if needed
   brew services start postgresql  # macOS
   sudo systemctl start postgresql  # Linux
   ```

## Free Tier Limits

- **Heroku Postgres hobby-dev**: 10,000 rows, 20 connections
- **Perfect for development and small applications**