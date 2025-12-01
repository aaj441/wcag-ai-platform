# InfinitySoul - WCAG Compliance Intelligence Platform

> Enterprise-grade WCAG compliance scanning and accessibility management platform powered by AI

## Overview

InfinitySoul is a comprehensive WCAG 2.2 compliance platform that combines automated accessibility testing with AI-powered analysis. Built for compliance teams who need accuracy at scale, it provides:

- **AI-Powered Analysis**: Google Gemini AI integration for violation explanations and remediation suggestions
- **Confidence Scoring**: Multi-factor confidence metrics for result reliability
- **Enterprise Ready**: Multi-tenant architecture with queue-based processing
- **Comprehensive Reports**: Executive summaries, detailed violation analysis, and export options

## Project Structure

```
infinitysoul-platform/
├── packages/
│   └── scanner/              # Core WCAG scanning engine
│       ├── src/
│       │   ├── types.ts      # TypeScript type definitions
│       │   ├── utils.ts      # URL handling & scoring utilities
│       │   ├── confidence.ts # Confidence scoring engine
│       │   ├── analyzer.ts   # Gemini AI integration
│       │   ├── queue.ts      # BullMQ job queue
│       │   └── index.ts      # Main exports
│       └── package.json
│
├── apps/
│   └── web/                  # Next.js 14 frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── hero.tsx
│       │   └── scan-form.tsx
│       └── package.json
│
├── package.json              # Root workspace config
└── pnpm-workspace.yaml       # PNPM workspace definition
```

## Technology Stack

### Backend
- **TypeScript**: Type-safe development
- **Puppeteer**: Headless browser automation
- **Axe-core**: Industry-standard accessibility testing
- **Google Gemini AI**: Violation analysis and recommendations
- **BullMQ + Redis**: Queue-based scan processing
- **Prisma**: Database ORM (PostgreSQL)

### Frontend
- **Next.js 14**: App Router architecture
- **React 18**: Modern React with Server Components
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: End-to-end type safety

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Redis (for queue management)
- PostgreSQL (for data persistence)
- Google Gemini API key

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env and add:
# - GEMINI_API_KEY
# - REDIS_URL
# - DATABASE_URL
```

### Development

```bash
# Run InfinitySoul frontend in development mode
pnpm dev:infinitysoul

# Or run all packages
pnpm dev

# Build scanner package
pnpm build:scanner

# Build web frontend
pnpm build:web

# Build everything
pnpm build:infinitysoul

# Type checking
pnpm type-check
```

### Building for Production

```bash
# Build all InfinitySoul packages
pnpm build:infinitysoul

# Or build individually
pnpm build:scanner
pnpm build:web
```

## Package: @infinitysoul/scanner

The core scanning engine that performs WCAG compliance analysis.

**Key Features:**
- Automated axe-core scanning
- AI-powered violation enrichment
- Confidence scoring (elementVisibility, dynamicContent, browserCompatibility, sampleSize)
- Queue-based processing with BullMQ
- Compliance score calculation
- Executive summary generation

**Usage:**

```typescript
import { WCAGAnalyzer, ConfidenceScorer, addScanToQueue } from '@infinitysoul/scanner'

// Add scan to queue
await addScanToQueue({
  url: 'https://example.com',
  wcagLevel: 'AA',
  scanType: 'FULL',
  tenantId: 'tenant-123'
})

// Analyze with AI
const analyzer = new WCAGAnalyzer(process.env.GEMINI_API_KEY)
const enriched = await analyzer.enrichViolation(violation)
```

## App: infinitysoul-web

Next.js 14 frontend providing the user interface for scan submission and results viewing.

**Key Components:**
- `Hero`: Landing page hero section with value proposition
- `ScanForm`: URL submission with validation and error handling
- Feature cards showcasing platform capabilities

**API Routes (to be implemented):**
- `POST /api/scans`: Submit new scan request
- `GET /api/scans/:id`: Get scan results
- `GET /api/scans`: List user scans

## Target Industries

InfinitySoul is purpose-built for three high-compliance verticals:

1. **Fintech**: Payment processors, digital banks, trading platforms
   - Stripe, Square, PayPal, Robinhood, Coinbase, Chime
   - Deal size: $20K-$50K+

2. **Healthcare**: Patient portals, telemedicine, EHR systems
   - Kaiser Permanente, Cleveland Clinic, Teladoc, Epic Systems
   - Deal size: $30K-$75K+

3. **Debt Collection**: Collection agencies, recovery services
   - Portfolio Recovery Associates, Midland Credit, LVNV Funding
   - Deal size: $15K-$30K+

See `deployment/industry-target-lists.md` for detailed target lists and outreach strategies.

## Deployment

The platform is designed for deployment on Vercel with:
- Next.js frontend on Vercel Edge Network
- API routes as serverless functions
- Redis on Upstash or Railway
- PostgreSQL on Neon or Supabase

### Environment Variables

```env
# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Queue Management
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/infinitysoul

# App Config
NEXT_PUBLIC_APP_URL=https://infinitysoul.com

# Optional: Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

## Development Roadmap

### Phase 1: Core Platform (Current)
- [x] Scanner package with AI integration
- [x] Next.js frontend with scan submission
- [x] Confidence scoring engine
- [x] BullMQ queue management
- [ ] Backend API implementation
- [ ] Scan results storage

### Phase 2: Enterprise Features
- [ ] Multi-tenant architecture
- [ ] User authentication & authorization
- [ ] Dashboard with scan history
- [ ] PDF/JSON export functionality
- [ ] Industry benchmarking

### Phase 3: Go-to-Market
- [ ] CRM for target industries
- [ ] Email automation & outreach
- [ ] Lead tracking & management
- [ ] Revenue analytics

## Contributing

This is a private enterprise platform. For questions or support, contact the development team.

## License

MIT License - Copyright (c) 2024 Aaron Johnson

---

Built with ❤️ for accessibility compliance at scale
