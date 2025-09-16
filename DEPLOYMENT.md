# Deployment Guide

## Heroku Deployment

### Prerequisites
- Heroku CLI installed
- Git repository set up

### Steps

1. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your-production-secret-key
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Environment Variables

- `PORT` - Automatically set by Heroku
- `NODE_ENV` - Set to "production" for production
- `SESSION_SECRET` - Secret key for session encryption

### Database Notes

- SQLite databases will be created in the `data/` folder
- For production, consider using PostgreSQL or another persistent database
- Heroku's filesystem is ephemeral, so SQLite data will be lost on restart

### Build Process

The root package.json handles the complete deployment process:
1. `postinstall` script installs server dependencies
2. Automatically builds TypeScript code
3. Starts the server with `npm start`

## Local Development

### Frontend (React)
```bash
npm run dev
```

### Backend (Express)
```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```
