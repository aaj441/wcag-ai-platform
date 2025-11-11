# WCAG AI Platform - AI Agent Instructions

## Project Overview
This is a WCAG (Web Content Accessibility Guidelines) compliance platform focused on email draft management for accessibility consultants. The platform detects accessibility violations and helps consultants send professional remediation emails to clients.

## Architecture & Structure
**Monorepo**: Two main packages with shared TypeScript types
- `packages/api/` - Express REST API (TypeScript, in-memory store)
- `packages/webapp/` - React + Vite frontend (TypeScript, Tailwind CSS)
- `deployment/` - Production deployment scripts and Terraform configs
- `backend/src/services/` - Additional backend services (cost control, worker identity)

**Data Flow**: React Dashboard ↔ Express API ↔ In-memory store (fintechStore.ts for production data)

## Core Domain Models
The platform revolves around these key entities defined in `packages/*/src/types.ts`:
- **EmailDraft**: Email communications with status workflow (`draft → pending_review → approved → sent`)
- **Violation**: WCAG accessibility violations with severity levels (`critical | high | medium | low`)
- **Consultant**: Client contact information with HubSpot integration

## Development Patterns

### Build & Run Commands
```bash
# Frontend (port 3000)
cd packages/webapp && npm run dev

# Backend API (port 3001)  
cd packages/api && npm run dev

# Production build
npm run build  # both packages
```

### API Patterns
- RESTful endpoints in `packages/api/src/routes/`
- Standard pattern: `router.get|post|put|delete('/', handler)`
- All responses use `ApiResponse<T>` wrapper with `success`, `data`, `error` fields
- CORS enabled for frontend at `:3000`

### Frontend Patterns
- **State Management**: React hooks in dashboard component (no Redux)
- **Styling**: Tailwind CSS with dark theme (`bg-gray-800`, `text-gray-100`)
- **Data Fetching**: Custom API service in `src/services/api.ts`
- **Components**: Hierarchical structure with clear separation (`ConsultantApprovalDashboard` → `ViolationCard`)

### Type Safety
- Shared types between frontend/backend via identical `types.ts` files
- Strict TypeScript config with `noEmit` type checking
- Union types for stateful enums (`EmailStatus`, `ViolationSeverity`)

## Critical File Locations

### Configuration
- `packages/webapp/vite.config.ts` - Frontend build config with React chunks
- `packages/api/src/server.ts` - Express server with CORS and middleware
- `deployment/scripts/deploy.sh` - Railway/Terraform production deployment

### Data Layer
- `packages/api/src/data/fintechStore.ts` - Main data operations (CRUD)
- `packages/api/src/data/fintechTestData.ts` - Realistic test dataset
- Mock data pattern: export functions like `getAllDrafts()`, `createDraft()`

### Core Components
- `packages/webapp/src/components/ConsultantApprovalDashboard.tsx` - Main UI (570 lines)
- `packages/api/src/routes/drafts.ts` - Draft CRUD endpoints
- `packages/api/src/services/aiRouter.ts` - AI model routing with LaunchDarkly feature flags

## Production Features
- **Cost Control**: `backend/src/services/costController.js` - Budget monitoring with kill switches
- **Monitoring**: OpenTelemetry instrumentation in API
- **Security**: Helmet, rate limiting, input validation
- **Deployment**: Automated via `wcagaii-production-deploy-v10.json` playbook

## Development Workflows

### Adding New Features
1. Update types in both `packages/*/src/types.ts` files (keep them identical)
2. Add backend route in `packages/api/src/routes/`
3. Update frontend service in `packages/webapp/src/services/api.ts`
4. Implement UI in React components with Tailwind classes

### Testing & Debugging
- Use the in-memory store for quick iteration
- API health check at `/health` endpoint
- Frontend dev server has proxy to API (see vite.config.ts)
- Check `PRODUCTION_READINESS_AUDIT.md` for known issues

### Deployment
- Run `deployment/scripts/deploy.sh` for Railway deployment
- Terraform configs in `deployment/terraform/`
- Production monitoring via cost controller and worker attestation

## Key Conventions
- **Dark Theme**: All UI uses `bg-gray-*` and `text-gray-*` Tailwind classes
- **Error Handling**: Always use `ApiResponse<T>` wrapper for consistency
- **State Updates**: Direct array mutations in React state (no immutability libraries)
- **File Naming**: camelCase for components, kebab-case for API routes
- **TypeScript**: Explicit return types for all exported functions

## Integration Points
- **HubSpot**: `packages/webapp/src/services/hubspot.ts` for consultant data
- **LaunchDarkly**: Feature flags for AI model selection
- **OpenTelemetry**: Distributed tracing in production
- **Railway**: Primary deployment platform (see `railway.json|toml` configs)