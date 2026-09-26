#!/usr/bin/env bash
# A repository whose feature branch adds a cart total that breaks on an empty
# cart and a hand-rolled date helper duplicating a declared dependency.
set -euo pipefail
g() { git -c user.name=eval -c user.email=eval@example.com -c commit.gpgsign=false "$@"; }
g init -q -b main
cat > package.json <<'JSON'
{ "name": "shop", "type": "module", "dependencies": { "date-fns": "^4.1.0" } }
JSON
mkdir -p src
printf 'export const currency = "USD";\n' > src/config.js
g add . && g commit -qm init
g checkout -qb feature/cart
cat > src/cart.js <<'JS'
export function total(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty);
}
JS
cat > src/days.js <<'JS'
export function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / ms);
}
JS
g add . && g commit -qm "cart total and day counts"
