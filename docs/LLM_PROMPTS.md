# WCAG AI Platform — Prompt Pack for Complete Project Development

Purpose: A curated, project-specific set of prompts you can paste into your AI assistant to plan, build, test, and ship changes fast in this repo.

Context to include at the top of any prompt (short):
- Repo: wcag-ai-platform (monorepo)
- Frontend: packages/webapp (React 18 + TypeScript + Vite + Tailwind dark theme)
- Backend: packages/api (Express + TypeScript + in-memory store)
- Shared types: packages/*/src/types.ts (EmailDraft, Violation, ApiResponse)
- Data flow: Webapp ↔ API ↔ data/fintechStore.ts
- Local dev: webapp: 3000; api: 3001

## 1) Initiation, Scope, and Architecture

1. Project charter (tailored): “Act as a PM. Draft a 1-page charter for ‘WCAG AI Platform — Consultant Approval Dashboard’. Include purpose, scope (email drafts + WCAG violations), success metrics (SLA for approvals, % reduction in manual edits), stakeholders (consultants, client eng, compliance), assumptions, out-of-scope, and a 90-day timeline.”
2. SMART objectives: “Write 3 SMART goals for improving the draft→approval→sent flow using current types in packages/*/src/types.ts, target metrics, and a release by [date].”
3. Stakeholders & comms: “List internal/external stakeholders; map power/interest; propose comms cadence and artifacts using docs/ and .github/workflows/.”
4. KPIs: “Propose 6 KPIs spanning quality (WCAG pass rate), velocity (lead time), reliability (error rates), and product (approval turnaround). Include calculation methods.”
5. Requirements (user stories): “Generate user stories for: create/update/approve/send EmailDraft, view Violations, search/filter/sort, and status workflow. Include acceptance criteria referencing ApiResponse<T>.”
6. Non-functional reqs: “List measurable NFRs for performance (webapp <150ms TTFB on local), security (helmet, rate-limit), observability (OpenTelemetry in API), and accessibility targets (WCAG AA).”
7. WBS (repo-aware): “Create a WBS that maps to this repo: API routes (packages/api/src/routes), data ops (data/fintechStore.ts), frontend components (ConsultantApprovalDashboard.tsx, ViolationCard.tsx), deployment (deployment/scripts/deploy.sh). Include durations and dependencies.”
8. Risk register: “Identify 10 risks specific to this stack (e.g., in-memory data loss, LaunchDarkly misconfig, rate limit tuning). Provide probability, impact, mitigations, contingencies.”
9. Stack validation: “Validate the chosen stack for near-term scale. Identify triggers to move from in-memory to DB, and outline a migration plan with minimal code changes.”
10. Architecture blueprint: “Produce a current-state diagram and a phased target-state for adding persistence and auth while preserving current APIs and types.”

## 2) Backend (API) — Design and Implementation

11. Endpoint spec: “Design a versioned drafts API (`/api/drafts`) additions: pagination, status transitions, text search. Provide routes, query params, TS interfaces, and sample ApiResponse.”
12. Validation: “Write Zod (or express-validator) schemas for EmailDraft create/update using packages/api/src/types.ts; show error responses via ApiResponse.”
13. Controller code: “Generate TypeScript handlers for GET/POST/PUT/PATCH in packages/api/src/routes/drafts.ts using data/fintechStore.ts helpers. Keep logging consistent with utils/logger.ts.”
14. Business rules: “Enforce status workflow: draft→pending_review→approved→sent and rejected path. Prevent invalid transitions; return 422 with message.”
15. Search & filters: “Implement server-side filtering (status, date range) and search (recipient, subject, company, body) with safe string ops; add tests.”
16. Metrics: “Instrument endpoints with prom-client in packages/api/src/utils/metrics.ts; expose /metrics and label by route and status.”
17. Security middleware: “Wire helmet and express-rate-limit via middleware/security.ts with sane defaults; document env toggles.”
18. Error handling: “Add centralized error handler that normalizes to ApiResponse; include correlation id and log level guidelines.”
19. LaunchDarkly usage: “Extend services/aiRouter.ts to gate a shadow model call; record drift with utils/metrics.ts; include fallback when LD key missing.”
20. Tests (supertest): “Create Jest + supertest tests for drafts routes covering happy path, invalid status transitions, and search; seed using data/fintechTestData.ts.”

## 3) Frontend (Webapp) — Components and UX

