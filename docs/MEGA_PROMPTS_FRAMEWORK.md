# 10 System Mega Prompts Framework

## Overview

This document provides a comprehensive strategic framework covering the full production operations spectrum for the WCAG AI Platform. The framework consists of 10 production-focused mega prompts addressing key system areas with clear measurability and implementation awareness.

---

## Analysis of Mega Prompt Framework

### Coverage Strengths

✅ **Cross-functional**: Spans AI, infrastructure, security, UX, and business operations
✅ **Metrics-driven**: Each prompt ties to concrete KPIs (cost %, uptime %, success rates)
✅ **Implementation-aware**: Pre-planned dependency ordering and 4-phase structure

---

## The 10 System Mega Prompts

### 1. AI Remediation Engine Optimization
**Objective**: Improve fix acceptance & reduce false positives

**Target Metrics**:
- 95%+ violation detection accuracy
- Reduce false positives by 40%
- Increase fix acceptance rate to 70%

**Key Deliverables**:
- Enhanced violation detection algorithms
- Context-aware code fix suggestions
- Machine learning model for fix validation
- A/B testing framework for remediation quality

**Success Criteria**:
- User satisfaction score > 4.5/5
- Reduction in manual fix rejection
- Improved WCAG compliance scores

---

### 2. Demographic Targeting & Lead Discovery
**Objective**: Intelligent lead generation system

**Target Metrics**:
- 3x increase in qualified leads
- 60% conversion rate from demo to paid
- <$50 customer acquisition cost

**Key Deliverables**:
- AI-powered lead scoring system
- Automated demographic analysis
- Integration with CRM platforms
- Predictive analytics for conversion

**Success Criteria**:
- ROI > 300% on marketing spend
- Lead quality score > 80/100
- Sales cycle reduction by 30%

---

### 3. Deployment Harmony & CI/CD Safety
**Objective**: Zero-downtime deployment with auto-rollback

**Target Metrics**:
- 99.99% deployment success rate
- <5 minute rollback time
- Zero customer-impacting incidents

**Key Deliverables**:
- Blue-green deployment strategy
- Automated health checks
- Canary deployment system
- Automated rollback triggers

**Success Criteria**:
- Mean time to recovery < 5 minutes
- Zero failed deployments in production
- 100% test coverage for critical paths

---

### 4. System Performance Optimization
**Objective**: 10x traffic capacity with 30% cost reduction

**Target Metrics**:
- Support 10x current traffic
- Reduce infrastructure costs by 30%
- API response time < 200ms (p95)

**Key Deliverables**:
- Database query optimization
- CDN integration for static assets
- Caching layer implementation
- Load balancing optimization

**Success Criteria**:
- Page load time < 2 seconds
- Zero performance degradation under load
- Cost per request reduced by 45%

---

### 5. WCAG Compliance Enhancement
**Objective**: 95%+ violation detection accuracy

**Target Metrics**:
- 95%+ true positive rate
- <5% false positive rate
- Support all WCAG 2.1 AAA criteria

**Key Deliverables**:
- Enhanced scanning algorithms
- Multi-browser testing automation
- Accessibility tree analysis
- Screen reader simulation

**Success Criteria**:
- Industry-leading detection accuracy
- Zero missed critical violations
- Compliance certification ready

---

### 6. Multi-Tenant Architecture & Security
**Objective**: Enterprise-grade data isolation

**Target Metrics**:
- 100% data isolation between tenants
- SOC 2 Type II certification
- Zero security incidents

**Key Deliverables**:
- Row-level security implementation
- Encryption at rest and in transit
- Audit logging system
- Access control framework

**Success Criteria**:
- Pass penetration testing
- Enterprise customer adoption > 50%
- Security compliance score 100%

---

### 7. Observability & SLA Compliance
**Objective**: 99.95% uptime SLA enforcement

**Target Metrics**:
- 99.95% uptime (21.6 minutes/month downtime)
- Mean time to detection < 1 minute
- Mean time to resolution < 15 minutes

