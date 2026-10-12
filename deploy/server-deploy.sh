#!/usr/bin/env bash
# Runs ON THE SERVER inside /var/www/appus-mart after the code has been copied there.
# Touches only this app: its own folder, database (DATABASE_URL in .env), port and pm2 process "appus-mart".
set -euo pipefail
cd "$(dirname "$0")/.."
APP=appus-mart
PORT="${APPUS_MART_PORT:-3005}"

[ -f .env ] || { echo "Missing .env (copy deploy/env.production.example and fill it in)"; exit 1; }
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<20||(a===20&&b<9)) { console.error("Node >= 20.9 required, found "+process.versions.node); process.exit(1) }'

# Refuse to start on a port another program already uses (unless it is this app).
if ! pm2 describe "$APP" >/dev/null 2>&1 && ss -ltn "sport = :$PORT" | grep -q LISTEN; then
  echo "Port $PORT is already in use by another program. Set APPUS_MART_PORT to a free port (and update nginx)."; exit 1
fi

npm ci                    # dev dependencies are needed for the build (TypeScript, Tailwind)
npm run db:generate
npm run db:deploy         # applies committed migrations only (never migrate dev in production)
npm run db:seed           # idempotent: adds missing categories/products/pincodes/admin, never overwrites edits
npm run build

if pm2 describe "$APP" >/dev/null 2>&1; then
  pm2 reload "$APP" --update-env
else
  APPUS_MART_PORT="$PORT" pm2 start ecosystem.config.cjs
fi
pm2 save                  # remembers the current process list (including the other apps, unchanged) for reboots

sleep 4
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo && echo "Appu's Mart is up on 127.0.0.1:$PORT"
