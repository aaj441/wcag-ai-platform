# 🚀 WCAG AI Platform Automation Checklist

## Infrastructure

- [ ] Consolidate all codebases into master monorepo
- [ ] Set up `.gitignore` to protect secrets
- [ ] Configure Docker Compose for local dev and Prisma for DB
- [ ] Enable automated CI/CD (GitHub Actions)
- [ ] Activate Copilot auto-review for PRs

## Validation Protocol (48 Hours)

### 1. Prep & Run Script
- [ ] `cd wcag-ai-platform`
- [ ] `docker-compose up -d`
- [ ] `npx prisma db push`
- [ ] `npx tsx apps/scanner/src/scripts/validate.ts`
- [ ] Confirm successful output (leads discovered/audited; PDFs/emails generated in `/output/`)

### 2. Manual QA
- [ ] Open `/output/` folder
- [ ] Review each email and PDF
- [ ] Evaluate: “Would I reply?” (yes/no per item)
- [ ] Tune prompt in `EmailGenerationAgent.ts` if needed

### 3. Prospect Outreach
- [ ] Send emails manually from business account (no automation)
- [ ] Personalize subject line (company name)
- [ ] Attach correct PDF per company

### 4. Tracking & Decision Gate
- [ ] Log outreach in Google Sheet
- [ ] Track opens/replies; update next steps
- [ ] Review status after 48h:
  - [ ] If ≥4 replies: proceed to next roadmap stage
  - [ ] If 2-3 replies: tune prompts, retry vertical (NO new features)
  - [ ] If ≤1 reply: pivot product or messaging

## Blockers (Immediate Attention)
- [ ] `npm install` fails? → Check Node/version/cache
- [ ] `prisma db push` fails? → Check Docker/.env
- [ ] Validation script errors? → Check OpenAI key/quota
- [ ] No emails generated? → Inspect output folder permissions
- [ ] Emails generic? → Tune email generation prompt

## CI/CD & Maintenance
- [ ] Monitor CI/CD build logs for errors
- [ ] Review Copilot PR checks (code quality only, not business value)
- [ ] Refactor incrementally only after validation

***