# Integration Layer
## WCAG AI Platform - External Service Connectors

This directory contains integration connectors for external services across the multi-platform business model.

## Overview

The integration layer provides standardized connectors to:
- **CRM Systems**: HubSpot, Zoho for lead management
- **Insurance APIs**: Medicare.gov, insurance carrier APIs for plan lookups
- **Music Platforms**: Spotify, Apple Music, Last.fm for metadata sync
- **WCAG Validators**: Enhanced accessibility scanning engines

## Directory Structure

```
integrations/
├── crm/                    # CRM integrations
│   ├── hubspot_connector.js    (Planned)
│   └── zoho_connector.js       (Planned)
├── insurance_api/          # Insurance platform APIs
│   ├── medicare_quoter.js      (Planned)
│   └── carrier_api.js          (Planned)
├── music_api/              # Music streaming platforms
│   ├── sync_licensing.js       (Planned)
│   └── platform_sync.js        (Planned)
└── wcag_validator/         # Accessibility scanners
    └── enhanced_validator.js   (Planned)
```

## Status: Phase 2 Implementation

### Why Deferred?
The existing codebase already has robust integrations in `/packages/api/src/services/`:
- `aiRouter.ts` - AI model routing with LaunchDarkly
- `sendgridService.ts` - Email integration
- Various orchestration services for scanning

These existing services are sufficient for the MVP launch. The integration layer in this directory will be implemented in Phase 2 as the business scales and requires:
1. More sophisticated CRM automation
2. Real-time insurance API integrations
3. Advanced music platform features
4. Enhanced WCAG validation engines

## Planned Integrations (Phase 2)

### 1. HubSpot CRM Connector
**Purpose**: Automated lead management and pipeline tracking

**Features** (Planned):
- Automatic contact creation from email drafts
- Deal stage progression tracking
- Activity logging (emails, calls, meetings)
- Custom properties for WCAG project data
- Integration with existing `/packages/api/src/services/hubspot.ts`

**Priority**: Medium (Month 2-3)

### 2. Medicare API Integration
**Purpose**: Real-time plan lookups and quotes

**Features** (Planned):
- Medicare Advantage plan search by ZIP code
- Supplemental insurance comparisons
- ACA Marketplace plan lookups
- Carrier-specific API integrations

**Priority**: Medium (Month 3-4 after first insurance clients)

### 3. Music Licensing Workflow
**Purpose**: Automated sync licensing management

**Features** (Planned):
- Licensing agreement tracking
- Royalty calculation and reporting
- Multi-platform distribution management
- Rights holder communication

**Priority**: Low (Month 6+ after music SaaS launch)

### 4. Enhanced WCAG Validator
**Purpose**: Multi-engine accessibility scanning

**Features** (Planned):
- Aggregation across axe-core, WAVE, Pa11y
- Custom WCAG 2.2 rule implementations
- Machine learning for false positive reduction
- Parallel scanning for performance

**Priority**: High (Month 2 to differentiate from competitors)

## Usage Pattern (When Implemented)

### Standard Integration Interface
```javascript
// Example: Future HubSpot integration
import { HubSpotConnector } from './integrations/crm/hubspot_connector';

const hubspot = new HubSpotConnector({
  apiKey: process.env.HUBSPOT_API_KEY,
  retryAttempts: 3,
  timeout: 10000
});

// Create contact from email draft
const contact = await hubspot.createContact({
  email: draft.recipient,
  firstName: draft.recipientName,
  company: draft.company,
  source: 'wcag_ai_platform'
});

// Create deal
const deal = await hubspot.createDeal({
  contactId: contact.id,
  dealName: `WCAG Audit - ${draft.company}`,
  amount: 7500,
  stage: 'proposal_sent'
});
```

### Error Handling
```javascript
try {
  await connector.performAction();
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Implement exponential backoff
    await sleep(error.retryAfter * 1000);
    await connector.performAction();
  } else {
    logger.error('Integration error', error);
    // Fallback to manual process
  }
}
```

## Integration Best Practices

### 1. Rate Limiting
- Implement exponential backoff for API rate limits
- Use Redis for distributed rate limit tracking
- Monitor API usage against quotas

### 2. Retry Logic
- 3 retry attempts with exponential backoff
- Idempotency keys for critical operations
- Circuit breaker pattern for failing services

### 3. Caching
- Cache frequently accessed data (15-60 minutes)
- Use Redis for shared cache across instances
- Invalidate cache on data mutations

### 4. Monitoring
- Log all API calls with request/response times
- Alert on error rates > 5%
- Track API costs and usage metrics

### 5. Security
- Never log API keys or sensitive data
- Use AWS Secrets Manager for credentials
- Rotate API keys quarterly
- Validate webhook signatures

