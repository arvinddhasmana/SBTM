#!/usr/bin/env bash
# Wrapper script for backward compatibility
# The actual script is now in simulation/SimulationOnlyOnSeededDB.sh
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${DIR}/simulation/SimulationOnlyOnSeededDB.sh" "$@"
