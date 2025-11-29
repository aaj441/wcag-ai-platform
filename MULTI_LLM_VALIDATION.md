# Multi-LLM Validation System

## Overview

The Multi-LLM Validation System is a production-level workflow that enhances the reliability and confidence of AI-generated accessibility fixes by:

1. **Parallel LLM Execution** - Sends prompts to multiple LLMs (GPT-4, Claude-3, Sonar) simultaneously
2. **Majority Vote Consensus** - Aggregates responses and identifies consensus solutions
3. **Expert Critic Review** - Uses a dedicated LLM to analyze all outputs and identify the best solution
4. **Transparency & Auditability** - Stores all responses, rationales, and metrics in the database

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Request                            │
│          POST /api/fixes/generate/multi-llm                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│             RemediationEngine                               │
│         .generateFixWithMultiLLM()                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           MultiLLMValidator                                 │
│       .validateWithMultipleLLMs()                           │
└─────┬──────────┬────────────┬──────────────────────────────┘
      │          │            │
      ▼          ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ OpenAI   │ │Anthropic │ │  Sonar   │
│  GPT-4   │ │ Claude-3 │ │          │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Majority Vote   │
         │   Calculation   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Critic Review  │
         │ (Claude/GPT-4)  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Enhanced Result │
         │  + Confidence   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │    Database     │
         │   Persistence   │
         └─────────────────┘
```

## Key Features

### 1. Multi-Provider Support

The system supports three LLM providers:

- **OpenAI GPT-4** - Industry-leading general-purpose model
- **Anthropic Claude-3** - Strong reasoning and long-context capabilities
- **Perplexity Sonar** - Research-oriented with up-to-date information

Each provider is called in parallel for optimal performance.

### 2. Consensus Mechanisms

#### Majority Vote
- Normalizes code responses for comparison
- Groups similar solutions together
- Returns the solution with the most agreement

#### Critic Review
- A dedicated "reviewer" LLM analyzes all responses
- Identifies issues, hallucinations, or errors in each output
- Selects the best response with detailed rationale
- Calculates an agreement score (0.0-1.0)
- Optionally generates a merged/corrected version

### 3. Confidence Enhancement

The final confidence score is enhanced based on:

```typescript
enhancedConfidence = baseConfidence + bonuses

Where bonuses include:
- Agreement boost: agreementScore * 0.1 (max +0.1)
- Consensus boost:
  - high: +0.05
  - medium: +0.02
  - low: 0
- Provider count boost: min(numProviders/3, 1) * 0.05 (max +0.05)

Final confidence is capped at 1.0
```

### 4. Full Auditability

All validation data is persisted:

```typescript
MultiLLMValidation {
  id: string
  tenantId: string
  fixId: string
  violationId: string
  wcagCriteria: string
  majorityVoteResult: JSON
  criticReview: JSON
  consensusLevel: 'high' | 'medium' | 'low'
  agreementScore: number
  totalLatency: number
  totalCost: number
  providerResponses: LLMProviderResponse[]
}

LLMProviderResponse {
  provider: 'openai' | 'anthropic' | 'sonar'
  model: string
  fixedCode: string
  explanation: string
  confidence: number
  latency: number
  cost: number
  issues: string[]
  selectedAsBest: boolean
}
```

## API Endpoints

### 1. Generate Fix with Multi-LLM Validation

```http
POST /api/fixes/generate/multi-llm
Content-Type: application/json
Authorization: Bearer <token>

{
  "violationId": "clx123...",
  "wcagCriteria": "1.4.3",
  "issueType": "low_contrast",
  "description": "Text has insufficient contrast ratio",
  "codeLanguage": "html"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fix": {
      "id": "fix_abc123",
      "fixedCode": "<div style=\"color: #1a1a1a; background: #ffffff;\">...",
      "explanation": "Increased contrast ratio to 16:1 (WCAG AAA)",
      "confidenceScore": 0.96,
      "codeLanguage": "html"
    },
    "validation": {
      "id": "val_xyz789",
      "responses": [
        {
          "model": "GPT-4",
          "provider": "openai",
          "output": { /* AIFixResponse */ },
          "latency": 1200,
          "cost": 0.0024
        },
        {
          "model": "Claude-3",
          "provider": "anthropic",
          "output": { /* AIFixResponse */ },
          "latency": 980,
          "cost": 0.0015
        }
      ],
      "majorityVote": { /* AIFixResponse */ },
      "critic": {
        "best": "Claude-3",
        "issues": {
          "GPT-4": ["Minor: Could specify exact color values in comment"],
          "Claude-3": []
        },
        "rationale": "Claude-3 provided the most complete solution with...",
        "agreementScore": 0.92
      },
      "consensusLevel": "high",
      "agreementScore": 0.92,
      "totalLatency": 2850,
      "totalCost": 0.0054
    }
  },
  "message": "Fix generated with 96% confidence using 2 LLM providers (high consensus)"
}
```

### 2. Get Specific Validation

```http
GET /api/fixes/multi-llm/:validationId
Authorization: Bearer <token>
```

### 3. Get Multi-LLM Metrics

```http
GET /api/fixes/multi-llm-metrics
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalValidations": 127,
    "averageAgreementScore": "0.87",
    "consensusBreakdown": {
      "high": 98,
      "medium": 24,
      "low": 5
    },
    "averageLatency": "2340ms",
    "totalCost": "$0.68",
    "averageConfidence": "0.91"
  }
}
```

### 4. List All Validations

```http
GET /api/fixes/multi-llm-validations?limit=20&offset=0&consensusLevel=high
Authorization: Bearer <token>
```

## Configuration

Set up environment variables for each LLM provider:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4  # or gpt-4-turbo

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229  # or claude-3-opus

# Perplexity Sonar Configuration
PERPLEXITY_API_KEY=pplx-...
# or
SONAR_API_KEY=...
```

