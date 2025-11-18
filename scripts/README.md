# Accessibility Testing Scripts

This directory contains automated accessibility testing scripts for the WCAG AI Platform.

## Available Scripts

### 1. accessibility-scan.js

Primary accessibility scanner using axe-core via Puppeteer.

**Usage:**
```bash
# Scan localhost (default)
node scripts/accessibility-scan.js

# Scan specific URL
node scripts/accessibility-scan.js http://localhost:3000

# Via npm script
npm run accessibility:scan
```

**Features:**
- Uses axe-core for WCAG 2.1 Level A & AA testing
- Automatically blocks on critical violations
- Saves results to evidence-vault/scans/
- Detailed violation reporting with impact levels

**Exit Codes:**
- `0` - Success (no critical violations)
- `1` - Failure (critical violations found or error)

### 2. pa11y-scan.js

Alternative accessibility scanner using Pa11y.

**Usage:**
```bash
# Scan localhost (default)
node scripts/pa11y-scan.js

# Scan specific URL
node scripts/pa11y-scan.js http://localhost:3000

# Via npm script
npm run accessibility:pa11y
```

**Features:**
- Uses Pa11y for WCAG 2.1 AA testing
- Detailed error/warning/notice categorization
- Saves results to evidence-vault/scans/
- Includes HTML context for each issue

**Exit Codes:**
- `0` - Success (no errors)
- `1` - Failure (errors found)

### 3. update-evidence-vault.js

Manages the evidence vault structure and generates index files.

**Usage:**
```bash
# Update vault and regenerate index
node scripts/update-evidence-vault.js

# Via npm script
npm run evidence:update
```

**Features:**
- Creates/maintains evidence vault directory structure
- Generates index.json with scan metadata
- Creates README.md with scan summary
- Automatic retention tracking

## CI/CD Integration

The accessibility scanning is automatically triggered by the GitHub Actions workflow:

**Workflow File:** `.github/workflows/accessibility.yml`

**Triggers:**
- Pull requests to `main` or `develop` branches
- Pushes to `main` branch
- Manual workflow dispatch

**What it does:**
1. Builds the application
2. Starts API and webapp servers
3. Runs accessibility scan
4. Updates evidence vault
5. Comments PR with results
6. Blocks merge if critical violations found

## Evidence Vault

All scan results are stored in the `evidence-vault/` directory:

```
evidence-vault/
├── scans/          # Accessibility scan results (JSON)
├── attestations/   # Compliance attestations
├── reports/        # Generated VPAT reports
├── index.json      # Scan index (auto-generated)
└── README.md       # Vault summary (auto-generated)
```

**Retention:** Scan results are retained for 90 days.

## Local Testing

To test accessibility locally:

```bash
# 1. Install dependencies
npm install

# 2. Start the application
# Terminal 1:
cd packages/api && npm run dev

# Terminal 2:
cd packages/webapp && npm run dev

# 3. Run accessibility scan
npm run accessibility:scan

# 4. Or run Pa11y scan
npm run accessibility:pa11y

# 5. Update evidence vault
npm run evidence:update
```

## Violation Severity Levels

### Critical (🔴)
- **Impact:** Severe accessibility barriers
- **Action:** Must be fixed before merging
- **Examples:** Missing alt text, form labels, keyboard navigation

### Serious (🟠)
- **Impact:** Significant barriers for many users
- **Action:** Should be fixed before merging
- **Examples:** Color contrast issues, missing landmarks

### Moderate (🟡)
- **Impact:** Noticeable barriers for some users
- **Action:** Fix when possible
- **Examples:** Redundant alt text, minor ARIA issues

### Minor (🟢)
- **Impact:** Minimal impact
- **Action:** Low priority
- **Examples:** Best practice recommendations

## Troubleshooting

### Puppeteer Installation Issues

If Puppeteer fails to download Chrome:

```bash
# Skip Chrome download during install
PUPPETEER_SKIP_DOWNLOAD=true npm install

# Use system Chrome (GitHub Actions uses this)
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Server Not Starting

If the application server fails to start:

```bash
# Check if port is already in use
lsof -i :3000
lsof -i :3001

# Kill existing processes
killall node

# Restart servers
cd packages/api && npm run dev &
cd packages/webapp && npm run dev &
```

### Scan Timing Out

If scans timeout:

```bash
# Increase timeout in script
# Edit scripts/accessibility-scan.js or scripts/pa11y-scan.js
# Change timeout value (default: 30000ms)
```

## Resources

- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Pa11y Documentation](https://pa11y.org/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
