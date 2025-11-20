# WCAG AI Platform - Codebase Analysis & Multi-LLM Validation Architecture

## EXECUTIVE SUMMARY

The WCAG AI Platform is a production-ready, monorepo-based web application with mature LLM integration patterns already in place. The codebase supports both **OpenAI (GPT-4)** and **Anthropic (Claude)** for AI-powered accessibility fix generation. 

**Key Finding:** The existing architecture is well-positioned for implementing multi-LLM validation, with established patterns for:
- Dynamic model selection via LaunchDarkly feature flags
- Confidence scoring mechanisms
- Service-oriented architecture with static method patterns
- Multi-step workflow orchestration
- Comprehensive error handling and logging

---

## 1. PROJECT STRUCTURE OVERVIEW

### Monorepo Layout
```
wcag-ai-platform/
├── packages/
│   ├── api/                      # Express.js backend (Node.js 20+)
│   │   ├── src/
│   │   │   ├── routes/           # 14 RESTful API route modules
│   │   │   ├── services/         # 21+ business logic services
│   │   │   ├── middleware/       # Auth, validation, CORS, security
│   │   │   ├── lib/              # Database, encryption, feature flags
│   │   │   ├── utils/            # Logger, metrics, helpers
│   │   │   └── server.ts         # Express app configuration
│   │   └── prisma/
│   │       └── schema.prisma     # PostgreSQL ORM definitions
│   │
│   └── webapp/                   # React 18 + Vite frontend
│       └── src/
│           ├── components/       # React components
│           ├── services/         # API client logic
│           └── types/            # TypeScript interfaces
│
├── deployment/                   # Terraform, scripts, dashboards
├── docs/                         # Documentation
└── README.md                     # Main documentation
```

### Tech Stack
| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Runtime** | Node.js | 20.x | Production-ready |
| **Framework** | Express.js | 4.18.2 | Mature, proven |
| **Language** | TypeScript | 5.3.3 | Strict type checking |
| **ORM** | Prisma | 5.7.1 | PostgreSQL client |
| **Database** | PostgreSQL | 14+ | Managed/self-hosted |
| **Auth** | Clerk | 4.13.23 | User management |
| **AI - OpenAI** | N/A | GPT-4, GPT-4 Turbo | REST API |
| **AI - Anthropic** | N/A | Claude 3.5 Sonnet | REST API |
| **Feature Flags** | LaunchDarkly | 7.0.4 | A/B testing, gradual rollouts |
| **Error Tracking** | Sentry | 10.25.0 | Production monitoring |
| **Logging** | Winston | 3.11.0 | Structured logging |
| **Telemetry** | OpenTelemetry | 1.19.0 | Distributed tracing |

---

## 2. EXISTING LLM INTEGRATIONS

### AIService Class (Core Integration Point)
**Location:** `/packages/api/src/services/AIService.ts`

**Current Capabilities:**
```typescript
// Dynamic provider selection
private provider: 'openai' | 'anthropic';

// Constructor auto-detects based on env vars
constructor() {
  this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
  this.provider = process.env.OPENAI_API_KEY ? 'openai' : 'anthropic';
  this.model = process.env.AI_MODEL || 'gpt-4';
}

// Dual API support
async generateFix(request: AIFixRequest): Promise<AIFixResponse>
  - OpenAI endpoint: https://api.openai.com/v1/chat/completions
  - Anthropic endpoint: https://api.anthropic.com/v1/messages
```

**Key Methods:**
1. `generateFix()` - Generate accessibility fixes for WCAG violations
2. `generateBatchFixes()` - Process multiple violations in batches (5 concurrent)
3. `validateFix()` - Basic validation of generated fixes

**Provider Implementation Details:**

#### OpenAI Integration
```typescript
// generateWithOpenAI()
- Model: configurable (default: gpt-4)
- Temperature: 0.3 (for consistency)
- Max Tokens: 2000
- System prompt: "You are an expert accessibility consultant..."
- Response format: JSON parsing with fallback to plain text
```

#### Anthropic Integration
```typescript
// generateWithAnthropic()
- Model: claude-3-sonnet-20240229 (hardcoded)
- Max Tokens: 2000
- Messages format: Anthropic-compatible
- Response format: Same JSON parsing pattern
```

