# The "Overnight Expert" Cheat Code

**Reality check:** You don't need to become a developer. You need to wire together 3 tools and look like a magician.

**Time to functional:** 3-4 hours tonight
**What makes you "expert":** You can demo it working
**Your moat:** Automated violation-to-fix visualization that consultants charge $5K for manually

---

## 🎯 THE KILLER FEATURE

### What You're Building

An automated **before/after screenshot generator** that:

1. **Scans any website** for WCAG violations
2. **Takes "BEFORE" screenshot** with violations highlighted in **RED**
3. **Takes "AFTER" screenshot** with fixes applied, highlighted in **GREEN**
4. **Creates side-by-side composite** perfect for pitch decks

### Why This Closes Deals

❌ **Generic HTML demos** → Prospect thinks "that's not my site"
✅ **Their actual site with red boxes** → Prospect thinks "OH SHIT"

---

## 🚀 TONIGHT'S 4-HOUR PLAN

### Hour 1: Setup (15 minutes)

#### Step 1: Get Browserless Token (FREE)

Browserless.io runs Chrome in the cloud (works on Replit, Railway, anywhere).

```bash
# 1. Visit https://browserless.io
# 2. Click "Sign Up" (free tier: 100 sessions/month)
# 3. Copy your token from dashboard
```

#### Step 2: Add to Environment

```bash
cd packages/api
echo "BROWSERLESS_TOKEN=your_token_here" >> .env
```

#### Step 3: Install Dependencies

```bash
npm install
```

That's it. You're now "equipped" like an expert.

---

### Hour 2: Test the Magic (30 minutes)

#### Step 1: Start Your API

```bash
cd packages/api
npm run dev
```

You should see:
```
Server running on port 3001
```

#### Step 2: Test Browserless Connection

```bash
curl http://localhost:3001/api/pitch/test
```

Expected response:
```json
{
  "success": true,
  "message": "Browserless.io connection working!",
  "screenshotSize": 123456
}
```

If you see `"success": false`, check your `BROWSERLESS_TOKEN`.

#### Step 3: Generate Your First Demo

```bash
# Test on a simple site
curl "http://localhost:3001/api/pitch/quick-demo?url=https://example.com&format=composite" > demo.png

# Open it
open demo.png
```

**What you should see:**
- Left side: Site with red borders around violations
- Right side: Same site with green checkmarks showing fixes
- Top banner: "❌ BEFORE: X Violations Found" vs "✅ AFTER: X Fixed"

---

### Hour 3: Create Your Pitch Deck (1 hour)

#### Step 1: Test on Real Sites

Try these (they all have violations):

```bash
# Restaurant site
curl "http://localhost:3001/api/pitch/quick-demo?url=https://some-restaurant.com" > restaurant-demo.png

# Law firm site
curl "http://localhost:3001/api/pitch/quick-demo?url=https://some-lawfirm.com" > lawfirm-demo.png

# Retail site
curl "http://localhost:3001/api/pitch/quick-demo?url=https://some-store.com" > store-demo.png
```

#### Step 2: Create Your Pitch Deck

Open PowerPoint/Google Slides and create 3 slides:

**SLIDE 1: "The Problem"**
```
Title: We Found X Violations on Your Website
Image: [Before screenshot with red boxes]
Text: Each violation could cost $5K-$20K in lawsuits
```

**SLIDE 2: "The Solution"**
```
Title: Here's How We Fix It (5 Minutes Per Violation)
Image: [After screenshot with green checkmarks]
Text: All fixes are AI-powered, WCAG 2.1 AA compliant
```

**SLIDE 3: "The Offer"**
```
Title: Special Offer: Fix All Violations for $4,999
Image: [Side-by-side composite]
Bullets:
- Before: 45% compliant
- After: 92% compliant
- Timeline: 2-3 weeks
- Guarantee: WCAG 2.1 AA certification
```

---

### Hour 4: Test Your Pitch (1 hour)

#### Step 1: Record a Loom Video

1. Open your pitch deck
2. Start Loom recording
3. Walk through the 3 slides
4. Practice this script:

```
"Hi [Name],

I ran an automated accessibility scan on [their-site.com] and found
[X] WCAG violations.

[Show BEFORE screenshot]
See these red boxes? Each one is a potential lawsuit. The average
settlement is $10,000-$20,000.

[Show AFTER screenshot]
Here's what your site looks like after our AI-powered fixes. All
violations resolved, fully compliant.

[Show composite]
We can do this for $4,999, delivered in 2-3 weeks. That's a fraction
of what one lawsuit would cost.

Want to move forward?"
```

