# Target Demographics API Guide

## Overview

The Target Demographics feature enables the WCAG AI Platform to identify, track, and manage potential clients who are most likely to need WCAG compliance services. This feature implements a smart matching system based on industry characteristics, business size, technology adoption patterns, and ADA lawsuit risk.

## Key Features

### 1. **Industry-Based Targeting**
Categorizes businesses by industry with detailed profiles:
- **Risk Characteristics**: ADA lawsuit risk levels (low, medium, high)
- **Tech Adoption**: How technology-oriented the industry is (0.0 to 1.0)
- **Adoption Speed**: How quickly they adopt new technology (slow, medium, fast)
- **Blue Collar Indicator**: Identifies trade/manufacturing industries
- **Typical Financials**: Revenue ranges and employee count profiles

### 2. **Smart Match Scoring**
Automatically calculates a match score (0.0-1.0) for each business based on:
- How well their revenue aligns with ideal target range
- Employee count within typical range
- Industry characteristics match

### 3. **WCAG Violation Tracking**
- Records specific WCAG criteria violations found on target businesses
- Tracks violation severity levels (critical, high, medium, low)
- Maintains violation history for outreach prioritization

### 4. **Outreach Management**
Track the status of each prospect:
- `not_contacted` - New prospect
- `contacted` - Initial outreach made
- `interested` - Prospect showed interest
- `client` - Converted to paying client
- `rejected` - Not a good fit or declined

### 5. **Advanced Search & Filtering**
Find prospects by:
- Industry category
- Location (city, state)
- Outreach status
- Match score range
- WCAG compliance score
- Revenue and employee count ranges

## API Endpoints

### Industries

#### List Industries
```bash
GET /api/target-demographics/industries?location=Pittsburgh&techOrientationMax=0.5&isBlueCollar=true
```

Query Parameters:
- `location`: Filter by location (e.g., "Pittsburgh")
- `riskLevel`: Filter by risk level (low, medium, high)
- `techOrientationMin`: Min tech orientation score (0.0-1.0)
- `techOrientationMax`: Max tech orientation score (0.0-1.0)
- `techAdoptionSpeed`: Filter by adoption speed (slow, medium, fast)
- `isBlueCollar`: Filter for blue-collar industries (true/false)

Response:
```json
{
  "success": true,
  "count": 4,
  "industries": [
    {
      "id": "cid123",
      "name": "Dental Practices",
      "description": "Dental offices and orthodontist practices",
      "adariskLevel": "high",
      "typicalRevenueMin": 1000000,
      "typicalRevenueMax": 5000000,
      "typicalEmployeeMin": 5,
      "typicalEmployeeMax": 20,
      "techOrientationScore": 0.3,
      "techAdoptionSpeed": "slow",
      "isBlueCollar": false,
      "location": "Pittsburgh",
      "_count": { "targetBusinesses": 12 }
    }
  ]
}
```

#### Create Industry
```bash
POST /api/target-demographics/industries
Content-Type: application/json

{
  "name": "Home Inspection Services",
  "description": "Independent home inspectors",
  "adariskLevel": "medium",
  "typicalRevenueMin": 500000,
  "typicalRevenueMax": 2000000,
  "typicalEmployeeMin": 1,
  "typicalEmployeeMax": 10,
  "techOrientationScore": 0.35,
  "techAdoptionSpeed": "slow",
  "isBlueCollar": true,
  "location": "Pittsburgh",
  "notes": "Service providers, need online booking systems"
}
```

### Target Businesses

#### Search Businesses
```bash
GET /api/target-demographics/businesses?industryId=dental123&city=Pittsburgh&outreachStatus=not_contacted&sortBy=matchScore&sortOrder=desc&limit=20
```

Query Parameters:
- `industryId`: Filter by industry ID
- `city`: Filter by city name
- `state`: Filter by state abbreviation
- `outreachStatus`: Filter by outreach status
- `minMatchScore`: Minimum match score (0.0-1.0)
- `maxMatchScore`: Maximum match score (0.0-1.0)
- `hasWcagScore`: Filter by WCAG score availability (true/false)
- `sortBy`: Sort field (matchScore, wcagScore, createdAt, etc.)
- `sortOrder`: asc or desc
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset

Response:
```json
{
  "success": true,
  "count": 3,
  "totalCount": 12,
  "offset": 0,
  "limit": 50,
  "businesses": [
    {
      "id": "bid123",
      "name": "Smile Craft Dental",
      "website": "smilecraftdental.com",
      "industryId": "ind123",
      "location": "Squirrel Hill, Pittsburgh",
      "city": "Pittsburgh",
      "state": "PA",
      "revenue": 2300000,
      "employeeCount": 12,
      "ownerName": "Dr. Sarah Chen",
      "email": "sarah@smilecraft.com",
      "phone": "412-555-0101",
      "wcagScore": 62,
      "wcagViolationCount": 8,
      "matchScore": 0.95,
      "outreachStatus": "not_contacted",
      "outreachAttempts": 0,
      "notes": "Perfect target: Non-responsive site built 2017",
      "industry": { "id": "ind123", "name": "Dental Practices" },
      "violations": [
        {
          "wcagCriteria": "1.4.3",
          "severity": "critical",
          "description": "Insufficient color contrast"
        }
      ]
    }
  ]
}
```