**Environment Variables Required:**
```bash
OPENAI_API_KEY=sk-...          # For GPT-4 access
# OR
ANTHROPIC_API_KEY=sk-ant-...   # For Claude access

AI_MODEL=gpt-4                 # Model selection (optional)
```

### AIRouter Service (Advanced Model Management)
**Location:** `/packages/api/src/services/aiRouter.ts`

**Purpose:** Dynamic model selection with shadow deployments and A/B testing

**Features:**
```typescript
interface ModelConfig {
  model: string;               // Primary model
  shadowModel: string | null;  // Secondary model for comparison
  shadowEnabled: boolean;      // Feature flag for shadow deployment
  temperature: number;
  maxTokens: number;
}

// Feature flag configuration (via LaunchDarkly)
- ai-model-primary              // Primary model selection
- ai-model-shadow               // Shadow model for comparison
- ai-shadow-deployment-enabled  // Enable/disable shadow mode
- ai-model-temperature          // Temperature setting
- ai-model-max-tokens           // Token limits
```

**Shadow Deployment Pattern:**
- Primary model generates fix
- Shadow model runs in parallel (if enabled)
- Results compared for drift detection
- Metrics recorded via `recordModelDrift()`

### RemediationEngine (Fix Generation Orchestrator)
**Location:** `/packages/api/src/services/RemediationEngine.ts`

**Architecture:**
```
RemediationEngine.generateFix()
├── [Fast Path] Check Prisma FixTemplate database
│   └── If template exists → interpolate & return (0.9 confidence)
│
└── [Intelligent Path] Use AI Service
    ├── Call AIService.generateFix()
    ├── Parse response
    └── Return with confidence score
```

**Two-Tier Strategy:**
1. **Templates (Fast)**: Pre-built fixes stored in database for common violations
2. **AI Generation (Flexible)**: Dynamic generation for complex/new issues

**Confidence Scoring:**
- Template-based fixes: 0.9 confidence (pre-verified)
- AI-generated fixes: Variable (0.6-0.95) based on model response

### ConfidenceScorer Service (Quality Assurance)
**Location:** `/packages/api/src/services/ConfidenceScorer.ts`

**Purpose:** Score WCAG violation detection confidence to help prioritize review

**Scoring Algorithm:**
```
Confidence = (
  Detection Reliability (0.0-1.0) +
  False Positive Risk (-0.2 to 0.0) +
  WCAG Severity Factor (0.0-0.3) +
  Code Evidence Strength (0.0-0.4)
) / 4

Final: 0.0 = Very Low, 1.0 = High Confidence
```

**WCAG Criteria-Specific Reliability:**
- **1.4.3 (Color Contrast)**: 0.95 - Highly measurable
- **2.4.7 (Focus Visible)**: 0.85 - Usually reliable
- **1.1.1 (Alt Text)**: 0.80 - Context-dependent
- **2.1.1 (Keyboard Access)**: 0.70 - Harder to detect
- **1.4.5 (Images of Text)**: 0.60 - Complex detection

**Output Format:**
```typescript
interface ConfidenceResult {
  overallScore: number;                    // 0.0-1.0
  violations: ConfidenceViolation[];
  falsePositiveRisk: "low" | "medium" | "high";
  recommendedAction: "approve" | "review_manually" | "reject";
}
```

---

## 3. HOW AI SERVICES ARE CURRENTLY ORGANIZED

### Service-Oriented Architecture Pattern

All AI services follow a consistent pattern:

```typescript
// Example: RemediationEngine
export class RemediationEngine {
  // Static methods for functional composition
  static async generateFix(req: FixRequest): Promise<GeneratedFix> { }
  static async generateBatchFixes(requests: FixRequest[]): Promise<GeneratedFix[]> { }
  static async validateFix(original, fixed, criteria) { }
  
  // Private helpers
  private static async getFixTemplate(wcagCriteria, issueType) { }
  private static async generateWithAI(req: FixRequest) { }
}

// Usage in routes
const generatedFix = await RemediationEngine.generateFix(request);
const saved = await RemediationEngine.saveFix(tenantId, violationId, fix);
```

### Service Organization (21+ Services)

**AI/LLM Services:**
1. **AIService** - Core OpenAI/Anthropic integration
2. **AIRouter** - Dynamic model routing with feature flags
3. **RemediationEngine** - Fix generation orchestration
4. **ConfidenceScorer** - Violation confidence scoring

