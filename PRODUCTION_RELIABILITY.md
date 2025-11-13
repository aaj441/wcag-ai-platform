# 🔧 Production-Grade Reliability Layer for WCAG AI Platform

This document describes the production-grade reliability implementation for handling 50+ audits/month without manual intervention.

## Overview

The reliability layer consists of:

1. **PuppeteerService** - Resource pooling with kill switches and memory management
2. **ScanQueue** - Persistent job queue with Redis and Bull
3. **CircuitBreaker** - API resilience pattern for graceful degradation
4. **HealthCheckService** - Comprehensive monitoring and auto-recovery
5. **SafetyService** - Kill switches, rate limiting, and guardrails
6. **Monitoring Routes** - Real-time metrics and health dashboards

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Node.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Monitoring Routes (/api/monitoring)         │  │
│  │  - Health checks                                      │  │
│  │  - Queue metrics                                      │  │
│  │  - Reliability insights                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            HealthCheckService                         │  │
│  │  - Component monitoring                               │  │
│  │  - Auto-recovery                                      │  │
│  │  - Metrics calculation                                │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓              ↓              ↓                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐    │
│  │ ScanQueue    │  │ Puppeteer    │  │ SafetyService  │    │
│  │ (Bull)       │  │ Service      │  │ (Guardrails)   │    │
│  └──────────────┘  └──────────────┘  └────────────────┘    │
│        ↓                  ↓                                  │
│     Redis           Chromium Browser                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
      PostgreSQL        Health/Queue          Monitoring
```

## Features

### 1. PuppeteerService

**Purpose**: Manage browser instances with automatic resource pooling and recovery

**Key Features**:
- ✅ Resource pooling (max 3 concurrent pages)
- ✅ Automatic browser restart on high memory usage
- ✅ Kill switches for timeout handling
- ✅ Anti-bot headers and user agents
- ✅ Health monitoring every 30 seconds
- ✅ Singleton instance for easy access

**Usage**:
```typescript
import { getPuppeteerService } from './services/orchestration/PuppeteerService';

const puppeteer = getPuppeteerService();
const result = await puppeteer.scanUrl({
  url: 'https://example.com',
  timeout: 30000,
  maxRetries: 2
});
```

**Configuration**:
```
MAX_CONCURRENT_PAGES: 3
BROWSER_LAUNCH_TIMEOUT: 60000ms (60 seconds)
PAGE_IDLE_TIMEOUT: 30000ms (30 seconds)
MEMORY_HEALTH_CHECK_INTERVAL: 30000ms (30 seconds)
```

### 2. ScanQueue

**Purpose**: Persistent job queue for reliable scan execution with automatic retries

**Key Features**:
- ✅ Persistent queue using Redis and Bull
- ✅ Exponential backoff retry logic (2s, 4s, 8s)
- ✅ Priority-based processing (high/low)
- ✅ Failed job tracking and retry capability
- ✅ Bulk scan operations
- ✅ Queue health monitoring
- ✅ Job event handlers and alerts

**Usage**:
```typescript
import { getScanQueue } from './services/orchestration/ScanQueue';

const scanQueue = getScanQueue();

// Add single scan
await scanQueue.addScan({
  prospectId: 'prospect-123',
  url: 'https://example.com',
  clientId: 'client-456',
  priority: 5,
  queue: 'low'
});

// Add bulk scans
await scanQueue.addScansBulk(
  scans,
  { queue: 'high', progressCallback: (i) => console.log(i) }
);

// Get statistics
const stats = await scanQueue.getStats();
// { waiting: 10, active: 2, completed: 150, failed: 3, delayed: 0 }
```

**Job Status Flow**:
```
Queued → Processing (with retries) → Completed/Failed
                                          ↓
                                    Database Storage
```

**Retry Configuration**:
```
DEFAULT_ATTEMPTS: 3
BACKOFF_TYPE: exponential
BACKOFF_DELAY: 2000ms (increases exponentially)
LOCK_DURATION: 120000ms (2 minutes)
```

### 3. CircuitBreaker

**Purpose**: Graceful API degradation when services fail

**Key Features**:
- ✅ CLOSED → OPEN → HALF_OPEN state transitions
- ✅ Configurable failure/success thresholds
- ✅ Auto-recovery with exponential backoff
- ✅ Detailed state tracking

**Configuration**:
```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,      // Consecutive failures to open
  successThreshold: 2,       // Consecutive successes to close
  timeout: 30000,           // Time before attempting recovery
  name: 'api-scan-service'
});
```

### 4. HealthCheckService

**Purpose**: Comprehensive monitoring and auto-recovery

**Key Features**:
- ✅ Multi-component health checks
- ✅ Automatic recovery attempts
- ✅ Success rate calculation
- ✅ Failure reason analysis
- ✅ Reliability insights over time

**Monitored Components**:
- Queue (Redis connection, job counts)
- Puppeteer (browser health, memory usage)
- Database (connection, query performance)

**Usage**:
```typescript
import { getHealthCheckService } from './services/orchestration/HealthCheckService';

