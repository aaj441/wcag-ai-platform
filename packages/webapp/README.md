# Consultant Approval Dashboard

A React TypeScript dashboard for reviewing and approving email drafts about WCAG violations that will be sent to consultants.

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
