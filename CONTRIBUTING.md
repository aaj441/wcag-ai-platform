# Contributing to WCAG AI Platform

Thank you for your interest in contributing to the WCAG AI Platform! This guide will help you get started with development, testing, and contributing to the project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Standards](#code-standards)
- [Submitting Changes](#submitting-changes)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js**: v18.0.0 or higher (v20 LTS recommended)
  ```bash
  node --version  # Should be >= 18.0.0
  ```

- **npm**: v9.0.0 or higher
  ```bash
  npm --version  # Should be >= 9.0.0
  ```

- **PostgreSQL**: v14 or higher
  ```bash
  psql --version  # Should be >= 14
  ```

- **Git**: v2.30 or higher
  ```bash
  git --version
  ```

### Optional but Recommended

- **Docker**: For containerized database (alternative to local PostgreSQL)
- **Railway CLI**: For deployment testing
- **Vercel CLI**: For frontend deployment testing

## Getting Started

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/wcag-ai-platform.git
cd wcag-ai-platform
```

### 2. Install Dependencies

This is a monorepo with multiple packages. Install all dependencies:

```bash
# Install root dependencies
npm install

# Install API package dependencies
cd packages/api
npm install

# Install webapp package dependencies
cd ../webapp
npm install

# Return to root
cd ../..
```

### 3. Set Up Environment Variables

#### API Environment Variables

Create a `.env` file in `packages/api/`:

```bash
cd packages/api
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wcag_ai_dev"

# Authentication (Clerk)
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_WEBHOOK_SECRET="your_webhook_secret"

# JWT
JWT_SECRET="your_jwt_secret_for_development"

# APIs (Optional for development)
APOLLO_API_KEY="your_apollo_key"  # For lead discovery
HUNTER_API_KEY="your_hunter_key"  # For email verification
SENDGRID_API_KEY="your_sendgrid_key"  # For email sending

# Stripe (Optional)
STRIPE_SECRET_KEY="your_stripe_secret"
STRIPE_WEBHOOK_SECRET="your_webhook_secret"

# Monitoring (Optional)
SENTRY_DSN="your_sentry_dsn"

# Node Environment
NODE_ENV="development"
PORT=3001
```

#### Webapp Environment Variables

Create a `.env` file in `packages/webapp/`:

```bash
cd packages/webapp
cp .env.example .env
```

Edit with your configuration:

```env
VITE_API_URL="http://localhost:3001"
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
```

### 4. Set Up the Database

#### Option A: Local PostgreSQL

```bash
# Create database
createdb wcag_ai_dev

# Run Prisma migrations
cd packages/api
npx prisma migrate dev --name init

# (Optional) Seed database with test data
npx prisma db seed
```

#### Option B: Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run --name wcag-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=wcag_ai_dev \
  -p 5432:5432 \
  -d postgres:16

# Run migrations (from packages/api)
npx prisma migrate dev --name init
```

### 5. Start Development Servers

Open two terminal windows/tabs:

**Terminal 1 - API Server:**
```bash
npm run dev:api
# API runs on http://localhost:3001
```

**Terminal 2 - Webapp Server:**
```bash
npm run dev:webapp
# Webapp runs on http://localhost:3000
```

### 6. Verify Installation

Visit http://localhost:3000 in your browser. You should see the WCAG AI Platform interface.

## Project Structure

```
wcag-ai-platform/
├── packages/
│   ├── api/                      # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/           # API endpoints
│   │   │   ├── services/         # Business logic
│   │   │   ├── middleware/       # Express middleware
│   │   │   ├── lib/              # Utilities and helpers
│   │   │   ├── data/             # Test/seed data
│   │   │   └── types.ts          # TypeScript type definitions
│   │   ├── prisma/               # Database schema and migrations
│   │   ├── dist/                 # Compiled JavaScript (generated)
│   │   └── tsconfig.json         # TypeScript configuration
│   │
│   └── webapp/                   # React frontend
│       ├── src/
│       │   ├── components/       # React components
│       │   ├── pages/            # Page components
│       │   ├── hooks/            # Custom React hooks
│       │   ├── utils/            # Frontend utilities
│       │   └── types.ts          # Frontend types
│       ├── public/               # Static assets
│       └── tsconfig.json         # TypeScript configuration
│
├── deployment/                   # Deployment configs and scripts
├── automation/                   # Automation scripts (Python/JS)
├── integrations/                 # Third-party integrations
├── docs/                         # Additional documentation
├── legal/                        # Legal documents and templates
├── evidence-vault/               # WCAG scan results
├── .github/workflows/            # CI/CD workflows
└── scripts/                      # Utility scripts
```

## Development Workflow

### Creating a New Feature

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [Code Standards](#code-standards)

3. **Test your changes** thoroughly

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

### Commit Message Format

We follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add WCAG violation detection endpoint
fix(webapp): resolve contrast ratio calculation bug
docs: update setup instructions for Docker
test(api): add unit tests for RemediationEngine
```

## Testing

### Running Tests

#### API Tests
```bash
cd packages/api
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage report
```

#### Frontend Tests
```bash
cd packages/webapp
npm test                    # Run all tests
npm test -- --watch         # Watch mode
```

### Writing Tests

#### API Tests (Jest)

Create test files alongside your source files with `.test.ts` extension:

```typescript
// src/services/RemediationEngine.test.ts
import { RemediationEngine } from './RemediationEngine';

describe('RemediationEngine', () => {
  it('should generate fix for WCAG violation', async () => {
    const fix = await RemediationEngine.generateFix({
      violationId: 'test-violation',
      wcagCriteria: '1.4.3',
      issueType: 'color-contrast',
      description: 'Insufficient color contrast',
    });

    expect(fix).toBeDefined();
    expect(fix.confidenceScore).toBeGreaterThan(0);
  });
});
```

#### Frontend Tests (Vitest + React Testing Library)

```typescript
// src/components/ViolationCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ViolationCard } from './ViolationCard';

describe('ViolationCard', () => {
  it('renders violation details', () => {
    const violation = {
      id: '1',
      wcagCriteria: '1.4.3',
      severity: 'critical',
      description: 'Color contrast issue',
    };

    render(<ViolationCard violation={violation} />);

    expect(screen.getByText('1.4.3')).toBeInTheDocument();
    expect(screen.getByText(/Color contrast issue/i)).toBeInTheDocument();
  });
});
```

### Accessibility Testing

Run automated accessibility scans:

```bash
# Scan a local URL
npm run accessibility:scan http://localhost:3000

# Run Pa11y tests
npm run accessibility:pa11y http://localhost:3000
```

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable `strict` mode in tsconfig.json
- Define explicit types for function parameters and return values
- Avoid `any` type; use `unknown` if type is truly unknown

**Good:**
```typescript
function processViolation(violation: Violation): Promise<Fix> {
  // Implementation
}
```

**Bad:**
```typescript
function processViolation(violation: any): any {
  // Implementation
}
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Security Best Practices

- **Never commit secrets**: Use environment variables
- **Validate all inputs**: Use validation libraries (Zod, Joi)
- **Sanitize outputs**: Prevent XSS attacks
- **Use parameterized queries**: Prisma handles this automatically
- **Review dependencies**: Check for known vulnerabilities

### API Design

- Use RESTful conventions
- Return consistent response formats:
  ```typescript
  {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
  }
  ```
- Use proper HTTP status codes
- Include comprehensive error messages
- Version your APIs (e.g., `/api/v1/...`)

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper TypeScript props interfaces
- Implement error boundaries
- Follow accessibility best practices (WCAG 2.1 AA)

**Example:**
```typescript
interface ViolationCardProps {
  violation: Violation;
  onFix?: (violationId: string) => void;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({
  violation,
  onFix
}) => {
  // Component implementation
};
```

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Ensure README, API docs, and comments are up to date

2. **Run Tests**: All tests must pass
   ```bash
   npm test
   npm run build  # Ensure build succeeds
   ```

3. **Check Code Quality**:
   ```bash
   npm run lint
   npm run format
   ```

4. **Create Pull Request** with:
   - Clear title describing the change
   - Detailed description of what changed and why
   - Link to related issues
   - Screenshots for UI changes
   - Test results

5. **Address Review Comments**: Respond to feedback promptly

6. **Squash Commits**: Before merging, squash commits into logical units

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Accessibility testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
```

## Troubleshooting

### Common Issues

#### TypeScript Compilation Errors

**Problem**: `Cannot find name 'console'` or similar errors

**Solution**: Ensure `tsconfig.json` includes DOM lib:
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"]
  }
}
```

#### Database Connection Errors

**Problem**: `Can't reach database server`

**Solution**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env`
3. Ensure database exists: `createdb wcag_ai_dev`

#### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find process using the port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

#### Missing Dependencies

**Problem**: Module import errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# For monorepo packages
cd packages/api && rm -rf node_modules && npm install
cd packages/webapp && rm -rf node_modules && npm install
```

### Getting Help

- **GitHub Issues**: https://github.com/aaj441/wcag-ai-platform/issues
- **Discussions**: https://github.com/aaj441/wcag-ai-platform/discussions
- **Email**: developers@wcag-ai-platform.com

## Development Resources

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [Postman](https://www.postman.com/) - API testing
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI (`npx prisma studio`)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to WCAG AI Platform!**

If you have questions about this guide, please open an issue or reach out to the maintainers.
