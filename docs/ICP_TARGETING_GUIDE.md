# ICP-Based Geographic Lead Targeting Guide

## Overview

This guide explains how to use the WCAG AI Platform's GIS-style Ideal Customer Profile (ICP) targeting engine to identify and reach the best SMB prospects across 50 major US metropolitan areas.

The system combines:
- **50 Metropolitan Areas** with demographic & tech adoption data
- **20 Industries** (healthcare, legal, finance, manufacturing, services, etc.)
- **1000 ICP Profiles** (industry-metro combinations defining ideal targets)
- **3 Decision Maker Personas** (Owner, Operations Manager, Marketing/IT)
- **1000+ Sample Businesses** with contact information and WCAG scores

---

## The Three Decision Makers You Need to Reach

### 1. **Owner/C-Suite Executive** 👔
**Authority:** Sole decision-maker
**Role:** DMD, Managing Partner, CEO, Owner
**Influence Level:** 5/5
**Motivation:** Risk mitigation, revenue growth, reputation

**Pain Points:**
- ADA compliance liability
- Online booking/revenue generation
- Outdated technology
- Staff turnover and competition

**Buying Trigger:** Lawsuit threat, competitor action, staff complaint

**Best Approach:** Phone call or in-person meeting (Business hours)
**Message Frame:** "Protect from ADA lawsuits AND increase online revenue"

---

### 2. **Operations/Practice Manager** 📋
**Authority:** Key influencer, recommends to owner
**Role:** Practice Manager, Office Manager, Operations Director
**Influence Level:** 4/5
**Motivation:** Operational efficiency, reduce manual work, happy customers

**Pain Points:**
- Website issues affecting daily operations
- Online booking problems
- Customer/patient complaints
- Manual scheduling inefficiency

**Buying Trigger:** Recurring customer complaint, staff efficiency opportunity

**Best Approach:** Email with case studies and ROI calculation
**Message Frame:** "Reduce manual work, increase online bookings, improve customer satisfaction"

---

### 3. **Marketing/IT Manager** 💻
**Authority:** Implementer/recommender
**Role:** Marketing Director, IT Manager, Digital Lead
**Influence Level:** 3/5
**Motivation:** Lead generation, online visibility, modern tech

**Pain Points:**
- Poor website performance
- Low SEO rankings
- Accessibility audit failures
- Outdated technology

**Buying Trigger:** Accessibility audit results, competitor website comparison

**Best Approach:** LinkedIn connection + technical documentation
**Message Frame:** "Modernize your digital presence, improve SEO, achieve accessibility compliance"

---

## Metropolitan Areas (50)

The system includes data for all major US metros:

### **Top 10 by Market Size:**
1. **New York Metro** (code: NYC) - 20.1M pop, 450k SMBs, Tech: 0.75
2. **Los Angeles Metro** (code: LA) - 13.2M pop, 420k SMBs, Tech: 0.78
3. **Chicago Metro** (code: CHI) - 9.7M pop, 310k SMBs, Tech: 0.70
4. **Dallas-Ft Worth** (code: DFW) - 7.6M pop, 245k SMBs, Tech: 0.72
5. **Houston Metro** (code: HOU) - 7.1M pop, 228k SMBs, Tech: 0.68
6. **Philadelphia Metro** (code: PHI) - 6.2M pop, 200k SMBs, Tech: 0.68
7. **Washington DC Metro** (code: DC) - 6.4M pop, 205k SMBs, Tech: 0.80
8. **Miami Metro** (code: MIA) - 6.1M pop, 195k SMBs, Tech: 0.70
9. **Atlanta Metro** (code: ATL) - 6.0M pop, 193k SMBs, Tech: 0.74
10. **Phoenix Metro** (code: PHX) - 4.9M pop, 158k SMBs, Tech: 0.69

### **Tech Adoption Tiers:**
- **High Tech (0.75+):** San Francisco (0.92), DC (0.80), Seattle (0.88), Boston (0.82)
- **Medium Tech (0.65-0.74):** Most major metros
- **Lower Tech (0.60-0.64):** Rural/smaller metros, manufacturing-heavy regions

---

## Industries (20)

