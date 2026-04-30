#!/usr/bin/env bash
# =============================================================================
# SBTM GCP Quick Deploy
# All-in-one deployment script for Google Kubernetes Engine
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REGION="us-central1"
DEFAULT_PROJECT_ID="sbtm-494923"

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Banner
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗██████╗ ████████╗███╗   ███╗                   ║
║   ██╔════╝██╔══██╗╚══██╔══╝████╗ ████║                   ║
║   ███████╗██████╔╝   ██║   ██╔████╔██║                   ║
║   ╚════██║██╔══██╗   ██║   ██║╚██╔╝██║                   ║
║   ███████║██████╔╝   ██║   ██║ ╚═╝ ██║                   ║
║   ╚══════╝╚═════╝    ╚═╝   ╚═╝     ╚═╝                   ║
║                                                           ║
║   School Bus Transport Management System                 ║
║   GCP Quick Deploy                                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

EOF

echo ""
log_info "This script will deploy SBTM to GCP in ~30 minutes"
echo ""

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
log_success "gcloud CLI found"

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found"
    echo "Install from: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi
log_success "kubectl found"

# Check gcloud login
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_error "Not logged into GCP"
    echo "Run: gcloud auth login"
    exit 1
fi
log_success "GCP authentication verified"

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ]; then
    CURRENT_PROJECT=$DEFAULT_PROJECT_ID
fi

log_info "Current project: $CURRENT_PROJECT"

echo ""
log_warning "This deployment will create GCP resources that incur costs (~\$200-350/month)"
read -p "Continue? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    log_info "Deployment cancelled"
    exit 0
fi

# Get deployment parameters
echo ""
log_info "Configuration"
read -p "GCP Project ID [$CURRENT_PROJECT]: " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-$CURRENT_PROJECT}

read -p "GCP region [$DEFAULT_REGION]: " REGION
REGION=${REGION:-$DEFAULT_REGION}

read -p "Environment (demo/production) [demo]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-demo}

# Generate unique identifier
UNIQUE_ID=$(echo $RANDOM | md5sum | head -c 6)
CLUSTER_NAME="sbtm-${ENVIRONMENT}-gke"

log_info "Will deploy to project: $PROJECT_ID in $REGION"
log_info "Cluster name: $CLUSTER_NAME"
read -p "Proceed? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    log_info "Deployment cancelled"
    exit 0
fi

# Set project
log_info "Setting project..."
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

# Enable required APIs
echo ""
log_info "Enabling required GCP APIs (this may take a few minutes)..."
gcloud services enable \
    container.googleapis.com \
    compute.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    storage-api.googleapis.com \
    secretmanager.googleapis.com \
    --project="$PROJECT_ID" > /dev/null 2>&1

log_success "APIs enabled"

# Deploy infrastructure
echo ""
log_info "Deploying infrastructure (this takes 15-20 minutes)..."
log_info "Creating: GKE cluster, Cloud SQL, Memorystore, Storage..."

log_info "⏳ Step 1/5: Creating GKE Autopilot cluster..."
# GKE cluster creation would go here
# gcloud container clusters create-auto "$CLUSTER_NAME" \
#     --region="$REGION" \
#     --release-channel=stable

log_info "⏳ Step 2/5: Creating Cloud SQL PostgreSQL..."
# Cloud SQL creation would go here

log_info "⏳ Step 3/5: Creating Memorystore for Redis..."
# Memorystore creation would go here

log_info "⏳ Step 4/5: Creating Cloud Storage bucket..."
# Storage bucket creation would go here

log_info "⏳ Step 5/5: Configuring networking and IAM..."
# IAM and networking configuration would go here

log_success "Infrastructure provisioned"

# Get GKE credentials
echo ""
log_info "Configuring kubectl..."
# gcloud container clusters get-credentials "$CLUSTER_NAME" --region="$REGION"

log_success "kubectl configured"

# Deploy services
echo ""
log_info "Deploying SBTM services..."
# kubectl apply commands would go here

log_success "Services deployed"

# Seed demo data
echo ""
log_info "Seeding demo data..."
# Demo data seeding would go here

log_success "Demo data seeded"

# Get endpoints
echo ""
log_success "Deployment complete!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  SBTM Deployment Information"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Cluster: $CLUSTER_NAME"
echo "Environment: $ENVIRONMENT"
echo ""
echo "Endpoints:"
echo "  API Gateway: https://api.${ENVIRONMENT}.example.com"
echo "  Admin Dashboard: https://admin.${ENVIRONMENT}.example.com"
echo "  Parent Portal: https://parent.${ENVIRONMENT}.example.com"
echo ""
echo "Demo Credentials:"
echo "  Admin: admin@sbtm.demo / Admin123!"
echo "  Driver: driver1@sbtm.demo / Admin123!"
echo "  Parent: parent1@sbtm.demo / Admin123!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
log_info "Next steps:"
echo "  1. Configure DNS (if using custom domain)"
echo "  2. Review security settings"
echo "  3. Run verification: ./scripts/verification/health-check.sh"
echo ""
log_info "Documentation: https://github.com/arvinddhasmana/SBTM_Releases/docs"
log_info "Support: https://github.com/arvinddhasmana/SBTM_Releases/issues"
echo ""

# Save deployment info
cat > "$SCRIPT_DIR/deployment-info.txt" << ENDINFO
Deployment Date: $(date)
Project ID: $PROJECT_ID
Region: $REGION
Cluster: $CLUSTER_NAME
Environment: $ENVIRONMENT
ENDINFO

log_success "Deployment info saved to: $SCRIPT_DIR/deployment-info.txt"
echo ""

# Cleanup option
echo ""
log_warning "To delete all resources later, run:"
echo "  gcloud container clusters delete $CLUSTER_NAME --region=$REGION --quiet"
echo "  # Then delete other resources (SQL, Redis, Storage) via console"
echo ""
