#!/usr/bin/env bash
set -euo pipefail

export RBTE_ROOT="${RBTE_ROOT:-${HOME}/rbte}"
export RBTE_LOGS="${RBTE_LOGS:-${HOME}/rbte-logs}"
export NODE_ENV=production

echo "[RBTE deploy] RBTE_ROOT=${RBTE_ROOT}"
echo "[RBTE deploy] RBTE_LOGS=${RBTE_LOGS}"
echo "[RBTE deploy] node=$(node -v) npm=$(npm -v) swap=$(cat /proc/swaps | tail -n +2 | awk '{s+=$3} END {printf "%.0fM", s}')"

mkdir -p "${RBTE_ROOT}"/{repo,current,previous} "${RBTE_LOGS}"

if [ ! -f "${RBTE_ROOT}/repo/package.json" ]; then
  echo "ERROR: ${RBTE_ROOT}/repo/package.json not found. Upload code first."
  exit 1
fi

cd "${RBTE_ROOT}/repo"

if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi

echo "[RBTE deploy] npm install (maxsockets=4, 3G heap)..."
export NODE_OPTIONS="--max-old-space-size=3072"
npm install --maxsockets=4 --no-audit --no-fund --prefer-offline 2>&1 | tail -n 5

echo "[RBTE deploy] drizzle migrate..."
if [ -f drizzle/0000_init.sql ] && [ -n "${DATABASE_URL:-}" ]; then
  PSQL_DATABASE_URL="${DATABASE_URL%%\?schema=*}"
  PSQL_DATABASE_URL="${PSQL_DATABASE_URL%%&schema=*}"
  if ! psql "${PSQL_DATABASE_URL}" -c "SELECT count(*) FROM users;" >/dev/null 2>&1; then
    echo "  applying drizzle/0000_init.sql manually..."
    psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 -f drizzle/0000_init.sql >/dev/null
  fi
  if [ -f drizzle/0001_users_identity.sql ]; then
    echo "  applying drizzle/0001_users_identity.sql..."
    psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 -f drizzle/0001_users_identity.sql >/dev/null
  fi
  if [ -f drizzle/0002_lucia_v3_sessions.sql ]; then
    echo "  applying drizzle/0002_lucia_v3_sessions.sql..."
    psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 -f drizzle/0002_lucia_v3_sessions.sql >/dev/null
  fi
  if [ -f drizzle/0003_lucia_session_ids_text.sql ]; then
    echo "  applying drizzle/0003_lucia_session_ids_text.sql..."
    psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 -f drizzle/0003_lucia_session_ids_text.sql >/dev/null
  fi
  echo "  schema ready."
fi

echo "[RBTE deploy] next build standalone..."
rm -rf .next
NODE_OPTIONS="--max-old-space-size=3072" node ./node_modules/next/dist/bin/next build 2>&1 | tail -n 30
BUILD_OK=${PIPESTATUS[0]}
if [ "${BUILD_OK}" -ne 0 ]; then
  echo "FATAL: next build exit=${BUILD_OK}"
  exit "${BUILD_OK}"
fi
echo "  Build OK."

echo "[RBTE deploy] copy public and static assets into standalone..."
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static .next/standalone/public
cp -a .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -a public .next/standalone/public
fi
test -d .next/standalone/.next/static/css
echo "  Standalone assets ready."

cd "${RBTE_ROOT}"

echo "[RBTE deploy] blue-green rsync..."
if [ -d current ]; then
  if [ -d previous ]; then
    rm -rf previous
  fi
  mv current previous
fi
mkdir -p current
rsync -a --delete \
  --exclude='node_modules/.cache' \
  --exclude='.next/cache' \
  --exclude='.git' \
  repo/ current/
if [ -f repo/.env.local ]; then
  cp repo/.env.local current/.env.local
  chmod 600 current/.env.local
fi
echo "  rsync done."

cd "${RBTE_ROOT}/current"
if [ -f .env.local ]; then
  set -a; source .env.local; set +a
fi

echo "[RBTE deploy] pm2 startOrReload..."
pm2 delete rbte-pilot 2>/dev/null || true
pm2 startOrReload deploy/ecosystem.config.js --env production --update-env 2>&1 | tail -n 10
pm2 save 2>&1 | tail -n 2
sleep 3

echo ""
echo "============================================"
echo " Smoke tests"
echo "============================================"
echo "  [1] localhost healthz..."
curl -sS -i http://127.0.0.1:3000/api/healthz 2>&1 | head -n 15 || true
echo ""
echo "  [2] public healthz..."
curl -sS -i https://pilot.rbte.pro/api/healthz 2>&1 | head -n 15 || true
echo ""
echo "  [3] pm2 status..."
pm2 status rbte-pilot 2>&1 | tail -n 6 || true

echo ""
echo "[RBTE deploy] Done. Rollback if needed:"
echo "  cd ${RBTE_ROOT} && rm -rf current && if [ -d previous ]; then rsync -a previous/ current/; fi && pm2 reload rbte-pilot"
