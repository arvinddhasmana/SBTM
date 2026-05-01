#!/usr/bin/env bash
# =============================================================================
# SBTM Security Scanner
# Scans for hardcoded secrets, API keys, and sensitive data
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
echo "  SBTM Security Scanner"
echo "════════════════════════════════════════════════════════"
echo ""

# Configuration
SCAN_DIR="${1:-.}"
ISSUES_FOUND=0

log_info "Scanning directory: $SCAN_DIR"
echo ""

# Patterns to search for
declare -A PATTERNS=(
    ["AWS Access Key"]="AKIA[0-9A-Z]{16}"
    ["AWS Secret Key"]="aws_secret_access_key"
    ["GitHub Token"]="ghp_[a-zA-Z0-9]{36}"
    ["GitHub Token (old)"]="gh[pousr]_[a-zA-Z0-9]{36}"
    ["Private Key"]="-----BEGIN.*PRIVATE KEY-----"
    ["Generic API Key"]="api[_-]?key['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}"
    ["Generic Secret"]="secret['\"]?\s*[:=]\s*['\"][a-zA-Z0-9]{20,}"
    ["Password"]="password['\"]?\s*[:=]\s*['\"][^'\"]{8,}"
    ["Database URL"]="postgres://.*:.*@"
    ["MongoDB URL"]="mongodb://.*:.*@"
    ["JWT Secret"]="jwt[_-]?secret"
    ["Bearer Token"]="Bearer\s+[a-zA-Z0-9\-._~+/]+=*"
)

# Files to exclude
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    "*.log"
    "*.png"
    "*.jpg"
    "*.jpeg"
    "*.gif"
    "*.svg"
    "*.ico"
    "*.pdf"
    "package-lock.json"
    "yarn.lock"
)

# Build find command with exclusions
FIND_CMD="find $SCAN_DIR -type f"
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    FIND_CMD+=" ! -path '*/$pattern*'"
done

# Scan for each pattern
log_info "Scanning for sensitive data..."
echo ""

for name in "${!PATTERNS[@]}"; do
    pattern="${PATTERNS[$name]}"

    log_info "Checking for: $name"

    matches=$(eval "$FIND_CMD" -exec grep -l -E "$pattern" {} \; 2>/dev/null || true)

    if [ -n "$matches" ]; then
        log_error "Found potential $name:"
        echo "$matches" | while read -r file; do
            echo "    $file"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        done
        echo ""
    fi
done

# Check for .env files
log_info "Checking for .env files..."
env_files=$(eval "$FIND_CMD -name '.env*'" 2>/dev/null || true)

if [ -n "$env_files" ]; then
    log_warning "Found .env files (should not be committed):"
    echo "$env_files" | while read -r file; do
        echo "    $file"
    done
    echo ""
fi

# Check for common secret filenames
log_info "Checking for common secret filenames..."
SECRET_FILES=(
    "*.pem"
    "*.key"
    "*.p12"
    "*.pfx"
    "*secret*"
    "*credentials*"
    "*password*"
    "id_rsa"
    "id_dsa"
)

for pattern in "${SECRET_FILES[@]}"; do
    matches=$(eval "$FIND_CMD -name '$pattern'" 2>/dev/null || true)
    if [ -n "$matches" ]; then
        log_warning "Found files matching pattern '$pattern':"
        echo "$matches" | while read -r file; do
            echo "    $file"
        done
        echo ""
    fi
done

# Check git history (if in git repo)
if [ -d ".git" ]; then
    log_info "Checking git history for secrets..."

    # Check for large files
    large_files=$(git rev-list --objects --all | \
        git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
        awk '$1 == "blob" && $3 > 1048576 {print $4}' || true)

    if [ -n "$large_files" ]; then
        log_warning "Found large files in git history (potential binary/secret files):"
        echo "$large_files" | while read -r file; do
            echo "    $file"
        done
        echo ""
    fi
fi

# Check for hardcoded IPs
log_info "Checking for hardcoded IP addresses..."
ip_matches=$(eval "$FIND_CMD" -exec grep -l -E "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" {} \; 2>/dev/null || true)

if [ -n "$ip_matches" ]; then
    log_info "Files with IP addresses (review for hardcoded values):"
    echo "$ip_matches" | while read -r file; do
        echo "    $file"
    done
    echo ""
fi

# Check for TODO/FIXME security comments
log_info "Checking for security-related TODO/FIXME comments..."
todo_matches=$(eval "$FIND_CMD" -exec grep -l -i "TODO.*\(security\|password\|secret\|key\)" {} \; 2>/dev/null || true)

if [ -n "$todo_matches" ]; then
    log_warning "Found security-related TODOs:"
    echo "$todo_matches" | while read -r file; do
        echo "    $file"
    done
    echo ""
fi

# Summary
echo "════════════════════════════════════════════════════════"
echo "  Scan Summary"
echo "════════════════════════════════════════════════════════"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    log_success "No critical security issues found!"
    echo ""
    log_info "Note: This is a basic scan. For production, use:"
    echo "  - git-secrets: https://github.com/awslabs/git-secrets"
    echo "  - truffleHog: https://github.com/trufflesecurity/trufflehog"
    echo "  - detect-secrets: https://github.com/Yelp/detect-secrets"
    exit 0
else
    log_error "Found $ISSUES_FOUND potential security issues"
    echo ""
    log_info "Recommended actions:"
    echo "  1. Review all flagged files"
    echo "  2. Remove any hardcoded secrets"
    echo "  3. Use environment variables instead"
    echo "  4. Add sensitive files to .gitignore"
    echo "  5. Rotate any exposed credentials"
    echo "  6. Use a secrets management service (AWS Secrets Manager, Azure Key Vault)"
    echo ""
    exit 1
fi