### **High-Risk Industries** (ADA lawsuit risk = HIGH)
Best for compliance-focused messaging. Often have older websites and eager to protect against litigation.

- Dental Practices
- Medical Practices
- Law Firms
- Physical Therapy
- Healthcare Administration

### **Medium-Risk Industries** (ADA lawsuit risk = MEDIUM)
Good balance of risk awareness and revenue potential. Often have older websites but budgets for updates.

- Financial Services & Wealth Management
- Real Estate Agencies
- Accounting & CPA Firms
- Restaurants
- Hotels
- Retail
- Manufacturing
- Engineering Consulting
- Construction
- Insurance Agencies

### **Lower-Risk Industries** (ADA lawsuit risk = LOW)
Smaller budgets but high volume. Good for scaling outreach.

- HVAC Services
- Auto Repair
- Plumbing
- Electrical Services
- Fitness Centers
- Hair Salons
- Veterinary Clinics

---

## API Endpoints

### 1. Find Prospects by ICP Profile

```bash
GET /api/icp-targeting/search-by-icp?icpProfileId=abc123&minMatchScore=0.7&limit=50
```

**Response:**
```json
{
  "success": true,
  "icp": {
    "name": "Dental Practices - Pittsburgh Metro",
    "industry": "Dental Practices",
    "metro": "Pittsburgh Metro",
    "estimatedTAM": 450,
    "estimatedSOM": 90
  },
  "businesses": [
    {
      "id": "biz123",
      "name": "Smile Dental - Pittsburgh #1",
      "website": "smile-dental-pit-1.com",
      "location": "Pittsburgh Metro",
      "revenue": 2300000,
      "employees": 12,
      "wcagScore": 45,
      "icpMatchScore": 0.92,
      "outreachStatus": "not_contacted"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. Geographic Cluster Analysis

Find best opportunities across multiple metros and industries:

```bash
POST /api/icp-targeting/geographic-cluster
Content-Type: application/json

{
  "industryIds": ["ind_dental", "ind_medical", "ind_law"],
  "metroIds": ["pit", "philly", "chi"],
  "minTechMaturity": 0.2,
  "maxTechMaturity": 0.6,
  "minTAM": 100
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalICPs": 9,
    "totalTAM": 4500,
    "totalSOM": 900,
    "totalProspects": 1250
  },
  "icpProfiles": [
    {
      "id": "icp123",
      "name": "Dental Practices - Pittsburgh Metro",
      "industry": "Dental Practices",
      "metro": "Pittsburgh Metro",
      "tam": 450,
      "som": 90,
      "closingRate": 0.18,
      "topProspects": [...]
    }
  ]
}
```

### 3. Find Specific Decision Makers

```bash
POST /api/icp-targeting/find-contacts
Content-Type: application/json

