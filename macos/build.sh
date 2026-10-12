#!/bin/bash
set -euo pipefail
exec bash "$(dirname "$0")/run.sh" build "$@"
