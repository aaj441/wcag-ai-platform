# Multi-LLM Validation - Quick Start Guide

## TL;DR
The WCAG AI Platform is **ready for multi-LLM validation** implementation. The codebase already has:
- ✅ Dual AI provider support (OpenAI + Anthropic)
- ✅ Feature flag infrastructure (LaunchDarkly)
- ✅ Confidence scoring system
- ✅ Service-oriented architecture

**Recommended approach:** Extend `RemediationEngine` + create new `MultiLLMValidator` service

---

## Key Findings

### 1. Existing LLM Integration Points

**AIService** (`/src/services/AIService.ts`)
- Supports OpenAI (GPT-4) and Anthropic (Claude)
- Auto-detects provider based on env vars
- Batch processing with 5-request concurrency
- Fallback to mock responses

**AIRouter** (`/src/services/aiRouter.ts`)
- LaunchDarkly feature flags for model selection
- Shadow deployment support (primary + shadow model comparison)
- Model drift detection
- A/B testing infrastructure

**RemediationEngine** (`/src/services/RemediationEngine.ts`)
- Two-tier strategy: Templates (fast) → AI generation (flexible)
- Confidence scoring (0.6-0.95)
- Batch fix generation capability

**ConfidenceScorer** (`/src/services/ConfidenceScorer.ts`)
- Scores violation confidence based on WCAG criteria
- Factors: detection reliability, false positive risk, severity, evidence
- Recommends action: approve/review/reject

### 2. Database Support
PostgreSQL with Prisma ORM is production-ready.
New models needed:
- `MultiLLMValidation` - Results from each provider
- `LLMProviderResult` - Individual provider tracking

### 3. API Route Patterns
14 existing routes follow consistent patterns:
```
POST /api/endpoint
├─ Validate input
├─ Call service layer
└─ Return { success, data, error }
```

---

## Implementation Roadmap

### Phase 1: Core (Week 1-2)
```
[ ] Create MultiLLMValidator service
[ ] Add Prisma models
[ ] Extend RemediationEngine
[ ] Create POST /api/fixes/generate/multi-llm
[ ] Unit tests
```

**Files to create:**
- `/src/services/MultiLLMValidator.ts` (NEW)
- `/prisma/schema.prisma` (EXTEND)
- `/src/routes/fixes.ts` (EXTEND)

### Phase 2: Features (Week 3)
```
[ ] Implement consensus algorithm
[ ] Add fix comparison logic
[ ] POST /api/fixes/compare-providers
[ ] Extend ConfidenceScorer for agreement bonus
```

### Phase 3: UI (Week 4)
```
[ ] React component for multi-LLM results
[ ] Provider selection UI
[ ] Agreement score visualization
```

### Phase 4: Advanced (Week 5+)
```
[ ] Custom provider support
[ ] Provider fallback chains
[ ] Cost optimization routing
[ ] Analytics dashboard
```

---

## Critical Files to Review

| File | Purpose | Lines |
|------|---------|-------|
| `/src/services/AIService.ts` | Current AI provider logic | 332 |
| `/src/services/RemediationEngine.ts` | Fix generation orchestrator | 210 |
| `/src/services/ConfidenceScorer.ts` | Quality scoring | 242 |
| `/src/routes/fixes.ts` | Fix API endpoints | 309 |
| `/prisma/schema.prisma` | Database models | 200+  |
| `/src/server.ts` | Express app setup | 266 |

---

## Database Schema Changes

### New Models Needed

```prisma
model MultiLLMValidation {
  id              String   @id @default(cuid())
  tenantId        String
  violationId     String
  
  // Results
  consensusCode   String   @db.Text
  agreementScore  Float    // 0.0-1.0
  providerResults Json     // Array of results
  
  // Metadata
  processingTime  Int      // milliseconds
  providerCount   Int
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([violationId])
  @@index([agreementScore])
}

model LLMProviderResult {
  id              String   @id @default(cuid())
  multiLLMId      String
  provider        String
  model           String
  
  fixedCode       String   @db.Text
  explanation     String   @db.Text
  confidence      Float
  processingTime  Int
  
  tokensUsed      Int?
  estimatedCost   Float?
  
  error           String?
  
  createdAt       DateTime @default(now())
  
  @@index([multiLLMId])
  @@index([provider])
}
```

---

## New Service: MultiLLMValidator

**Location:** `/src/services/MultiLLMValidator.ts`

```typescript
export class MultiLLMValidator {
  // Main orchestrator
  static async validateWithMultipleLLMs(
    request: AIFixRequest,
    providers?: LLMProviderConfig[]
  ): Promise<MultiLLMValidationResult>

  // Compare results from different providers
  static compareResults(results: AIFixResponse[]): ComparisonResult

  // Select best fix based on confidence + agreement
  static selectBestFix(results: AIFixResponse[]): AIFixResponse

  // Calculate agreement score (0.0-1.0)
  static calculateAgreement(results: AIFixResponse[]): number

  // Fallback chain support
  static async validateWithFallback(
    request: AIFixRequest,
    primaryProvider: LLMProviderConfig,
    fallbackChain: LLMProviderConfig[]
  ): Promise<GeneratedFix>
}
```

---

## New API Endpoints

