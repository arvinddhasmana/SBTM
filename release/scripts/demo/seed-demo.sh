#!/usr/bin/env bash
# =============================================================================
# SBTM Demo Data Seeding Script
# Seeds the database with demo data for testing and demonstrations
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "════════════════════════════════════════════════════════"
echo "  SBTM Demo Data Seeding"
echo "════════════════════════════════════════════════════════"
echo ""

# Configuration
API_ENDPOINT="${1:-http://localhost:3001}"
ADMIN_EMAIL="admin@sbtm.demo"
ADMIN_PASSWORD="Admin123!"

log_info "API Endpoint: $API_ENDPOINT"
echo ""

# Check if API is accessible
log_info "Checking API availability..."
if ! curl -sf --max-time 10 "${API_ENDPOINT}/health" > /dev/null 2>&1; then
    log_error "API is not accessible at ${API_ENDPOINT}"
    log_info "Make sure SBTM is deployed and running"
    exit 1
fi
log_success "API is accessible"
echo ""

# Login as admin
log_info "Logging in as admin..."
TOKEN=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    | grep -oP '(?<="token":")[^"]*' || echo "")

if [ -z "$TOKEN" ]; then
    log_error "Failed to login. Check credentials."
    exit 1
fi
log_success "Logged in successfully"
echo ""

# Create schools
log_info "Creating demo schools..."

SCHOOLS=(
    '{"name":"Maple Elementary","address":"123 Maple St, Ottawa, ON","type":"elementary","capacity":500}'
    '{"name":"Oak Middle School","address":"456 Oak Ave, Ottawa, ON","type":"middle","capacity":800}'
    '{"name":"Pine High School","address":"789 Pine Blvd, Ottawa, ON","type":"high","capacity":1200}'
    '{"name":"Birch Elementary","address":"321 Birch Rd, Ottawa, ON","type":"elementary","capacity":450}'
    '{"name":"Cedar Academy","address":"654 Cedar Lane, Ottawa, ON","type":"elementary","capacity":600}'
    '{"name":"Elm Secondary","address":"987 Elm Street, Ottawa, ON","type":"high","capacity":1000}'
)

SCHOOL_IDS=()
for school in "${SCHOOLS[@]}"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/schools" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$school" || echo "")

    SCHOOL_ID=$(echo "$RESPONSE" | grep -oP '(?<="id":")[^"]*' || echo "")
    if [ -n "$SCHOOL_ID" ]; then
        SCHOOL_IDS+=("$SCHOOL_ID")
        SCHOOL_NAME=$(echo "$school" | grep -oP '(?<="name":")[^"]*')
        log_success "Created school: $SCHOOL_NAME"
    else
        log_warning "Failed to create school"
    fi
done
echo ""

# Create buses
log_info "Creating demo buses..."

BUSES=(
    '{"number":"BUS001","capacity":50,"make":"Blue Bird","model":"Vision","year":2020}'
    '{"number":"BUS002","capacity":50,"make":"IC Bus","model":"CE Series","year":2021}'
    '{"number":"BUS003","capacity":65,"make":"Blue Bird","model":"All American","year":2019}'
    '{"number":"BUS004","capacity":45,"make":"Thomas Built","model":"Saf-T-Liner","year":2022}'
    '{"number":"BUS005","capacity":50,"make":"Blue Bird","model":"Vision","year":2021}'
    '{"number":"BUS006","capacity":55,"make":"IC Bus","model":"CE Series","year":2020}'
)

BUS_IDS=()
for bus in "${BUSES[@]}"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/buses" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$bus" || echo "")

    BUS_ID=$(echo "$RESPONSE" | grep -oP '(?<="id":")[^"]*' || echo "")
    if [ -n "$BUS_ID" ]; then
        BUS_IDS+=("$BUS_ID")
        BUS_NUMBER=$(echo "$bus" | grep -oP '(?<="number":")[^"]*')
        log_success "Created bus: $BUS_NUMBER"
    fi
done
echo ""

# Create drivers
log_info "Creating demo drivers..."

DRIVERS=(
    '{"firstName":"John","lastName":"Driver","email":"driver1@sbtm.demo","phone":"555-0101","licenseNumber":"DL12345"}'
    '{"firstName":"Jane","lastName":"Smith","email":"driver2@sbtm.demo","phone":"555-0102","licenseNumber":"DL12346"}'
    '{"firstName":"Bob","lastName":"Johnson","email":"driver3@sbtm.demo","phone":"555-0103","licenseNumber":"DL12347"}'
    '{"firstName":"Alice","lastName":"Williams","email":"driver4@sbtm.demo","phone":"555-0104","licenseNumber":"DL12348"}'
    '{"firstName":"Charlie","lastName":"Brown","email":"driver5@sbtm.demo","phone":"555-0105","licenseNumber":"DL12349"}'
    '{"firstName":"Diana","lastName":"Davis","email":"driver6@sbtm.demo","phone":"555-0106","licenseNumber":"DL12350"}'
)

DRIVER_IDS=()
for driver in "${DRIVERS[@]}"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/drivers" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$driver" || echo "")

    DRIVER_ID=$(echo "$RESPONSE" | grep -oP '(?<="id":")[^"]*' || echo "")
    if [ -n "$DRIVER_ID" ]; then
        DRIVER_IDS+=("$DRIVER_ID")
        DRIVER_NAME=$(echo "$driver" | grep -oP '(?<="firstName":")[^"]*')
        log_success "Created driver: $DRIVER_NAME"
    fi
done
echo ""

# Create students
log_info "Creating demo students..."