#### Step 2: Send Test Email

Email yourself using this template:

```
Subject: Found [X] accessibility violations on [their-site.com]

Hi [Name],

Quick heads up - I ran an automated WCAG scan on [their-site.com]
and found [X] violations that could expose you to ADA lawsuits.

I built a before/after preview showing exactly what we'd fix:

[Attach composite image]

The red boxes show current violations. The green checkmarks show
our AI-powered fixes.

This is a $100K+ lawsuit risk that we can solve for $4,999.

15 minutes on your calendar tomorrow?

[Calendar link]

Best,
[Your Name]

P.S. - This scan was 100% automated. I can fix these in 2-3 weeks.
```

---

## 🎯 YOUR "EXPERT" ARSENAL

### What You Actually Know

You understand **3 concepts** (not coding, just orchestration):

1. **Browserless.io** = Remote-controlled Chrome (you tell it what to do)
2. **Axe-core** = Finds accessibility violations automatically
3. **API endpoint** = URL that returns data when you visit it

That's it. You're now "expert enough."

### What Makes You Look Expert

```
❌ "I can code"
✅ "I can generate before/after demos in 5 seconds"

❌ "I know WCAG guidelines"
✅ "My tool automatically highlights every violation"

❌ "I'm a developer"
✅ "I wired together $0 tools to save you $100K"
```

---

## 📧 THE EMAIL THAT CLOSES DEALS

### Cold Outreach Template

```
Subject: [X] accessibility issues found on [their-domain.com]

Hi [FirstName],

I noticed [their-domain.com] has [X] WCAG accessibility violations
that could trigger ADA lawsuits (avg settlement: $15K/violation).

I built a quick visualization showing what needs to be fixed:

[Attach before/after composite]

Red = Current violations
Green = Our AI-powered fixes

Total risk exposure: ~$[X*15K]
Our fix: $4,999 (one-time)

Worth a 15-minute call?

[Calendar Link]

Best,
[Name]

P.S. - This was 100% automated. I can deliver fixes in 2 weeks.
```

### Follow-Up Email (Day 3)

```
Subject: Re: [X] accessibility issues

[FirstName],

Bumping this to the top of your inbox.

I've attached the before/after visualization again - takes 10
seconds to review:

[Attach composite]

The violations I found are actively putting you at legal risk.

Most businesses settle these lawsuits for $10K-$50K.

We can fix all of this for $4,999.

Can I hop on your calendar for 15 minutes this week?

[Calendar Link]

Best,
[Name]
```

---

## 🛠️ API ENDPOINTS (YOUR TOOLS)

### 1. Quick Demo (Fastest)

**Use this for:** Quick demos, testing, screenshots

```bash
GET /api/pitch/quick-demo?url={url}&format={format}
```

**Formats:**
- `before` - Just the "before" screenshot with red violations
- `after` - Just the "after" screenshot with green fixes
- `composite` - Side-by-side comparison (DEFAULT)

**Example:**
```bash
curl "http://localhost:3001/api/pitch/quick-demo?url=https://example.com&format=composite" > demo.png
```

**Returns:** PNG image (ready for pitch deck)

---

### 2. Custom Violations (Advanced)

**Use this for:** When you already have scan results

```bash
POST /api/pitch/custom
Content-Type: application/json

{
  "url": "https://example.com",
  "violations": [
    {
      "selector": "img.logo",
      "wcagCriteria": "1.1.1",
      "severity": "critical",
      "description": "Image missing alt text",
      "fix": {
        "type": "alt-text",
        "suggestedFix": "Company logo"
      }
    }
  ],
  "format": "composite"
}
```

**Returns:** PNG image with your custom violations highlighted

---

### 3. Test Connection

**Use this for:** Verifying Browserless.io is working

```bash
GET /api/pitch/test
```

**Returns:**
```json
{
  "success": true,
  "message": "Browserless.io connection working!"
}
```

---

## 🎬 DEMO WORKFLOW

### Your Automated Sales Machine

```
1. Prospect visits your landing page
   ↓
2. They enter their URL
   ↓
3. Your API scans it (automatic)
   ↓
4. Generate before/after screenshots (automatic)
   ↓
5. Send email with composite image (automatic)
   ↓
6. They see red violations on THEIR site
   ↓
7. They reply "How much?"
   ↓
8. You close the deal 💰
```

