# GitHub Pages Setup Guide

## Overview

This guide explains how to enable and configure GitHub Pages for the WCAG AI Platform documentation.

## What's Deployed

The GitHub Pages site includes:

- **Home Page** (`docs/index.html`) - Beautiful landing page with features overview
- **API Documentation** - Complete REST API reference (API_DOCUMENTATION.md)
- **Security Policy** - Vulnerability disclosure and security guidelines (SECURITY.md)
- **Contributing Guide** - Developer setup and contribution workflow (CONTRIBUTING.md)
- **Build Troubleshooting** - Common errors and solutions (BUILD_TROUBLESHOOTING.md)
- **Workflow Fixes** - CI/CD pipeline documentation (WORKFLOW_FIXES.md)
- **Project README** - Project overview and quickstart (README.md)

## Enable GitHub Pages

### Step 1: Configure Pages in Repository Settings

1. Go to your repository on GitHub: https://github.com/aaj441/wcag-ai-platform
2. Click **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - **Source**: GitHub Actions
5. Click **Save**

### Step 2: Trigger First Deployment

The GitHub Pages workflow (`.github/workflows/gh-pages.yml`) will automatically run when:

- Code is pushed to `main` branch
- Documentation files (`*.md`) are updated
- Files in `docs/` directory change
- Manually triggered via Actions tab

**To trigger manually:**

1. Go to **Actions** tab
2. Select **Deploy GitHub Pages** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

### Step 3: Wait for Deployment

The deployment typically takes 1-2 minutes. You can monitor progress:

1. Go to **Actions** tab
2. Click on the running "Deploy GitHub Pages" workflow
3. Watch the build and deploy jobs

### Step 4: Access Your Site

Once deployed, your documentation will be available at:

```
https://aaj441.github.io/wcag-ai-platform/
```

Or if using a custom domain:
```
https://your-custom-domain.com/
```

## Accessing Documentation

### Main Pages

- **Home**: `https://aaj441.github.io/wcag-ai-platform/`
- **API Docs Viewer**: `https://aaj441.github.io/wcag-ai-platform/docs/viewer.html?doc=API_DOCUMENTATION.md`
- **Security Policy**: `https://aaj441.github.io/wcag-ai-platform/docs/viewer.html?doc=SECURITY.md`
- **Contributing**: `https://aaj441.github.io/wcag-ai-platform/docs/viewer.html?doc=CONTRIBUTING.md`
- **Troubleshooting**: `https://aaj441.github.io/wcag-ai-platform/docs/viewer.html?doc=BUILD_TROUBLESHOOTING.md`

### Direct Markdown Access

You can also access raw markdown files:

```
https://aaj441.github.io/wcag-ai-platform/docs/SECURITY.md
https://aaj441.github.io/wcag-ai-platform/docs/API_DOCUMENTATION.md
https://aaj441.github.io/wcag-ai-platform/docs/CONTRIBUTING.md
```

## Custom Domain Setup (Optional)

### Step 1: Add CNAME File

Create a file named `CNAME` in the `docs/` directory:

```bash
echo "docs.wcag-ai-platform.com" > docs/CNAME
git add docs/CNAME
git commit -m "chore: add custom domain for GitHub Pages"
git push
```

### Step 2: Configure DNS

Add DNS records with your domain provider:

**For apex domain** (wcag-ai-platform.com):
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**For subdomain** (docs.wcag-ai-platform.com):
```
Type: CNAME
Name: docs
Value: aaj441.github.io
```

### Step 3: Enable HTTPS

1. Go to repository **Settings** > **Pages**
2. Check **Enforce HTTPS**
3. Wait for SSL certificate provisioning (can take up to 24 hours)

## Updating Documentation

Documentation automatically updates when you:

1. Push changes to `main` branch:
   ```bash
   # Edit documentation
   vim API_DOCUMENTATION.md

   # Commit and push
   git add API_DOCUMENTATION.md
   git commit -m "docs: update API documentation"
   git push origin main
   ```

2. The workflow automatically:
   - Detects changes to `*.md` or `docs/` files
   - Builds the static site
   - Deploys to GitHub Pages
   - Updates live site (2-3 minutes)

## Troubleshooting

### Pages Not Deploying

**Problem**: Workflow runs but site doesn't update

**Solutions**:

1. Check workflow status in Actions tab
2. Verify Pages is enabled in Settings
3. Check for errors in deployment job logs
4. Ensure `permissions` are set correctly in workflow file

### 404 Not Found

**Problem**: Site returns 404 error

