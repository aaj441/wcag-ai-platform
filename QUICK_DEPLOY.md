# 🚀 Quick Deployment Reference Card

## Prerequisites (5 min)
```powershell
npm install -g @railway/cli vercel
railway login
vercel login
```

## Deploy API to Railway (5 min)
```powershell
cd packages\api

# One-time setup
railway link

# Configure
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set CORS_ORIGIN=*

# Deploy
railway up

# Get URL (save this!)
railway domain
```
**Railway URL**: _______________________________________

## Deploy Webapp to Vercel (5 min)
```powershell
cd packages\webapp

# Configure (use Railway URL from above)
vercel env add VITE_API_BASE_URL production

# Deploy
vercel --prod
```
**Vercel URL**: _______________________________________

## Update CORS (2 min)
```powershell
cd packages\api
railway variables set CORS_ORIGIN=https://your-vercel-url.vercel.app
railway up
```

## Test Deployment (2 min)
```powershell
# API
curl https://your-railway-url.railway.app/health

# Webapp
# Open browser: https://your-vercel-url.vercel.app
```

## Troubleshooting
```powershell
railway logs          # View API logs
vercel logs          # View webapp logs
railway restart      # Restart API
```

---
**Total Time**: ~15 minutes | **Docs**: See DEPLOYMENT_GUIDE.md
