#!/usr/bin/env bash
# Three decisions this app makes in the browser, asked of the server directly.
#
#   ./run.sh
#
# Needs Docker and Node 22. The backend is destroyed and rebuilt every run.
set -euo pipefail
cd "$(dirname "$0")"

docker compose down -v >/dev/null 2>&1 || true
docker compose up -d >/dev/null
docker compose restart parse >/dev/null          # it races mongo on a cold volume
node run.mjs

echo "  [3/3] THE FLAG THE BROWSER READS TO UNLOCK THE PAID FEATURES"
echo ""
echo "    as the app was generated"
node entitlement.mjs

# the guard is a server trigger, so it needs the server restarted with it on
docker compose stop parse >/dev/null
GUARD_ENTITLEMENT=true docker compose up -d parse >/dev/null
for _ in $(seq 1 120); do
  curl -sf -o /dev/null -H 'X-Parse-Application-Id: shop' \
    'http://127.0.0.1:1343/parse/classes/Price?limit=0' && break
  sleep 0.5
done
echo "    with the same flag guarded on the server"
node entitlement.mjs