## Current Workarounds (Until Phase 2)

### CRM Integration
**Current**: Manual contact entry in HubSpot
**Automation**: Email drafts exported to CSV, bulk import to HubSpot
**Future**: Real-time sync via `hubspot_connector.js`

### Insurance APIs
**Current**: Manual plan lookups on Medicare.gov
**Automation**: Python script for batch ZIP code lookups
**Future**: Real-time API integration with caching

### Music Platforms
**Current**: Manual metadata updates per platform
**Automation**: `automation/music_metadata_sync.py` batch script
**Future**: Real-time webhook-based synchronization

### WCAG Validation
**Current**: axe-core + Pa11y command-line tools
**Automation**: Existing `/packages/api/src/services/orchestration/`
**Future**: Aggregated multi-engine validation with ML

## Development Roadmap

### Phase 2A: CRM Integration (Month 2)
- [ ] HubSpot connector with OAuth 2.0
- [ ] Automatic contact/deal creation
- [ ] Activity logging
- [ ] Custom WCAG project fields
- **Estimated Effort**: 20 hours

### Phase 2B: Insurance APIs (Month 3-4)
- [ ] Medicare.gov API wrapper
- [ ] Carrier-specific integrations
- [ ] Plan comparison engine
- [ ] Quote generation automation
- **Estimated Effort**: 30 hours

### Phase 2C: Music Enhancements (Month 6+)
- [ ] Spotify/Apple Music webhook handlers
- [ ] Automated licensing workflows
- [ ] Royalty calculation engine
- [ ] Multi-platform distribution
- **Estimated Effort**: 40 hours

### Phase 2D: WCAG Validator (Month 2)
- [ ] Multi-engine aggregation
- [ ] WCAG 2.2 support
- [ ] ML-powered false positive reduction
- [ ] Performance optimization (parallel scans)
- **Estimated Effort**: 50 hours

**Total Phase 2 Effort**: 140 hours (~3.5 weeks full-time)

## Testing Strategy

### Integration Tests
```javascript
// Example test structure
describe('HubSpotConnector', () => {
  let connector;
  
  beforeEach(() => {
    connector = new HubSpotConnector({
      apiKey: process.env.TEST_HUBSPOT_API_KEY
    });
  });
  
  it('should create contact with valid data', async () => {
    const contact = await connector.createContact({
      email: 'test@example.com',
      firstName: 'Test'
    });
    
    expect(contact.id).toBeDefined();
    expect(contact.email).toBe('test@example.com');
  });
  
  it('should handle rate limit errors', async () => {
    // Mock rate limit response
    // Verify exponential backoff
  });
});
```

### Mock Services
- Use Polly.js for HTTP recording/replay
- Mock API responses for CI/CD
- Test error scenarios (timeouts, rate limits)

## Documentation Requirements

Each integration should include:
1. **README.md**: Setup guide and API documentation
2. **EXAMPLES.md**: Code examples for common use cases
3. **TROUBLESHOOTING.md**: Common issues and solutions
4. **API_REFERENCE.md**: Full API surface documentation

## Cost Estimates (Phase 2)

### API Usage Costs (Monthly)
| Service | Free Tier | Paid Tier | Expected Cost |
|---------|-----------|-----------|---------------|
| HubSpot | 1M contacts | $45/mo | $0 (free tier) |
| Medicare.gov | Free | N/A | $0 |
| Spotify API | 2,000 requests | N/A | $0 (within limits) |
| Apple Music | 500 requests | Enterprise | TBD |
| **Total** | | | **$0-$100/month** |

### Development Costs
- **Contractor Rate**: $50-$100/hour
- **Total Hours**: 140 hours
- **Total Cost**: $7,000-$14,000

### ROI Calculation
- **Time Saved**: 10 hours/week manual work
- **Hourly Value**: $100/hour (consultant time)
- **Annual Savings**: $52,000
- **Payback Period**: 1.5-3 months

## Support & Contributions

### Getting Help
- **GitHub Issues**: Tag with `integration` label
- **Documentation**: See individual integration READMEs
- **Email**: dev@wcagaiplatform.com

### Contributing
1. Create feature branch: `git checkout -b integration/feature-name`
2. Follow existing code patterns
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## Related Resources

- **Automation Scripts**: `/automation/README.md`
- **API Services**: `/packages/api/src/services/`
- **Configuration**: `/config/.env.example`
- **Secrets Management**: `/config/secrets-manager.ts`

---

**Status**: 🚧 Phase 2 Planning  
**Priority**: Medium (after MVP launch)  
**Estimated Start Date**: Month 2-3 (January-February 2026)  
**Dependencies**: Successful MVP launch, first 5 clients acquired  
**Owner**: Engineering team  
**Last Updated**: November 2025
