#!/usr/bin/env bash
set -Eeuo pipefail

if [ -f /home/deployrbte/rbte/current/.next/standalone/server.js ]; then
  RBTE_OWNER=deployrbte
  RBTE_ROOT=/home/deployrbte/rbte
elif [ -f /home/www-data/rbte/current/.next/standalone/server.js ]; then
  RBTE_OWNER=www-data
  RBTE_ROOT=/home/www-data/rbte
elif [ -f "${HOME}/rbte/current/.next/standalone/server.js" ]; then
  RBTE_OWNER="$(id -un)"
  RBTE_ROOT="${HOME}/rbte"
else
  echo "ERROR: RBTE standalone installation not found."
  exit 1
fi

if [ "$(id -un)" != "${RBTE_OWNER}" ]; then
  if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run as root or ${RBTE_OWNER}."
    exit 1
  fi
  exec runuser -u "${RBTE_OWNER}" -- env \
    RBTE_ROOT="${RBTE_ROOT}" \
    bash "$0" --as-owner
fi

CURRENT="${RBTE_ROOT}/current"
cd "${CURRENT}"

test -d .next/static
test -f .next/standalone/server.js

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static .next/standalone/public
cp -a .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -a public .next/standalone/public
fi

CSS_FILE="$(find .next/standalone/.next/static/css -maxdepth 1 -type f -name '*.css' | head -n 1)"
test -n "${CSS_FILE}"
echo "Standalone CSS ready: ${CSS_FILE}"

export RBTE_ROOT
export RBTE_LOGS="${RBTE_ROOT}/../rbte-logs"
pm2 reload rbte-pilot --update-env
pm2 save
sleep 4

curl -fsS --max-time 10 http://127.0.0.1:3000/api/healthz
echo
curl -fsSI --max-time 10 "http://127.0.0.1:3000/_next/static/css/$(basename "${CSS_FILE}")" | head -n 12
echo "DESIGN ASSETS FIXED"
