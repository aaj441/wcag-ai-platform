# WCAG AI Platform - Web Application

Enterprise-grade React dashboard for WCAG compliance workflow management.

## Features

- 📧 Email Draft Management (Draft → Review → Approved → Sent workflow)
- 🔍 Accessibility Violation Tracking (WCAG 2.1 A/AA/AAA)
- 🎨 Dark-themed UI with Tailwind CSS (PostCSS build pipeline)
- 📊 Real-time Statistics & Filtering
- 🏷️ Keyword extraction and filtering
- ⌨️ Full Keyboard Navigation
- 🔔 Toast Notifications

## Tech Stack

- React 18 (with Hooks)
- TypeScript
- Tailwind CSS v3 (Dark Theme, PostCSS pipeline)
- Vite (Build Tool)

## Quick Start

```bash
npm install
npm run dev   # Opens on http://localhost:3000
```

The dashboard loads with mock data by default. The UI includes:
- Email draft list with search, status filters, and keyword filters
- Draft preview and editing
- Violation cards with WCAG details
- Status workflow actions (approve, reject, mark sent)

## Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Production build to `dist/`
- `npm run preview` - Preview production build
- `npm run lint` - Lint TypeScript files
- `npm run type-check` - Check types without emitting
- `npm start` - Start production server (Railway/Express)

## Configuration

### Tailwind CSS Setup

The project uses Tailwind CSS via a PostCSS build pipeline:
- `tailwind.config.cjs` - Tailwind configuration with content paths
- `postcss.config.cjs` - PostCSS with Tailwind and Autoprefixer
- `src/index.css` - Tailwind directives (`@tailwind base; components; utilities`)

**Note**: The Tailwind CDN script has been removed from `index.html` to avoid duplicate styles. All Tailwind classes are compiled via PostCSS during build.

Optional: Update Browserslist data to suppress warnings:
```bash
npx update-browserslist-db@latest
```

### API Integration

Set the backend API URL via environment variable:

```bash
VITE_API_URL=http://localhost:3001/api npm run dev
```

Or create `.env.local`:

```env
VITE_API_URL=http://localhost:3001/api
```

### Mock Data Mode

By default, the app uses mock data for demonstration. To connect to the real API:

1. Start the backend API server: `cd ../api && npm run dev`
2. Set `VITE_API_URL` to the API endpoint
3. Ensure CORS is configured in the API (`server.ts`)

## Project Structure

```
src/
├── components/       # React components
│   ├── ConsultantApprovalDashboard.tsx  # Main dashboard (597 lines)
│   ├── ViolationCard.tsx                # Violation detail card
│   ├── ViolationReviewCard.tsx          # Review interface
│   ├── KeywordFilter.tsx                # Keyword search input
│   └── KeywordBadge.tsx                 # Keyword badge component
├── services/         # API & Data
│   ├── api.ts        # Backend API client
│   ├── mockData.ts   # Demo data with keywords
│   └── hubspot.ts    # HubSpot integration
├── types/            # TypeScript types
│   └── index.ts      # EmailDraft, Violation, Consultant
├── utils/            # Helpers
│   └── helpers.ts    # Formatting, validation, search
├── config/           # Constants
│   └── constants.ts  # Status workflow, app config
├── index.css         # Tailwind CSS entry (imported in main.tsx)
├── App.tsx           # Root component
└── main.tsx          # Entry point
```

## Key Components

### ConsultantApprovalDashboard

Main workflow component (597 lines):

- Email draft list with filtering (status, search, keywords)
- Preview/edit mode
- Status transitions (approve, reject, mark sent)
- Violation review cards
- Toast notifications

**Usage:**

```tsx
import { ConsultantApprovalDashboard } from './components/ConsultantApprovalDashboard';

function App() {
  return <ConsultantApprovalDashboard />;
}
```

### ViolationCard

Displays individual WCAG violation with severity badge:

```tsx
<ViolationCard 
  violation={violation}
  index={0}
/>
```

### KeywordFilter & KeywordBadge

Keyword filtering UI:

```tsx
<KeywordFilter value={keyword} onChange={setKeyword} />
<KeywordBadge keyword="contrast" />
```

## API Endpoints

If using the live API backend:

- `GET /api/drafts` - List email drafts (filter by status, search, keywords)
- `GET /api/drafts/:id` - Get draft by ID
- `POST /api/drafts` - Create new draft (auto-extracts keywords)
- `PUT /api/drafts/:id` - Update draft
- `PATCH /api/drafts/:id/approve` - Approve draft
- `PATCH /api/drafts/:id/reject` - Reject draft
- `PATCH /api/drafts/:id/send` - Mark as sent
- `DELETE /api/drafts/:id` - Delete draft

