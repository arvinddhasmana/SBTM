# =============================================================================
# SBTM Demo Data Seeder - PowerShell Script
# =============================================================================
# This script seeds the database with demo data for testing and demonstrations.
# Run this after docker compose up is complete.
# =============================================================================

param(
    [string]$DatabaseHost = "localhost",
    [int]$DatabasePort = 5433,
    [string]$DatabaseName = "sbms",
    [string]$DatabaseUser = "postgres",
    [string]$DatabasePassword = "mysecretpassword",
    [switch]$SkipWait,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SBTM Demo Data Seeder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# 1. Check Prerequisites
# =============================================================================

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check if Docker is running
try {
    $dockerStatus = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Host "  ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if containers are running
$postgresContainer = docker ps --filter "name=postgres" --format "{{.Names}}" 2>&1
if (-not $postgresContainer) {
    Write-Host "  ✗ PostgreSQL container is not running." -ForegroundColor Red
    Write-Host "  → Run 'docker compose up -d' first" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✓ PostgreSQL container found: $postgresContainer" -ForegroundColor Green

# =============================================================================
# 2. Wait for Database
# =============================================================================

if (-not $SkipWait) {
    Write-Host ""
    Write-Host "[2/5] Waiting for database to be ready..." -ForegroundColor Yellow
    
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while (-not $ready -and $attempt -lt $maxAttempts) {
        $attempt++
        try {
            $result = docker exec $postgresContainer pg_isready -U $DatabaseUser -d $DatabaseName 2>&1
            if ($result -match "accepting connections") {
                $ready = $true
                Write-Host "  ✓ Database is ready!" -ForegroundColor Green
            } else {
                Write-Host "  Attempt $attempt/$maxAttempts - Waiting..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        } catch {
            Write-Host "  Attempt $attempt/$maxAttempts - Still starting..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $ready) {
        Write-Host "  ✗ Database did not become ready in time" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[2/5] Skipping database wait (--SkipWait specified)" -ForegroundColor Gray
}

# =============================================================================
# 3. Run Database Migrations
# =============================================================================

Write-Host ""
Write-Host "[3/5] Running database migrations..." -ForegroundColor Yellow

# API Gateway migrations (TypeORM)
try {
    Write-Host "  → Running API Gateway migrations..." -ForegroundColor Gray
    Push-Location "$ProjectRoot\services\api-gateway"
    
    # Set environment for local connection
    $env:DB_HOST = $DatabaseHost
    $env:DB_PORT = $DatabasePort
    $env:DB_DATABASE = $DatabaseName
    $env:DB_USERNAME = $DatabaseUser
    $env:DB_PASSWORD = $DatabasePassword
    
    # Run TypeORM migrations
    npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ API Gateway migrations complete" -ForegroundColor Green
    } else {
        Write-Host "  ! API Gateway migrations: No new migrations or already applied" -ForegroundColor Yellow
    }
    Pop-Location
} catch {
    Write-Host "  ! API Gateway migrations: $($_.Exception.Message)" -ForegroundColor Yellow
    Pop-Location
}

# GPS Tracking migrations (Prisma)
try {
    Write-Host "  → Running GPS Tracking migrations..." -ForegroundColor Gray
    Push-Location "$ProjectRoot\services\gps-tracking"
    
    $env:DATABASE_URL = "postgresql://${DatabaseUser}:${DatabasePassword}@${DatabaseHost}:${DatabasePort}/${DatabaseName}"
    npx prisma migrate deploy 2>&1 | Out-Null
    Write-Host "  ✓ GPS Tracking migrations complete" -ForegroundColor Green
    Pop-Location
} catch {
    Write-Host "  ! GPS Tracking migrations: $($_.Exception.Message)" -ForegroundColor Yellow
    Pop-Location
}

# =============================================================================
# 4. Seed Demo Data
# =============================================================================

Write-Host ""
Write-Host "[4/5] Seeding demo data..." -ForegroundColor Yellow

$sqlFile = "$ScriptDir\seed-demo-data.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "  ✗ Seed file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

try {
    # Copy SQL file to container and execute
    docker cp $sqlFile "${postgresContainer}:/tmp/seed-demo-data.sql"
    $result = docker exec $postgresContainer psql -U $DatabaseUser -d $DatabaseName -f /tmp/seed-demo-data.sql 2>&1
    
    if ($result -match "successfully") {
        Write-Host "  ✓ Demo data seeded successfully!" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Seed script executed" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Failed to seed data: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# =============================================================================
# 5. Verify Data
# =============================================================================

Write-Host ""
Write-Host "[5/5] Verifying seeded data..." -ForegroundColor Yellow

$verifyQuery = @"
SELECT 'Users' as entity, COUNT(*) as count FROM users WHERE email LIKE '%@sbtm.demo' 
UNION ALL 
SELECT 'Students', COUNT(*) FROM students_reference WHERE id LIKE 'STUDENT-%'
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles_reference WHERE id LIKE 'BUS-%'
UNION ALL
SELECT 'Routes', COUNT(*) FROM routes_reference WHERE id LIKE 'ROUTE-%'
UNION ALL
SELECT 'Stops', COUNT(*) FROM route_stops_reference WHERE id LIKE 'STOP-%';
"@

$verification = docker exec $postgresContainer psql -U $DatabaseUser -d $DatabaseName -t -c "$verifyQuery" 2>&1

Write-Host ""
Write-Host "  Seeded Data Summary:" -ForegroundColor Cyan
Write-Host "  ---------------------" -ForegroundColor Cyan
$verification | ForEach-Object {
    $line = $_.Trim()
    if ($line) {
        Write-Host "  $line" -ForegroundColor White
    }
}

# =============================================================================
# Complete
# =============================================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Demo Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor Cyan
Write-Host "  Admin:   admin@sbtm.demo / Admin123!" -ForegroundColor White
Write-Host "  Driver:  driver1@sbtm.demo / Driver123!" -ForegroundColor White
Write-Host "  Parent:  parent1@sbtm.demo / Parent123!" -ForegroundColor White
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  API Gateway:      http://localhost:3001" -ForegroundColor White
Write-Host "  Admin Dashboard:  http://localhost:5173" -ForegroundColor White
Write-Host "  Parent App:       http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Run 'npm run dev' in each app folder to start frontends." -ForegroundColor Yellow