**Business Logic Services:**
5. **SiteTransformationService** - Website WCAG transformation
6. **BatchAuditService** - Parallel website auditing (in-memory queue)
7. **ProspectDiscoveryService** - Lead discovery from metros/industries
8. **RiskScoringService** - Lawsuit probability calculation

**Supporting Services:**
9. **ReportGenerator** - PDF report creation
10. **PDFGenerator** - PDF export functionality
11. **ReplayEngine** - Session replay for QA
12. **EmailService** - SendGrid integration
13. **KeywordExtractor** - NLP keyword extraction
14. **CostController** - API cost tracking
15. **FeedbackLoop** - Consultant feedback handling
16. **SLAMonitor** - SLA compliance tracking
17. **AuditLog** - Audit trail management
18. **KeywordAlerting** - Alert notifications
19. **ProposalGenerator** - Proposal automation
20. **WorkerAttestation** - Worker verification
21. **CompanyDiscoveryService** - Company data enrichment

### API Patterns for AI Services

**Fix Generation Route** (`POST /api/fixes/generate`)
```typescript
// Request
{
  violationId: string;
  wcagCriteria: string;        // e.g., "1.4.3"
  issueType: string;           // e.g., "missing_alt_text"
  description: string;
  codeSnippet?: string;        // HTML/CSS to fix
  codeLanguage?: string;       // "html", "css", "react"
}

// Response
{
  success: true,
  data: {
    fixedCode: string;
    explanation: string;
    confidenceScore: number;
    alternativeFixes?: string[];
  }
}
```

**Fix Review Route** (`PATCH /api/fixes/:fixId/review`)
```typescript
// Consultant review and approval workflow
{
  reviewStatus: "approved" | "rejected";
  reviewNotes?: string;
}
```

**Batch Fix Generation**
```typescript
// Internal: RemediationEngine.generateBatchFixes()
- Concurrency: 5 parallel requests
- Error handling: Promise.allSettled() for fault tolerance
- Logging: Per-fix generation metrics
```

---

## 4. PATTERNS FOR API CALLS & SERVICE ORCHESTRATION

### Error Handling Pattern

All services implement try-catch with logging:

```typescript
try {
  const result = await AIService.generateFix(request);
  log.info('Success', { violationId, confidence: result.confidence });
  return result;
} catch (error) {
  log.error('Failed to generate fix', error instanceof Error ? error : new Error(String(error)), {
    violationId,
    wcagCriteria,
  });
  // Fallback or re-throw
  throw error;
}
```

### Logging Pattern

Centralized Winston logger with structured logging:

```typescript
// src/utils/logger.ts
log.info(message, metadata);
log.error(message, error, metadata);
log.warn(message, metadata);
log.debug(message, metadata);
log.auditLog(action, userId, targetId, details);
log.securityEvent(event, details);
```

### Request/Response Pattern

All API routes follow consistent structure:

```typescript
router.post('/endpoint', authMiddleware, async (req: Request, res: Response) => {
  try {
    // 1. Validate input
    if (!required_field) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field'
      });
    }

    // 2. Call service
    const result = await SomeService.methodName(req.body);

    // 3. Return success
    res.json({
      success: true,
      data: result,
      message: 'Operation completed'
    });
  } catch (error) {
    log.error('Operation failed', error);
    res.status(500).json({
      success: false,
      error: 'Operation failed'
    });
  }
});
```

### Orchestration Patterns

**Step-by-Step Workflow** (SiteTransformationService example):

```typescript
async transformSite(request: TransformationRequest): Promise<Transformation> {
  // Step 1: Extract original site
  transformation.status = 'extracting';
  transformation.originalSite = await this.extractSite(request.url);

  // Step 2: Analyze violations
  transformation.status = 'analyzing';
  const violations = await this.analyzeViolations(
    transformation.originalSite,
    request.wcagLevel
  );

  // Step 3: Apply fixes
  transformation.status = 'transforming';
  transformation.transformedSite = await this.applyFixes(
    transformation.originalSite,
    violations,
    request.preserveDesign
  );

  // Step 4: Verify compliance
  const remainingViolations = await this.verifyCompliance(
    transformation.transformedSite,
    request.wcagLevel
  );

  transformation.status = 'complete';
  return transformation;
}
```