**Key Deliverables**:
- Real-time monitoring dashboard
- Automated alerting system
- Performance metrics collection
- SLA reporting automation

**Success Criteria**:
- Zero SLA breaches
- 100% incident detection within SLA
- Customer satisfaction > 95%

---

### 8. Frontend Developer Experience
**Objective**: 50% faster feature development

**Target Metrics**:
- 50% reduction in feature development time
- 80% code reusability
- <5% bug rate in production

**Key Deliverables**:
- Component library system
- Design system documentation
- Automated testing framework
- Developer tooling optimization

**Success Criteria**:
- Developer satisfaction > 4.5/5
- Time to first meaningful paint < 1s
- Accessibility compliance by default

---

### 9. Resilience & Graceful Degradation
**Objective**: 99.99% request success rate

**Target Metrics**:
- 99.99% successful request rate
- Graceful degradation for all features
- Zero data loss scenarios

**Key Deliverables**:
- Circuit breaker implementation
- Retry logic with exponential backoff
- Fallback mechanisms
- Service mesh architecture

**Success Criteria**:
- Zero catastrophic failures
- All critical paths have fallbacks
- Customer experience unaffected by partial outages

---

### 10. Cost Optimization & Infrastructure
**Objective**: 45% overall cost reduction

**Target Metrics**:
- 45% reduction in infrastructure costs
- 60% resource utilization efficiency
- 30% reduction in database costs

**Key Deliverables**:
- Auto-scaling policies
- Reserved instance optimization
- Database indexing strategy
- Cold storage implementation

**Success Criteria**:
- Cost per customer reduced by 50%
- Profitability achieved at current scale
- Runway extended by 12 months

---

## Critical Observations

### 1. Metric Interdependencies

Your targets create ripple effects:

- **10x traffic capacity + 45% cost reduction** = requires **aggressive efficiency engineering**
- **99.99% success rate + 99.95% uptime SLA** = **8.76 hours/year** total downtime budget (21.6 min/month uptime + remainder for request failures)
- **The 30% cost reduction for performance contradicts the 45% infrastructure reduction** - these may need reconciliation to avoid conflicts

### 2. Implementation Risk Hotspots

- **AI Remediation Engine**: "Reduce false positives" conflicts with "95%+ violation detection" - this is a precision/recall tradeoff that needs explicit balancing
- **Multi-Tenant Security**: Enterprise isolation at this scale typically **increases** costs initially, conflicting with optimization goals
- **Frontend DX**: 50% faster development may require tooling investments that temporarily reduce resilience metrics

### 3. Missing Integration Layer

There's no explicit prompt for **orchestrating these interdependencies**. Consider adding:

- **System-Wide Tradeoff Management Prompt**: Balances conflicting metrics (cost vs. resilience vs. speed)
- **Cross-Prompt Validation Engine**: Ensures deliverables don't create negative feedback loops

---

## Recommended Immediate Actions

### For Prompt Refinement:

1. **Add constraint clauses** to each prompt: "Improve X while maintaining Y above Z%"
2. **Define failure modes**: What happens if 99.99% success rate drops temporarily during cost optimization?
3. **Specify measurement windows**: Are these metrics monthly, quarterly, or rolling averages?

### For Execution Readiness:

**Priority Options:**
- **Review actual prompt text** for each of the 10 areas
- **Create the 11th "orchestration" prompt** to manage interdependencies
- **Generate a detailed phase-gate checklist** given your dependency ordering
- **Identify which 2-3 prompts should form the MVP launch sequence**

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
**Focus**: Critical infrastructure and security

