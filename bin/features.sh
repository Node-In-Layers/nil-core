#!/usr/bin/env bash

set -euo pipefail

# Run Cucumber feature tests. Collector lifecycle is managed per-scenario
# from the Cucumber step definitions.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run test:features