21. Error boundary: “Add robust ErrorBoundary around <ConsultantApprovalDashboard/> in packages/webapp/src/App.tsx to address P0 in PRODUCTION_READINESS_AUDIT.md.”
22. API client: “Implement services/api.ts with typed fetchers that return ApiResponse<T>; handle errors/toasts consistently.”
23. State flows: “Refactor ConsultantApprovalDashboard state transitions to call API (instead of mockData) behind a feature flag; keep dark theme classes.”
24. Forms & validation: “Create reusable input components with Tailwind dark styles; client-side validate EmailDraft (subject, recipient).”
25. Search/sort/filter: “Wire searchQuery, sortBy, filterStatus to API query params; debounce input; ensure empty/edge cases render cleanly.”
26. Violation UI: “Enhance ViolationCard to show wcagCriteria links and copyable codeSnippet; keep severity badges consistent with dark variants.”
27. Accessibility: “Audit keyboard navigation and focus states for the dashboard; propose fixes that meet WCAG AA.”
28. Notifications: “Centralize notifications with a toast service; auto-dismiss success; persist recent errors for debugging.”
29. Performance: “Use React.memo/useMemo effectively in dashboard derived lists; measure with React Profiler and report findings.”
30. Theming: “Confirm all components use bg-gray-* and text-gray-*; fix any light-theme leaks.”

## 4) Data and Types — Consistency and Evolution

31. Type parity: “Diff packages/api/src/types.ts vs packages/webapp/src/types/index.ts and generate a patch to keep them identical.”
32. Narrow unions: “Ensure EmailStatus/ViolationSeverity unions are referenced everywhere; add exhaustive switch handling in UI.”
33. API response typing: “Define ApiResponse<T> helpers on the frontend to unwrap and handle errors; eliminate ‘any’.”
34. Test fixtures: “Create shared JSON fixtures for EmailDraft/Violation mirroring fintechTestData.ts for frontend tests.”
35. Migration plan: “Draft a migration note to replace in-memory store with persistent DB without breaking the public API.”

## 5) Testing & Quality Gates

36. Unit tests (API): “Write Jest unit tests for data/fintechStore.ts (create/update/delete/query) with edge cases.”
37. Integration tests (API): “Supertest the full drafts lifecycle including rejected path; assert ApiResponse shape.”
38. Component tests: “Add React Testing Library tests for ConsultantApprovalDashboard filtering/sorting and validation errors.”
39. Type-check & lint: “Add scripts that run tsc --noEmit and eslint for both packages, and fail on CI.”
40. Accessibility tests: “Propose an accessibility smoke test plan (axe-core) for key dashboard flows.”

## 6) CI/CD, Deployment, Ops

41. GitHub Actions: “Create a workflow that runs lint, type-check, tests for both packages, then builds webapp; attach artifacts.”
42. Release gating: “Add a manual approval step when PRODUCTION_READINESS_AUDIT.md P0/P1 items are open.”
43. Deploy script review: “Analyze deployment/scripts/deploy.sh for idempotency and Windows developer ergonomics; propose improvements.”
44. Health checks: “Verify /health in API and add /ready for readiness; document expected payload.”
45. Observability: “Confirm OpenTelemetry instrumentation paths and add minimal trace context propagation between webapp and API.”

## 7) Security, Compliance, and Cost Controls

46. Security review: “Audit middleware/security.ts and server.ts for headers, CORS, and rate limits; propose defaults for prod vs dev.”
47. Secret handling: “List required env vars (.env.example) for API and webapp; mark sensitive; document fallback behaviors.”
48. Cost controller: “Integrate backend/src/services/costController.js as an optional endpoint (/api/cost/status) with feature flag; return safe summary.”
49. Feature flags: “Define a minimal LaunchDarkly flag contract for model routing; include disabled behavior and test plan.”
50. WCAG coverage: “Map Violation data model to WCAG criteria pages and ensure links and user impact content are consistent across UI.”

How to use this pack:
- Paste a single prompt, and include the short context block above plus relevant file paths.
- Ask for diffs/patches that match this repo’s style and file layout.
- Prefer TS-first solutions, ApiResponse<T> returns, Tailwind dark theme classes, and minimal dependencies.

---

## 8) Runnable Testing Examples (copy/paste ready)

These examples are minimal and align with this repo. They can be adapted into real tests when you’re ready.

### 8.1 API integration test (Jest + supertest)

File: `packages/api/test/drafts.int.test.ts`

```ts
import request from 'supertest';
import express from 'express';
import draftsRouter from '../src/routes/drafts';

// Minimal app wrapper for route testing
const app = express();
app.use(express.json());
app.use('/api/drafts', draftsRouter);

describe('Drafts API', () => {
	it('lists drafts', async () => {
		const res = await request(app).get('/api/drafts');
		expect(res.status).toBe(200);
		expect(res.body?.success).toBe(true);
		expect(Array.isArray(res.body?.data)).toBe(true);
	});

	it('rejects invalid status transition', async () => {
		// assumes a valid draft id exists in in-memory store
		const list = await request(app).get('/api/drafts');
		const draft = list.body.data[0];
		const res = await request(app)
			.patch(`/api/drafts/${draft.id}`)
			.send({ status: 'sent' }); // invalid jump unless approved
		expect([400, 422]).toContain(res.status);
	});
});
```

