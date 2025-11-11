# WCAG AI Platform

## Quick Start
```bash
docker-compose up -d
npm install
npx prisma db push
npx tsx apps/scanner/src/scripts/validate.ts
```

## Structure
- `apps/scanner`: Core scanning service
- `apps/dashboard`: Dashboard web application (under development)
- `packages/core`: Confidence scoring engine (MOAT)
- `packages/db`: Prisma schema
- `packages/config`: Configuration utilities
- `packages/utils`: Search helpers

> **Master monorepo: combines all previous experimental and production WCAG AI codebases, automated setup per consolidation protocol.**

***

## Repo Structure

```
/
├── README.md
├── docs/
├── packages/
│   ├── core/
│   ├── api/
│   ├── scanner/
│   ├── overlay/
│   ├── reporting/
│   ├── cli/
│   ├── webapp/
│   └── agent/
├── scripts/
├── .github/
│   ├── workflows/
│   └── issue-templates/
├── test/
├── config/
└── assets/
```

***

## Key Components

### 1. Core
- Shared WCAG rules engine (modular, extensible)
- Accessibility checks, criteria parsing

### 2. API
- REST/GraphQL gateway for scans, reporting, user config
- Auth systems (JWT, OAuth integration options)

### 3. Scanner & Crawler
- Multi-domain crawling, batch scans
- Puppeteer/Playwright test harnesses
- Headless scan workflows

### 4. Overlay
- Live site “visual” accessibility overlay
- Color-coded highlights (e.g. red: non-compliance)
- React/TS and extension support

### 5. Reporting
- Automated PDF/Excel/Markdown report generation
- Custom templates (branding for clients)
- Historical scans and delta reports

### 6. CLI
- Terminal tools for bulk/manual scans and builds
- Easy install (npm, pip, etc)

### 7. WebApp Frontend
- React/TypeScript single-page app (SPA)
- Client, admin, auditor UIs (role-based access)
- Progress dashboards & multi-project management

### 8. Agent/AI Orchestration
- Plug-and-play for Copilot, Claude, Perplexity, etc
- Automated fixing workflows (code suggestions, PRs)
- Personalization engine for scan priorities

### 9. Docs/
- Full platform usage guide
- WCAG references, code samples
- API, CLI, DevOps, agent integration FAQs

***

## DevOps & Automation

- **Monorepo auto-setup:** workflows to combine/merge histories
- **CI/CD:** GitHub Actions for lint/test/build/deploy (Railway & Vercel support)
- **Versioning:** semantic release, changelog autogen
- **Issue templates:** bug, audit, feature, security

***

## Project Goals

- **Single source of accessibility truth.**
- **Turnkey automation for devs, auditors, clients.**
- **Industry-agnostic scan, overlay, and reporting workflows.**
- **Agentic AI-powered fixes and recommendations.**
- **Compliance with WCAG, ADA, Section 508.**

***

## Main Tech Stack

- TypeScript, Python, Node.js, React, Express
- Puppeteer/Playwright (scanning)
- PDFKit/ExcelJS (reports)
- GitHub Actions, Vercel, Railway, Retool

***

## Contributors & History

- All previous contributors (history preserved/merged)
- Unified changelog tracking

***

## License & Attribution

- MIT or Apache 2.0 (choose and document)
- Attributions to open-source WCAG and AI packages

***

## Next Steps

- Import and merge all legacy repos (“experimental,” “prod” WCAG AI, overlays, scripts)
- Refactor for shared config/utility packages
- Initialize docs folder (usage, setup, agent toolkit)
- Build minimal working scanner, overlay, and report generator

***
