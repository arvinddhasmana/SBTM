#!/usr/bin/env bash
# scripts/mobile-build.sh
# Trigger EAS Cloud Build for Android AAB and/or iOS IPA (production profile).
#
# Usage:
#   bash scripts/mobile-build.sh android
#   bash scripts/mobile-build.sh ios
#   bash scripts/mobile-build.sh all

set -euo pipefail

PLATFORM="${1:-all}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/driver-app"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "ERROR: Driver app not found at ${APP_DIR}"
  exit 1
fi

if ! command -v eas &> /dev/null; then
  echo "ERROR: eas-cli not installed. Run: npm install -g eas-cli"
  exit 1
fi

cd "${APP_DIR}"

build() {
  local platform="$1"
  echo "==> Building ${platform} (production profile)..."
  eas build \
    --platform "${platform}" \
    --profile production \
    --non-interactive
}

case "${PLATFORM}" in
  android) build android ;;
  ios)     build ios ;;
  all)
    build android
    build ios
    ;;
  *)
    echo "Usage: $0 [android|ios|all]"
    exit 1
    ;;
esac

echo ""
echo "==> Build submitted to EAS Cloud Build."
echo "    Track progress: https://expo.dev/accounts/<your-account>/projects/driver-app/builds"