{
  "decisionMakerRole": "owner",
  "industryIds": ["ind_dental", "ind_medical"],
  "metroIds": ["pit", "philly"],
  "outreachStatus": "not_contacted",
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "decisionMaker": {
    "title": "Owner/C-Suite Executive",
    "role": "owner",
    "influenceLevel": 5,
    "painPoints": [
      "ADA compliance liability",
      "Online booking generation",
      "Outdated technology"
    ],
    "motivations": [
      "Avoid lawsuits",
      "Increase revenue",
      "Look modern"
    ],
    "preferredChannel": "phone"
  },
  "contacts": [
    {
      "id": "contact123",
      "name": "Dr. Sarah Chen",
      "email": "sarah@smile-dental.com",
      "phone": "412-555-0101",
      "linkedIn": "linkedin.com/in/sarah-chen",
      "business": {
        "name": "Smile Dental - Pittsburgh #1",
        "industry": "Dental Practices",
        "metro": "Pittsburgh Metro",
        "wcagScore": 45
      },
      "outreachStatus": "not_contacted",
      "engagementLevel": 0.0
    }
  ],
  "count": 45
}
```

### 4. Market Opportunity Analysis

```bash
GET /api/icp-targeting/market-analysis?industryId=ind_dental&metroId=pit
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "totalICPs": 1,
    "totalTAM": 450,
    "totalSOM": 90,
    "totalProspects": 135,
    "averageClosingRate": "0.18",
    "averageSalesCycle": "45",
    "byIndustry": {
      "Dental Practices": {
        "tam": 450,
        "som": 90,
        "prospects": 135,
        "count": 1
      }
    },
    "byMetro": {
      "Pittsburgh Metro": {
        "tam": 450,
        "som": 90,
        "prospects": 135,
        "count": 1
      }
    }
  }
}
```

### 5. Opportunity Scoring (Revenue Potential)

Rank all opportunities by estimated annual revenue:

```bash
GET /api/icp-targeting/opportunity-score?limit=20
```

**Response:**
```json
{
  "success": true,
  "opportunities": [
    {
      "id": "icp123",
      "name": "Dental Practices - New York Metro",
      "industry": "Dental Practices",
      "metro": "New York Metro",
      "tam": 3600,
      "som": 720,
      "prospects": 2160,
      "closingRate": 0.18,
      "opportunityScore": 648,
      "yearlySalesOpportunity": 1440000
    },
    {
      "id": "icp124",
      "name": "Medical Practices - New York Metro",
      "industry": "Medical Practices",
      "metro": "New York Metro",
      "tam": 2800,
      "som": 560,
      "prospects": 1680,
      "closingRate": 0.20,
      "opportunityScore": 560,
      "yearlySalesOpportunity": 1120000
    }
  ]
}
```

---

## Example Outreach Workflows

### **Workflow 1: Medical Practice Owner in High-Risk Metro**

```bash
# 1. Find dental practices in Pittsburgh
curl -X POST "http://localhost:3001/api/icp-targeting/find-contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "decisionMakerRole": "owner",
    "industryIds": ["dental_practices"],
    "metroIds": ["pit"],
    "outreachStatus": "not_contacted",
    "limit": 50
  }'

# 2. Get list of practice owners
# Output: 45 practice owners in Pittsburgh area

# 3. Build email campaign targeting specific pain points
# Subject: "ADA Compliance Alert for [Practice Name]"
# Body: Emphasize lawsuit risk + online booking revenue
# Call-to-action: Schedule free 15-minute audit

# 4. After email, follow up with phone calls
# Best time: Tuesday-Thursday 10am-11am
# Talking points: Lawsuit risk, online bookings, competitive positioning

# 5. Update contact status after reaching out
curl -X PATCH "http://localhost:3001/api/target-demographics/businesses/biz123" \
  -H "Content-Type: application/json" \
  -d '{
    "outreachStatus": "contacted",
    "outreachAttempts": 1,
    "lastOutreachDate": "2024-01-15T10:30:00Z"
  }'
```

### **Workflow 2: Geographic Expansion Analysis**

```bash
# 1. Find best markets for dental practices
curl -X POST "http://localhost:3001/api/icp-targeting/opportunity-score" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50
  }'

# 2. Filter for dental-related opportunities
# Results show top metros by annual sales potential

# 3. Focus on metros with:
#    - Large TAM (300+)
#    - Low tech adoption (easier sales)
#    - Lots of prospects (100+)

# Example: Denver has 250 dental prospects, 0.77 tech (easier than SF)
# Annual potential: $500k+ from dental alone
```

### **Workflow 3: Persona-Based Campaign**

```bash
# 1. Create email campaign for Operations Managers
curl -X GET "http://localhost:3001/api/icp-targeting/decision-makers?role=operations"

# 2. Find all operations managers in manufacturing (high pain point)
curl -X POST "http://localhost:3001/api/icp-targeting/find-contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "decisionMakerRole": "operations",
    "industryIds": ["manufacturing"],
    "outreachStatus": "not_contacted",
    "limit": 200
  }'

# 3. Build campaign around their pain points:
#    - Efficiency gains (time saved on bookings)
#    - Cost reduction (fewer support tickets)
#    - Compliance (avoid federal contractor penalties)

