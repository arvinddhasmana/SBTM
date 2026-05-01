#!/usr/bin/env bash
# =============================================================================
# SBTM Container Build and Push Script
# Builds all microservice Docker images and pushes to GitHub Container Registry
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "════════════════════════════════════════════════════════"
echo "  SBTM Container Build and Push"
echo "════════════════════════════════════════════════════════"
echo ""

# Configuration
GITHUB_USER="${GITHUB_USER:-arvinddhasmana}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REGISTRY="ghcr.io"
VERSION="${VERSION:-v1.0.0}"
TAG_LATEST="${TAG_LATEST:-true}"

# List of services to build
SERVICES=(
    "api-gateway"
    "gps-tracking"
    "emergency-alerts"
    "student-presence"
    "video-service"
    "student-management"
    "compliance-management"
    "notification-service"
)

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
    log_error "GITHUB_TOKEN environment variable is not set"
    echo ""
    echo "Please set GITHUB_TOKEN with your GitHub Personal Access Token:"
    echo "  export GITHUB_TOKEN=ghp_your_token_here"
    echo ""
    echo "Or pass it as parameter:"
    echo "  GITHUB_TOKEN=ghp_your_token_here ./build-and-push.sh"
    exit 1
fi

log_success "Prerequisites check passed"
echo ""

# Login to GitHub Container Registry
log_info "Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

if [ $? -eq 0 ]; then
    log_success "Logged in to ghcr.io"
else
    log_error "Failed to login to ghcr.io"
    exit 1
fi
echo ""

# Build and push each service
SUCCESSFUL_BUILDS=()
FAILED_BUILDS=()

for service in "${SERVICES[@]}"; do
    log_info "Building $service..."

    IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/sbtm-${service}"

    # Check if Dockerfile exists
    DOCKERFILE="services/${service}/Dockerfile"
    if [ ! -f "$DOCKERFILE" ]; then
        log_warning "Dockerfile not found for $service, using generic Dockerfile"
        DOCKERFILE="Dockerfile.generic"
    fi

    # Build image
    if docker build -t "${IMAGE_NAME}:${VERSION}" \
                   -t "${IMAGE_NAME}:latest" \
                   -f "$DOCKERFILE" \
                   --build-arg SERVICE_NAME="$service" \
                   --build-arg VERSION="$VERSION" \
                   .; then
        log_success "Built ${service}"

        # Push version tag
        log_info "Pushing ${IMAGE_NAME}:${VERSION}..."
        if docker push "${IMAGE_NAME}:${VERSION}"; then
            log_success "Pushed ${IMAGE_NAME}:${VERSION}"

            # Push latest tag
            if [ "$TAG_LATEST" = "true" ]; then
                log_info "Pushing ${IMAGE_NAME}:latest..."
                if docker push "${IMAGE_NAME}:latest"; then
                    log_success "Pushed ${IMAGE_NAME}:latest"
                else
                    log_warning "Failed to push latest tag for ${service}"
                fi
            fi

            SUCCESSFUL_BUILDS+=("$service")
        else
            log_error "Failed to push ${service}"
            FAILED_BUILDS+=("$service")
        fi
    else
        log_error "Failed to build ${service}"
        FAILED_BUILDS+=("$service")
    fi

    echo ""
done

# Generate image list file
log_info "Generating image list..."

IMAGE_LIST_FILE="docker-images.txt"
cat > "$IMAGE_LIST_FILE" <<EOF
# SBTM Docker Images
# Version: ${VERSION}
# Built: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

EOF

for service in "${SUCCESSFUL_BUILDS[@]}"; do
    echo "${REGISTRY}/${GITHUB_USER}/sbtm-${service}:${VERSION}" >> "$IMAGE_LIST_FILE"
done

log_success "Image list saved to ${IMAGE_LIST_FILE}"
echo ""

# Generate checksums
log_info "Generating image checksums..."

CHECKSUM_FILE="checksums.txt"
cat > "$CHECKSUM_FILE" <<EOF
# SBTM Docker Image Checksums
# Version: ${VERSION}
# Built: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

EOF

for service in "${SUCCESSFUL_BUILDS[@]}"; do
    IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/sbtm-${service}:${VERSION}"
    DIGEST=$(docker inspect --format='{{.RepoDigests}}' "$IMAGE_NAME" | grep -oP 'sha256:[a-f0-9]+' || echo "N/A")
    echo "${service}: ${DIGEST}" >> "$CHECKSUM_FILE"
done

log_success "Checksums saved to ${CHECKSUM_FILE}"
echo ""

# Generate deployment manifest updates
log_info "Generating Kubernetes manifest updates..."

MANIFEST_FILE="k8s-image-updates.yaml"
cat > "$MANIFEST_FILE" <<EOF
# Update your Kubernetes deployments with these image references
# kubectl set image deployment/<deployment-name> <container-name>=<image> -n sbtm

EOF

for service in "${SUCCESSFUL_BUILDS[@]}"; do
    IMAGE_NAME="${REGISTRY}/${GITHUB_USER}/sbtm-${service}:${VERSION}"
    cat >> "$MANIFEST_FILE" <<EOF
# ${service}
kubectl set image deployment/${service} ${service}=${IMAGE_NAME} -n sbtm

EOF
done

log_success "Manifest updates saved to ${MANIFEST_FILE}"
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo "  Build Summary"
echo "════════════════════════════════════════════════════════"
echo ""

log_success "Successfully built and pushed: ${#SUCCESSFUL_BUILDS[@]} services"
for service in "${SUCCESSFUL_BUILDS[@]}"; do
    echo "  ✓ $service"
done

if [ ${#FAILED_BUILDS[@]} -gt 0 ]; then
    echo ""
    log_error "Failed builds: ${#FAILED_BUILDS[@]} services"
    for service in "${FAILED_BUILDS[@]}"; do
        echo "  ✗ $service"
    done
fi

echo ""
echo "Image Registry: ${REGISTRY}/${GITHUB_USER}"
echo "Version: ${VERSION}"
echo ""

log_info "Generated files:"
echo "  - ${IMAGE_LIST_FILE} (list of all images)"
echo "  - ${CHECKSUM_FILE} (image checksums)"
echo "  - ${MANIFEST_FILE} (Kubernetes update commands)"
echo ""

log_info "Next steps:"
echo "  1. Verify images in GitHub Packages:"
echo "     https://github.com/${GITHUB_USER}?tab=packages"
echo ""
echo "  2. Update Kubernetes deployments:"
echo "     kubectl apply -f k8s/deployments/"
echo "     Or use commands from ${MANIFEST_FILE}"
echo ""
echo "  3. Verify deployments:"
echo "     kubectl get pods -n sbtm"
echo "     kubectl rollout status deployment/<name> -n sbtm"
echo ""

if [ ${#FAILED_BUILDS[@]} -eq 0 ]; then
    log_success "All services built and pushed successfully!"
    exit 0
else
    log_warning "Some services failed. Review errors above."
    exit 1
fi
