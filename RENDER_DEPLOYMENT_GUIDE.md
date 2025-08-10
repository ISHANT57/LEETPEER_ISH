# Render Deployment Guide - LeetCode Progress Tracker with Caching

## Overview
Complete guide for deploying the LeetCode Progress Tracker to Render with advanced caching capabilities for instant loading performance.

## Prerequisites
- [ ] GitHub repository with your code
- [ ] Render account
- [ ] Database provider account (Neon Database recommended)

## Database Setup (First)

### Option 1: Neon Database (Recommended)
1. Go to https://neon.tech and create an account
2. Create a new database project
3. Copy the connection string (it should look like: `postgresql://username:password@host/dbname`)
4. Save this connection string - you'll need it for Render

### Option 2: Render PostgreSQL
1. In Render Dashboard, create a new PostgreSQL database
2. Wait for it to deploy (5-10 minutes)
3. Copy the "Internal Database URL" from the database info page

## Render Web Service Deployment

### Step 1: Create Web Service
1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:

```
Name: leetcode-progress-tracker
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: (leave blank)
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

### Step 2: Environment Variables
Add these environment variables in Render:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_neon_database_connection_string_here
```

**Optional Performance Variables:**
```
CACHE_WARMUP_DELAY=30000
CACHE_CLEANUP_INTERVAL=1800000
CACHE_DEFAULT_TTL=900000
```

### Step 3: Advanced Settings
In "Advanced" section:
- **Auto-Deploy**: Yes
- **Health Check Path**: `/healthcheck`
- **Docker Command**: (leave blank)

## Deployment Files Verification

Ensure these files are in your repository root:

### package.json Scripts
```json
{
  "scripts": {
    "start": "NODE_ENV=production tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "node deploy-simple.cjs",
    "db:push": "drizzle-kit push"
  }
}
```

### render.yaml (Auto-detected by Render)
```yaml
services:
  - type: web
    name: leetcode-progress-tracker
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /healthcheck
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

### healthcheck.js
```javascript
const http = require('http');

const options = {
  host: '0.0.0.0',
  port: process.env.PORT || 10000,
  path: '/healthcheck',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', function(err) {
  console.log('ERROR:', err);
  process.exit(1);
});

request.end();
```

## Database Schema Deployment

### Method 1: Automatic (Recommended)
The application will automatically create tables on first run using Drizzle migrations.

### Method 2: Manual (If needed)
1. Connect to your database using the Neon console or pgAdmin
2. Run: `npm run db:push` from your local machine with DATABASE_URL set

## Cache System Verification

After deployment, verify the caching system:

### 1. Check Logs
Monitor Render logs for these messages:
```
Cache cleanup scheduler started
Starting cache warm-up...
Cache updated for key: admin
Cache updated for key: university
Cache warm-up completed successfully
```

### 2. Test Admin Dashboard
1. Login as admin (admin/leetpeer57)
2. Go to Admin Dashboard
3. Look for cache status indicators
4. Check the "Cache Status" section at the bottom

### 3. Performance Test
- First load: Should be instant if cache is warmed
- Subsequent loads: Should be under 100ms
- Cache indicators should show "Fast" or "Cached"

## Post-Deployment Configuration

### 1. Initialize Data
Visit: `https://your-app.onrender.com/admin`
- Login with admin/leetpeer57
- Click "Initialize Students" to import student data
- Click "Warm Up Cache" to populate cache

### 2. Setup Monitoring
Monitor these endpoints:
- `GET /api/cache/status` - Cache health
- `GET /healthcheck` - Application health
- `GET /api/settings` - App settings

### 3. Performance Optimization
- Cache warm-up runs automatically every startup
- Cache cleanup runs every 30 minutes
- Dashboard data refreshes every 15 minutes

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | - | Set to "production" |
| `PORT` | Yes | 5000 | Render requires 10000 |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `CACHE_WARMUP_DELAY` | No | 30000 | Delay before cache warmup (ms) |
| `CACHE_CLEANUP_INTERVAL` | No | 1800000 | Cache cleanup interval (ms) |
| `CACHE_DEFAULT_TTL` | No | 900000 | Default cache TTL (ms) |

## Troubleshooting

### Build Failures
1. Check Node.js version in package.json engines
2. Verify all dependencies in package.json
3. Check build logs for specific errors

### Database Connection Issues
1. Verify DATABASE_URL is correctly formatted
2. Check database is accessible from Render IPs
3. Test connection from local machine first

### Cache Issues
1. Check logs for cache initialization errors
2. Manually trigger cache warm-up via admin panel
3. Clear cache and let it rebuild automatically

### Performance Issues
1. Monitor cache hit rates in admin dashboard
2. Check database query performance
3. Verify cache is properly warmed up

## Security Checklist
- [ ] Database URL is in environment variables (not code)
- [ ] Admin credentials are secure
- [ ] HTTPS is enabled (automatic on Render)
- [ ] No sensitive data in logs
- [ ] Cache doesn't store sensitive information

## Success Indicators
✅ Application loads without errors
✅ Database connection successful
✅ Cache system operational
✅ Admin dashboard accessible
✅ Student data displays correctly
✅ Cache indicators show fresh/cached status
✅ Performance is under 100ms for cached requests

## Support
If you encounter issues:
1. Check Render deployment logs
2. Review database connection
3. Test cache warm-up manually
4. Contact support with specific error messages

## Advanced Configuration

### Custom Cache Settings
Add to environment variables for fine-tuning:
```
# Cache TTL for different data types (in milliseconds)
ADMIN_CACHE_TTL=900000        # 15 minutes
STUDENT_CACHE_TTL=1800000     # 30 minutes
BATCH_CACHE_TTL=600000        # 10 minutes

# Production optimizations
STUDENT_WARMUP_LIMIT=20       # Limit student cache warmup
CACHE_RETRY_ATTEMPTS=3        # Retry failed cache operations
```

### Monitoring Dashboard URLs
After deployment, bookmark these admin URLs:
- `https://your-app.onrender.com/admin` - Admin dashboard
- Cache management section shows real-time cache status
- Performance metrics and cache control buttons available

This deployment guide ensures your LeetCode Progress Tracker runs optimally on Render with instant loading through intelligent caching.