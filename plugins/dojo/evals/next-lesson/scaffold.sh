#!/usr/bin/env bash
# Seeds the empty eval workspace with the fixture course. Runs only with --scaffold.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$here/../fixtures/workspace/." "$PWD/"
