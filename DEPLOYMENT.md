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

The app automatically detects the environment:
- **Production (Heroku)**: Uses PostgreSQL via `DATABASE_URL` environment variable
- **Development (Local)**: Uses SQLite in `./data/` directory

## Database Schema

The app will automatically create the required tables on first run:
- `products` table for product data
- `user_sessions` table for session storage (PostgreSQL only)

## Deployment Commands

1. **Deploy to Heroku:**
   ```bash
   git add .
   git commit -m "Add PostgreSQL support"
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

## Local Development

For local development, the app will automatically use SQLite:
- Database file: `./data/products.db`
- Session file: `./data/sessions.db`

No additional setup required for local development.

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

## Free Tier Limits

- **Heroku Postgres hobby-dev**: 10,000 rows, 20 connections
- **Perfect for development and small applications**