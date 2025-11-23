# Sales Demo Workflow

## Overview

This workflow allows you to scan any website, find WCAG violations, and generate a stunning before/after demo for your sales pitch - all automatically!

## Quick Start

### 1. Manual Demo (Static Example)

Open the pre-built demo with intentional violations:

```bash
# Just open this file in your browser:
open packages/webapp/compliance-demo.html

# Or if you're running the webapp:
# Visit: http://localhost:3000/compliance-demo.html
```

**Use this for:** Generic demos, screenshots, pitch decks

---

### 2. Automated Demo (Scan Any URL)

Scan a real website and generate a custom demo showing their actual violations:

```bash
# Start the API server
cd packages/api
npm run dev
```

Then make a POST request:

```bash
curl -X POST http://localhost:3001/api/demo/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "wcagLevel": "AA",
    "customBranding": {
      "primaryColor": "#4CAF50",
      "companyName": "Your Company Name"
    }
  }' > client-demo.html

# Open the generated demo
open client-demo.html
```

**Use this for:** Prospect-specific demos, custom pitches, proof of concept

---

## Complete Sales Workflow

Here's your end-to-end process:

### Step 1: Scan Prospect's Site

```bash
curl -X POST http://localhost:3001/api/demo/generate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://prospect-website.com",
    "wcagLevel": "AA"
  }' > prospect-demo.html
```

### Step 2: Review the Demo

```bash
open prospect-demo.html
```

You'll see:
- ✅ Violation count in red badge
- ✅ All violations highlighted with red borders
- ✅ WCAG criteria labels on each issue
- ✅ Compliance score (before: X%, after: Y%)

### Step 3: Take Screenshots

1. **BEFORE Screenshot:**
   - Demo loads in "before" state
   - Red violations visible
   - Capture full page

2. **AFTER Screenshot:**
   - Click "Show Fixed Version →"
   - Green checkmarks appear
   - Violations are fixed
   - Capture full page

### Step 4: Use in Sales Pitch

```
SLIDE 1: "Here's what we found on your website"
→ Show BEFORE screenshot with violations highlighted

SLIDE 2: "Here's how we'll fix it"
→ Show AFTER screenshot with fixes applied

SLIDE 3: "Results"
→ X violations found
→ X violations fixed
→ +XX% compliance improvement
→ Estimated cost savings: $XX,XXX (avoid lawsuits)
```

---

## API Endpoints

### `POST /api/demo/generate`

Generate a full HTML demo from a URL.

**Request:**
```json
{
  "url": "https://example.com",
  "wcagLevel": "AA",
  "customBranding": {
    "primaryColor": "#4CAF50",
    "companyName": "Your Company"
  }
}
```

**Response:** HTML file (text/html)

---

### `POST /api/demo/generate-json`

Get the raw scan data as JSON (for custom frontends).

**Request:**
```json
{
  "url": "https://example.com",
  "wcagLevel": "AA"
}
```

**Response:**
```json
{
  "success": true,
  "transformation": {
    "id": "trans_123",
    "url": "https://example.com",
    "violations": [
      {
        "wcagCriteria": "1.1.1",
        "severity": "critical",
        "description": "Image missing alt text",
        "elementSelector": "img.logo",
        "fixed": true
      }
    ],
    "complianceScore": {
      "before": 45,
      "after": 92,
      "improvement": 47
    }
  }
}
```

---

### `GET /api/demo/example`

Returns the static example demo.

---

## Customization Options

### Custom Branding

Make the demo match your brand:

```json
{
  "customBranding": {
    "primaryColor": "#FF5722",     // Your brand color
    "companyName": "Acme Corp",    // Your company name
    "logo": "https://..."          // Your logo URL (optional)
  }
}
```

### WCAG Levels

Choose compliance level:

- `"A"` - Minimum compliance
- `"AA"` - Standard compliance ⭐ **Recommended**
- `"AAA"` - Maximum compliance

---

## Sales Pitch Template

### Opening

"I ran an automated accessibility scan on your website and found **[X violations]** that could expose you to ADA lawsuits."

### The Problem

"Let me show you what I found..."
→ Show demo in "BEFORE" state
→ Toggle through violations
→ Emphasize critical issues

### The Solution

"Here's what it looks like after our fixes..."
→ Click "Show Fixed Version"
→ Show green checkmarks
→ Highlight compliance score improvement

### The Close

**Financial Impact:**
- Each violation: $5,000-$20,000 in legal fees
- Total risk exposure: $[X],XXX
- Our fix: $[Y],XXX (one-time)
- Savings: $[Z],XXX + avoid ongoing legal risk

**Timeline:**
- Scan completed: ✅ Today
- Fixes implemented: ⏱ 2-3 weeks
- Full compliance: ✅ 30 days

**Next Steps:**
1. Review this demo
2. Sign proposal
3. We start fixes immediately

---

## Integration with Existing Workflow

This demo workflow fits into your platform like this:

```
┌─────────────────────────────────────────────────┐
│  1. LEAD GENERATION                             │
│     - Scan prospect's site                      │
│     - Generate demo (NEW!)                      │
│     - Send demo link                            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  2. SALES PITCH                                 │
│     - Present demo                              │
│     - Show before/after                         │
│     - Close deal                                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│  3. DELIVERY                                    │
│     - Use existing transformation service       │
│     - Deploy fixed site                         │
│     - Generate VPAT report                      │
└─────────────────────────────────────────────────┘
```

---

## Tips for Better Demos

### 1. Use Real Sites

Generic demos are good, but scanning the prospect's **actual site** is 10x more powerful.

### 2. Focus on Critical Issues

Filter to show only critical/high severity violations for maximum impact.

### 3. Emphasize Financial Risk

Translate violations to dollar amounts:
- 10 violations × $10K average = $100K risk exposure

### 4. Show the Improvement Score

"We'll take you from 45% compliant to 92% compliant in 30 days"

### 5. Make It Interactive

Send them the HTML file so they can toggle it themselves - much more engaging than static screenshots.

---

## Troubleshooting

### Demo won't generate

**Error:** "Failed to scan and transform site"

**Fix:** Check that the target URL is publicly accessible and doesn't block scrapers.

### Violations not showing

**Error:** No violations found on a clearly non-compliant site

**Fix:** Increase WCAG level from "A" to "AA" or "AAA" for stricter scanning.

### Can't customize branding

**Issue:** Custom colors not appearing

**Fix:** Ensure `customBranding` object is included in the request body.

---

## Next Steps

1. **Try the static demo:** Open `packages/webapp/compliance-demo.html`
2. **Test the API:** Generate a demo from a real URL
3. **Customize it:** Add your branding
4. **Use it in a pitch:** Screenshot and present to a prospect
5. **Automate it:** Integrate into your sales workflow

**Ready to close more deals?** Start scanning! 🚀
