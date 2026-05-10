#!/usr/bin/env bash
# Wrapper script for backward compatibility
# The actual script is now in schema-seed/verify-demo.sh
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${DIR}/schema-seed/verify-demo.sh" "$@"
