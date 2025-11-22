# AI Comprehensive Audit Prompts for WCAG AI Platform

**Purpose**: Use these 10 comprehensive prompts with AI auditors (like Kimi/Claude/ChatGPT) to extensively verify platform completeness, production readiness, and deployment reproducibility.

**How to Use**: Copy each prompt into your AI assistant, provide access to the repository, and review the detailed audit reports.

---

## 📋 Prompt 1: Complete Production Readiness Audit

```
I need you to conduct a comprehensive production readiness audit of this WCAG AI Platform repository. 

Please audit ALL of the following areas and provide a detailed report with severity levels (P0/P1/P2):

1. **Security Assessment**:
   - Check for exposed secrets, API keys, or credentials
   - Review authentication and authorization implementations
   - Validate input sanitization and XSS protection
   - Check for SQL injection vulnerabilities
   - Review CORS configuration and security headers
   - Assess rate limiting and DDoS protection
   - Check dependency vulnerabilities (npm audit)

2. **Error Handling & Resilience**:
   - React Error Boundaries presence and coverage
   - API error responses and status codes
   - Database connection error handling
   - External service failure handling
   - Timeout configurations
   - Retry logic and circuit breakers
   - Graceful degradation strategies

3. **Data Persistence & Integrity**:
   - Database schema completeness
   - Migration system presence
   - Data validation rules
   - Backup and restore procedures
   - Transaction handling
   - Data retention policies

4. **Monitoring & Observability**:
   - Logging infrastructure
   - Error tracking integration
   - Performance monitoring
   - Health check endpoints
   - Metrics collection
   - Alert configurations

5. **WCAG Compliance**:
   - Accessibility testing coverage
   - ARIA implementation
   - Keyboard navigation
   - Screen reader compatibility
   - Color contrast ratios
   - Focus management
   - Skip links and landmarks

For each issue found, provide:
- Severity level (P0 = blocker, P1 = high, P2 = medium)
- Current state (code snippet)
- Production-ready fix (code example)
- Verification method (how to test)

Generate a final "GO/NO-GO" recommendation for production deployment.
```

---

## 📋 Prompt 2: Deployment Infrastructure Completeness

```
Audit the deployment infrastructure of this WCAG AI Platform for completeness and reproducibility.

Focus on:

1. **Deployment Scripts**:
   - Review all scripts in /deployment/scripts/
   - Check for idempotency (safe to run multiple times)
   - Verify error handling and rollback mechanisms
   - Validate environment variable handling
   - Check for hardcoded values or assumptions
   - Assess logging and progress reporting

2. **Configuration Management**:
   - .env.example files completeness
   - Railway configuration (railway.json, railway.toml)
   - Vercel configuration (vercel.json)
   - Docker configuration if present
   - CI/CD configuration (.github/workflows/)
   - Terraform configurations

3. **Platform Requirements**:
   - Node.js version requirements documented
   - Database setup instructions
   - External service dependencies (OpenAI, Anthropic, etc.)
   - Port configurations
   - SSL/TLS certificate requirements

4. **Verification & Testing**:
   - Pre-deployment validation scripts
   - Post-deployment smoke tests
   - Health check endpoints
   - Load testing capabilities
   - Rollback procedures

5. **Documentation Quality**:
   - README completeness
   - Deployment guides accuracy
   - API documentation
   - Troubleshooting guides
   - Runbook for common issues

For each missing or incomplete component:
- Describe the gap
- Explain the production risk
- Provide implementation guidance
- Estimate effort required (hours/days)

Score the deployment infrastructure on a scale of 1-10 and provide a detailed improvement roadmap.
```

---

## 📋 Prompt 3: Code Quality & Architecture Review