const health = getHealthCheckService();

// Get full health report
const report = await health.runHealthCheck();
// { status, components, metrics }

// Get reliability insights
const insights = await health.getReliabilityInsights(7);
// { period, totalScans, successRate, failureReasons }

// Trigger auto-recovery
await health.autoRecover();
```

### 5. SafetyService

**Purpose**: Kill switches, rate limiting, and safety guardrails

**Key Features**:
- ✅ Scan timeout enforcement (120 seconds max)
- ✅ Memory limit checks (800MB threshold)
- ✅ Rate limiting per client (10 scans/hour)
- ✅ URL validation and pattern checking
- ✅ Request validation
- ✅ Safety metrics reporting

**Usage**:
```typescript
import { SafetyService } from './services/orchestration/SafetyService';

// Validate request
const validation = SafetyService.validateScanRequest({
  url: 'https://example.com',
  clientId: 'client-123',
  priority: 5
});

// Check URL safety
const safety = SafetyService.checkUrlSafety('https://example.com');

// Check rate limits
const allowed = await SafetyService.checkRateLimit('client-123');
const status = await SafetyService.getRateLimitStatus('client-123');
// { scansThisHour, limit, remaining, resetTime }

// Get safety metrics
const metrics = SafetyService.getSafetyMetrics();
```

**Safety Limits**:
```
MAX_SCAN_TIME: 120000ms (2 minutes)
MAX_MEMORY: 800MB
MAX_CONCURRENT_SCANS: 3
MAX_SCANS_PER_HOUR: 10 per client
MAX_URL_LENGTH: 2048 characters
```

## Monitoring

### REST API Endpoints

All monitoring endpoints are available at `/api/monitoring`:

#### 1. `/api/monitoring/health`
Complete health report of all components.

**Response**:
```json
{
  "status": "healthy|warning|critical",
  "components": {
    "queue": { "status": "...", "message": "...", "details": {} },
    "puppeteer": { "status": "...", "message": "...", "details": {} },
    "database": { "status": "...", "message": "...", "details": {} }
  },
  "metrics": {
    "successRate": "95.5%",
    "averageScanTime": 15000,
    "memoryUsageMB": 450
  }
}
```

#### 2. `/api/monitoring/queue/health`
Queue-specific health status.

#### 3. `/api/monitoring/queue/stats`
Real-time queue statistics.

**Response**:
```json
{
  "waiting": 10,
  "active": 2,
  "completed": 150,
  "failed": 3,
  "delayed": 0
}
```

#### 4. `/api/monitoring/queue/failed`
List failed jobs with error details.

#### 5. `/api/monitoring/queue/retry/:jobId`
Manually retry a failed job.

#### 6. `/api/monitoring/reliability`
Reliability metrics over N days (default: 7).

**Response**:
```json
{
  "period": "Last 7 days",
  "summary": {
    "totalScans": 150,
    "successfulScans": 142,
    "failedScans": 8,
    "successRate": "94.67%",
    "averageScore": 78.5
  },
  "failureAnalysis": {
    "reasons": { "timeout": 3, "blocked": 2, "memory": 1 },
    "recommendations": { ... }
  }
}
```

#### 7. `/api/monitoring/puppeteer`
Puppeteer-specific metrics and health.

#### 8. `/api/monitoring/safety`
Safety metrics and guardrails status.

#### 9. `/api/monitoring/rate-limit/:clientId`
Rate limit status for a specific client.

#### 10. `/api/monitoring/dashboard`
Unified dashboard combining all metrics.

#### 11. `/api/monitoring/recover` (POST)
Manually trigger auto-recovery process.

## CLI Scripts

### 1. scan-bulk.sh
Bulk scan prospects from a file.

**Usage**:
```bash
./scripts/scan-bulk.sh prospect-ids.txt [high|low] [base-url]

# Examples:
./scripts/scan-bulk.sh prospects.txt low http://localhost:3001
./scripts/scan-bulk.sh prospects.txt high https://api.example.com
```

**Input File Format**:
```
prospect-123
prospect-456
prospect-789
# Comments starting with # are ignored
```

**Output**:
```
[1/100] Processing...
[2/100] Processing...
...
✅ Bulk scan completed!
📊 Total processed: 100
✅ Successful: 98
❌ Failed: 2
```

### 2. monitor-queue.sh
Real-time queue monitoring with auto-refresh.

**Usage**:
```bash
./scripts/monitor-queue.sh [base-url] [refresh-interval]

