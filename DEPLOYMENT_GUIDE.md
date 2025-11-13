# WCAG AI Platform - Quick Deployment Guide

## Prerequisites

Install the required CLI tools:
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel
```

## Step 1: Deploy API to Railway

```powershell
# Navigate to API package
cd packages/api

# Login to Railway (opens browser)
railway login

# Link to project (or create new)
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set CORS_ORIGIN=*

# Deploy
railway up

# Get your deployment URL
railway domain
# Save this URL - you'll need it for the webapp!
```

## Step 2: Deploy Webapp to Vercel

```powershell
# Navigate to webapp package
cd packages/webapp

# Login to Vercel (opens browser)
vercel login

# Deploy to preview first
vercel

# Set environment variable with your Railway API URL
vercel env add VITE_API_BASE_URL
# When prompted, enter: https://your-railway-app.railway.app

# Deploy to production
vercel --prod

# Get your deployment URL
vercel inspect
```

## Step 3: Update CORS Configuration

```powershell
# Update Railway API to allow your Vercel domain
cd packages/api
railway variables set CORS_ORIGIN=https://your-vercel-app.vercel.app

# Redeploy API
railway up
```

## Step 4: Verify Deployment

### Test API Health
```powershell
curl https://your-railway-app.railway.app/health
# Should return: {"success":true,"message":"WCAG AI Platform API is running"...}

curl https://your-railway-app.railway.app/api/drafts
# Should return list of draft emails
```

### Test Webapp
Open your Vercel URL in browser:
- https://your-vercel-app.vercel.app
- Should see the WCAG AI Platform dashboard
- Try filtering drafts by status
- Test keyword search functionality

## Quick Deployment Commands

### Railway (API)
```powershell
cd packages/api
railway link              # One-time: link to project
railway up                # Deploy
railway logs              # View logs
railway domain            # Get URL
railway variables list    # List env vars
```

### Vercel (Webapp)
```powershell
cd packages/webapp
vercel                    # Deploy to preview
vercel --prod             # Deploy to production
vercel logs               # View logs
vercel domains list       # List domains
vercel env ls             # List env vars
```

## Troubleshooting

### Railway API Not Responding
1. Check logs: `railway logs`
2. Verify PORT variable is set to 3001
3. Ensure build succeeded: check Railway dashboard
4. Verify Dockerfile exists in packages/api/

### Vercel Webapp Build Failed
1. Check build logs in Vercel dashboard
2. Verify VITE_API_BASE_URL is set correctly
3. Test build locally: `npm run build`
4. Check vercel.json configuration

### CORS Errors
1. Verify CORS_ORIGIN in Railway matches your Vercel URL
2. Include https:// in the URL
3. No trailing slash in URL
4. Redeploy API after changing CORS_ORIGIN

### API Connection Failed
1. Verify VITE_API_BASE_URL in Vercel environment
2. Check Railway API is running: visit /health endpoint
3. Verify Railway domain is public (not private)
4. Check browser console for specific error

## Environment Variables

### Railway (API)
Required:
- `NODE_ENV=production`
- `PORT=3001`
- `CORS_ORIGIN=https://your-vercel-app.vercel.app`

Optional:
- `LAUNCHDARKLY_SDK_KEY=your-key`
- `OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces`
- `LOG_LEVEL=info`

### Vercel (Webapp)
Required:
- `VITE_API_BASE_URL=https://your-railway-app.railway.app`

## Monitoring

### Railway
- Dashboard: https://railway.app/dashboard
- Metrics: CPU, Memory, Network usage
- Logs: Real-time streaming
- Deployments: History and rollback

### Vercel
- Dashboard: https://vercel.com/dashboard
- Analytics: Page views, performance
- Logs: Function logs and build logs
- Deployments: Git-based with preview URLs

## CI/CD Integration

### GitHub Actions (Recommended)
The project includes `.github/workflows/ci.yml` for automated:
- Linting
- Type checking
- Testing
- Building

Connect your GitHub repo to:
- Railway: Auto-deploy on push to main
- Vercel: Auto-deploy on push with preview URLs for PRs

### Manual Deployment
Use the commands above for manual deployments.

## Cost Estimation

### Railway (Free Tier)
- $5/month free credit
- API should cost ~$2-3/month for light usage
- Scales automatically

### Vercel (Hobby Tier - Free)
- Unlimited deployments
- 100GB bandwidth/month
- Free SSL certificates
- Perfect for demo/staging

## Next Steps

1. ✅ Install Railway and Vercel CLIs
2. ✅ Deploy API to Railway
3. ✅ Deploy Webapp to Vercel
4. ✅ Update CORS configuration
5. ✅ Test both deployments
6. 📊 Set up monitoring alerts
7. 🔒 Configure custom domains (optional)
8. 🚀 Connect GitHub for auto-deploy (optional)

## Support

- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- Project Issues: https://github.com/aaj441/wcag-ai-platform/issues
