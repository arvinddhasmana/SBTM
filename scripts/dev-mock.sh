#!/usr/bin/env bash
# Wrapper script for backward compatibility
# The actual script is now in dev/dev-mock.sh
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${DIR}/dev/dev-mock.sh" "$@"
