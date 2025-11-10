# WCAG AI Platform

## Quick Start
```
docker-compose up -d
npm install
npx prisma db push
npx tsx apps/scanner/src/scripts/validate.ts
```

## Structure
- `apps/scanner`: Core scanning service
- `packages/core`: Confidence scoring engine (MOAT)
- `packages/db`: Prisma schema
- `packages/utils`: Search helpers

## Validation Protocol
1. Send 5 emails
2. Track replies
3. If ≥4 replies, scale. Else pivot.
