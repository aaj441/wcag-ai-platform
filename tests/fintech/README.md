# 🚀 WCAG AI Platform: Fintech Vertical – Full Workflow Test

Welcome! This guide will walk you through testing the **complete agentic workflow for fintech companies**:  
**Keyword-based prospect discovery → Automated scanning → Outreach/reporting**  
All steps are ready to run on Replit.

---

## 🛠 1. Prerequisites

- Your project includes these files:
    - `config.js`
    - `keywordDiscoveryAgent.js`
    - `scanScheduler.js`
    - `emailer.js`
    - `dashboard.js` (optional)
    - `package.json`
- The following secrets are set in your Replit environment:
    - `BING_API_KEY` (for Bing prospect discovery)
    - `FELLOU_TOKEN` (for Fellou-based scanning)
    - `RESEND_API_KEY` (for email outreach)
- **Dependencies installed:**  
    ```bash
    npm install axios @replit/database resend
    ```

---

## ⚙️ 2. Test the Full Fintech Workflow

### **Step 1: Run Keyword-Based Prospect Discovery**

```bash
node tests/fintech/test-discover-fintech.js
```

**What it does:**  
Fetches and stores fresh fintech company URLs in your database (`prospects:finance`).

**Expected output:**
```
✅ Fintech prospects discovered: [
  'https://stripe.com',
  'https://robinhood.com',
  'https://coinbase.com',
  ...
]
```

---

### **Step 2: Run Automated Accessibility Scans**

```bash
node tests/fintech/test-scan-fintech.js
```

**What it does:**  
Performs WCAG audits on all discovered fintech URLs and stores results.

**Expected output:**
```
✅ Fintech WCAG scan complete.
Scanned 10 prospects, found 47 violations.
```

---

### **Step 3: Generate Reports & Send Outreach Emails**

```bash
node tests/fintech/test-outreach-fintech.js
```

**What it does:**  
Sends a report email to each prospect (requires valid contact info).

**Expected output:**
```
✅ Fintech outreach emails sent.
Sent 5 emails to prospects.
```

---

### **Step 4 (Optional): View Prospects and Results in Dashboard**

If you have a dashboard or API:
```bash
curl https://your-repl-url/dashboard/finance
```
_Or visit `/dashboard/finance` in your browser to see results._

---

## 🧑‍💻 One-Click: Full Automated Workflow

You can automate everything in a single script for the finance vertical:

```bash
node tests/fintech/test-full-fintech-workflow.js
```

**What it does:**
1. Discovers fintech prospects
2. Scans prospects for WCAG compliance
3. Sends outreach emails

**Expected output:**
```
🔍 Discovering fintech prospects...
✅ Discovered 10 prospects
🕵️‍♂️ Scanning prospects for WCAG compliance...
✅ Scanned 10 URLs, found 47 violations
📧 Sending outreach emails...
✅ Sent 5 emails
🎉 Full fintech workflow complete!
```

---

## 📝 **Results Checklist**

After running these steps, you should have:
- ✅ New fintech companies in your DB (`prospects:finance`)
- ✅ WCAG scan results stored per company
- ✅ Outreach emails sent to valid contacts
- ✅ (Optional) Dashboard updated with latest info

---

## 🛡️ **Troubleshooting**

- **No prospects found?** Check your Bing API key and that keywords are set in `config.js`.
- **Scans failing?** Verify your Fellou token and internet connection.
- **Emails not sent?** Ensure RESEND_API_KEY is valid and prospect emails are present.
- **Dashboard empty?** Make sure all previous steps succeeded.

---

## 🔗 **Customization Tips**

- Edit `config.js` to add/change fintech keywords.
- Adjust domain filtering logic in `keywordDiscoveryAgent.js` for best-fit prospects.
- Extend scanning and outreach logic as needed for your workflow.

---

## 🎯 Test Coverage

### Individual Test Scripts

| Script | Purpose | Expected Result |
|--------|---------|----------------|
| `test-discover-fintech.js` | Discover fintech prospects via keyword search | 10+ prospect URLs stored |
| `test-scan-fintech.js` | Scan all prospects for WCAG violations | Scan results for all URLs |
| `test-outreach-fintech.js` | Send compliance emails to prospects | Emails sent with reports |
| `test-full-fintech-workflow.js` | Complete end-to-end workflow | Full pipeline execution |

### Configuration Files

| File | Purpose |
|------|--------|
| `config.js` | API keys and fintech keywords |
| `keywordDiscoveryAgent.js` | Bing search integration |
| `scanScheduler.js` | WCAG scanning logic |
| `emailer.js` | Email outreach service |

---

## 📊 Expected Data Flow

```
┌─────────────────────────────────────┐
│  1. Keyword Discovery               │
│  (Bing API Search)                  │
│  Keywords: "fintech", "payment"     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Prospect Storage                │
│  Database: prospects:finance        │
│  URLs: stripe.com, coinbase.com...  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. WCAG Scanning                   │
│  (Fellou/Axe-core)                  │
│  Violations per URL stored          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. Report Generation               │
│  PDF/HTML reports created           │
│  Compliance scores calculated       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  5. Email Outreach                  │
│  (Resend API)                       │
│  Personalized reports sent          │
└─────────────────────────────────────┘
```

---

## 🚀 Production Deployment

### Replit Deployment

1. Set environment variables in Replit Secrets:
   ```
   BING_API_KEY=your_key_here
   FELLOU_TOKEN=your_token_here
   RESEND_API_KEY=your_key_here
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm run test:fintech
   ```

### Railway/Vercel Deployment

Add the same environment variables to your hosting platform and deploy.

---

**You now have a reproducible, agentic workflow for WCAG fintech prospecting!**  
If you want a copy-paste ready set of scripts or further dashboard integration, just ask.

---

∴ ∵ ∴