```
Conduct a comprehensive code quality and architecture review of this WCAG AI Platform.

Analyze:

1. **TypeScript/JavaScript Quality**:
   - Type safety (any usage, type assertions)
   - Strict mode compliance
   - Code organization and modularity
   - Naming conventions consistency
   - DRY principle adherence
   - Function complexity (cyclomatic complexity)
   - Dead code detection

2. **React Frontend Architecture**:
   - Component structure and hierarchy
   - State management patterns
   - Props drilling issues
   - useEffect dependencies correctness
   - Performance optimization (useMemo, useCallback)
   - Accessibility implementation
   - Error boundary coverage

3. **Backend API Architecture**:
   - RESTful design adherence
   - Route organization
   - Middleware usage
   - Database query optimization
   - Business logic separation
   - Service layer patterns
   - API versioning

4. **Testing Coverage**:
   - Unit test presence and quality
   - Integration test coverage
   - E2E test scenarios
   - Mock usage appropriateness
   - Test maintainability
   - Coverage percentage by module

5. **Performance Considerations**:
   - Bundle size analysis
   - Code splitting implementation
   - Lazy loading usage
   - Database query efficiency
   - Caching strategies
   - Memory leak risks

6. **Technical Debt**:
   - TODO/FIXME comments audit
   - Deprecated dependency usage
   - Browser compatibility issues
   - Mobile responsiveness
   - Internationalization readiness

Provide:
- Overall code quality score (1-10)
- Top 10 refactoring priorities
- Security concerns in code patterns
- Performance optimization opportunities
- Architectural improvement recommendations

Include specific file paths and line numbers for all findings.
```

---

## 📋 Prompt 4: Database & Data Layer Assessment

```
Audit the database and data layer implementation for production readiness.

Examine:

1. **Schema Design**:
   - Review Prisma schema (packages/api/prisma/schema.prisma)
   - Table normalization assessment
   - Index optimization for common queries
   - Foreign key constraints
   - Data type appropriateness
   - Default values and constraints

2. **Migration System**:
   - Migration file organization
   - Rollback procedures
   - Seeding strategies
   - Version control integration
   - Production migration safety

3. **Data Access Patterns**:
   - Query efficiency analysis
   - N+1 query detection
   - Transaction usage
   - Connection pooling configuration
   - Prepared statement usage
   - ORM best practices compliance

4. **Data Integrity**:
   - Input validation at database level
   - Orphaned record prevention
   - Cascade delete configuration
   - Unique constraint enforcement
   - Check constraint usage

5. **Performance & Scalability**:
   - Query performance analysis
   - Index strategy
   - Caching opportunities
   - Read replica readiness
   - Sharding considerations
   - Database size growth projections

6. **Backup & Recovery**:
   - Backup strategy documentation
   - Point-in-time recovery capability
   - Disaster recovery procedures
   - Data retention policies
   - Compliance requirements (GDPR, etc.)

7. **Current In-Memory Store**:
   - Analyze packages/api/src/data/fintechStore.ts
   - Migration path from in-memory to PostgreSQL
   - Data loss risks
   - Session persistence issues

Provide:
- Database readiness score (1-10)
- Critical migration tasks before production
- Query optimization recommendations
- Backup/recovery implementation plan
- Scalability roadmap
```

---

## 📋 Prompt 5: API Contract & Integration Testing

```
Validate the API contract completeness and integration testing coverage.

Audit:

1. **API Endpoint Coverage**:
   - List all API endpoints (GET, POST, PUT, DELETE, PATCH)
   - Document expected request/response formats
   - Verify HTTP status code usage
   - Check error response consistency
   - Validate pagination implementation
   - Review filtering and sorting capabilities

2. **API Documentation**:
   - OpenAPI/Swagger spec completeness
   - Request parameter documentation
   - Response schema documentation
   - Authentication flow documentation
   - Rate limiting documentation
   - Example requests/responses

3. **Request Validation**:
   - Input validation middleware
   - Required field enforcement
   - Type validation
   - Format validation (email, URL, etc.)
   - Size limits (payload, file uploads)
   - SQL injection prevention
   - XSS prevention

4. **Response Consistency**:
   - ApiResponse<T> wrapper usage
   - Error format standardization
   - Success/failure indication
   - Metadata inclusion (pagination, timestamps)
   - HATEOAS links if applicable

5. **Integration Testing**:
   - Review tests in packages/api/src/__tests__/integration/
   - Test coverage for happy paths
   - Test coverage for error scenarios
   - Authentication/authorization tests
   - Rate limiting tests
   - CORS tests

6. **API Versioning**:
   - Version strategy (/api/v1/)
   - Breaking change handling
   - Deprecation notices
   - Backward compatibility

7. **External Integrations**:
   - OpenAI/Anthropic API error handling
   - HubSpot integration reliability
   - LaunchDarkly feature flags
   - Third-party service mocking in tests

Deliverables:
- Complete API contract document
- Integration test gap analysis
- Test implementation priorities
- API documentation improvement plan
- Backward compatibility checklist
```

