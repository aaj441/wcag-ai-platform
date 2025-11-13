# ICP Targeting System - Setup & Installation Guide

## Overview

The WCAG AI Platform now includes a comprehensive GIS-style Ideal Customer Profile (ICP) targeting engine that enables data-driven lead generation and outreach across 50 major US metropolitan areas, 20 industries, and multiple decision-maker personas.

## Architecture

The system consists of:

1. **Database Schema** - Prisma models for ICPs, geographic areas, industries, and contact persons
2. **Seed Data** - 50 metros, 1000 ICP profiles, 1000+ sample businesses, 3000+ contact people
3. **API Endpoints** - 6 specialized endpoints for searching, filtering, and analyzing opportunities
4. **Documentation** - Complete guide with example workflows and API reference

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ database (development or cloud-hosted)
- Git for version control

## Installation Steps

### 1. Set Up Database Connection

Create a PostgreSQL database and get your connection string:

```bash
# Example PostgreSQL connection strings
# Local: postgresql://user:password@localhost:5432/wcag_ai_platform
# Railway: postgresql://user:password@railway-host:5432/wcag_ai_platform
# Supabase: postgresql://user:password@db.xxx.supabase.co:5432/postgres
```

Update the `.env` file in `packages/api/`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/wcag_ai_platform"
```

### 2. Install Dependencies

```bash
cd packages/api
npm install
```

### 3. Run Prisma Migrations

Create the database tables based on the schema:

```bash
npm run migrate
```

This will:
- Run any pending migrations
- Create all tables (MetropolitanArea, Industry, IdealCustomerProfile, etc.)
- Set up indexes for performance

### 4. Populate with Seed Data

Run the ICP targeting seed script to populate the database:

```bash
npm run seed-icp
```

This command will:
- Create 50 metropolitan areas with demographic data
- Create 20 industries categorized by ADA risk level
- Generate 1000 ICP profiles (20 industries × 50 metros)
- Create 1000+ sample businesses with realistic data
- Create 3000+ contact persons linked to decision maker personas
- Populate all relationships and match scores

**Expected Output:**
```
🌱 Starting ICP targeting seed script...

📍 Creating 50 metropolitan areas...
✓ Created 50 metros with tech adoption indices

🏢 Creating 20 industries...
✓ Created 20 industries (5 high-risk, 10 medium-risk, 5 low-risk)

🎯 Creating 1000 ICP profiles...
✓ Created 1000 ICP profiles (50 metros × 20 industries)

👥 Creating 3 decision maker personas...
✓ Owner/C-Suite Executive
✓ Operations/Practice Manager
✓ Marketing/IT Manager

📊 Creating 1000+ sample businesses...
✓ Generated businesses across all metros and industries
✓ Created contact persons for each business

✨ Seed complete! Database ready for use.
```

## Running the API

### Development Server

```bash
npm run dev
```

Server starts on `http://localhost:3001` with hot-reload enabled.

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

All endpoints are under `/api/icp-targeting/`:

### 1. Search by ICP Profile

```bash
GET /api/icp-targeting/search-by-icp?icpProfileId=<id>&minMatchScore=0.7&limit=50
```

Find businesses matching a specific industry-metro combination.

### 2. Geographic Cluster Analysis

```bash
POST /api/icp-targeting/geographic-cluster
{
  "industryIds": ["ind_dental", "ind_medical"],
  "metroIds": ["pit", "philly"],
  "minTechMaturity": 0.2,
  "maxTechMaturity": 0.6,
  "minTAM": 100
}
```

Analyze opportunities across multiple metros and industries.

### 3. Find Contacts by Decision Maker

```bash
POST /api/icp-targeting/find-contacts
{
  "decisionMakerRole": "owner",
  "industryIds": ["ind_dental"],
  "metroIds": ["pit"],
  "outreachStatus": "not_contacted",
  "limit": 50
}
```

Get contact people by persona type.

### 4. Get Decision Makers

```bash
GET /api/icp-targeting/decision-makers?role=owner
```

List decision maker personas with their pain points and motivations.

### 5. Market Analysis

