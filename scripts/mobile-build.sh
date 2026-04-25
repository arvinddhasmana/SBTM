#!/usr/bin/env bash
# scripts/mobile-build.sh
# Trigger EAS Cloud Build for the driver app.
#
# Usage:
#   bash scripts/mobile-build.sh [android|ios|all] [--profile <profile>]
#
# Profiles:
#   production  (default) — .aab / .ipa for store submission; auto-increments versionCode
#   preview               — .apk for demos, QA, and sideloading; does NOT auto-increment
#   development           — .apk (debug) with Expo Dev Client for local development
#
# Examples:
#   bash scripts/mobile-build.sh android                   # production AAB
#   bash scripts/mobile-build.sh android --profile preview # demo APK (sideloadable)

set -euo pipefail

PLATFORM="${1:-all}"
PROFILE="production"

# Parse optional --profile flag
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="${2:?'--profile requires a value'}"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

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
  echo "==> Building ${platform} (profile: ${PROFILE})..."
  eas build \
    --platform "${platform}" \
    --profile "${PROFILE}" \
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
    echo "Usage: $0 [android|ios|all] [--profile production|preview|development]"
    exit 1
    ;;
esac

echo ""
echo "==> Build submitted to EAS Cloud Build."

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