# Examples:
./scripts/monitor-queue.sh http://localhost:3001 5
./scripts/monitor-queue.sh https://api.example.com 10
```

**Output**:
```
📊 Queue Statistics
Waiting:   10 jobs
Active:    2 jobs
Completed: 150 jobs
Failed:    3 jobs

🏥 Health Status
Status: ✅ Healthy
Message: Queue operational...

[Refreshes every 5 seconds]
```

### 3. health-check.sh
One-time health check with recovery recommendations.

**Usage**:
```bash
./scripts/health-check.sh [base-url]

# Examples:
./scripts/health-check.sh http://localhost:3001
./scripts/health-check.sh https://api.example.com
```

## Docker Deployment

### Dockerfile
Production-ready multi-stage build with:
- Chromium browser support
- System dependencies for Puppeteer
- Non-root user for security
- Health checks
- Memory limits

**Build**:
```bash
docker build -t wcag-api:latest packages/api/
```

### docker-compose.yml
Complete production stack with:
- PostgreSQL database
- Redis cache/queue
- API server
- Optional: Prometheus + Grafana monitoring

**Start**:
```bash
# Create .env file first (see below)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://example.com

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=wcag_prod
DB_USER=wcag_user
DB_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://wcag_user:password@db:5432/wcag_prod

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# AWS S3 (optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=wcagai-screenshots

# Monitoring
SENTRY_DSN=https://key@sentry.io/project

# Feature Flags
LAUNCHDARKLY_SDK_KEY=sdk-key-here
```

## Success Criteria

Your implementation is production-ready when:

- [ ] **Queue Reliability**: Success rate > 90% over 24 hours
- [ ] **No Memory Leaks**: Memory usage stable after 1000+ scans
- [ ] **Failed Job Recovery**: Automatic retry succeeds for transient failures
- [ ] **Load Handling**: Can queue 50+ scans without performance degradation
- [ ] **Monitoring**: All endpoints return data within 1 second
- [ ] **Auto-Recovery**: System recovers from single component failures
- [ ] **Rate Limiting**: Per-client limits are enforced
- [ ] **Kill Switches**: Runaway scans are terminated
- [ ] **Alerts**: Critical failures trigger notifications

## Troubleshooting

### High Memory Usage
```bash
# Check memory status
curl http://localhost:3001/api/monitoring/puppeteer

# Triggers auto-recovery (browser restart)
curl -X POST http://localhost:3001/api/monitoring/recover
```

### Pending Queue Jobs
```bash
# View queue statistics
curl http://localhost:3001/api/monitoring/queue/stats

# Check failed jobs
curl http://localhost:3001/api/monitoring/queue/failed

# Retry a failed job
curl -X POST http://localhost:3001/api/monitoring/queue/retry/{jobId}
```

### Slow Scan Times
```bash
# Check reliability insights
curl "http://localhost:3001/api/monitoring/reliability?days=1"

# Look for timeout failures
# Increase timeout or check URL accessibility
```

### Database Issues
```bash
# Run health check
curl http://localhost:3001/api/monitoring/health

# Force recovery
curl -X POST http://localhost:3001/api/monitoring/recover
```

## Performance Tuning

### Queue Concurrency
Adjust in `ScanQueue` constructor:
```typescript
// Process more jobs in parallel (requires more memory)
await this.queue.process('high', 4, ...);  // Increased from 2
```

### Browser Pool Size
Adjust in `PuppeteerService`:
```typescript
private maxConcurrentPages = 5;  // Increased from 3
```

### Memory Threshold
Adjust in `SafetyService`:
```typescript
private static readonly MAX_MEMORY_MB = 1000;  // Increased from 800
```

### Timeout Duration
Adjust in `SafetyService`:
```typescript
private static readonly MAX_SCAN_TIME = 180000;  // 3 minutes instead of 2
```

## Next Steps

After deployment:

1. **Run initial tests**: Execute bulk scans with 20-50 URLs
2. **Monitor for 24 hours**: Check success rate and metrics
3. **Verify recovery**: Simulate failures and confirm auto-recovery
4. **Load test**: Increase concurrent scans to peak capacity
5. **Set up alerts**: Integrate with Slack, PagerDuty, or email
6. **Document runbooks**: Create team procedures for common issues

## Support

For issues or questions:
- Check monitoring endpoints for detailed error information
- Review logs in `/app/logs` or via `docker-compose logs`
- Run health checks: `./scripts/health-check.sh`
- Contact platform team with monitoring export