---

## 📋 Prompt 6: Frontend Accessibility Deep Dive

```
Conduct an exhaustive WCAG 2.2 Level AA/AAA accessibility audit of the React frontend.

Focus Areas:

1. **Perceivable (WCAG Principle 1)**:
   - 1.1.1: Non-text content (alt text, aria-labels)
   - 1.2.x: Time-based media
   - 1.3.x: Adaptable content (semantic HTML, proper structure)
   - 1.4.x: Distinguishable (color contrast, text sizing, visual presentation)

2. **Operable (WCAG Principle 2)**:
   - 2.1.x: Keyboard accessible (tab order, keyboard shortcuts, no keyboard traps)
   - 2.2.x: Enough time (session timeouts, auto-advancing content)
   - 2.3.x: Seizures and physical reactions
   - 2.4.x: Navigable (skip links, page titles, focus order, link purpose)
   - 2.5.x: Input modalities (pointer gestures, label in name)

3. **Understandable (WCAG Principle 3)**:
   - 3.1.x: Readable (language attribute, abbreviations)
   - 3.2.x: Predictable (consistent navigation, consistent identification)
   - 3.3.x: Input assistance (error identification, labels, error prevention)

4. **Robust (WCAG Principle 4)**:
   - 4.1.x: Compatible (parsing, name/role/value, status messages)

5. **Component-Specific Audit**:
   - ConsultantApprovalDashboard.tsx
   - ViolationCard component
   - Forms and input fields
   - Modals and dialogs
   - Notifications and alerts
   - Navigation menus

6. **Dynamic Content Handling**:
   - aria-live regions
   - Focus management on route changes
   - Screen reader announcements
   - Loading states
   - Error states

7. **Testing Coverage**:
   - Axe-core automated tests
   - Manual keyboard navigation tests
   - Screen reader testing procedures
   - Color blindness testing
   - Zoom/magnification testing (up to 400%)

Provide:
- WCAG 2.2 Level AA compliance percentage
- Detailed violation list with WCAG criterion references
- Remediation code examples for each violation
- Testing procedures for validation
- Browser/AT compatibility matrix
- Legal risk assessment for ADA/Section 508 compliance
```

---

## 📋 Prompt 7: CI/CD Pipeline & DevOps Audit

```
Audit the CI/CD pipeline and DevOps practices for production reliability.

Evaluate:

1. **GitHub Actions Workflows**:
   - Review .github/workflows/ configurations
   - Build pipeline completeness
   - Test execution in CI
   - Deployment automation
   - Branch protection rules
   - PR validation requirements

2. **Build Process**:
   - TypeScript compilation
   - Frontend bundling (Vite)
   - Asset optimization
   - Environment-specific builds
   - Build artifact management
   - Build reproducibility

3. **Testing in CI**:
   - Unit test execution
   - Integration test execution
   - E2E test execution
   - Accessibility test automation
   - Performance testing
   - Security scanning (npm audit, Snyk)
   - Test result reporting
   - Coverage thresholds

4. **Deployment Pipeline**:
   - Deployment trigger mechanisms
   - Environment promotion (dev → staging → prod)
   - Blue-green deployment capability
   - Canary deployment support
   - Rollback procedures
   - Database migration handling

5. **Infrastructure as Code**:
   - Terraform configuration review
   - Railway/Vercel config management
   - Secrets management
   - Environment variable handling
   - Resource provisioning automation

6. **Monitoring & Alerting**:
   - Error tracking setup (Sentry, etc.)
   - Performance monitoring (APM)
   - Uptime monitoring
   - Log aggregation
   - Alert routing
   - On-call procedures

7. **Release Management**:
   - Versioning strategy (semver)
   - Changelog maintenance
   - Release notes generation
   - Deployment frequency
   - Lead time for changes
   - Mean time to recovery (MTTR)

8. **Developer Experience**:
   - Local development setup ease
   - Development environment parity with production
   - Hot reload functionality
   - Debug tooling
   - Documentation quality

Deliverables:
- CI/CD maturity score (1-10)
- Pipeline optimization recommendations
- Missing automation opportunities
- Security vulnerability remediation
- DevOps best practices compliance checklist
- Incident response readiness assessment
```

