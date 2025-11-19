# WCAG AI Laboratory - Architecture Overview

## System Design Philosophy

### Feature-Based Architecture

This laboratory uses **feature-based organization** over traditional file-type grouping:

```
backend/src/
├── features/           # (Future: when adding more features)
│   ├── scanner/
│   ├── discovery/
│   └── reporting/
├── routes/            # API endpoints
├── middleware/       # Security, validation
├── instrumentation/  # Observability
└── config.ts        # Type-safe configuration
```

**Benefits:**
- Self-contained modules with clear boundaries
- Independent testing and deployment
- Parallel development without conflicts
- Easy to understand and maintain

### Technology Stack

**Backend:**
- Express 4.x - Battle-tested, minimal overhead
- TypeScript 5.3+ - Type safety with ES2022 features
- Pino - Structured JSON logging (12x faster than Winston)
- Zod - Runtime type validation
- OpenTelemetry - Distributed tracing

**Infrastructure:**
- Docker - Containerization with multi-stage builds
- Railway - Cloud deployment (or any PaaS)
- Redis - Caching and session storage
- PostgreSQL - Relational data (future)

### Design Patterns

#### 1. Discriminated Unions for API Responses

```typescript
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: number };

// Self-documenting, type-safe error handling
function handleResponse<T>(response: ApiResponse<T>) {
  if (response.success) {
    return response.data; // TypeScript knows this is safe
  } else {
    throw new ApiError(response.error, response.code);
  }
}
```

#### 2. Centralized Configuration

All environment variables validated on startup with Zod:

```typescript
// config.ts validates at boot
const config = configSchema.parse(process.env);

// Type-safe access throughout app
app.listen(config.port); // number, guaranteed
```

#### 3. Middleware Pipeline

Security layers applied in strict order:

```
Request
  ↓
1. Helmet (Security headers)
  ↓
2. CORS (Origin validation)
  ↓
3. Body parsing (Size limits)
  ↓
4. Logging (Request tracking)
  ↓
5. Sanitization (XSS prevention)
  ↓
6. Rate limiting (Abuse prevention)
  ↓
7. Routes (Business logic)
  ↓
8. Error handling (Safe error responses)
  ↓
Response
```

## Request Flow

### Example: Discovery API Call

```
1. Client: POST /api/discovery/search
   Body: { keywords: ["hospital"], location: "Boston", limit: 10 }

2. Middleware chain:
   - Helmet: Add security headers
   - CORS: Validate origin
   - Body parser: Parse JSON
   - Pino: Log request ID
   - Sanitization: Clean inputs
   - Rate limiter: Check IP quota

3. Route handler (discovery.ts):
   - Zod validation: Ensure data shape
   - Business logic: Call discoverWebsites()
   - Response formatting: Wrap in ApiResponse

4. OpenTelemetry (if enabled):
   - Create span for request
   - Track external API calls
   - Record timing and errors

5. Response: JSON with 200/400/500 status
   Success: { success: true, data: {...} }
   Error: { success: false, error: "...", code: 400 }
```

## Security Architecture

### Defense in Depth

**Layer 1: Network**
- Railway/Cloud firewall
- DDoS protection at edge
- TLS 1.3 for all traffic

**Layer 2: Application**
- Helmet security headers (CSP, HSTS, XSS)
- CORS with explicit origin whitelist
- Rate limiting (100 req/15min per IP)
- Input sanitization (XSS, injection)

**Layer 3: Data**
- No sensitive data stored (stateless)
- Redis for ephemeral cache only
- Secrets in environment variables

**Layer 4: Monitoring**
- Structured logging (JSON)
- Error tracking (Sentry ready)
- Distributed tracing (OpenTelemetry)

### Threat Model

| Threat | Mitigation |
|--------|------------|
| **XSS** | Input sanitization, CSP headers |
| **SQL Injection** | No SQL (future: Prisma with parameterized queries) |
| **CSRF** | Same-Origin policy, CORS validation |
| **DDoS** | Rate limiting, cloud-level protection |
| **Secrets Exposure** | Environment variables, no hardcoded keys |
| **Man-in-the-Middle** | TLS 1.3, HSTS headers |

## Performance Considerations

### Caching Strategy