```bash
GET /api/icp-targeting/market-analysis?industryId=<id>&metroId=<id>
```

Get TAM/SOM and opportunity analysis.

### 6. Opportunity Scoring

```bash
GET /api/icp-targeting/opportunity-score?limit=50
```

Rank all opportunities by estimated annual revenue potential.

## Example Workflow

### Find High-Value Dental Practice Opportunities in Pittsburgh

```bash
# 1. Get decision maker info
curl -X GET "http://localhost:3001/api/icp-targeting/decision-makers?role=owner"

# 2. Find practice owners in Pittsburgh
curl -X POST "http://localhost:3001/api/icp-targeting/find-contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "decisionMakerRole": "owner",
    "industryIds": ["dental_practices"],
    "metroIds": ["pit"],
    "outreachStatus": "not_contacted",
    "limit": 50
  }'

# 3. Expected response: 45 dental practice owners in Pittsburgh area
# with contact info, business details, and WCAG scores
```

## Database Schema

### Key Models

**MetropolitanArea**
- 50 major US metros with population, income, business density
- Tech adoption index (0-1 scale)
- Average website quality

**IdealCustomerProfile (ICP)**
- Unique combination of industry × metropolitan area
- TAM (Total Addressable Market)
- SOM (Serviceable Obtainable Market)
- Common pain points and key motivations
- Closing rate and sales cycle estimates

**Industry**
- 20 industries categorized by ADA risk
- Tech orientation score
- Typical revenue and employee ranges

**TargetBusiness**
- 1000+ sample businesses
- WCAG scores and violation counts
- Match score against ICP profile
- Outreach status tracking

**ContactPerson**
- 3000+ individuals at target businesses
- Linked to decision maker personas
- Outreach attempt tracking
- Engagement level metrics

**DecisionMaker**
- 3 buyer personas (Owner, Operations, Marketing)
- Pain points and motivations specific to each role
- Preferred outreach channel and best time to reach

## Customization

### Adding New Data

To add more industries, metros, or businesses:

1. Modify `packages/api/prisma/seed-icp.ts`
2. Update the arrays: `industriesData`, `metropsData`, `sampleBusinessesData`
3. Run `npm run seed-icp` again

### Adjusting ICP Parameters

Modify ICP calculations in the seed script:
- TAM (Total Addressable Market) estimates
- SOM (Serviceable Obtainable Market) percentages
- Closing rates by industry/metro
- Sales cycle estimates

## Performance Optimization

The system includes database indexes on:
- `Industry.adariskLevel` - Filter by risk level
- `MetropolitanArea.techAdoptionIndex` - Filter by tech maturity
- `IdealCustomerProfile.estimatedTAM` - Filter by market size
- `TargetBusiness.outreachStatus` - Filter by outreach tracking
- `ContactPerson.outreachStatus` - Track contact attempts

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `npm install` in `packages/api/`

### "Error: connect ECONNREFUSED - PostgreSQL not running"
Ensure PostgreSQL is running and DATABASE_URL is correct

### Seed script fails with "Unique constraint failed"
Run `npm run seed-icp` again to clear and repopulate (destructive)

### API returns empty results
Check that migrations have run: `npm run migrate`

## Next Steps

1. **Integrate with Frontend** - Build dashboard to visualize ICPs
2. **Outreach Automation** - Create email campaign builder
3. **Lead Scoring** - Implement ML-based opportunity scoring
4. **CRM Integration** - Connect with HubSpot, Salesforce
5. **Analytics** - Track response rates by persona and metro
6. **A/B Testing** - Test different messaging and outreach channels

## Resources

- **API Guide**: See `docs/ICP_TARGETING_GUIDE.md`
- **Database Schema**: See `packages/api/prisma/schema.prisma`
- **Seed Script**: See `packages/api/prisma/seed-icp.ts`
- **Routes**: See `packages/api/src/routes/icpTargeting.ts`

## Support

For questions or issues with the ICP targeting system, check:
1. The comprehensive API guide in `docs/ICP_TARGETING_GUIDE.md`
2. Example workflows in this setup guide
3. TypeScript types in `packages/api/src/routes/icpTargeting.ts`