---

## 📋 Prompt 8: Environment Configuration & Secrets Management

```
Audit environment configuration, secrets management, and operational security.

Investigate:

1. **Environment Variables**:
   - Review .env.example files in all packages
   - Completeness of required variables
   - Sensitive data identification
   - Default value safety
   - Documentation accuracy

2. **Secrets Management**:
   - API key storage mechanisms
   - Database credentials handling
   - Third-party service tokens
   - JWT secret management
   - Encryption key management
   - Secret rotation procedures

3. **Configuration Per Environment**:
   - Local development config
   - CI/CD config
   - Staging environment config
   - Production environment config
   - Configuration validation on startup
   - Configuration documentation

4. **Railway Configuration**:
   - Review railway.json and railway.toml
   - Environment variable setup
   - Service dependencies
   - Resource limits
   - Health check configuration
   - Auto-scaling settings

5. **Vercel Configuration**:
   - Review vercel.json
   - Build settings
   - Environment variables
   - Redirects and rewrites
   - Headers configuration
   - Edge function configuration

6. **Security Best Practices**:
   - No hardcoded secrets in code
   - .gitignore completeness
   - Secret scanner in CI/CD
   - Least privilege principle
   - Encryption at rest
   - Encryption in transit (TLS)

7. **Operational Concerns**:
   - Configuration change process
   - Secret rotation frequency
   - Access control (who can view/modify)
   - Audit logging of config changes
   - Disaster recovery procedures
   - Compliance requirements (SOC2, HIPAA, etc.)

8. **Third-Party Services**:
   - OpenAI API key management
   - Anthropic API key management
   - HubSpot integration credentials
   - LaunchDarkly SDK keys
   - Database connection strings
   - Redis/cache credentials

Provide:
- Configuration security score (1-10)
- Exposed secret detection results
   - Secret management improvement plan
- Environment parity checklist
- Compliance gap analysis
- Incident response plan for credential compromise
```

---

## 📋 Prompt 9: Performance, Scalability & Load Testing

```
Assess the platform's performance characteristics and scalability readiness.

Analyze:

1. **Frontend Performance**:
   - Bundle size analysis (target: <250KB initial)
   - Code splitting implementation
   - Lazy loading of routes/components
   - Image optimization
   - Font loading strategy
   - Third-party script impact
   - Service worker/PWA implementation

2. **Backend Performance**:
   - API response time benchmarks (<200ms target)
   - Database query performance
   - Caching implementation (Redis, in-memory)
   - Rate limiting impact
   - Middleware overhead
   - CPU and memory profiling

3. **Core Web Vitals**:
   - Largest Contentful Paint (LCP < 2.5s)
   - First Input Delay (FID < 100ms)
   - Cumulative Layout Shift (CLS < 0.1)
   - Time to First Byte (TTFB < 800ms)
   - First Contentful Paint (FCP < 1.8s)

4. **Load Testing**:
   - Review deployment/scripts/load-test.js
   - Concurrent user capacity
   - Requests per second limits
   - Database connection pool sizing
   - Memory usage under load
   - CPU usage under load
   - Error rate under stress

5. **Scalability Architecture**:
   - Horizontal scaling capability
   - Stateless service design
   - Database scaling strategy
   - CDN usage for static assets
   - Load balancer configuration
   - Auto-scaling policies

6. **Bottleneck Identification**:
   - Database as bottleneck
   - External API dependencies
   - Synchronous processing limits
   - In-memory store limitations
   - File system I/O constraints

7. **Optimization Opportunities**:
   - Database query optimization
   - API response caching
   - Frontend asset optimization
   - Background job processing
   - Async/await optimization
   - Connection pooling tuning

8. **Monitoring & Metrics**:
   - Application Performance Monitoring (APM)
   - Real User Monitoring (RUM)
   - Error rate tracking
   - Apdex score
   - P95/P99 latency metrics

Deliverables:
- Performance baseline report
- Load testing results summary
- Scalability bottleneck analysis
- Optimization priority matrix
- Capacity planning recommendations
- Performance budget definition
```

---

## 📋 Prompt 10: End-to-End User Journey & Business Logic Validation

