# WCAG AI Platform API

Production-ready REST API for the WCAG AI Platform Consultant Approval Dashboard.

## 🏗️ Architecture

Built with:
- **Express** - Fast, unopinionated web framework
- **TypeScript** - Type-safe development
- **CORS** - Cross-origin resource sharing
- **In-memory store** - Fast development (migrate to PostgreSQL/MongoDB for production)

## 📚 API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "WCAG AI Platform API is running",
  "timestamp": "2025-11-11T10:57:11.384Z",
  "environment": "development"
}
```

### Email Drafts

#### Get All Drafts

```http
GET /api/drafts?status=pending_review&search=techcorp
```

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `pending_review`, `approved`, `sent`, `rejected`)
- `search` (optional): Full-text search across recipient, subject, company, body

**Response:**
```json
{
  "success": true,
  "data": [...],
  "message": "Retrieved 2 draft(s)"
}
```

#### Get Draft by ID

```http
GET /api/drafts/:id
```

#### Create Draft

```http
POST /api/drafts
Content-Type: application/json

{
  "recipient": "test@example.com",
  "recipientName": "John Doe",
  "company": "Example Corp",
  "subject": "WCAG Issues Found",
  "body": "Email body...",
  "violations": [...],
  "tags": ["high-priority"],
  "notes": "Internal notes"
}
```

#### Update Draft

```http
PUT /api/drafts/:id
Content-Type: application/json

{
  "subject": "Updated subject",
  "body": "Updated body"
}
```

#### Approve Draft

```http
PATCH /api/drafts/:id/approve
Content-Type: application/json

{
  "approvedBy": "admin@wcag-ai.com"
}
```

#### Reject Draft

```http
PATCH /api/drafts/:id/reject
```

#### Mark as Sent

```http
PATCH /api/drafts/:id/send
```

**Note:** Only `approved` drafts can be marked as sent.

#### Delete Draft

```http
DELETE /api/drafts/:id
```

### Violations

#### Get All Violations

```http
GET /api/violations?severity=critical&wcagLevel=AA
```

**Query Parameters:**
- `severity` (optional): Filter by severity
- `wcagLevel` (optional): Filter by WCAG level

#### Get Violation Statistics

```http
GET /api/violations/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "bySeverity": {
      "critical": 1,
      "high": 1,
      "medium": 1,
      "low": 0
    },
    "byLevel": {
      "A": 2,
      "AA": 1,
      "AAA": 0
    }
  }
}
```

## 🚀 Development

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Server will start with hot-reload on `http://localhost:3001`

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## 🧪 Testing API Endpoints

### Using curl

```bash
# Health check
curl http://localhost:3001/health

# Get all drafts
curl http://localhost:3001/api/drafts

# Get draft by ID
curl http://localhost:3001/api/drafts/draft1

# Create draft
curl -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "subject": "Test Subject",
    "body": "Test body",
    "violations": []
  }'

# Approve draft
curl -X PATCH http://localhost:3001/api/drafts/draft1/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "admin@wcag.com"}'

# Get violation stats
curl http://localhost:3001/api/violations/stats
```

## 📦 Data Structure

### EmailDraft

```typescript
interface EmailDraft {
  id: string;
  recipient: string;
  recipientName?: string;
  company?: string;
  subject: string;
  body: string;
  violations: Violation[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'pending_review' | 'approved' | 'sent' | 'rejected';
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  tags?: string[];
}
```

### Violation

```typescript
interface Violation {
  id: string;
  url: string;
  pageTitle: string;
  element: string;
  wcagCriteria: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  technicalDetails?: string;
  screenshot?: string;
  codeSnippet?: string;
  affectedUsers?: string;
  priority: number;
}
```

## 🔒 Security

- CORS configured for production domains
- Input validation on all POST/PUT/PATCH endpoints
- Error messages sanitized in production
- No secrets in codebase (use environment variables)

## 🚢 Railway Deployment

API is Railway-ready:

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Environment Variables**: Set in Railway dashboard
   - `PORT` (automatically provided by Railway)
   - `NODE_ENV=production`
   - `CORS_ORIGIN=https://your-frontend-domain.com`

The server listens on `0.0.0.0` and uses the `PORT` environment variable.

## 📈 Status

- ✅ All endpoints tested and working
- ✅ TypeScript compilation successful
- ✅ CORS configured
- ✅ Error handling implemented
- ✅ Railway deployment ready

## 🔗 Integration with Frontend

Frontend connects via the `apiService`:

```typescript
import { apiService } from './services/api';

// Get all drafts
const drafts = await apiService.getAllDrafts();

// Approve draft
const approved = await apiService.approveDraft('draft1');
```

Set `VITE_API_URL` in frontend `.env`:

```
VITE_API_URL=http://localhost:3001/api
```

## 📝 Next Steps

- [ ] Add database integration (PostgreSQL/MongoDB)
- [ ] Implement authentication (JWT)
- [ ] Add rate limiting
- [ ] Add request validation middleware
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add unit tests (Jest)
- [ ] Add integration tests
- [ ] Add logging (Winston/Pino)
- [ ] Add monitoring (Sentry)
