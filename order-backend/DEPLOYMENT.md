# Deployment Guide for JB Creations Backend

## Overview
This guide will help you deploy your JB Creations backend server to various cloud platforms while keeping your frontend on Netlify.

## Prerequisites
1. Node.js 18+ installed locally
2. Git repository with your code
3. Environment variables configured

## Deployment Options

### Option 1: Railway (Recommended - Easy & Free)

Railway is excellent for Node.js applications and offers great integration with GitHub.

**Steps:**
1. Go to [railway.app](https://railway.app) and sign up
2. Connect your GitHub account
3. Create new project from GitHub repo
4. Select your repository and the `/order-backend` folder
5. Add environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   JWT_SECRET=your-secure-jwt-secret
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CORS_ORIGIN=https://your-netlify-site.netlify.app
   ```
6. Railway will auto-deploy from your `railway.toml` configuration

**Pricing:** Free tier with 500 hours/month, then $5/month

### Option 2: Heroku

**Steps:**
1. Install Heroku CLI
2. Create new Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Add config vars:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your-secure-secret
   # Add other environment variables
   ```
4. Deploy:
   ```bash
   git subtree push --prefix order-backend heroku main
   ```

### Option 3: Render.com

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `order-backend`
5. Add environment variables in Render dashboard

### Option 4: DigitalOcean App Platform

**Steps:**
1. Sign up at DigitalOcean
2. Create new App
3. Connect GitHub repository
4. Configure build settings:
   - Source Directory: `/order-backend`
   - Build Command: `npm install`
   - Run Command: `npm start`

## Environment Variables Setup

Create these environment variables in your deployment platform:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
CORS_ORIGIN=https://your-netlify-site.netlify.app
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
MSG91_API_KEY=your-msg91-api-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

## Post-Deployment Steps

### 1. Update Frontend Configuration

Update your frontend files to use the production API URL:

**In `auth.js`:**
```javascript
const API_BASE_URL = 'https://your-backend-url.railway.app/api';
```

**In `script.js`:**
```javascript
const API_BASE_URL = 'https://your-backend-url.railway.app/api';
```

### 2. Test Your Deployment

1. Visit your backend URL: `https://your-backend-url.railway.app/health`
2. Test user registration: `POST /api/auth/register`
3. Test order creation: `POST /api/orders`
4. Access admin panel: `https://your-backend-url.railway.app/admin`

### 3. Configure Netlify Environment

In your Netlify site settings, add environment variable:
```
REACT_APP_API_URL=https://your-backend-url.railway.app/api
```

## Database Considerations

### SQLite in Production
Your current setup uses SQLite, which works well for small to medium applications. For production:

**Pros:**
- Simple setup
- No additional database service needed
- Good performance for read-heavy workloads

**Cons:**
- Limited concurrent writes
- Backup complexity in cloud environments

### Migration to PostgreSQL (Optional)
For higher scalability, consider migrating to PostgreSQL:

1. Add PostgreSQL service to your deployment platform
2. Update database connection code
3. Migrate existing SQLite data

## Security Checklist

- ✅ JWT secrets are secure and different from development
- ✅ CORS is configured with your actual Netlify URL
- ✅ Rate limiting is enabled
- ✅ Helmet security headers are active
- ✅ Environment variables are set in deployment platform
- ✅ Database backups are configured

## Monitoring and Logs

Most platforms provide built-in logging. Access logs via:

**Railway:** Dashboard → Deployments → View Logs
**Heroku:** `heroku logs --tail`
**Render:** Dashboard → Logs tab

## Backup Strategy

Set up automated database backups:

1. Use the provided backup script: `npm run backup`
2. Store backups in cloud storage (AWS S3, Google Cloud Storage)
3. Schedule regular backups via cron jobs

## Cost Estimates

| Platform | Free Tier | Paid Plans |
|----------|-----------|------------|
| Railway | 500 hours/month | $5/month |
| Heroku | 550 hours/month | $7/month |
| Render | 750 hours/month | $7/month |
| DigitalOcean | $5/month credit | $5/month |

## Troubleshooting

### Common Issues:

1. **CORS Errors:** Ensure `CORS_ORIGIN` environment variable is set correctly
2. **Database Errors:** Check file permissions and disk space
3. **Port Issues:** Most platforms set `PORT` automatically
4. **Memory Issues:** Increase memory allocation in platform settings

### Debug Steps:

1. Check deployment logs
2. Verify environment variables
3. Test endpoints individually
4. Check database connectivity

## Next Steps

1. Choose your preferred deployment platform
2. Set up the deployment following the steps above
3. Update your frontend configuration
4. Test all functionality
5. Set up monitoring and backups

Need help? Check the platform-specific documentation or contact support.