```
Validate all critical user journeys and business logic completeness for production.

Test Scenarios:

1. **Consultant Onboarding Journey**:
   - Initial account creation
   - Profile setup and configuration
   - API key configuration (OpenAI/Anthropic)
   - First project creation
   - Learning curve assessment
   - Documentation clarity

2. **Email Draft Workflow**:
   - Create new draft
   - Add WCAG violations
   - Edit draft content
   - Submit for review
   - Approve draft
   - Send email
   - Track sent status
   - Draft versioning/history

3. **Violation Management**:
   - Detect violations (automated scanning)
   - Categorize by severity
   - Generate remediation guidance
   - Track violation resolution
   - Compliance reporting
   - Historical violation tracking

4. **Client Management**:
   - Add new client/consultant
   - HubSpot integration sync
   - Contact management
   - Communication history
   - Client portal access
   - Invoice/billing integration

5. **AI-Powered Features**:
   - Site transformation API
   - AI code generation
   - WCAG compliance validation
   - Automated email generation
   - Proposal generation
   - VPAT report generation

6. **Dashboard & Reporting**:
   - Consultant metrics dashboard
   - Revenue tracking
   - Project pipeline view
   - Compliance status overview
   - Client satisfaction metrics
   - Performance analytics

7. **Error Scenarios**:
   - Network failures
   - API timeout handling
   - Invalid input handling
   - Database connection loss
   - External service downtime
   - Concurrent edit conflicts

8. **Data Consistency**:
   - Email status transitions
   - Violation linkage integrity
   - Audit trail completeness
   - Timestamp accuracy
   - User action attribution

9. **Business Rules Validation**:
   - Email approval workflow logic
   - Status state machine correctness
   - Permission/role enforcement
   - Data retention policies
   - Rate limiting business logic
   - Pricing tier enforcement

10. **Integration Points**:
    - OpenAI/Anthropic API
    - HubSpot CRM sync
    - LaunchDarkly feature flags
    - Email delivery service
    - Payment processing (Stripe)
    - Analytics tracking

Deliverables:
- User journey completion report (% success rate)
- Business logic validation matrix
- Critical bug list with severity
- User experience friction points
- Integration reliability assessment
- Production readiness scorecard (1-100)
- Go-live risk assessment
- Post-launch monitoring plan

Test each journey both manually and with automated E2E tests. Document:
- Expected behavior
- Actual behavior
- Edge cases
- Error handling
- User feedback mechanisms
- Rollback procedures
```

---

## 🎯 How to Use These Prompts

### For Comprehensive Auditing:
1. **Sequential Execution**: Run prompts 1-10 in order for complete coverage
2. **Parallel Execution**: Assign different prompts to team members simultaneously
3. **Iterative Refinement**: Re-run prompts after fixes to validate improvements

### For Targeted Auditing:
- **Security Focus**: Prompts 1, 8
- **Code Quality**: Prompts 3, 4
- **Deployment**: Prompts 2, 7
- **Accessibility**: Prompts 6
- **Performance**: Prompt 9
- **End-User**: Prompt 10
- **API**: Prompt 5

### Expected Outcomes:
Each prompt should generate:
- ✅ Detailed findings with severity levels
- 📊 Quantitative metrics/scores
- 🔧 Specific remediation recommendations
- 📝 Code examples for fixes
- ✨ Best practices guidance
- 🚀 Production readiness assessment

### Success Criteria:
Platform is production-ready when:
- All P0 (blocker) issues resolved: 100%
- All P1 (high) issues resolved: >90%
- WCAG AA compliance: >95%
- Performance score: >8/10
- Security score: >9/10
- Test coverage: >80%
- Documentation completeness: >90%

---

## 📈 Audit Tracking

Create a tracking spreadsheet with:
- Prompt ID
- Auditor Name
- Completion Date
- Issues Found (P0/P1/P2)
- Issues Resolved
- Overall Score
- Status (In Progress/Complete)
- Notes

Example:
```
| Prompt | Auditor | Date | P0 | P1 | P2 | Score | Status | Notes |
|--------|---------|------|----|----|----|----|--------|-------|
| 1      | Kimi    | 11/18| 3  | 7  | 12 | 6/10| Done   | See report |
| 2      | Claude  | 11/19| 1  | 4  | 8  | 7/10| Done   | Config gaps |
```

---

**Last Updated**: November 18, 2025
**Version**: 1.0
**Maintainer**: WCAG AI Platform Team