- `GET /api/violations` - List violations (filter by severity, wcagLevel)
- `GET /api/violations/stats` - Aggregated statistics

- `GET /api/keywords` - Aggregate keyword counts
- `POST /api/keywords/refresh` - Recompute all keywords

## Deployment

### Production Build

```bash
npm run build
```

Output: `dist/` folder with optimized static assets

### Environment Variables

For production deployment (Vercel, Netlify, etc.):

```env
VITE_API_URL=https://your-api-domain.com/api
HUBSPOT_API_URL=https://api.hubapi.com
HUBSPOT_API_KEY=your-hubspot-key
SENDER_EMAIL=your-email@example.com
```

### Railway Deployment

Railway configuration files:
- `railway.json` - Railway configuration
- `railway.toml` - Alternative configuration format
- `server.js` - Express production server

Railway will automatically:
1. Run `npm install && npm run build`
2. Start the server with `npm start` on `$PORT`

Set these in your Railway dashboard:
- `NODE_ENV=production`
- `VITE_API_URL` (API backend URL)
- `HUBSPOT_API_KEY` (optional for HubSpot integration)
- `SENDER_EMAIL` (optional for email logging)

### Vercel Deployment

1. Connect GitHub repo to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript
- No IE11 support

## Accessibility

Built with WCAG 2.1 AA compliance in mind:

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels where needed
- Color contrast ratios meet AA standards
- Focus indicators on interactive elements

## Dark Theme

All components use Tailwind CSS dark theme classes:
- Backgrounds: `bg-gray-800`, `bg-gray-900`
- Borders: `border-gray-700`
- Text: `text-gray-100`, `text-gray-200`, `text-gray-300`
- Hover states: `hover:border-gray-600`
- Severity badges with proper dark variants

## License

MIT


## Features

### ✅ Fixed Issues

1. **Type Consistency**: All TypeScript types are properly defined
   - `EmailDraft` includes the `recipient` field
   - All interfaces are properly exported from `types/index.ts`

2. **Dark Theme UI**: Complete dark theme implementation
   - `ViolationReviewCard` uses dark theme classes (gray-800, gray-700, etc.)
   - Proper contrast ratios for accessibility
   - Color-coded severity badges with dark variants

3. **HubSpot Integration**: Correct import structure
   - Service properly imports types from `../types`
   - Exports singleton instance for easy use
   - Includes methods for fetching consultants and logging email activity

4. **State Management**: Basic state management for email editing
   - Uses React `useState` hook
   - Separate edit state for subject, body, and recipient
   - Toggle between view and edit modes
   - Save and approve functionality

## Components

### ConsultantApprovalDashboard
Main dashboard component with:
- Email draft list view
- Email preview and editor
- Violation cards display
- Approve/save actions

### ViolationReviewCard
Individual violation display with:
- Severity indicator (critical, high, medium, low)
- WCAG criteria reference
- Element selector
- Description and recommendations
- Screenshot support

## Types

- `Violation`: WCAG violation details
- `EmailDraft`: Email with recipient, subject, body, and violations
- `Consultant`: Consultant information with HubSpot integration
- `DashboardState`: Application state management

## Services

### HubSpotService
- `getConsultant(email)`: Fetch consultant from HubSpot
- `logEmailActivity(draft)`: Log email sends to HubSpot

## Usage

```tsx
import { ConsultantApprovalDashboard } from '@wcag-ai-platform/webapp';

function App() {
  return <ConsultantApprovalDashboard />;
}
```

## Environment Variables

- `HUBSPOT_API_URL`: HubSpot API endpoint (default: https://api.hubapi.com)
- `HUBSPOT_API_KEY`: HubSpot API authentication key
- `SENDER_EMAIL`: Sender email address for logging

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Preview production build locally
npm run preview

# Start production server
npm start
```

## Deployment

### Railway

This application is configured for Railway deployment with the following files:
- `railway.json` - Railway configuration
- `railway.toml` - Alternative configuration format
- `server.js` - Express production server

Railway will automatically:
1. Run `npm install && npm run build`
2. Start the server with `npm start` on `$PORT`

The server listens on `0.0.0.0` and uses the `PORT` environment variable provided by Railway.

### Environment Variables (Production)

Set these in your Railway dashboard:
- `NODE_ENV=production`
- `HUBSPOT_API_URL` (optional, defaults to https://api.hubapi.com)
- `HUBSPOT_API_KEY` (required for HubSpot integration)
- `SENDER_EMAIL` (required for email logging)

## Dark Theme

All components use Tailwind CSS dark theme classes:
- Backgrounds: `bg-gray-800`, `bg-gray-900`
- Borders: `border-gray-700`
- Text: `text-gray-100`, `text-gray-200`, `text-gray-300`
- Hover states: `hover:border-gray-600`
- Severity badges with proper dark variants