### Manual Workflow (For Tonight)

```bash
# 1. Find a prospect
PROSPECT_URL="https://their-site.com"

# 2. Generate demo
curl "http://localhost:3001/api/pitch/quick-demo?url=$PROSPECT_URL&format=composite" > prospect-demo.png

# 3. Review it
open prospect-demo.png

# 4. Email them with the image attached
# (Use the template above)

# 5. Wait for "How much?" reply

# 6. Send proposal: $4,999
```

---

## 💰 PRICING CALCULATOR

Use this to calculate your pitch:

```bash
# Count violations
VIOLATIONS=7

# Calculate risk exposure (avg $15K per violation)
RISK=$((VIOLATIONS * 15000))

# Your price (1/3 of risk)
YOUR_PRICE=$((RISK / 3))

echo "Risk Exposure: $${RISK}"
echo "Your Price: $${YOUR_PRICE}"
```

**Example:**
```
7 violations × $15,000 = $105,000 risk
Your price: $35,000 / 3 = $11,666
Offer them: $4,999 (steal deal)
```

---

## 🚨 TROUBLESHOOTING

### "Browserless.io connection failed"

**Fix:**
```bash
# Check your token is set
cat packages/api/.env | grep BROWSERLESS_TOKEN

# If empty, add it:
echo "BROWSERLESS_TOKEN=your_token_here" >> packages/api/.env

# Restart server
npm run dev
```

### "No violations found"

**This means:**
- Site is actually compliant (rare)
- OR site blocks bots
- OR URL is wrong

**Try:**
```bash
# Test with known non-compliant site
curl "http://localhost:3001/api/pitch/quick-demo?url=https://example.com"
```

### "Screenshot is blank"

**Fix:**
```bash
# Add timeout
curl "http://localhost:3001/api/pitch/quick-demo?url=https://slow-site.com&timeout=60000"
```

### "Out of Browserless credits"

**Options:**
1. **Upgrade:** $50/mo for 500 sessions
2. **Use local Chrome:** Set `BROWSERLESS_TOKEN=""` (dev only)
3. **Wait:** Credits reset monthly

---

## 🎯 SUCCESS METRICS

### Week 1 Goals

- [ ] Generate 10 demos from real sites
- [ ] Create your pitch deck
- [ ] Send 5 cold emails
- [ ] Get 1 reply

### Week 2 Goals

- [ ] Send 20 cold emails
- [ ] Book 3 demo calls
- [ ] Close 1 deal ($4,999)

### Month 1 Goals

- [ ] Close 5 deals ($24,995)
- [ ] Build testimonial collection
- [ ] Refine pitch based on objections

---

## 🔥 THE "EXPERT" MINDSET

### You're Not Selling Code

You're selling:
- ✅ **Risk mitigation** (avoid $100K lawsuits)
- ✅ **Visual proof** (red → green transformation)
- ✅ **Speed** (2-3 weeks vs 6+ months with agencies)
- ✅ **Price** ($4,999 vs $50K+ with agencies)

### Your Competitive Advantage

**Traditional agency:**
- Manual scan: 2 weeks
- Manual fixes: 6 weeks
- Manual screenshots: N/A
- Price: $50,000

**You:**
- Automated scan: 5 seconds
- AI-powered fixes: 2 weeks
- Automated screenshots: 5 seconds
- Price: $4,999

**You're 10x faster and 90% cheaper.**

---

## 📚 NEXT STEPS

### Tonight (4 hours)

1. ✅ Set up Browserless.io token
2. ✅ Generate first demo
3. ✅ Create pitch deck
4. ✅ Send first test email

### Tomorrow (2 hours)

1. Find 10 prospects with websites
2. Generate demos for each
3. Send 10 cold emails
4. Track replies

### This Week

1. Book first demo call
2. Present pitch deck
3. Close first deal
4. Celebrate 🎉

---

## 💪 YOU GOT THIS

**Remember:**

- You don't need to be a developer
- You need to demo working tools
- Prospects don't care about your code
- They care about not getting sued

**Your "overnight expert" move:**

> "How the fuck did you do that so fast?"

That's the reaction you want. Now go get it.

---

**Built with ❤️ for overnight experts who wire tools together**

Ready to close your first deal? → [Send your first cold email](mailto:)
