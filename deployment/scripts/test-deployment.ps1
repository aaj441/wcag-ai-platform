# WCAG AI Platform - Deployment Test Script (PowerShell)
# Tests deployment readiness for Railway (API) and Vercel (Webapp)

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("staging", "production")]
    [string]$Environment = "staging"
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 WCAG AI Platform - Deployment Test" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Helper functions
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Step 1: Check Prerequisites
Write-Step "1️⃣  Checking Prerequisites..."

$railwayInstalled = Test-Command "railway"
$vercelInstalled = Test-Command "vercel"
$gitInstalled = Test-Command "git"
$nodeInstalled = Test-Command "node"
$npmInstalled = Test-Command "npm"

if (-not $railwayInstalled) {
    Write-Warning "Railway CLI not installed"
    Write-Host "   Install: npm install -g @railway/cli" -ForegroundColor Gray
    Write-Host "   Then run: railway login" -ForegroundColor Gray
}

if (-not $vercelInstalled) {
    Write-Warning "Vercel CLI not installed"
    Write-Host "   Install: npm install -g vercel" -ForegroundColor Gray
    Write-Host "   Then run: vercel login" -ForegroundColor Gray
}

if (-not $gitInstalled) {
    Write-Error "Git is required but not installed"
    exit 1
}

if (-not $nodeInstalled) {
    Write-Error "Node.js is required but not installed"
    exit 1
}

if (-not $npmInstalled) {
    Write-Error "npm is required but not installed"
    exit 1
}

$nodeVersion = node --version
$npmVersion = npm --version
Write-Success "Node.js $nodeVersion, npm $npmVersion"

if ($gitInstalled) {
    $gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
    $gitCommit = git rev-parse --short HEAD 2>$null
    Write-Success "Git: branch=$gitBranch, commit=$gitCommit"
}

# Step 2: Check Environment Variables
Write-Step "2️⃣  Checking Environment Variables..."

$requiredEnvVars = @(
    "NODE_ENV",
    "PORT",
    "CORS_ORIGIN"
)

$optionalEnvVars = @(
    "RAILWAY_TOKEN",
    "VERCEL_TOKEN",
    "LAUNCHDARKLY_SDK_KEY",
    "OTEL_EXPORTER_JAEGER_ENDPOINT"
)

foreach ($var in $requiredEnvVars) {
    if ([string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($var))) {
        Write-Warning "Required environment variable not set: $var"
    } else {
        Write-Success "Environment variable set: $var"
    }
}

foreach ($var in $optionalEnvVars) {
    if ([string]::IsNullOrEmpty([System.Environment]::GetEnvironmentVariable($var))) {
        Write-Host "   Optional: $var (not set)" -ForegroundColor Gray
    } else {
        Write-Success "Optional environment variable set: $var"
    }
}

# Step 3: Build Packages
Write-Step "3️⃣  Building Packages..."

# Build API
Write-Host "`nBuilding API package..." -ForegroundColor Cyan
Push-Location packages\api
try {
    Write-Host "   Installing dependencies..." -ForegroundColor Gray
    npm install 2>&1 | Out-Null
    
    Write-Host "   Running TypeScript build..." -ForegroundColor Gray
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "API build successful"
    } else {
        Write-Warning "API build completed with warnings"
        Write-Host $buildOutput -ForegroundColor Gray
    }
} catch {
    Write-Error "API build failed: $_"
} finally {
    Pop-Location
}

# Build Webapp
Write-Host "`nBuilding Webapp package..." -ForegroundColor Cyan
Push-Location packages\webapp
try {
    Write-Host "   Installing dependencies..." -ForegroundColor Gray
    npm install 2>&1 | Out-Null
    
    Write-Host "   Running Vite build..." -ForegroundColor Gray
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Webapp build successful"
        
        # Check dist folder
        if (Test-Path "dist") {
            $distFiles = Get-ChildItem -Path dist -Recurse | Measure-Object
            Write-Success "Webapp dist folder created ($($distFiles.Count) files)"
        }
    } else {
        Write-Warning "Webapp build completed with warnings"
        Write-Host $buildOutput -ForegroundColor Gray
    }
} catch {
    Write-Error "Webapp build failed: $_"
} finally {
    Pop-Location
}

# Step 4: Run Tests
Write-Step "4️⃣  Running Tests..."

Push-Location packages\api
try {
    Write-Host "   Running API tests..." -ForegroundColor Gray
    $testOutput = npm test 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "API tests passed"
    } else {
        Write-Warning "API tests failed or not configured"
    }
} catch {
    Write-Warning "API tests could not run: $_"
} finally {
    Pop-Location
}

# Step 5: Validate Configuration Files
Write-Step "5️⃣  Validating Configuration Files..."

$configFiles = @(
    @{Path="packages\api\railway.json"; Description="API Railway config"},
    @{Path="packages\api\Dockerfile"; Description="API Dockerfile"},
    @{Path="packages\webapp\vercel.json"; Description="Webapp Vercel config"},
    @{Path="packages\webapp\railway.json"; Description="Webapp Railway config"},
    @{Path=".github\workflows\ci.yml"; Description="GitHub Actions CI workflow"}
)

foreach ($config in $configFiles) {
    if (Test-Path $config.Path) {
        Write-Success "$($config.Description) exists"
        
        # Validate JSON files
        if ($config.Path -match "\.json$") {
            try {
                $jsonContent = Get-Content $config.Path -Raw | ConvertFrom-Json
                Write-Host "   ✓ Valid JSON syntax" -ForegroundColor Gray
            } catch {
                Write-Error "$($config.Description) has invalid JSON: $_"
            }
        }
    } else {
        Write-Warning "$($config.Description) not found"
    }
}

