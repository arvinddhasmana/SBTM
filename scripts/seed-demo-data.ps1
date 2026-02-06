# =============================================================================
# SBTM Demo Data Seeder - PowerShell Script (Foolproof)
# =============================================================================

$DatabaseUser = "postgres"
$DatabaseName = "sbms"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "--- SBTM Demo Setup ---" -ForegroundColor Cyan

# 1. Wait for healthy
$services = @("postgres", "redis", "api-gateway", "gps-tracking", "emergency-alerts", "student-presence", "video-service")
foreach ($s in $services) {
    Write-Host "Checking $s..."
    $h = $false
    for ($i = 0; $i -lt 30; $i++) {
        $st = docker inspect --format='{{json .State.Health.Status}}' "sbtm_antigravity-$s-1" 2>$null
        if ($st -match "healthy") { $h = $true; break }
        $r = docker inspect -f '{{.State.Running}}' "sbtm_antigravity-$s-1" 2>$null
        if ($r -eq "true") { $h = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $h) { Write-Host "$s FAILED" -ForegroundColor Red; exit 1 }
}

# 2. Migrations
Write-Host "Running Migrations..."
docker exec sbtm_antigravity-gps-tracking-1 npx prisma migrate deploy

# 3. Seed
Write-Host "Seeding Data..."
$sql = Join-Path $ScriptDir "seed-demo-data.sql"
docker cp $sql "sbtm_antigravity-postgres-1:/tmp/seed.sql"
docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -f /tmp/seed.sql

# 4. Verify
Write-Host "Verifying..."
$verifySql = @"
SELECT 'Users' as E, COUNT(*) as C FROM users WHERE email LIKE '%@sbtm.demo'
UNION ALL SELECT 'Students', COUNT(*) FROM students_reference WHERE id LIKE 'STUDENT-%'
UNION ALL SELECT 'Vehicles', COUNT(*) FROM vehicles_reference WHERE id LIKE 'BUS-%'
UNION ALL SELECT 'Routes', COUNT(*) FROM routes_reference WHERE id LIKE 'ROUTE-%'
UNION ALL SELECT 'Stops', COUNT(*) FROM route_stops_reference WHERE id LIKE 'STOP-%';
"@
$vFile = Join-Path $ScriptDir "verify.sql"
$verifySql | Out-File -FilePath $vFile -Encoding utf8
docker cp $vFile "sbtm_antigravity-postgres-1:/tmp/verify.sql"
docker exec sbtm_antigravity-postgres-1 psql -U $DatabaseUser -d $DatabaseName -t -f /tmp/verify.sql

Write-Host "Done! Check docs/DEMO_SETUP_GUIDE.md" -ForegroundColor Green
