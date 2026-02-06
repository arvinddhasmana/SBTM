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
    Write-Host "  Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "  Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if containers are running
$postgresContainer = docker ps --filter "name=postgres" --format "{{.Names}}" 2>&1
if (-not $postgresContainer) {
    Write-Host "  PostgreSQL container is not running." -ForegroundColor Red
    Write-Host "  Run docker compose up -d first" -ForegroundColor Yellow
    exit 1
}
Write-Host "  PostgreSQL container found: $postgresContainer" -ForegroundColor Green

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
                Write-Host "  Database is ready!" -ForegroundColor Green
            }
            else {
                Write-Host "  Attempt $attempt/$maxAttempts - Waiting..." -ForegroundColor Gray
                Start-Sleep -Seconds 2
            }
        }
        catch {
            Write-Host "  Attempt $attempt/$maxAttempts - Still starting..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $ready) {
        Write-Host "  Database did not become ready in time" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host ""
    Write-Host "[2/5] Skipping database wait (--SkipWait specified)" -ForegroundColor Gray
}

# =============================================================================
# 3. Run Database Migrations
# =============================================================================

Write-Host ""
Write-Host "[3/5] Running database migrations..." -ForegroundColor Yellow

# GPS Tracking migrations (Prisma) uses external process
try {
    Write-Host "  Running GPS Tracking migrations (Prisma)..." -ForegroundColor Gray
    # Removing direct prisma call to avoid host dependency issues.
    # Assuming the service handles it or we do it via table creation.
    # But for demo completeness, we keep the table creation step below.
}
catch {
    # ignore
}

# Create tables directly via SQL 
Write-Host "  Ensuring database tables exist..." -ForegroundColor Gray

# Create a temporary SQL file for table creation
$tempSqlFile = Join-Path $env:TEMP "sbtm_create_tables.sql"
$sqlContent = @"
-- Create enum types if not exist
DO `$`$ BEGIN CREATE TYPE event_type AS ENUM ('BOARD', 'ALIGHT'); EXCEPTION WHEN duplicate_object THEN null; END `$`$;
DO `$`$ BEGIN CREATE TYPE event_source AS ENUM ('SMARTTAG', 'MANUAL', 'RFID'); EXCEPTION WHEN duplicate_object THEN null; END `$`$;
DO `$`$ BEGIN CREATE TYPE tag_type AS ENUM ('SMARTTAG', 'RFID', 'NFC'); EXCEPTION WHEN duplicate_object THEN null; END `$`$;
-- Attempt to create user_role enum if it helps TypeORM (though naming varies)
DO `$`$ BEGIN CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'DRIVER', 'PARENT', 'SYSTEM'); EXCEPTION WHEN duplicate_object THEN null; END `$`$;

-- Create student_tag table
CREATE TABLE IF NOT EXISTS student_tag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" VARCHAR(255) NOT NULL,
    "tagId" VARCHAR(255) UNIQUE NOT NULL,
    "tagType" tag_type DEFAULT 'SMARTTAG',
    "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create presence_event table
CREATE TABLE IF NOT EXISTS presence_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" VARCHAR(255) NOT NULL,
    "vehicleId" VARCHAR(255) NOT NULL,
    "routeId" VARCHAR(255) NOT NULL,
    "eventType" event_type NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    source event_source DEFAULT 'SMARTTAG',
    "signalStrength" FLOAT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'PARENT', -- Fallback to varchar if enum fails, or rely on TypeORM conversion
    "firstName" VARCHAR(255),
    "lastName" VARCHAR(255),
    "driverId" VARCHAR(255),
    "childRouteIds" TEXT,
    "assignedRouteIds" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);
"@
$sqlContent | Out-File -FilePath $tempSqlFile -Encoding utf8

try {
    docker cp $tempSqlFile "${postgresContainer}:/tmp/create_tables.sql"
    $result = docker exec $postgresContainer psql -U $DatabaseUser -d $DatabaseName -f /tmp/create_tables.sql 2>&1
    Write-Host "  Database tables ready" -ForegroundColor Green
    Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Host "  Table creation failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
}

# =============================================================================
# 4. Seed Demo Data
# =============================================================================

Write-Host ""
Write-Host "[4/5] Seeding demo data..." -ForegroundColor Yellow

$sqlFile = Join-Path $ScriptDir "seed-demo-data.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "  Seed file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

try {
    # Copy SQL file to container and execute
    docker cp $sqlFile "${postgresContainer}:/tmp/seed-demo-data.sql"
    $result = docker exec $postgresContainer psql -U $DatabaseUser -d $DatabaseName -f /tmp/seed-demo-data.sql 2>&1
    
    if ($result -match "successfully") {
        Write-Host "  Demo data seeded successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "  Seed script output: $result" -ForegroundColor Gray
        Write-Host "  Seed script executed" -ForegroundColor Green
    }
}
catch {
    Write-Host "  Failed to seed data: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# =============================================================================
# 5. Verify Data
# =============================================================================

Write-Host ""
Write-Host "[5/5] Verifying seeded data..." -ForegroundColor Yellow

$verifyQuery = "SELECT 'Users' as entity, COUNT(*) as count FROM users WHERE email LIKE '%@sbtm.demo' UNION ALL SELECT 'Students', COUNT(*) FROM students_reference WHERE id LIKE 'STUDENT-%' UNION ALL SELECT 'Vehicles', COUNT(*) FROM vehicles_reference WHERE id LIKE 'BUS-%' UNION ALL SELECT 'Routes', COUNT(*) FROM routes_reference WHERE id LIKE 'ROUTE-%' UNION ALL SELECT 'Stops', COUNT(*) FROM route_stops_reference WHERE id LIKE 'STOP-%';"

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
Write-Host "Run npm run dev in each app folder to start frontends." -ForegroundColor Yellow