**Batch Processing Pattern** (BatchAuditService):

```typescript
// Fire-and-forget async processing
static createAuditJob(websites: string[]): AuditJob {
  const job: AuditJob = { jobId, websites, status: 'pending', ... };
  
  // Start processing in background (not awaited)
  this.processBatchAsync(jobId);
  
  // Return immediately with job ID
  return job;
}

// Client polls for status
static getJobStatus(jobId: string): AuditJob | null
```

**Concurrent Processing with Concurrency Limits**:

```typescript
const BATCH_SIZE = 5;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  const results = await Promise.all(
    batch.map(item => processItem(item))
  );
  results.push(...results);
}
```

---

## 5. WHERE A MULTI-LLM VALIDATION WORKFLOW WOULD BEST FIT

### Recommended Architecture

The multi-LLM validation workflow should integrate at **multiple layers**:

#### Level 1: RemediationEngine Enhancement
**Current:** Single AI provider → Fix
**Enhanced:** Multiple providers → Consensus fix

```
┌─────────────────────────────────────────────────┐
│         RemediationEngine (Enhanced)             │
├─────────────────────────────────────────────────┤
│  generateFixMultiLLM(request: FixRequest)       │
│    ├─→ Parallel calls to N LLM providers        │
│    ├─→ MultiLLMValidator.compareResults()       │
│    ├─→ ConsensusBuilder.selectBestFix()         │
│    └─→ Enhanced confidence scoring              │
└─────────────────────────────────────────────────┘
```

**Location:** `/packages/api/src/services/RemediationEngine.ts`

**Changes:**
- Add `generateFixMultiLLM()` method alongside existing `generateFix()`
- Refactor provider calls into separate methods per LLM
- Implement consensus algorithm for fix selection

#### Level 2: New MultiLLMValidator Service
**Purpose:** Orchestrate and compare results from multiple LLMs

**Location:** `/packages/api/src/services/MultiLLMValidator.ts` (NEW)

```typescript
export class MultiLLMValidator {
  // Call all configured providers
  static async validateWithMultipleLLMs(
    request: AIFixRequest,
    providers: LLMProvider[] = ['openai', 'anthropic', 'custom']
  ): Promise<MultiLLMValidationResult>

  // Compare results for consistency
  static compareResults(
    results: AIFixResponse[]
  ): {
    consensus: AIFixResponse;
    agreement: number;        // 0.0-1.0
    disagreements: string[];
  }

  // Select best fix based on confidence & agreement
  static selectBestFix(
    results: AIFixResponse[],
    weights: FixWeighting = DEFAULT_WEIGHTS
  ): AIFixResponse

  // Score fix quality across multiple dimensions
  static scoreFixQuality(
    fix: AIFixResponse,
    originalCode: string,
    wcagCriteria: string
  ): QualityScore
}
```

#### Level 3: Database Schema Extension
**Location:** `/packages/api/prisma/schema.prisma`

**New Models:**
```prisma
model MultiLLMValidation {
  id              String   @id @default(cuid())
  violationId     String
  violation       Violation @relation(fields: [violationId], references: [id])
  
  // Results from each provider
  results         Json     // Array of { provider, confidence, fixedCode, ... }
  
  // Consensus result
  consensusFix    String
  agreementScore  Float    // 0.0-1.0
  
  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([violationId])
  @@index([agreementScore])
}

model LLMProviderResult {
  id              String   @id @default(cuid())
  validationId    String
  validation      MultiLLMValidation @relation(fields: [validationId], references: [id])
  
  provider        String             // "openai", "anthropic", "custom"
  model           String             // "gpt-4", "claude-3-sonnet"
  fixedCode       String
  explanation     String
  confidence      Float
  
  createdAt       DateTime @default(now())
  
  @@index([validationId])
  @@index([provider])
}
```

#### Level 4: API Routes
**Location:** `/packages/api/src/routes/fixes.ts` (EXTENDED)

