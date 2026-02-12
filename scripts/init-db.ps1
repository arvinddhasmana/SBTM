# =============================================================================
# SBTM Init & Seed Database (Consolidated)
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "Initializing Database..." -ForegroundColor Cyan

# 1. Copy SQL to container
# Note: Using hardcoded container name from existing scripts. Adjust if needed.
$ContainerName = "sbtm_antigravity-postgres-1"

Write-Host "Copying init-db.sql to $ContainerName..."
docker cp ./scripts/init-db.sql "$($ContainerName):/tmp/init-db.sql"

# 2. Execute SQL
Write-Host "Executing SQL script inside container..."
docker exec $ContainerName psql -U postgres -d sbms -f /tmp/init-db.sql

Write-Host "✅ Database initialized and seeded successfully!" -ForegroundColor Green
Write-Host "users created:"
Write-Host "  Admin: osta.admin@sbtm.demo / Admin123!"
Write-Host "  Parent: parent1@sbtm.demo / Admin123!"