**Solutions**:

1. Verify `index.html` exists in `docs/` directory
2. Check Pages settings for correct source
3. Wait 2-3 minutes after deployment
4. Clear browser cache

### Custom Domain Not Working

**Problem**: Custom domain shows error

**Solutions**:

1. Verify DNS records are correct
2. Wait 24-48 hours for DNS propagation
3. Check CNAME file contains correct domain
4. Ensure HTTPS is enforced after SSL provisioning

### Workflow Failing

**Problem**: GitHub Pages workflow fails

**Solutions**:

1. Check error logs in Actions tab
2. Verify file paths in workflow are correct
3. Ensure all referenced files exist
4. Check workflow permissions

## Features of the Deployed Site

### Accessibility

The GitHub Pages site follows WCAG 2.1 AA standards:

- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy
- ✅ Sufficient color contrast (4.5:1 minimum)
- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ Responsive design for all devices

### Performance

- **Fast Loading**: Static HTML with minimal dependencies
- **CDN Hosted**: GitHub's global CDN for fast delivery
- **Optimized Assets**: Minimal CSS, no unnecessary JavaScript
- **Markdown Rendering**: Client-side rendering with marked.js

### SEO

- **Meta Tags**: Proper meta descriptions
- **Semantic HTML**: Search engine friendly structure
- **Sitemap**: Auto-generated by GitHub Pages
- **Mobile Friendly**: Responsive design

## Monitoring

### Page Views

GitHub Pages doesn't include built-in analytics. To track visitors:

1. **Google Analytics**:
   - Add tracking code to `docs/index.html`
   - Monitor in Google Analytics dashboard

2. **Plausible Analytics**:
   - Privacy-friendly alternative
   - Add script tag to HTML files

3. **GitHub Insights**:
   - Repository traffic tab
   - Shows unique visitors and page views

### Uptime Monitoring

GitHub Pages has 99.9% uptime SLA. For monitoring:

1. **UptimeRobot**: Free uptime monitoring
2. **Pingdom**: Professional monitoring service
3. **StatusCake**: Website monitoring and alerts

## Best Practices

### Documentation Updates

1. **Always update in markdown** - Don't edit HTML directly for docs
2. **Use descriptive commit messages** - Helps track documentation changes
3. **Preview locally** - Test markdown rendering before pushing
4. **Check links** - Verify all internal and external links work

### File Organization

```
docs/
├── index.html              # Landing page (custom HTML)
├── viewer.html             # Markdown viewer (auto-generated)
├── SECURITY.md             # Security policy (copied from root)
├── API_DOCUMENTATION.md    # API reference (copied from root)
├── CONTRIBUTING.md         # Contributing guide (copied from root)
└── *.md                    # Other documentation files
```

### Versioning

Consider adding version tags to documentation:

```bash
# Tag a documentation version
git tag -a docs-v1.0 -m "Documentation version 1.0"
git push origin docs-v1.0

# Reference in docs
echo "Version: 1.0" >> API_DOCUMENTATION.md
```

## Advanced Configuration

### Custom 404 Page

Create `docs/404.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>404 - Page Not Found</title>
    <meta http-equiv="refresh" content="3;url=/">
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>Redirecting to home page...</p>
</body>
</html>
```

### Robots.txt

Create `docs/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://aaj441.github.io/wcag-ai-platform/sitemap.xml
```

### Favicon

Add to `docs/` directory:

```html
<!-- In index.html <head> -->
<link rel="icon" type="image/png" href="/favicon.png">
```

## Security Considerations

1. **No Secrets**: Never commit API keys or secrets to Pages
2. **Static Only**: GitHub Pages serves only static files
3. **HTTPS**: Always enforce HTTPS for security
4. **CSP Headers**: Consider Content Security Policy

## Support

If you encounter issues:

1. Check [GitHub Pages documentation](https://docs.github.com/en/pages)
2. Review workflow logs in Actions tab
3. Open issue in repository
4. Contact GitHub Support for Pages-specific issues

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Enable Pages | Settings > Pages > Source: GitHub Actions |
| Manual Deploy | Actions > Deploy GitHub Pages > Run workflow |
| View Site | https://aaj441.github.io/wcag-ai-platform/ |
| Check Status | Actions > Deploy GitHub Pages |
| Update Docs | Edit markdown, commit, push to main |
| Add Custom Domain | Create `docs/CNAME` file |
| View Logs | Actions > Workflow run > Build/Deploy job |

---

**Last Updated**: 2025-11-15
**Status**: Ready for Deployment