**Note:** The system will work with any combination of API keys. If only one provider is configured, it will use mock responses for testing.

## Cost Optimization

### Progressive Validation Strategy

To minimize costs while maintaining quality:

1. **Phase 1: Template Check** (Free)
   - Check if a pre-built template exists
   - ~20% of fixes use templates

2. **Phase 2: Single LLM** ($0.002/fix)
   - Use Claude-3 Sonnet (most cost-effective)
   - If confidence ≥ 0.9, stop here

3. **Phase 3: Multi-LLM** ($0.005-0.010/fix)
   - Only for low-confidence or critical fixes
   - Triggers when confidence < 0.9 or WCAG AAA

### Expected Cost Impact

```
Without Multi-LLM:     $0.002/fix × 1,000 fixes = $2.00
With Multi-LLM (100%): $0.007/fix × 1,000 fixes = $7.00 (+250%)
With Progressive:      $0.003/fix × 1,000 fixes = $3.00 (+50%)
```

**Recommended:** Enable multi-LLM validation selectively:
- Critical WCAG violations (A/AA)
- Low single-LLM confidence (< 0.85)
- Complex or novel accessibility issues

## Performance

### Latency Optimization

The system uses parallel API calls to minimize latency:

```
Sequential (3 LLMs):  ~6000ms
Parallel (3 LLMs):    ~2200ms  (fastest provider + critic)
Single LLM fallback:  ~1200ms
```

### Throughput

- **Single request:** ~2.5s end-to-end
- **Batch processing:** Supports concurrency limits
- **Database writes:** Async, non-blocking

## Use Cases

### 1. High-Stakes Accessibility Fixes

For organizations with strict compliance requirements:

```typescript
// Always use multi-LLM for WCAG AA/AAA
if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
  await RemediationEngine.generateFixWithMultiLLM(request);
}
```

### 2. Quality Assurance Layer

Validate AI-generated fixes before applying them:

```typescript
const { fix, validation } = await RemediationEngine.generateFixWithMultiLLM(request);

if (validation.consensusLevel === 'high' && validation.critic.agreementScore >= 0.85) {
  // Automatically approve
  await approveFix(fix.id);
} else {
  // Queue for human review
  await queueForReview(fix.id);
}
```

### 3. Research & Training

Analyze LLM performance across providers:

```typescript
const metrics = await RemediationEngine.getMultiLLMMetrics(tenantId);

// Which provider performs best?
const providerStats = await analyzeProviderPerformance(metrics);
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Agreement Score Distribution**
   - Alert if average drops below 0.75
   - Indicates potential model drift or prompt issues

2. **Consensus Level Breakdown**
   - Monitor the high/medium/low ratio
   - Target: 80%+ high consensus

3. **Provider Availability**
   - Track API failures per provider
   - Implement automatic failover

4. **Cost Tracking**
   - Set budget alerts for multi-LLM usage
   - Monitor cost per fix trend

### Example Monitoring Query

```typescript
const recentValidations = await prisma.multiLLMValidation.findMany({
  where: {
    tenantId,
    createdAt: { gte: last24Hours }
  },
  include: { providerResponses: true }
});

const avgAgreement = average(recentValidations.map(v => v.agreementScore));
const failureRate = recentValidations.filter(v => v.status === 'failed').length / recentValidations.length;

if (avgAgreement < 0.75 || failureRate > 0.05) {
  await sendAlert('Multi-LLM validation quality degradation detected');
}
```

## Troubleshooting

### Common Issues

#### 1. "No LLM API keys available"

**Solution:** Set at least one API key in `.env`:
```env
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

#### 2. "Multi-LLM validation failed"

**Causes:**
- API rate limits exceeded
- Network timeout
- Invalid API keys

**Solution:** Check logs for specific provider errors, implement exponential backoff

#### 3. Low agreement scores

**Causes:**
- Ambiguous prompts
- Novel accessibility issues
- Model version differences

**Solution:** Refine prompts, add more context to requests

## Future Enhancements

### Roadmap

1. **Dynamic Provider Selection** (Q3 2025)
   - Automatically choose providers based on violation type
   - GPT-4 for complex reasoning, Claude for code generation, etc.

2. **Custom Critic Prompts** (Q4 2025)
   - Allow teams to customize the critic review criteria
   - Support domain-specific requirements

3. **Historical Learning** (Q1 2026)
   - Learn from human reviewer feedback
   - Improve consensus algorithms over time

4. **Real-time Streaming** (Q2 2026)
   - Stream responses as they arrive
   - Show progress in UI

## References

- [Original Multi-LLM Script](https://www.perplexity.ai/search/perfect-let-s-set-up-a-multi-l-OpuMZm0BTfq2iIgeaFBycg)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Perplexity API Documentation](https://docs.perplexity.ai)

## Support

For questions or issues:
- GitHub Issues: [wcag-ai-platform/issues](https://github.com/aaj441/wcag-ai-platform/issues)
- Email: support@wcag-ai-platform.com
- Slack: #multi-llm-validation

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
**Authors:** WCAG AI Platform Team
