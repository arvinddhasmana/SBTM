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

Write-Host 'Seeding demo data...' -ForegroundColor Yellow
& "$PSScriptRoot\init-db.ps1" -NoCompose
if ($LASTEXITCODE -ne 0) { throw 'Seeding failed' }

if (-not $SkipVerify) {
    Write-Host 'Running verification...' -ForegroundColor Yellow
    & "$PSScriptRoot\verify-demo.ps1"
    if ($LASTEXITCODE -ne 0) { throw 'Verification failed' }
}

Pop-Location

Write-Host 'Reset complete.' -ForegroundColor Green