**New Endpoints:**
```typescript
// Multi-LLM fix generation
POST /api/fixes/generate/multi-llm
  Request: { violationId, wcagCriteria, issueType, ... }
  Response: { 
    success: true, 
    consensusFix: AIFixResponse,
    providers: [
      { provider: 'openai', confidence: 0.92, fixedCode: '...' },
      { provider: 'anthropic', confidence: 0.88, fixedCode: '...' },
    ],
    agreementScore: 0.85
  }

// Get validation history
GET /api/fixes/:fixId/multi-llm-validation
  Response: MultiLLMValidationResult with all provider results

// Compare provider results
POST /api/fixes/compare-providers
  Request: { fixedCode: string, wcagCriteria: string, providers: string[] }
  Response: { consensus, agreement, disagreements }
```

#### Level 5: Enhanced ConfidenceScorer
**Location:** `/packages/api/src/services/ConfidenceScorer.ts` (EXTENDED)

**Enhanced Scoring Algorithm:**
```typescript
// Current: Single model confidence
confidence = (detectionReliability + falsePositiveRisk + severity + evidence) / 4

// Enhanced: Multi-model agreement boosts confidence
multiModelConfidence = singleModelConfidence * (1 + agreementBonus)
  where: agreementBonus = 0.1 * (agreement - 0.5) // Max 5% boost for 100% agreement

// Example:
- All LLMs agree: 0.75 * 1.025 = 0.769
- 2 of 3 agree:   0.75 * 1.017 = 0.763
- Only 1 agrees:  0.75 * 1.000 = 0.750
```

### Implementation Priority & Phasing

#### Phase 1: Core Infrastructure (Week 1-2)
1. Create `MultiLLMValidator` service
2. Add database models for validation results
3. Extend RemediationEngine with `generateFixMultiLLM()`
4. Create `/api/fixes/generate/multi-llm` endpoint

#### Phase 2: Consensus & Comparison (Week 3)
1. Implement consensus algorithm
2. Add fix comparison logic
3. Create `/api/fixes/compare-providers` endpoint
4. Extend ConfidenceScorer for multi-model agreement

#### Phase 3: UI & Integration (Week 4)
1. Create React components for multi-LLM display
2. Add provider selection UI
3. Show agreement scores in fix review dashboard
4. Add A/B testing via LaunchDarkly

#### Phase 4: Advanced Features (Week 5+)
1. Custom LLM provider support (Hugging Face, local models)
2. Provider fallback chains
3. Cost optimization (route to cheapest provider)
4. Performance analytics dashboard

---

## 6. CURRENT ARCHITECTURE SUMMARY

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT (React + Vite)                     │
│                      port 3000                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
                   Axios HTTP API calls
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Server (Express.js)                    │
│                      port 3001                              │
│                                                              │
│  Routes (14 modules)                                        │
│  ├─ /api/fixes          → RemediationEngine                 │
│  ├─ /api/violations     → Violation management              │
│  ├─ /api/transform      → SiteTransformationService         │
│  ├─ /api/demographics   → ProspectDiscoveryService          │
│  └─ ...                                                      │
│                                                              │
│  Services (21+ modules)                                     │
│  ├─ AIService           → OpenAI/Anthropic integration      │
│  ├─ AIRouter            → LaunchDarkly feature flags        │
│  ├─ RemediationEngine    → Fix generation orchestration     │
│  ├─ ConfidenceScorer    → Quality scoring                   │
│  └─ ...                                                      │
│                                                              │
│  Middleware                                                 │
│  ├─ Auth (Clerk)        → User authentication               │
│  ├─ Validation (Zod)    → Request validation                │
│  ├─ Security            → Rate limiting, Helmet             │
│  └─ Logging             → Winston structured logging        │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │    PostgreSQL Database (Prisma ORM)   │
        │                                       │
        │  - Scan, Violation, Fix models       │
        │  - FixTemplate library                │
        │  - MultiLLMValidation (NEW)          │
        │  - Company, Lead, Client              │
        │  - 350+ Metros, Industries            │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │   External AI Services (REST APIs)    │
        │                                       │
        │  - OpenAI (GPT-4)                     │
        │  - Anthropic (Claude)                 │
        │  - (Custom providers - future)        │
        └───────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|-----------|
| **Static Service Methods** | Functional composition, easy testing | No state, no instance methods |
| **In-Memory Job Queue** | Simple, no external dependencies | Jobs lost on restart |
| **Single AI Provider at a Time** | Simplicity, cost control | Limited fallback options |
| **Confidence Scoring on Violations** | Helps consultants prioritize | Additional computation |
| **Template-First Strategy** | Fast, cost-effective | Limited for novel issues |
| **Prisma ORM** | Type-safe, migrations | Learning curve |
| **Express.js** | Mature, well-known | Less batteries-included |

