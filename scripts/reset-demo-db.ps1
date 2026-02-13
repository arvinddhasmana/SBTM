# =============================================================================
# SBTM Demo DB Reset (Destructive)
# Drops Docker volumes (fresh Postgres + Redis), recreates the stack, seeds demo data,
# and runs verification.
#
# Usage:
#   .\scripts\reset-demo-db.ps1
#   .\scripts\reset-demo-db.ps1 -NoBuild
#   .\scripts\reset-demo-db.ps1 -SkipVerify
# =============================================================================

param(
    [switch]$NoBuild,
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Push-Location $Root

Write-Host '--- SBTM Demo DB Reset (DESTRUCTIVE) ---' -ForegroundColor Cyan
Write-Host 'Stopping stack and deleting volumes...' -ForegroundColor Yellow

docker compose down -v
if ($LASTEXITCODE -ne 0) { throw 'docker compose down -v failed' }

Write-Host 'Starting stack...' -ForegroundColor Yellow
if ($NoBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }

Write-Host 'Waiting for services to become healthy...' -ForegroundColor Yellow
$maxWaitSeconds = 90
$elapsedSeconds = 0
$apiHealthy = $false

while ($elapsedSeconds -lt $maxWaitSeconds) {
    try {
        $null = Invoke-RestMethod -Uri 'http://localhost:3001/api/v1/health' -Method GET -ErrorAction Stop -TimeoutSec 5
        $apiHealthy = $true
        Write-Host "API Gateway is healthy after $elapsedSeconds seconds" -ForegroundColor Green
        break
    } catch {
        if ($elapsedSeconds -eq 0) {
            Write-Host "  API Gateway not ready yet, waiting..." -ForegroundColor DarkGray
        } elseif ($elapsedSeconds % 15 -eq 0) {
            Write-Host "  Still waiting for API Gateway... ($elapsedSeconds/$maxWaitSeconds seconds)" -ForegroundColor DarkGray
        }
        Start-Sleep -Seconds 5
        $elapsedSeconds += 5
    }
}

if (-not $apiHealthy) {
    Write-Host 'ERROR: API Gateway did not become healthy within timeout' -ForegroundColor Red
    Write-Host 'Check logs with: docker compose logs api-gateway' -ForegroundColor Yellow
    Write-Host 'Check logs with: docker compose logs student-presence' -ForegroundColor Yellow
    throw 'API Gateway health check failed'
}

Write-Host 'Seeding demo data...' -ForegroundColor Yellow
& "$PSScriptRoot\init-db.ps1" -NoCompose
if ($LASTEXITCODE -ne 0) { throw 'Seeding failed' }

Write-Host 'Waiting for services to process schema changes...' -ForegroundColor Yellow
Start-Sleep -Seconds 10

if (-not $SkipVerify) {
    Write-Host 'Running verification...' -ForegroundColor Yellow
    & "$PSScriptRoot\verify-demo.ps1"
    if ($LASTEXITCODE -ne 0) { throw 'Verification failed' }
}

Pop-Location

Write-Host 'Reset complete.' -ForegroundColor Green