#### Advanced Search
```bash
POST /api/target-demographics/businesses/search
Content-Type: application/json

{
  "industryNames": ["Dental Practices", "Medical Practices"],
  "techOrientationMax": 0.4,
  "techAdoptionSpeed": "slow",
  "isBlueCollar": false,
  "location": "Pittsburgh",
  "minRevenueMatch": 0.7,
  "excludeOutreachStatus": ["client", "rejected"],
  "minWcagScore": null,
  "maxWcagScore": 75,
  "sortBy": "matchScore",
  "limit": 25,
  "offset": 0
}
```

#### Add Business
```bash
POST /api/target-demographics/businesses
Content-Type: application/json

{
  "name": "Advanced Ortho Pittsburgh",
  "website": "advancedortho-pgh.com",
  "industryId": "ind123",
  "location": "Shadyside, Pittsburgh",
  "city": "Pittsburgh",
  "state": "PA",
  "revenue": 2800000,
  "employeeCount": 15,
  "ownerName": "Dr. Michael Rodriguez",
  "email": "contact@advancedortho.com",
  "phone": "412-555-0102",
  "matchScore": 0.92,
  "notes": "Specializes in orthodontics, older patients"
}
```

#### Update Business
```bash
PATCH /api/target-demographics/businesses/bid123
Content-Type: application/json

{
  "outreachStatus": "contacted",
  "outreachAttempts": 1,
  "wcagScore": 62,
  "wcagViolationCount": 8,
  "notes": "Sent initial outreach email, waiting for response"
}
```

#### Get Business Details
```bash
GET /api/target-demographics/businesses/bid123
```

### Violations

#### Add Violations to Business
```bash
POST /api/target-demographics/businesses/bid123/violations
Content-Type: application/json

{
  "wcagCriteria": "1.4.3",
  "severity": "critical",
  "description": "Insufficient color contrast on navigation menu",
  "count": 1
}
```

### Statistics

#### Get Targeting Statistics
```bash
GET /api/target-demographics/statistics
```

Response:
```json
{
  "success": true,
  "statistics": {
    "totalBusinesses": 487,
    "totalIndustries": 9,
    "contactedCount": 23,
    "interestedCount": 7,
    "clientCount": 2,
    "avgMatchScore": 0.78,
    "avgWcagScore": 58.3,
    "businessesByStatus": {
      "not_contacted": 455,
      "contacted": 20,
      "interested": 7,
      "client": 2,
      "rejected": 3
    },
    "topIndustries": [
      {
        "id": "ind123",
        "name": "Dental Practices",
        "businessCount": 87
      },
      {
        "id": "ind124",
        "name": "Medical Practices",
        "businessCount": 64
      }
    ]
  }
}
```

## Usage Examples

### Example 1: Find All Non-Tech Businesses in Pittsburgh

```bash
curl -X GET "http://localhost:3001/api/target-demographics/businesses?city=Pittsburgh&sortBy=matchScore&limit=50" \
  -H "Content-Type: application/json"
```

### Example 2: Search for High-Risk, Low-Tech Businesses

```bash
curl -X POST "http://localhost:3001/api/target-demographics/businesses/search" \
  -H "Content-Type: application/json" \
  -d '{
    "industryNames": ["Dental Practices", "Medical Practices", "Law Firms"],
    "techOrientationMax": 0.4,
    "techAdoptionSpeed": "slow",
    "excludeOutreachStatus": ["client", "rejected"],
    "sortBy": "matchScore",
    "limit": 100
  }'
```

### Example 3: Track Outreach Progress

```bash
# Step 1: Find uncontacted high-quality leads
curl -X GET "http://localhost:3001/api/target-demographics/businesses?outreachStatus=not_contacted&minMatchScore=0.85" \
  -H "Content-Type: application/json"

# Step 2: Update status after contact
curl -X PATCH "http://localhost:3001/api/target-demographics/businesses/bid123" \
  -H "Content-Type: application/json" \
  -d '{
    "outreachStatus": "contacted",
    "outreachAttempts": 1,
    "notes": "Called and left voicemail"
  }'

# Step 3: Track if they show interest
curl -X PATCH "http://localhost:3001/api/target-demographics/businesses/bid123" \
  -H "Content-Type: application/json" \
  -d '{
    "outreachStatus": "interested",
    "notes": "Called back, interested in demo"
  }'
```

### Example 4: Add New Industry and Businesses