Run (PowerShell):

```powershell
cd packages/api; if (Test-Path package-lock.json) { npm ci } else { npm install }; npm run build; npm i -D jest @types/jest ts-jest supertest @types/supertest; npx ts-jest config:init; npx jest
```

### 8.2 React component test (React Testing Library)

File: `packages/webapp/src/components/ConsultantApprovalDashboard.test.tsx`

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConsultantApprovalDashboard } from './ConsultantApprovalDashboard';

test('renders dashboard headings and stats', () => {
	render(<ConsultantApprovalDashboard />);
	expect(screen.getByText(/Email drafts/i)).toBeInTheDocument();
});
```

Basic setup (PowerShell):

```powershell
cd packages/webapp; if (Test-Path package-lock.json) { npm ci } else { npm install }; npm i -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom; npx ts-jest config:init; npx jest
```

### 8.3 Accessibility smoke test (axe-core)

File: `packages/webapp/src/components/ConsultantApprovalDashboard.a11y.test.tsx`

```tsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ConsultantApprovalDashboard } from './ConsultantApprovalDashboard';

expect.extend(toHaveNoViolations);

test('dashboard has no critical a11y violations', async () => {
	const { container } = render(<ConsultantApprovalDashboard />);
	const results = await axe(container);
	expect(results).toHaveNoViolations();
});
```

Install (PowerShell):

```powershell
cd packages/webapp; npm i -D jest-axe axe-core
```

---

## 9) LaunchDarkly Model Routing — Flag Contract and Examples

Use consistent flag keys and defaults to keep `services/aiRouter.ts` behavior deterministic without an SDK key.

- Flag keys:
	- `ai:model` (string): e.g., `gpt-4o-mini`
	- `ai:shadowModel` (string | null): e.g., `gpt-4o`
	- `ai:shadowEnabled` (boolean): default false
	- `ai:temperature` (number): default 0.2
	- `ai:maxTokens` (number): default 1024

Prompt to generate code changes:

“Update `packages/api/src/services/aiRouter.ts` to:
- Evaluate the above flags; when LD is unavailable, return these exact defaults.
- If `shadowEnabled` is true and `shadowModel` set, invoke shadow in background and record drift via `utils/metrics.ts`.
- Include structured logs (info/warn/error) via `utils/logger.ts` with `scanId` correlation.”

Minimal evaluation example:

```ts
const cfg = {
	model: (await client?.variation('ai:model', user, 'gpt-4o-mini'))!,
	shadowModel: await client?.variation('ai:shadowModel', user, null as string | null) ?? null,
	shadowEnabled: await client?.variation('ai:shadowEnabled', user, false) ?? false,
	temperature: await client?.variation('ai:temperature', user, 0.2) ?? 0.2,
	maxTokens: await client?.variation('ai:maxTokens', user, 1024) ?? 1024,
};
```

---

## 10) DB Migration Prompt Bundle (In-memory → Postgres)

10.1 High-level plan prompt:
“Design a migration that swaps `data/fintechStore.ts` for a Postgres-backed repo while preserving the public API in `routes/drafts.ts`. Include:
- Schema (tables for drafts, violations, consultants) keyed by `id`.
- Data access layer interfaces mirroring current helper functions.
- Feature flag to toggle between memory and DB.
- Backfill script to load `fintechTestData.ts` into the DB.”

10.2 Repository layer prompt:
“Create `packages/api/src/data/repo.ts` with interfaces and a Postgres implementation using `pg`. Methods: `getAllDrafts`, `getDraftById`, `createDraft`, `updateDraft`, `deleteDraft`, `getAllViolations`. Keep signatures identical to the current helpers.”

10.3 Wiring prompt:
“Refactor `routes/drafts.ts` to import the repository interface only. Add a provider that selects memory or Postgres impl based on `USE_DB=true` env var. No route signature changes.”

10.4 Migration + seed prompt:
“Add `migration.sql` and a seed script `scripts/seed.ts` that converts `fintechTestData.ts` to inserts. Provide Windows PowerShell-friendly commands.”

Suggested PowerShell commands (local dev):

```powershell
# Example: run Postgres locally via Docker (optional)
docker run --name wcag-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# Apply schema (example)
psql -h localhost -U postgres -f packages/api/src/data/migration.sql

# Seed
node packages/api/scripts/seed.js
```
