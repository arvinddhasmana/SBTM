#!/usr/bin/env bash
# =============================================================================
# SBTM Hybrid Dev Startup Script
# Starts Docker infrastructure and essential local services.
# =============================================================================
set -e

echo -e "\033[36mStarting SBTM Hybrid infrastructure (Docker)...\033[0m"
docker compose up -d postgres redis osrm

echo -e "\033[36mWaiting for infrastructure to be ready...\033[0m"
sleep 5

echo -e "\033[36mStarting local services in the background...\033[0m"

# Function to start a service
start_service() {
    local dir=$1
    local name=$2
    local command=${3:-"pnpm run start:dev"}
    echo "Starting $name..."
    (cd "$dir" && nohup $command > "${name}.log" 2>&1 &)
}

start_service "services/api-gateway" "api-gateway"
start_service "services/student-management" "student-management"
start_service "services/student-presence" "student-presence"
start_service "services/emergency-alerts" "emergency-alerts"
start_service "services/gps-tracking" "gps-tracking" "pnpm run dev"
start_service "services/compliance-management" "compliance-management"
start_service "services/video-service" "video-service"

echo -e "\033[32m✅ Hybrid Dev Mode is starting up!\033[0m"
echo "Logs are available in services/*/*.log"
echo "Infrastructure: http://localhost:5433 (DB), http://localhost:6379 (Redis), http://localhost:5000 (OSRM)"
echo "API Gateway: http://localhost:3001/api/v1"
