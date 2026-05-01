#!/usr/bin/env bash
# =============================================================================
# SBTM Release Files Migration Script
# Copies all release files to SBTM_Releases repository
# =============================================================================

set -euo pipefail

echo "════════════════════════════════════════════════════════"
echo "  SBTM Release Files Migration"
echo "════════════════════════════════════════════════════════"
echo ""

# Configuration
SOURCE_DIR="/home/runner/work/SBTM/SBTM/release"
TARGET_REPO="https://github.com/arvinddhasmana/SBTM_Releases.git"
TEMP_DIR="$HOME/SBTM_Releases_temp"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

echo "✓ Source directory found: $SOURCE_DIR"
echo ""

# Clone the target repository
echo "📥 Cloning target repository..."
if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

git clone "$TARGET_REPO" "$TEMP_DIR"
cd "$TEMP_DIR"

echo "✓ Repository cloned"
echo ""

# Copy all files
echo "📋 Copying files from release directory..."
cp -r "$SOURCE_DIR"/* "$TEMP_DIR/"

echo "✓ Files copied"
echo ""

# Show what will be committed
echo "📝 Files to be committed:"
git status --short
echo ""

# Add all files
echo "➕ Adding files to git..."
git add .

# Commit
echo "💾 Creating commit..."
git commit -m "feat: initial public release

Complete Implementation:
- Deployment automation for Azure and GCP
- Comprehensive documentation and guides
- Community files (CODE_OF_CONDUCT, CONTRIBUTING)
- Business model and pricing structure
- Health check and verification scripts
- Configured with production values

Repository: arvinddhasmana/SBTM_Releases
Support: arvinddhasmana@gmail.com

Ready for beta testing and public launch."

# Push
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "════════════════════════════════════════════════════════"
echo "  ✅ Migration Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Your files are now at:"
echo "  https://github.com/arvinddhasmana/SBTM_Releases"
echo ""
echo "Next steps:"
echo "  1. Visit the repository and verify all files are there"
echo "  2. Make repository Private initially (for review)"
echo "  3. Test the deployment scripts"
echo "  4. Make repository Public when ready"
echo ""
