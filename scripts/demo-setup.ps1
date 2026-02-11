# =============================================================================
# SBTM Demo Setup - Windows PowerShell
# Starts all containers and seeds demo data in one command.
# =============================================================================

param(
    [switch]$NoBuild,
    [switch]$NoSeed
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "--- SBTM Demo Setup (Windows) ---" -ForegroundColor Cyan

Push-Location $Root

if ($NoBuild) {
    Write-Host "Starting docker compose (no build)..." -ForegroundColor Yellow
    docker compose up -d
} else {
    Write-Host "Starting docker compose (build)..." -ForegroundColor Yellow
    docker compose up -d --build
}

if (-not $NoSeed) {
    Write-Host "Seeding demo data..." -ForegroundColor Yellow
    & "$PSScriptRoot\seed-demo-data.ps1" -NoCompose
}

Pop-Location

Write-Host "Demo setup complete." -ForegroundColor Green
