#!/usr/bin/env bash
# =============================================================================
# Azure Cleanup Script
# Deletes all SBTM resources from Azure
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
echo "  SBTM Azure Cleanup"
echo "════════════════════════════════════════════════════════"
echo ""

log_error "⚠️  WARNING: This will DELETE ALL SBTM resources!"
echo ""

# Prompt for confirmation
read -p "Enter resource group name to delete: " RESOURCE_GROUP

if [ -z "$RESOURCE_GROUP" ]; then
    log_error "Resource group name is required"
    exit 1
fi

echo ""
log_info "Will delete resource group: $RESOURCE_GROUP"
log_info "This includes:"
echo "  - AKS cluster"
echo "  - PostgreSQL database"
echo "  - Redis cache"
echo "  - Storage accounts"
echo "  - Virtual network"
echo "  - All other resources in the group"
echo ""

read -p "Type 'DELETE' to confirm: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE" ]; then
    log_info "Cleanup cancelled"
    exit 0
fi

echo ""
log_info "Starting cleanup..."
echo ""

# Check if resource group exists
if ! az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    log_error "Resource group '$RESOURCE_GROUP' not found"
    exit 1
fi

# Delete resource group
log_info "Deleting resource group (this may take 5-10 minutes)..."
az group delete --name "$RESOURCE_GROUP" --yes --no-wait

log_success "Deletion initiated"
echo ""
log_info "Resource group is being deleted in the background"
log_info "To check status:"
echo "  az group show --name $RESOURCE_GROUP"
echo ""
log_success "Cleanup complete!"
