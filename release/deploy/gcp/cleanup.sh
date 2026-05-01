#!/usr/bin/env bash
# =============================================================================
# GCP Cleanup Script
# Deletes all SBTM resources from Google Cloud Platform
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "════════════════════════════════════════════════════════"
echo "  SBTM GCP Cleanup"
echo "════════════════════════════════════════════════════════"
echo ""

log_error "⚠️  WARNING: This will DELETE ALL SBTM resources!"
echo ""

# Get current project
PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT" ]; then
    log_error "No GCP project configured"
    log_info "Run: gcloud config set project PROJECT_ID"
    exit 1
fi

echo "Current project: $PROJECT"
echo ""

# Prompt for cluster name and region
read -p "Enter GKE cluster name to delete: " CLUSTER_NAME
read -p "Enter region (e.g., us-central1): " REGION

if [ -z "$CLUSTER_NAME" ] || [ -z "$REGION" ]; then
    log_error "Cluster name and region are required"
    exit 1
fi

echo ""
log_info "Will delete from project: $PROJECT"
log_info "  - GKE cluster: $CLUSTER_NAME"
log_info "  - Cloud SQL instances"
log_info "  - Redis instances"
log_info "  - Storage buckets"
log_info "  - Service accounts"
echo ""

read -p "Type 'DELETE' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE" ]; then
    log_info "Cleanup cancelled"
    exit 0
fi

echo ""
log_info "Starting cleanup..."
echo ""

# Delete GKE cluster
log_info "Deleting GKE cluster..."
gcloud container clusters delete "$CLUSTER_NAME" \
    --region="$REGION" \
    --quiet || log_error "Failed to delete GKE cluster"

# Find and delete Cloud SQL instances
log_info "Looking for Cloud SQL instances..."
SQL_INSTANCES=$(gcloud sql instances list --format="value(name)" --filter="name~sbtm" || true)

if [ -n "$SQL_INSTANCES" ]; then
    echo "$SQL_INSTANCES" | while read -r instance; do
        log_info "Deleting Cloud SQL instance: $instance"
        gcloud sql instances delete "$instance" --quiet || log_error "Failed to delete $instance"
    done
else
    log_info "No Cloud SQL instances found"
fi

# Find and delete Redis instances
log_info "Looking for Redis instances..."
REDIS_INSTANCES=$(gcloud redis instances list --region="$REGION" --format="value(name)" --filter="name~sbtm" || true)

if [ -n "$REDIS_INSTANCES" ]; then
    echo "$REDIS_INSTANCES" | while read -r instance; do
        log_info "Deleting Redis instance: $instance"
        gcloud redis instances delete "$instance" --region="$REGION" --quiet || log_error "Failed to delete $instance"
    done
else
    log_info "No Redis instances found"
fi

# Find and delete storage buckets
log_info "Looking for storage buckets..."
BUCKETS=$(gsutil ls | grep sbtm || true)

if [ -n "$BUCKETS" ]; then
    echo "$BUCKETS" | while read -r bucket; do
        log_info "Deleting bucket: $bucket"
        gsutil -m rm -r "$bucket" || log_error "Failed to delete $bucket"
    done
else
    log_info "No storage buckets found"
fi

# Delete service accounts
log_info "Looking for service accounts..."
SERVICE_ACCOUNTS=$(gcloud iam service-accounts list --format="value(email)" --filter="email~sbtm" || true)

if [ -n "$SERVICE_ACCOUNTS" ]; then
    echo "$SERVICE_ACCOUNTS" | while read -r sa; do
        log_info "Deleting service account: $sa"
        gcloud iam service-accounts delete "$sa" --quiet || log_error "Failed to delete $sa"
    done
else
    log_info "No service accounts found"
fi

echo ""
log_success "Cleanup complete!"
echo ""
log_info "Verify deletion:"
echo "  gcloud container clusters list"
echo "  gcloud sql instances list"
echo "  gcloud redis instances list --region=$REGION"
echo "  gsutil ls"
echo ""