```bash
# Create industry
curl -X POST "http://localhost:3001/api/target-demographics/industries" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Physical Therapy Practices",
    "description": "PT clinics and rehabilitation centers",
    "adariskLevel": "high",
    "typicalRevenueMin": 800000,
    "typicalRevenueMax": 3000000,
    "typicalEmployeeMin": 5,
    "typicalEmployeeMax": 20,
    "techOrientationScore": 0.35,
    "techAdoptionSpeed": "slow",
    "isBlueCollar": false,
    "location": "Pittsburgh"
  }'

# Add business to industry
curl -X POST "http://localhost:3001/api/target-demographics/businesses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pittsburgh Physical Therapy Center",
    "website": "pittsburghpt.com",
    "industryId": "ind456",
    "city": "Pittsburgh",
    "state": "PA",
    "revenue": 1500000,
    "employeeCount": 8,
    "ownerName": "Jennifer Brown",
    "email": "jen@pittsburghpt.com"
  }'
```

## Database Schema

### Industry Model
```prisma
model Industry {
  id                    String   @id @default(cuid())
  name                  String   @unique
  description           String?
  adariskLevel          String   // low, medium, high
  typicalRevenueMin     Int
  typicalRevenueMax     Int
  typicalEmployeeMin    Int
  typicalEmployeeMax    Int
  techOrientationScore  Float    // 0.0-1.0
  techAdoptionSpeed     String   // slow, medium, fast
  isBlueCollar          Boolean
  location              String?
  notes                 String?
  createdAt             DateTime
  updatedAt             DateTime
  targetBusinesses      TargetBusiness[]
}
```

### TargetBusiness Model
```prisma
model TargetBusiness {
  id                    String   @id @default(cuid())
  name                  String
  website               String?  @unique
  industryId            String
  industry              Industry
  location              String
  city                  String
  state                 String
  revenue               Int?
  employeeCount         Int?
  ownerName             String?
  email                 String?
  phone                 String?
  wcagScore             Float?
  wcagViolationCount    Int
  matchScore            Float    // 0.0-1.0
  outreachStatus        String   // not_contacted, contacted, interested, client, rejected
  outreachAttempts      Int
  lastOutreachDate      DateTime?
  notes                 String?
  createdAt             DateTime
  updatedAt             DateTime
  violations            TargetBusinessViolation[]
}
```

### TargetBusinessViolation Model
```prisma
model TargetBusinessViolation {
  id                    String   @id @default(cuid())
  businessId            String
  business              TargetBusiness
  wcagCriteria          String
  severity              String
  description           String
  count                 Int
  createdAt             DateTime
  updatedAt             DateTime
}
```

## Setup & Initialization

### 1. Run Database Migrations
```bash
cd packages/api
npm run migrate
```

### 2. Seed Database with Pittsburgh Data
```bash
npm run seed
```

This will populate the database with:
- 9 industry categories (Dental, Medical, Law, Financial, Manufacturing, etc.)
- 12 sample Pittsburgh businesses
- Sample WCAG violations for demo purposes

## Business Rules

### Match Score Calculation
- **Base Score**: 0.5
- **Revenue Match**: +0.25 if within industry's typical range
- **Employee Count Match**: +0.25 if within industry's typical range
- **Maximum Score**: 1.0 (perfect match)

### Outreach Status Workflow
```
not_contacted → contacted → interested → client
         ↓                                    ↓
       rejected ← ← ← ← ← ← ← ← ← ← ← ← ←
```

### WCAG Violation Severity Levels
- **Critical**: Blocks access for many users
- **High**: Significantly impacts accessibility
- **Medium**: Moderately impacts accessibility
- **Low**: Minor accessibility issues

## Integration with Scanning

The Target Demographics system can integrate with your WCAG scanning engine:

1. **Scan Business Website** → Get WCAG violations
2. **Update Business Record**:
   ```bash
   PATCH /api/target-demographics/businesses/bid123
   {
     "wcagScore": 62,
     "wcagViolationCount": 8
   }
   ```
3. **Add Individual Violations**:
   ```bash
   POST /api/target-demographics/businesses/bid123/violations
   {
     "wcagCriteria": "1.4.3",
     "severity": "critical",
     "description": "Insufficient color contrast"
   }
   ```

## Best Practices

### 1. **Start with High-Match Businesses**
Focus outreach on businesses with matchScore > 0.85 first

### 2. **Prioritize by Risk Level**
Target high-risk industries (medical, legal) before medium-risk

### 3. **Track Outreach Metrics**
Monitor conversion rates by industry to refine targeting

### 4. **Leverage Local Information**
Use location filters to target clusters of similar businesses

### 5. **Document Reasons for Rejection**
When marking a business as "rejected", add notes explaining why

## Performance Tips

- Use pagination (limit/offset) for large result sets
- Index by matchScore and outreachStatus for faster queries
- Archive rejected/client records periodically
- Use POST search endpoint for complex multi-filter queries

## Future Enhancements

- ML-based match score refinement
- Automated WCAG scanning integration
- Email outreach campaign automation
- Conversion rate tracking by industry
- Territory/sales rep assignment
- Deal pipeline management
- Automated lead enrichment