```
Client Request
  ↓
1. Check Redis cache (if enabled)
   │
   ├─ Hit: Return cached response (< 10ms)
   │
   └─ Miss: Continue to handler
       ↓
2. Process request
   ↓
3. Store in Redis (TTL: 1 hour)
   ↓
4. Return to client
```

### Scaling Patterns

**Horizontal Scaling:**
- Stateless design allows multiple instances
- Railway auto-scaling based on CPU/memory
- Redis shared across instances

**Vertical Scaling:**
- Node.js cluster mode (future)
- Worker threads for CPU-heavy tasks

**Database Scaling:**
- Read replicas for queries
- Write master for mutations
- Connection pooling (PgBouncer)

## Observability

### Logging Levels

```typescript
logger.fatal() // System crash, immediate attention
logger.error() // Request failed, needs investigation
logger.warn()  // Degraded state, monitor closely
logger.info()  // Normal operation, audit trail
logger.debug() // Development debugging
logger.trace() // Verbose, performance tracing
```

### Structured Log Format

```json
{
  "level": "info",
  "time": 1732045200000,
  "pid": 12345,
  "hostname": "app-1",
  "reqId": "abc123",
  "msg": "Discovery search initiated",
  "keywords": ["hospital"],
  "location": "Boston",
  "limit": 10
}
```

### Tracing (OpenTelemetry)

When enabled, traces show complete request flow:

```
GET /api/discovery/search [500ms]
  ├─ validateInput [2ms]
  ├─ discoverWebsites [480ms]
  │  ├─ serpApiCall [450ms]
  │  └─ processResults [30ms]
  └─ calculateTAM [18ms]
```

## Deployment Architecture

### Railway Deployment

```
┌─────────────────────────────┐
│     Railway Platform        │
└────────────┬────────────────┘
             │
    ┌────────┼────────┐
    │               │
┌───┴───┐      ┌───┴────┐
│  App   │      │ Redis  │
│Service│      │Service │
└───────┘      └────────┘
```

**Health Checks:**
- `/health` - Liveness probe
- `/health/ready` - Readiness with dependency checks
- Automatic restart on 3 failed checks

**Deployment Strategy:**
1. Build Docker image
2. Push to Railway
3. Health check passes
4. Route traffic to new instance
5. Graceful shutdown of old instance

### Future: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wcag-lab-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: api
        image: wcag-lab:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Error Handling Philosophy

### Never Leak Implementation Details

```typescript
// ✅ Production
res.status(500).json({
  success: false,
  error: 'Internal server error'
});

// ❌ Development only
res.status(500).json({
  success: false,
  error: err.message,
  stack: err.stack // NEVER in production
});
```

### Error Categories

1. **Client Errors (4xx)**
   - 400: Bad Request (validation failed)
   - 404: Not Found (route/resource)
   - 429: Too Many Requests (rate limit)

2. **Server Errors (5xx)**
   - 500: Internal Server Error (catch-all)
   - 503: Service Unavailable (dependency down)

## Testing Strategy

### Testing Pyramid (Future)

```
         /\
        /E2E\      10% - Critical user paths
       /______\
      /        \
     /Integration\  20% - API workflows
    /____________\
   /              \
  /  Unit Tests   \  70% - Pure functions, utils
 /__________________\
```

### Example Test Structure

```typescript
// __tests__/routes/discovery.test.ts
describe('Discovery API', () => {
  describe('POST /api/discovery/search', () => {
    it('returns discovered websites', async () => {
      const response = await request(app)
        .post('/api/discovery/search')
        .send({ keywords: ['test'], location: 'Boston', limit: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.websites).toHaveLength(5);
    });

    it('validates keywords are required', async () => {
      const response = await request(app)
        .post('/api/discovery/search')
        .send({ location: 'Boston' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

## Future Enhancements

### Phase 2: Database Integration

- Add Prisma ORM for PostgreSQL
- Store scan history and user data
- Implement caching strategy

### Phase 3: Authentication

- JWT-based auth
- API key management
- Rate limiting per user

### Phase 4: Queue System

- BullMQ for background jobs
- Asynchronous scan processing
- Job status tracking

### Phase 5: Advanced Observability

- Grafana dashboards
- Prometheus metrics
- Custom alerting rules

---

**This architecture prioritizes production readiness, security, and scalability from day one.**