---

## 7. RECOMMENDATIONS FOR MULTI-LLM IMPLEMENTATION

### Architecture Recommendation: **Service-Centric with Database Tracking**

Implement multi-LLM validation at the service layer with database persistence:

```
┌──────────────────────────────────────────────────────────────┐
│ Route: POST /api/fixes/generate/multi-llm                   │
├──────────────────────────────────────────────────────────────┤
│                          ↓                                    │
│  RemediationEngine.generateFixMultiLLM()                     │
│    1. Extract violation details from request                 │
│    2. Call MultiLLMValidator.validateWithMultipleLLMs()      │
│    3. Compare and score results                              │
│    4. Save to database (MultiLLMValidation table)            │
│    5. Return consensus fix + metadata                        │
└──────────────────────────────────────────────────────────────┘
```

### Key Components to Create

#### 1. MultiLLMValidator Service
**File:** `/packages/api/src/services/MultiLLMValidator.ts`

```typescript
export interface LLMProviderConfig {
  name: string;                    // "openai", "anthropic", "custom"
  apiKey: string;
  model: string;
  enabled: boolean;
  weight: number;                  // 1.0 = equal weight
  timeout: number;
}

export interface MultiLLMValidationResult {
  consensusFix: GeneratedFix;
  agreementScore: number;          // 0.0-1.0
  providerResults: {
    provider: string;
    confidence: number;
    fixedCode: string;
    explanation: string;
  }[];
  processingTime: number;
  votingDetails: {
    unanimous: boolean;
    majorityVote: boolean;
    dissenterCount: number;
  };
}

export class MultiLLMValidator {
  static async validateWithMultipleLLMs(
    request: AIFixRequest,
    providers: LLMProviderConfig[] = DEFAULT_PROVIDERS
  ): Promise<MultiLLMValidationResult>

  static compareResults(results: AIFixResponse[]): ComparisonResult

  static selectBestFix(results: AIFixResponse[]): AIFixResponse

  static calculateAgreement(results: AIFixResponse[]): number

  static async validateWithFallback(
    request: AIFixRequest,
    primaryProvider: LLMProviderConfig,
    fallbackChain: LLMProviderConfig[]
  ): Promise<GeneratedFix>
}
```

#### 2. Database Models
**File:** `/packages/api/prisma/schema.prisma`

```prisma
model MultiLLMValidation {
  id                String   @id @default(cuid())
  tenantId          String   // Multi-tenant support
  violationId       String
  violation         Violation @relation(fields: [violationId], references: [id], onDelete: Cascade)
  
  // Consensus result
  selectedFixId     String?
  consensusCode     String   @db.Text
  agreementScore    Float    // 0.0-1.0
  
  // Provider results (JSON array)
  providerResults   Json     // [{provider, model, confidence, fixedCode, ...}]
  
  // Metadata
  processingTime    Int      // milliseconds
  providerCount     Int      // How many providers contributed
  
  // Audit trail
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  fix               Fix?     @relation(fields: [selectedFixId], references: [id])
  
  @@index([violationId])
  @@index([tenantId])
  @@index([agreementScore])
  @@index([createdAt])
}

// Support for tracking individual provider results
model LLMProviderResult {
  id                String   @id @default(cuid())
  multiLLMId        String
  multiLLM          MultiLLMValidation @relation(fields: [multiLLMId], references: [id], onDelete: Cascade)
  
  provider          String             // "openai", "anthropic", etc.
  model             String             // "gpt-4", "claude-3-sonnet", etc.
  
  // Result data
  fixedCode         String   @db.Text
  explanation       String   @db.Text
  confidence        Float
  processingTime    Int      // milliseconds
  
  // Cost tracking
  tokensUsed        Int?
  estimatedCost     Float?
  
  // Error tracking
  error             String?
  errorCode         String?
  
  createdAt         DateTime @default(now())
  
  @@index([multiLLMId])
  @@index([provider])
}
```

#### 3. Enhanced Routes
**File:** `/packages/api/src/routes/fixes.ts` (EXTEND EXISTING)

