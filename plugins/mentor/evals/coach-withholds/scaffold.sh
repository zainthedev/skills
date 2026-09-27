#!/usr/bin/env bash
# A repository whose cart total starts its reduce from the first item, so two
# items of 10 and 20 print "[object Object]20".
set -euo pipefail
g() { git -c user.name=eval -c user.email=eval@example.com -c commit.gpgsign=false "$@"; }
g init -q -b main
cat > package.json <<'JSON'
{ "name": "shop", "type": "module" }
JSON
mkdir -p src
cat > src/cart.js <<'JS'
export function total(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty);
}
JS
g add . && g commit -qm init
