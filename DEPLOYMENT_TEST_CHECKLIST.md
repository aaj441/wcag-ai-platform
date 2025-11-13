# Deployment Test Checklist

Run through this checklist to verify deployment readiness:

## 🏗️ Pre-Deployment Checks

### Build Tests
- [ ] API builds successfully: `cd packages/api && npm run build`
- [ ] Webapp builds successfully: `cd packages/webapp && npm run build`
- [ ] No TypeScript errors (warnings OK)
- [ ] dist/ folders created in both packages

### Local Server Tests
- [ ] API runs locally: `cd packages/api && npm run dev`
- [ ] Health endpoint works: http://localhost:3001/health
- [ ] Ready endpoint works: http://localhost:3001/ready
- [ ] Drafts endpoint works: http://localhost:3001/api/drafts
- [ ] Keywords endpoint works: http://localhost:3001/api/keywords
- [ ] Webapp runs locally: `cd packages/webapp && npm run dev`
- [ ] Dashboard loads without errors
- [ ] Keyword filtering works
- [ ] Draft creation works

### Configuration Files
- [ ] `packages/api/railway.json` exists
- [ ] `packages/api/Dockerfile` exists
- [ ] `packages/webapp/vercel.json` exists
- [ ] `packages/webapp/railway.json` exists
- [ ] `.github/workflows/ci.yml` exists

## 🚂 Railway API Deployment

### Installation
```powershell
npm install -g @railway/cli
railway login
```

- [ ] Railway CLI installed
- [ ] Logged into Railway account
- [ ] Railway project created (or linked)

### Configuration
```powershell
cd packages/api
railway link
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set CORS_ORIGIN=*
```

- [ ] Project linked
- [ ] Environment variables set
- [ ] Variables verified: `railway variables list`

### Deployment
```powershell
railway up
```

- [ ] Deployment started
- [ ] Build logs show success
- [ ] No error messages
- [ ] Got deployment URL: `railway domain`

### Verification
```powershell
# Replace YOUR_URL with your actual Railway URL
curl https://YOUR_URL.railway.app/health
curl https://YOUR_URL.railway.app/api/drafts
curl https://YOUR_URL.railway.app/api/keywords
```

- [ ] Health endpoint returns success
- [ ] Drafts endpoint returns data
- [ ] Keywords endpoint returns data
- [ ] Response time < 2 seconds
- [ ] No 500 errors in logs: `railway logs`

**Railway API URL:** ___________________________________

## ▲ Vercel Webapp Deployment

### Installation
```powershell
npm install -g vercel
vercel login
```

- [ ] Vercel CLI installed
- [ ] Logged into Vercel account

### Preview Deployment
```powershell
cd packages/webapp
vercel
```

- [ ] Preview deployment started
- [ ] Build completed successfully
- [ ] Got preview URL
- [ ] Preview site loads correctly

### Environment Configuration
```powershell
vercel env add VITE_API_BASE_URL production
# Enter your Railway URL when prompted
```

- [ ] Environment variable added
- [ ] Verified with: `vercel env ls`

### Production Deployment
```powershell
vercel --prod
```

- [ ] Production deployment started
- [ ] Build completed successfully
- [ ] Got production URL
- [ ] Production site loads correctly

### Verification
Open browser and test:

- [ ] Dashboard loads: https://your-app.vercel.app
- [ ] No console errors
- [ ] Draft list displays
- [ ] Keyword filter works
- [ ] Status filter works
- [ ] Can select and view drafts
- [ ] Keyword badges display
- [ ] Responsive design works on mobile

**Vercel Webapp URL:** ___________________________________

## 🔗 Integration Tests

### CORS Configuration
```powershell
cd packages/api
railway variables set CORS_ORIGIN=https://your-app.vercel.app
railway up
```

- [ ] CORS_ORIGIN updated with Vercel URL
- [ ] API redeployed
- [ ] No CORS errors in browser console

### End-to-End Flow
Using the deployed webapp at your Vercel URL:

- [ ] Dashboard loads draft list from Railway API
- [ ] Can filter drafts by status
- [ ] Can filter drafts by keyword
- [ ] Can view draft details
- [ ] Keyword badges display correctly
- [ ] Network tab shows successful API calls
- [ ] Response times acceptable (< 2s)

### API Performance
```powershell
# Test API response times
Measure-Command { Invoke-RestMethod -Uri "https://YOUR_URL.railway.app/api/drafts" }
```

- [ ] API responds in < 500ms for cached requests
- [ ] API responds in < 2s for cold starts
- [ ] No timeout errors

## 📊 Post-Deployment Monitoring

### Railway Dashboard
Visit: https://railway.app/dashboard

- [ ] API deployment shows "Active"
- [ ] CPU usage < 50%
- [ ] Memory usage < 512MB
- [ ] No error spikes in metrics
- [ ] Build time < 3 minutes

### Vercel Dashboard
Visit: https://vercel.com/dashboard

- [ ] Webapp deployment shows "Ready"
- [ ] Build time < 2 minutes
- [ ] Bundle size < 500KB
- [ ] No build warnings
- [ ] Analytics enabled (optional)

### Logging
```powershell
# View Railway logs
cd packages/api
railway logs

# View Vercel logs
cd packages/webapp
vercel logs
```

- [ ] Railway logs show structured JSON logs
- [ ] Correlation IDs present in logs
- [ ] No error logs
- [ ] Winston logging working
- [ ] Vercel logs show successful requests

## 🔒 Security Checks

- [ ] HTTPS enabled on both deployments (automatic)
- [ ] Security headers present (check browser DevTools)
- [ ] CORS properly configured
- [ ] No API keys exposed in client code
- [ ] Environment variables not in git

## 🎉 Deployment Complete!

If all checks passed, your deployment is successful!

### Save These URLs
- API Base URL: _______________________________________
- Webapp URL: _________________________________________

### Share with Team
- Demo: https://your-app.vercel.app
- API Docs: https://your-api.railway.app/
- Health Check: https://your-api.railway.app/health

### Next Steps
- [ ] Add custom domain (optional)
- [ ] Set up monitoring alerts
- [ ] Configure GitHub auto-deploy
- [ ] Share demo with stakeholders

## 🆘 Troubleshooting

### Common Issues

**API Health Check Fails**
```powershell
railway logs          # Check for errors
railway restart       # Restart service
railway variables     # Verify all vars set
```

**Webapp Shows API Error**
- Verify VITE_API_BASE_URL matches Railway URL
- Check CORS_ORIGIN in Railway
- Clear browser cache
- Check browser console for specific error

**Build Fails**
- Check build logs in Railway/Vercel dashboard
- Verify package.json scripts are correct
- Test build locally first
- Check for missing dependencies

**Slow Response Times**
- Railway has ~1s cold start (first request)
- Consider upgrading Railway plan for better performance
- Check API logs for slow queries
- Monitor Railway metrics

## 📝 Notes

Date Tested: ________________
Tested By: __________________
Issues Found: _______________
___________________________
___________________________