**Prompts to Execute**:
1. Multi-Tenant Architecture & Security (#6)
2. Observability & SLA Compliance (#7)
3. Deployment Harmony & CI/CD Safety (#3)

**Rationale**: Security and observability are prerequisites for all other improvements. Without proper monitoring and deployment safety, subsequent changes carry excessive risk.

**Success Gates**:
- [ ] SOC 2 compliance framework in place
- [ ] Monitoring dashboard operational
- [ ] Zero-downtime deployment pipeline tested

---

### Phase 2: Performance & Reliability (Weeks 5-8)
**Focus**: Scalability and resilience

**Prompts to Execute**:
4. System Performance Optimization (#4)
9. Resilience & Graceful Degradation (#9)
10. Cost Optimization & Infrastructure (#10)

**Rationale**: With monitoring in place, optimize performance while maintaining resilience. Cost optimization happens alongside performance work to balance the metrics.

**Success Gates**:
- [ ] 10x traffic capacity validated through load testing
- [ ] Circuit breakers implemented for all external dependencies
- [ ] Infrastructure costs reduced by 30% minimum

---

### Phase 3: Product Quality (Weeks 9-12)
**Focus**: Core product improvements

**Prompts to Execute**:
1. AI Remediation Engine Optimization (#1)
5. WCAG Compliance Enhancement (#5)
8. Frontend Developer Experience (#8)

**Rationale**: With a stable, performant platform, focus on improving the core product experience and development velocity.

**Success Gates**:
- [ ] Fix acceptance rate > 70%
- [ ] WCAG detection accuracy > 95%
- [ ] Feature development time reduced by 40%

---

### Phase 4: Growth & Scale (Weeks 13-16)
**Focus**: Business growth and customer acquisition

**Prompts to Execute**:
2. Demographic Targeting & Lead Discovery (#2)

**Rationale**: With a production-ready, high-quality product, activate growth engines to scale customer acquisition.

**Success Gates**:
- [ ] Qualified lead generation 3x baseline
- [ ] Demo-to-paid conversion > 60%
- [ ] CAC < $50

---

## Dependency Ordering

```
Phase 1: Foundation
├── Security & Multi-tenancy
├── Observability
└── CI/CD
    ↓
Phase 2: Performance
├── System Optimization
├── Resilience
└── Cost Reduction
    ↓
Phase 3: Product
├── AI Engine
├── WCAG Enhancement
└── Developer Experience
    ↓
Phase 4: Growth
└── Lead Generation
```

---

## Measurement Framework

### Weekly Metrics
- Deployment success rate
- P95 API response time
- Error rate by service
- Cost per request

### Monthly Metrics
- Uptime percentage
- Customer satisfaction (NPS)
- Feature velocity
- Infrastructure costs

### Quarterly Metrics
- Revenue growth
- Customer acquisition cost
- Churn rate
- Product-market fit score

---

## Risk Mitigation

### Conflicting Metrics Strategy

**Cost vs. Performance Tradeoff**:
- Establish clear priority: Performance degradation is unacceptable
- Cost reductions must maintain or improve response times
- Use reserved instances and auto-scaling to balance both

**Security vs. Development Speed**:
- Security is non-negotiable
- Automate security checks in CI/CD
- Developer training on secure coding practices

**Accuracy vs. Speed Tradeoff (AI Engine)**:
- Implement tiered scanning (fast + comprehensive modes)
- Let users choose speed vs. thoroughness
- Use ML to improve speed without sacrificing accuracy

---

## Next Steps

1. **Review and validate** this framework with engineering leadership
2. **Assign owners** to each of the 10 mega prompt areas
3. **Schedule kickoff** for Phase 1 implementation
4. **Create detailed project plans** for each phase
5. **Set up tracking dashboard** for all target metrics
6. **Establish weekly review cadence** to monitor progress

---

## Questions to Address

- [ ] What is the acceptable tradeoff between detection accuracy and false positives?
- [ ] What is the budget allocation across the 4 phases?
- [ ] Who are the technical owners for each mega prompt?
- [ ] What are the hard deadlines for SOC 2 compliance?
- [ ] What is the target date for 10x traffic capacity?
- [ ] How will we measure "fix acceptance rate" objectively?

---

## Document History

- **Created**: 2025-11-17
- **Last Updated**: 2025-11-17
- **Version**: 1.0
- **Status**: Active
- **Owner**: Platform Engineering Team