STUDENTS=(
    '{"firstName":"Emma","lastName":"Johnson","grade":5,"schoolId":"'${SCHOOL_IDS[0]}'","address":"100 Main St, Ottawa"}'
    '{"firstName":"Liam","lastName":"Smith","grade":3,"schoolId":"'${SCHOOL_IDS[0]}'","address":"102 Main St, Ottawa"}'
    '{"firstName":"Olivia","lastName":"Williams","grade":4,"schoolId":"'${SCHOOL_IDS[0]}'","address":"104 Oak Ave, Ottawa"}'
    '{"firstName":"Noah","lastName":"Brown","grade":6,"schoolId":"'${SCHOOL_IDS[1]}'","address":"200 Elm St, Ottawa"}'
    '{"firstName":"Ava","lastName":"Jones","grade":7,"schoolId":"'${SCHOOL_IDS[1]}'","address":"202 Elm St, Ottawa"}'
    '{"firstName":"Ethan","lastName":"Garcia","grade":8,"schoolId":"'${SCHOOL_IDS[1]}'","address":"300 Pine Rd, Ottawa"}'
    '{"firstName":"Sophia","lastName":"Miller","grade":9,"schoolId":"'${SCHOOL_IDS[2]}'","address":"400 Cedar Ln, Ottawa"}'
    '{"firstName":"Mason","lastName":"Davis","grade":10,"schoolId":"'${SCHOOL_IDS[2]}'","address":"402 Cedar Ln, Ottawa"}'
    '{"firstName":"Isabella","lastName":"Rodriguez","grade":11,"schoolId":"'${SCHOOL_IDS[2]}'","address":"500 Birch Ave, Ottawa"}'
    '{"firstName":"William","lastName":"Martinez","grade":12,"schoolId":"'${SCHOOL_IDS[2]}'","address":"502 Birch Ave, Ottawa"}'
)

STUDENT_IDS=()
for student in "${STUDENTS[@]}"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/students" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$student" || echo "")

    STUDENT_ID=$(echo "$RESPONSE" | grep -oP '(?<="id":")[^"]*' || echo "")
    if [ -n "$STUDENT_ID" ]; then
        STUDENT_IDS+=("$STUDENT_ID")
        STUDENT_NAME=$(echo "$student" | grep -oP '(?<="firstName":")[^"]*')
        log_success "Created student: $STUDENT_NAME"
    fi
done
echo ""

# Create routes
log_info "Creating demo routes..."

ROUTE1='{
    "name":"Route 101 AM",
    "number":"101",
    "type":"AM",
    "schoolId":"'${SCHOOL_IDS[0]}'",
    "busId":"'${BUS_IDS[0]}'",
    "driverId":"'${DRIVER_IDS[0]}'",
    "startTime":"07:00",
    "endTime":"08:30",
    "stops":[
        {"address":"100 Main St, Ottawa","sequence":1,"scheduledTime":"07:10"},
        {"address":"104 Oak Ave, Ottawa","sequence":2,"scheduledTime":"07:15"},
        {"address":"200 Elm St, Ottawa","sequence":3,"scheduledTime":"07:25"}
    ]
}'

ROUTE2='{
    "name":"Route 101 PM",
    "number":"101",
    "type":"PM",
    "schoolId":"'${SCHOOL_IDS[0]}'",
    "busId":"'${BUS_IDS[0]}'",
    "driverId":"'${DRIVER_IDS[0]}'",
    "startTime":"15:00",
    "endTime":"16:30"
}'

for route in "$ROUTE1" "$ROUTE2"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/routes" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$route" || echo "")

    ROUTE_ID=$(echo "$RESPONSE" | grep -oP '(?<="id":")[^"]*' || echo "")
    if [ -n "$ROUTE_ID" ]; then
        ROUTE_NAME=$(echo "$route" | grep -oP '(?<="name":")[^"]*')
        log_success "Created route: $ROUTE_NAME"
    fi
done
echo ""

# Create parent accounts
log_info "Creating demo parent accounts..."

PARENTS=(
    '{"email":"parent1@sbtm.demo","password":"Admin123!","firstName":"Sarah","lastName":"Johnson","phone":"555-0201"}'
    '{"email":"parent2@sbtm.demo","password":"Admin123!","firstName":"Michael","lastName":"Smith","phone":"555-0202"}'
    '{"email":"parent3@sbtm.demo","password":"Admin123!","firstName":"Jennifer","lastName":"Williams","phone":"555-0203"}'
)

for parent in "${PARENTS[@]}"; do
    RESPONSE=$(curl -sf -X POST "${API_ENDPOINT}/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "$parent" || echo "")

    if echo "$RESPONSE" | grep -q "id"; then
        PARENT_NAME=$(echo "$parent" | grep -oP '(?<="firstName":")[^"]*')
        log_success "Created parent: $PARENT_NAME"
    fi
done
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo "  ✅ Demo Data Seeding Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
log_success "Created:"
echo "  - ${#SCHOOL_IDS[@]} schools"
echo "  - ${#BUS_IDS[@]} buses"
echo "  - ${#DRIVER_IDS[@]} drivers"
echo "  - ${#STUDENT_IDS[@]} students"
echo "  - 2 routes (AM and PM)"
echo "  - 3 parent accounts"
echo ""
log_info "Demo credentials:"
echo "  Admin:"
echo "    Email: admin@sbtm.demo"
echo "    Password: Admin123!"
echo ""
echo "  Driver:"
echo "    Email: driver1@sbtm.demo"
echo "    Password: Admin123!"
echo ""
echo "  Parent:"
echo "    Email: parent1@sbtm.demo"
echo "    Password: Admin123!"
echo ""
log_info "You can now login and test the system!"
echo ""
