# =============================================================================
# SBTM Demo Setup & Seed (Non-Destructive)
# =============================================================================

param(
    [string]$DatabaseUser = "postgres",
    [string]$DatabaseName = "sbms",
    [switch]$Clean,
    [switch]$NoBuild,
    [switch]$NoCompose
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "--- SBTM Setup ---" -ForegroundColor Cyan
Write-Host "Tip: For the simplest full reset, run .\\scripts\\reset-demo-db.ps1" -ForegroundColor DarkGray

# 1. Docker
if ($Clean) {
    Write-Host "Resetting..."
    docker compose down -v
    docker compose up -d --build
}
elseif (-not $NoCompose) {
    docker compose up -d
}

# 2. Wait DB
Write-Host "Waiting for DB..."
for ($i = 0; $i -lt 30; $i++) {
    $st = docker inspect --format='{{json .State.Health.Status}}' "sbtm_antigravity-postgres-1" 2>$null
    if ($st -match "healthy") { break }
    Start-Sleep -Seconds 2
}

# 3. Schema Push (GPS Only if missing)
Write-Host "Checking GPS tables..."
$hasGps = docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -t -c "SELECT to_regclass('public.location_points');" 2>$null
if ($hasGps -notmatch "location_points") {
    Write-Host "Pushing GPS schema..."
    docker exec sbtm_antigravity-gps-tracking-1 npx prisma db push --skip-generate
}

# 4. Wait for Users (Syncing from api-gateway)
Write-Host "Waiting for 'users' table..."
$ready = $false
for ($i = 0; $i -lt 24; $i++) {
    docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -c "SELECT 1 FROM users LIMIT 1" > $null 2>&1
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Host "Users table not found. Bootstrapping minimal api-gateway schema..." -ForegroundColor Yellow
    $bootstrap = Join-Path $ScriptDir "bootstrap-gateway-schema.sql"
    if (-not (Test-Path $bootstrap)) {
        Write-Host "Missing bootstrap script: $bootstrap" -ForegroundColor Red
        exit 1
    }
    docker cp $bootstrap "sbtm_antigravity-postgres-1:/tmp/bootstrap-gateway-schema.sql" | Out-Null
    docker exec sbtm_antigravity-postgres-1 psql -v ON_ERROR_STOP=1 -U $DatabaseUser -d $DatabaseName -f /tmp/bootstrap-gateway-schema.sql > $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed while applying bootstrap-gateway-schema.sql" -ForegroundColor Red
        exit 1
    }
}

# 5. Seed
Write-Host "Seeding..."
$sql = Join-Path $ScriptDir "seed-demo-data.sql"
$tenantSql = Join-Path $ScriptDir "seed-multi-tenancy.sql"
docker cp $sql "sbtm_antigravity-postgres-1:/tmp/seed.sql"
if (Test-Path $tenantSql) {
    docker cp $tenantSql "sbtm_antigravity-postgres-1:/tmp/seed-multi-tenancy.sql"
    docker exec sbtm_antigravity-postgres-1 psql -v ON_ERROR_STOP=1 -U $DatabaseUser -d $DatabaseName -f /tmp/seed-multi-tenancy.sql > $null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed while applying seed-multi-tenancy.sql" -ForegroundColor Red
        exit 1
    }
}
docker exec sbtm_antigravity-postgres-1 psql -v ON_ERROR_STOP=1 -U $DatabaseUser -d $DatabaseName -f /tmp/seed.sql > $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed while applying seed-demo-data.sql" -ForegroundColor Red
    exit 1
}

# 6. Verify
Write-Host "Summary:" -ForegroundColor Cyan
$v = "SELECT 'Users', COUNT(*) FROM users WHERE email LIKE '%@sbtm.demo'; SELECT 'Students', COUNT(*) FROM students_reference; SELECT role, COUNT(*) FROM users WHERE email LIKE '%@sbtm.demo' GROUP BY role ORDER BY role;"
$vf = Join-Path $ScriptDir "v.sql"
$v | Out-File -FilePath $vf -Encoding utf8
docker cp $vf "sbtm_antigravity-postgres-1:/tmp/v.sql"
docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -t -f /tmp/v.sql
Write-Host "Run .\scripts\verify-demo.ps1 for login and seed verification." -ForegroundColor Yellow
Write-Host "Done!" -ForegroundColor Green