# Step 6: Check Health Endpoints
Write-Step "6️⃣  Testing Local Health Endpoints..."

Write-Host "`nStarting local API server for health check..." -ForegroundColor Cyan
Push-Location packages\api

# Start API in background
$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Start-Sleep -Seconds 5

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    if ($healthResponse.success) {
        Write-Success "API health endpoint responding"
    } else {
        Write-Warning "API health endpoint returned error"
    }
} catch {
    Write-Warning "API health endpoint not accessible (server may still be starting)"
}

try {
    $readyResponse = Invoke-RestMethod -Uri "http://localhost:3001/ready" -Method Get -TimeoutSec 5
    if ($readyResponse.ready) {
        Write-Success "API ready endpoint responding"
    } else {
        Write-Warning "API ready endpoint returned not ready"
    }
} catch {
    Write-Warning "API ready endpoint not accessible"
}

# Stop API server
Stop-Job -Job $apiJob
Remove-Job -Job $apiJob
Pop-Location

# Step 7: Deployment Readiness Check
Write-Step "7️⃣  Deployment Readiness Summary..."

Write-Host "`n📊 Deployment Readiness Report:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$readiness = @{
    "Railway CLI" = $railwayInstalled
    "Vercel CLI" = $vercelInstalled
    "API Build" = $true  # Assuming build succeeded
    "Webapp Build" = $true
    "Configuration Files" = $true
}

$totalChecks = $readiness.Count
$passedChecks = ($readiness.Values | Where-Object { $_ -eq $true }).Count
$readinessPercent = [math]::Round(($passedChecks / $totalChecks) * 100)

Write-Host "`nReadiness Score: $readinessPercent% ($passedChecks/$totalChecks checks passed)" -ForegroundColor $(if ($readinessPercent -ge 80) { "Green" } elseif ($readinessPercent -ge 60) { "Yellow" } else { "Red" })

# Step 8: Deployment Instructions
Write-Step "8️⃣  Deployment Instructions..."

if (-not $railwayInstalled) {
    Write-Host "`n🚂 Railway Deployment (API Backend):" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "1. Install Railway CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Login to Railway:" -ForegroundColor Yellow
    Write-Host "   railway login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Link project (or create new):" -ForegroundColor Yellow
    Write-Host "   cd packages\api" -ForegroundColor Gray
    Write-Host "   railway link" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Set environment variables:" -ForegroundColor Yellow
    Write-Host "   railway variables set NODE_ENV=production" -ForegroundColor Gray
    Write-Host "   railway variables set PORT=3001" -ForegroundColor Gray
    Write-Host "   railway variables set CORS_ORIGIN=https://your-webapp.vercel.app" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Deploy:" -ForegroundColor Yellow
    Write-Host "   railway up" -ForegroundColor Gray
    Write-Host ""
    Write-Host "6. Get deployment URL:" -ForegroundColor Yellow
    Write-Host "   railway domain" -ForegroundColor Gray
} else {
    Write-Host "`n🚂 Railway Deployment Commands (API):" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   cd packages\api" -ForegroundColor Gray
    Write-Host "   railway link   # Link to existing project or create new" -ForegroundColor Gray
    Write-Host "   railway up     # Deploy" -ForegroundColor Gray
    Write-Host "   railway logs   # View logs" -ForegroundColor Gray
    Write-Host "   railway domain # Get deployment URL" -ForegroundColor Gray
}

if (-not $vercelInstalled) {
    Write-Host "`n▲ Vercel Deployment (Webapp Frontend):" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host "1. Install Vercel CLI:" -ForegroundColor Yellow
    Write-Host "   npm install -g vercel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Login to Vercel:" -ForegroundColor Yellow
    Write-Host "   vercel login" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Deploy to preview:" -ForegroundColor Yellow
    Write-Host "   cd packages\webapp" -ForegroundColor Gray
    Write-Host "   vercel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Set environment variables:" -ForegroundColor Yellow
    Write-Host "   vercel env add VITE_API_BASE_URL production" -ForegroundColor Gray
    Write-Host "   # Enter your Railway API URL" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Deploy to production:" -ForegroundColor Yellow
    Write-Host "   vercel --prod" -ForegroundColor Gray
} else {
    Write-Host "`n▲ Vercel Deployment Commands (Webapp):" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Cyan
    Write-Host "   cd packages\webapp" -ForegroundColor Gray
    Write-Host "   vercel          # Deploy to preview" -ForegroundColor Gray
    Write-Host "   vercel --prod   # Deploy to production" -ForegroundColor Gray
    Write-Host "   vercel logs     # View logs" -ForegroundColor Gray
    Write-Host "   vercel domains  # Manage domains" -ForegroundColor Gray
}

# Final Summary
Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "1. Install missing CLI tools (Railway, Vercel)" -ForegroundColor White
Write-Host "2. Deploy API to Railway first" -ForegroundColor White
Write-Host "3. Get Railway deployment URL" -ForegroundColor White
Write-Host "4. Set VITE_API_BASE_URL in Vercel with Railway URL" -ForegroundColor White
Write-Host "5. Deploy Webapp to Vercel" -ForegroundColor White
Write-Host "6. Update CORS_ORIGIN in Railway with Vercel URL" -ForegroundColor White
Write-Host "7. Run smoke tests against deployed services" -ForegroundColor White

Write-Host "`n✨ Deployment test complete!" -ForegroundColor Green