### POST /api/fixes/generate/multi-llm
```json
Request:
{
  "violationId": "string",
  "wcagCriteria": "1.4.3",
  "issueType": "missing_alt_text",
  "description": "Image missing alt text",
  "providers": ["openai", "anthropic"]  // optional
}

Response:
{
  "success": true,
  "data": {
    "consensusFix": {
      "fixedCode": "...",
      "explanation": "...",
      "confidence": 0.92
    },
    "agreementScore": 0.85,
    "providers": [
      {
        "provider": "openai",
        "confidence": 0.92,
        "fixedCode": "..."
      },
      {
        "provider": "anthropic",
        "confidence": 0.88,
        "fixedCode": "..."
      }
    ],
    "validationId": "mlv_xyz"
  }
}
```

### GET /api/fixes/multi-llm/:validationId
Get detailed results from multi-LLM validation

### POST /api/fixes/compare-providers
Compare provider results directly

---

## Configuration Options

### Option 1: Environment Variables
```bash
MULTI_LLM_ENABLED=true
MULTI_LLM_PROVIDERS=openai,anthropic
MULTI_LLM_TIMEOUT_MS=30000
MULTI_LLM_CONSENSUS_THRESHOLD=0.8
```

### Option 2: LaunchDarkly (Recommended)
Feature flags for:
- `multi-llm-validation-enabled`
- `multi-llm-providers`
- `multi-llm-timeout-ms`
- `multi-llm-consensus-threshold`

### Option 3: Database Config
Store settings in `LLMConfiguration` table

---

## Cost Optimization Strategies

### 1. Progressive Validation
```
Use cheapest provider first (Claude)
│
├─ If confidence > threshold → Done
└─ Otherwise → Validate with premium provider (GPT-4)
```

### 2. Template-First
```
Check FixTemplate table (free)
│
├─ Template exists → Use it (no API calls)
└─ Otherwise → Call LLMs
```

### 3. Provider Weighting
```typescript
const PROVIDER_COSTS = {
  'claude-3-sonnet': 0.003,      // Cheapest
  'gpt-4-turbo': 0.01,            // Mid-tier
  'gpt-4': 0.03,                  // Premium
};
```

---

## Testing Strategy

### Unit Tests
- [ ] MultiLLMValidator.compareResults() - Agreement calculation
- [ ] MultiLLMValidator.selectBestFix() - Selection logic
- [ ] ConfidenceScorer - Agreement bonus calculation

### Integration Tests
- [ ] POST /api/fixes/generate/multi-llm - End-to-end flow
- [ ] GET /api/fixes/multi-llm/:id - Retrieval
- [ ] Database persistence - MultiLLMValidation table

### Performance Tests
- [ ] Concurrent provider calls (latency)
- [ ] Cost per violation type
- [ ] Agreement score distribution

---

## Monitoring & Observability

### Metrics to Track
- **Provider Agreement**: % of violations where all providers agree
- **Average Agreement Score**: Per WCAG criterion
- **Cost per Provider**: Token usage + API costs
- **Processing Time**: Sequential vs parallel
- **Confidence Impact**: Single vs multi-model confidence

### Logging
```typescript
log.info('Multi-LLM validation started', {
  violationId,
  wcagCriteria,
  providers: ['openai', 'anthropic'],
});

log.info('Multi-LLM validation complete', {
  violationId,
  agreementScore: 0.85,
  processingTime: 3420,
  providers: [...],
});
```

---

## Rollout Plan

### Week 1: Development
- Implement service & database models
- Unit tests
- Code review

### Week 2: Testing
- Integration tests
- Staging deployment
- Performance benchmarks

### Week 3: Gradual Rollout
- LaunchDarkly: 5% traffic
- Monitor agreement scores & costs
- Gather feedback

### Week 4: Full Rollout
- 100% for experimental features
- Keep single-LLM as fallback
- Document in API docs

---

## FAQ

**Q: Will this increase API latency?**
A: Yes, but mitigate with:
- Parallel provider calls (instead of sequential)
- Progressive validation (cheap → expensive)
- Template-first approach (no API call)

**Q: What about costs?**
A: Use progressive validation + template caching to minimize expensive provider calls.

**Q: Can we support custom providers?**
A: Yes! Phase 4 adds support for Hugging Face, local models, etc.

**Q: Do we need to change existing routes?**
A: No. Create new `/generate/multi-llm` endpoint alongside existing `/generate`.

**Q: How do we handle disagreements?**
A: 
1. Majority vote (2 of 3 agree)
2. Highest confidence provider
3. Ask consultant to review

---

## Resources

- **Full Analysis:** `/CODEBASE_MULTI_LLM_ANALYSIS.md`
- **Architecture Docs:** `/CODEBASE_ARCHITECTURE.md`
- **API Reference:** `/openapi.yaml`

---

## Next Steps

1. **Read** `/CODEBASE_MULTI_LLM_ANALYSIS.md` (sections 1-3)
2. **Review** existing services (AIService, RemediationEngine)
3. **Design** MultiLLMValidator API
4. **Create** feature branch: `feat/multi-llm-validation`
5. **Implement** Phase 1 components

---

**Ready to start?** Create the MultiLLMValidator service in `/src/services/MultiLLMValidator.ts`