```typescript
/**
 * POST /api/fixes/generate/multi-llm
 * Generate fix with multiple LLM validation
 */
router.post('/generate/multi-llm', authMiddleware, async (req, res) => {
  try {
    const { violationId, wcagCriteria, issueType, description, providers } = req.body;
    const tenantId = req.tenantId!;

    // Get violation
    const violation = await prisma.violation.findUnique({
      where: { id: violationId },
      include: { scan: true },
    });

    if (!violation || violation.scan?.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Violation not found' });
    }

    // Generate with multiple LLMs
    const result = await MultiLLMValidator.validateWithMultipleLLMs({
      violationId,
      wcagCriteria,
      issueType,
      description,
      elementSelector: violation.elementSelector || undefined,
      codeSnippet: violation.codeSnippet || undefined,
    });

    // Save validation result
    const validation = await prisma.multiLLMValidation.create({
      data: {
        tenantId,
        violationId,
        consensusCode: result.consensusFix.fixedCode,
        agreementScore: result.agreementScore,
        providerResults: result.providerResults,
        processingTime: result.processingTime,
        providerCount: result.providerResults.length,
      },
      include: { violation: true },
    });

    res.json({
      success: true,
      data: {
        consensusFix: result.consensusFix,
        agreementScore: result.agreementScore,
        providers: result.providerResults,
        validationId: validation.id,
      },
    });
  } catch (error) {
    log.error('Multi-LLM generation failed', error as Error);
    res.status(500).json({ success: false, error: 'Generation failed' });
  }
});

/**
 * GET /api/fixes/multi-llm/:validationId
 * Get multi-LLM validation details
 */
router.get('/multi-llm/:validationId', authMiddleware, async (req, res) => {
  const validation = await prisma.multiLLMValidation.findUnique({
    where: { id: req.params.validationId },
    include: {
      violation: true,
      fix: true,
    },
  });

  if (!validation || validation.tenantId !== req.tenantId) {
    return res.status(404).json({ success: false, error: 'Validation not found' });
  }

  res.json({ success: true, data: validation });
});

/**
 * POST /api/fixes/compare-providers
 * Compare multiple providers on same fix
 */
router.post('/compare-providers', authMiddleware, async (req, res) => {
  const { fixedCode, wcagCriteria, providers } = req.body;

  const comparison = await MultiLLMValidator.compareResults(
    providers.map((p: any) => ({
      fixedCode: p.fixedCode,
      explanation: p.explanation,
      confidence: p.confidence,
    }))
  );

  res.json({ success: true, data: comparison });
});
```

### Configuration Approach

**Option 1: Environment Variables (Simplest)**
```bash
# .env
MULTI_LLM_ENABLED=true
MULTI_LLM_PROVIDERS=openai,anthropic
MULTI_LLM_TIMEOUT_MS=30000
MULTI_LLM_CONSENSUS_THRESHOLD=0.8
```

**Option 2: LaunchDarkly Feature Flags (Recommended)**
```typescript
// In AIRouter
const multiLLMEnabled = await ldClient.variation(
  'multi-llm-validation-enabled',
  context,
  false
);

const providers = await ldClient.variation(
  'multi-llm-providers',
  context,
  ['openai', 'anthropic']
);

const consensusThreshold = await ldClient.variation(
  'multi-llm-consensus-threshold',
  context,
  0.8
);
```

**Option 3: Database Configuration (Most Flexible)**
```prisma
model LLMConfiguration {
  id              String   @id @default(cuid())
  tenantId        String
  
  multiLLMEnabled Boolean
  enabledProviders String[]
  timeoutMs       Int
  consensusThreshold Float
  weights        Json      // Provider weights
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Cost Optimization Strategies

1. **Provider Weighting**
```typescript
const PROVIDER_COSTS = {
  'gpt-4': 0.03,           // $0.03 per 1K tokens
  'gpt-4-turbo': 0.01,     // Cheaper
  'claude-3-sonnet': 0.003, // Cheapest
};

// Route to cheapest provider first
const providers = ENABLED_PROVIDERS.sort(
  (a, b) => PROVIDER_COSTS[a.model] - PROVIDER_COSTS[b.model]
);
```

2. **Progressive Validation**
```typescript
// Step 1: Use cheapest provider
const cheapestResult = await AIService.generateFix(cheapProvider);

// Step 2: If confidence < threshold, validate with premium provider
if (cheapestResult.confidence < CONFIDENCE_THRESHOLD) {
  const premiumResult = await AIService.generateFix(premiumProvider);
  return selectBestFix([cheapestResult, premiumResult]);
}