# 4. Use email channel (preferred for ops managers)
# Best time: Tuesday-Thursday 2pm-3pm
```

---

## Database Seeding

### Run the Comprehensive Seed Script

```bash
cd packages/api
npm run seed-icp
```

This creates:
- 50 metropolitan areas
- 1000 ICP profiles
- 1000+ sample businesses
- 3000+ contact people
- Complete outreach tracking setup

### Seed Data Structure

```
50 Metros
  ├── 20 Industries each
  │   ├── 1 ICP Profile (industry-metro combo)
  │   │   ├── TAM/SOM estimates
  │   │   ├── Common pain points
  │   │   └── Key motivations
  │   └── 3-5 Sample Businesses
  │       ├── Company details (revenue, employees)
  │       ├── WCAG score & violations
  │       └── 2-3 Contact People
  │           ├── Owner/C-Suite
  │           ├── Operations Manager
  │           └── Marketing/IT Manager
```

---

## Sample ICP Profiles

### **Profile 1: Dental Practices - Pittsburgh Metro**
- **TAM:** 450 estimated practices
- **SOM:** 90 realistic targets
- **Prospects in DB:** 135
- **Tech Maturity:** 0.30 (very low, easier sales)
- **Closing Rate:** 18%
- **Sales Cycle:** 45 days
- **Annual Spend:** $2,000-$3,000 per client
- **Revenue Potential:** $180,000-$270,000 annually from this ICP alone

### **Profile 2: Financial Services - San Francisco Metro**
- **TAM:** 1,200 estimated firms
- **SOM:** 240 realistic targets
- **Prospects in DB:** 360
- **Tech Maturity:** 0.75 (higher, harder sales)
- **Closing Rate:** 12% (lower because they're more tech-savvy)
- **Sales Cycle:** 60 days (longer decision-making)
- **Annual Spend:** $3,000-$5,000 per client
- **Revenue Potential:** $864,000-$1,440,000 annually

---

## Filtering Rules of Thumb

### **Best Prospects Match:**
- Tech maturity 0.20-0.50 (not too tech-savvy, but not luddites)
- High ADA risk industry
- TAM > 200 (enough businesses to make outreach worthwhile)
- Website quality < 0.55 (clear pain point)

### **Avoid:**
- Silicon Valley tech companies (0.90+ tech adoption, won't need compliance help)
- Industries with very small TAM (< 50)
- Prospects already contacted 5+ times

---

## Integration with Scanning Engine

### Auto-Populate WCAG Scores

```bash
# After scanning a prospect's website:
curl -X PATCH "http://localhost:3001/api/target-demographics/businesses/biz123" \
  -H "Content-Type: application/json" \
  -d '{
    "wcagScore": 42,
    "wcagViolationCount": 15,
    "lastScanned": "2024-01-15T10:30:00Z"
  }'

# Add violations
curl -X POST "http://localhost:3001/api/target-demographics/businesses/biz123/violations" \
  -H "Content-Type: application/json" \
  -d '{
    "wcagCriteria": "1.4.3",
    "severity": "critical",
    "description": "Insufficient color contrast",
    "count": 1
  }'
```

---

## KPIs to Track

1. **Outreach Efficiency**
   - Outreach attempts per contact
   - Time to convert from contact to client
   - Response rate by persona

2. **Market Opportunity**
   - Total TAM across all markets
   - SOM (Serviceable Obtainable Market)
   - Revenue potential by industry/metro

3. **Sales Performance**
   - Closing rate by ICP
   - Average sales cycle
   - Revenue per client by metro

4. **Geographic Expansion**
   - Which metros are performing best
   - Which metros have highest growth potential
   - Which industries are easiest to sell in each metro

---

## Next Steps

1. **Run the seed script** to populate database with 50 metros and 1000+ prospects
2. **Analyze opportunity scores** to identify highest-potential markets
3. **Build outreach list** by decision maker persona
4. **Create email campaigns** tailored to each persona's pain points
5. **Track results** and refine targeting based on response rates

---

## API Quick Reference

| Endpoint | Purpose | Best For |
|----------|---------|----------|
| `/search-by-icp` | Find prospects by industry-metro combo | Focused outreach |
| `/geographic-cluster` | Multi-metro analysis | Market expansion |
| `/find-contacts` | Get contact people by persona | Email/phone campaigns |
| `/decision-makers` | Learn persona characteristics | Message crafting |
| `/market-analysis` | TAM/SOM breakdown | Forecasting |
| `/opportunity-score` | Rank markets by revenue | Strategic planning |
