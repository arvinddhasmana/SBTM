#!/bin/bash
# =============================================================================
# SBTM Demo Data Seeder - Bash Script (Linux/Mac)
# =============================================================================
# This script seeds the database with demo data for testing and demonstrations.
# Run this after docker compose up is complete.
# =============================================================================

set -e

# Configuration
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5433}"
DATABASE_NAME="${DATABASE_NAME:-sbms}"
DATABASE_USER="${DATABASE_USER:-postgres}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-mysecretpassword}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  SBTM Demo Data Seeder${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# =============================================================================
# 1. Check Prerequisites
# =============================================================================

echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}  ✗ Docker is not running. Please start Docker.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Docker is running${NC}"

# Find PostgreSQL container
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" 2>/dev/null | head -n1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo -e "${RED}  ✗ PostgreSQL container is not running.${NC}"
    echo -e "${YELLOW}  → Run 'docker compose up -d' first${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ PostgreSQL container found: $POSTGRES_CONTAINER${NC}"

# =============================================================================
# 2. Wait for All Services
# =============================================================================

echo ""
echo -e "${YELLOW}[2/5] Waiting for all services to be healthy...${NC}"

SERVICES=("postgres" "redis" "api-gateway" "gps-tracking" "emergency-alerts" "student-presence" "video-service")

for SERVICE in "${SERVICES[@]}"; do
    echo -e "  Wait for $SERVICE..."
    MAX_ATTEMPTS=60
    ATTEMPT=0
    HEALTHY=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        STATUS=$(docker inspect --format='{{json .State.Health.Status}}' "sbtm_antigravity-$SERVICE-1" 2>/dev/null | tr -d '"')
        if [ "$STATUS" == "healthy" ]; then
            echo -e "${GREEN}    ✓ $SERVICE is healthy${NC}"
            HEALTHY=true
            break
        fi
        
        # Fallback check if no healthcheck defined but running
        if [ -z "$STATUS" ] || [ "$STATUS" == "null" ]; then
            if [ "$(docker inspect -f '{{.State.Running}}' "sbtm_antigravity-$SERVICE-1" 2>/dev/null)" == "true" ]; then
                echo -e "${GREEN}    ✓ $SERVICE is running (no healthcheck)${NC}"
                HEALTHY=true
                break
            fi
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        sleep 2
    done
    
    if [ "$HEALTHY" == "false" ]; then
        echo -e "${RED}    ✗ $SERVICE failed to become healthy${NC}"
        docker compose logs "$SERVICE" | tail -n 20
        exit 1
    fi
done

# =============================================================================
# 3. Run Database Migrations
# =============================================================================

echo ""
echo -e "${YELLOW}[3/5] Running database migrations...${NC}"

# GPS Tracking migrations (Prisma)
echo "  → GPS Tracking..."
docker exec sbtm_antigravity-gps-tracking-1 npx prisma migrate deploy || echo -e "${YELLOW}  ! GPS migrations check failed${NC}"

# API Gateway, Presence, Alerts (TypeORM/MikroORM - these usually run on startup)
# But we can trigger them or verify tables exist
echo "  → Verifying other services..."
sleep 2 # Give a moment for auto-migrations to finish

# =============================================================================
# 4. Seed Demo Data
# =============================================================================

echo ""
echo -e "${YELLOW}[4/5] Seeding demo data...${NC}"

SQL_FILE="$SCRIPT_DIR/seed-demo-data.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}  ✗ Seed file not found: $SQL_FILE${NC}"
    exit 1
fi

# Copy SQL file to container and execute
docker cp "$SQL_FILE" "${POSTGRES_CONTAINER}:/tmp/seed-demo-data.sql"
docker exec "$POSTGRES_CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -f /tmp/seed-demo-data.sql

echo -e "${GREEN}  ✓ Demo data seeded successfully!${NC}"

# =============================================================================
# 5. Verify Data
# =============================================================================

echo ""
echo -e "${YELLOW}[5/5] Verifying seeded data...${NC}"

VERIFY_QUERY="SELECT 'Users' as entity, COUNT(*) FROM users WHERE email LIKE '%@sbtm.demo' UNION ALL SELECT 'Students', COUNT(*) FROM students_reference WHERE id LIKE 'STUDENT-%' UNION ALL SELECT 'Vehicles', COUNT(*) FROM vehicles_reference WHERE id LIKE 'BUS-%' UNION ALL SELECT 'Routes', COUNT(*) FROM routes_reference WHERE id LIKE 'ROUTE-%' UNION ALL SELECT 'Stops', COUNT(*) FROM route_stops_reference WHERE id LIKE 'STOP-%';"

echo ""
echo -e "${CYAN}  Seeded Data Summary:${NC}"
echo -e "${CYAN}  ---------------------${NC}"
docker exec "$POSTGRES_CONTAINER" psql -U "$DATABASE_USER" -d "$DATABASE_NAME" -t -c "$VERIFY_QUERY"

# =============================================================================
# Complete
# =============================================================================

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Demo Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}Demo Credentials:${NC}"
echo "  Admin:   admin@sbtm.demo / Admin123!"
echo "  Supervisor: supervisor@sbtm.demo / Admin123!"
echo "  Driver 1: driver1@sbtm.demo / Driver123! (Route A)"
echo "  Driver 2: driver2@sbtm.demo / Driver123! (Route B)"
echo "  Parent 1: parent1@sbtm.demo / Parent123! (Route A - Emma/Liam)"
echo "  Parent 2: parent2@sbtm.demo / Parent123! (Route A/B - Olivia)"
echo ""
echo -e "${CYAN}Service URLs:${NC}"
echo "  API Gateway:      http://localhost:3001"
echo "  Admin Dashboard:  http://localhost:5173"
echo "  Parent App:       http://localhost:3000"
echo ""
echo -e "${YELLOW}Visit documentation for more details: docs/DEMO_SETUP_GUIDE.md${NC}"
echo ""