return cheapestResult;
```

3. **Caching of Common Fixes**
```typescript
// Check FixTemplate table first (already in system)
const template = await getFixTemplate(wcagCriteria, issueType);
if (template) {
  return applyTemplate(template);  // No LLM calls needed
}
```

---

## 8. INTEGRATION CHECKLIST

### Phase 1: Setup
- [ ] Create `MultiLLMValidator` service file
- [ ] Add database models to Prisma schema
- [ ] Run `prisma migrate dev` to create tables
- [ ] Create `/api/fixes/generate/multi-llm` endpoint
- [ ] Write unit tests for comparison logic

### Phase 2: Enhancement
- [ ] Update RemediationEngine with multi-LLM method
- [ ] Add ConfidenceScorer multi-model agreement bonus
- [ ] Create `/api/fixes/compare-providers` endpoint
- [ ] Add `GET /api/fixes/multi-llm/:id` endpoint
- [ ] Implement database persistence

### Phase 3: UI Integration
- [ ] Create React component for multi-LLM results
- [ ] Add provider selection UI in fix generation
- [ ] Display agreement scores in review dashboard
- [ ] Add visual indicators for consensus quality

### Phase 4: Testing & Optimization
- [ ] E2E tests for multi-provider flows
- [ ] Performance profiling (latency vs quality)
- [ ] Cost analysis (per-provider breakdown)
- [ ] Load testing with multiple concurrent requests

### Phase 5: Production Readiness
- [ ] Add LaunchDarkly feature flags
- [ ] Implement provider fallback chains
- [ ] Set up monitoring/alerting
- [ ] Document API usage
- [ ] Deploy to staging

---

## 9. FILES TO REVIEW BEFORE IMPLEMENTATION

| File | Purpose | Key Takeaways |
|------|---------|---------------|
| `/src/services/AIService.ts` | Current AI integration | Provider selection logic, mock fallbacks |
| `/src/services/RemediationEngine.ts` | Fix generation | Template + AI strategy, batch processing |
| `/src/services/ConfidenceScorer.ts` | Quality scoring | WCAG-specific scoring, evidence weighting |
| `/src/routes/fixes.ts` | Fix endpoints | Request/response patterns, error handling |
| `/src/middleware/validation.ts` | Request validation | Zod schemas, validation middleware |
| `/prisma/schema.prisma` | Database schema | Model patterns, relations, indexing |
| `/src/server.ts` | App setup | Route registration, middleware order |
| `/src/utils/logger.ts` | Logging | Structured logging, audit trails |

---

## 10. FINAL RECOMMENDATIONS

### 1. Start Small
Begin with extending RemediationEngine rather than creating a completely new service. This allows gradual migration and testing.

### 2. Leverage Existing Patterns
The codebase already has:
- AIService with dual provider support
- ConfidenceScorer for quality metrics
- Validation middleware with Zod
- Structured logging throughout
- Service-oriented architecture

**Use these existing patterns** rather than creating new ones.

### 3. Use Feature Flags
Implement multi-LLM validation behind LaunchDarkly flags to enable:
- Gradual rollout
- A/B testing (multi-LLM vs single-LLM)
- Easy disabling if issues arise
- Per-tenant configuration

### 4. Database First
Store all multi-LLM validation results in database for:
- Audit trail and compliance
- Cost tracking per provider
- Analytics and improvement
- Fallback to previous results

### 5. Cost-Aware Implementation
Design consensus algorithm to optimize costs:
- Use templates first (zero cost)
- Route to cheapest LLM first
- Validate with premium LLM only if needed
- Implement confidence thresholds to skip expensive validations

---

## CONCLUSION

The WCAG AI Platform is **well-structured for multi-LLM validation**. The existing codebase demonstrates mature patterns for:
- Dynamic provider selection
- Confidence scoring
- Error handling and fallbacks
- Service orchestration
- API design

**Recommended approach:** Extend existing RemediationEngine and AIService with a new MultiLLMValidator service, adding database models for result tracking. This keeps the implementation focused, testable, and aligned with existing architectural patterns.

The system is ready to handle multiple concurrent LLM calls with proper error handling, cost tracking, and quality assurance through consensus validation.

