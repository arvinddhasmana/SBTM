#!/usr/bin/env bash
# scripts/mobile-submit.sh
# Submit EAS builds to Google Play Store and/or Apple App Store.
# Requires builds to already exist (run mobile-build.sh first, or pass --id <build-id>).
#
# Usage:
#   bash scripts/mobile-submit.sh android
#   bash scripts/mobile-submit.sh ios
#   bash scripts/mobile-submit.sh all
#   bash scripts/mobile-submit.sh android --id <build-id>

set -euo pipefail

PLATFORM="${1:-all}"
shift || true
EXTRA_ARGS=("$@")

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

submit() {
  local platform="$1"
  echo "==> Submitting ${platform} build (production profile)..."
  eas submit \
    --platform "${platform}" \
    --profile production \
    --non-interactive \
    "${EXTRA_ARGS[@]}"
}

case "${PLATFORM}" in
  android) submit android ;;
  ios)     submit ios ;;
  all)
    submit android
    submit ios
    ;;
  *)
    echo "Usage: $0 [android|ios|all] [--id <build-id>]"
    exit 1
    ;;
esac

echo ""
echo "==> Submission complete."
echo "    Android: Google Play Console → Internal Testing track"
echo "    iOS: App Store Connect → TestFlight"
