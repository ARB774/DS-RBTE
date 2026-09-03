#!/usr/bin/env bash
set -Eeuo pipefail

detect_installation() {
  if [ -f /home/deployrbte/rbte/current/.env.local ]; then
    RBTE_OWNER=deployrbte
    RBTE_ROOT=/home/deployrbte/rbte
  elif [ -f /home/www-data/rbte/current/.env.local ]; then
    RBTE_OWNER=www-data
    RBTE_ROOT=/home/www-data/rbte
  elif [ -f "${HOME}/rbte/current/.env.local" ]; then
    RBTE_OWNER="$(id -un)"
    RBTE_ROOT="${HOME}/rbte"
  else
    echo "ERROR: RBTE installation with .env.local not found."
    exit 1
  fi
  export RBTE_OWNER RBTE_ROOT
}

detect_installation

if [ "$(id -un)" != "${RBTE_OWNER}" ]; then
  if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: run as root or ${RBTE_OWNER}."
    exit 1
  fi
  chmod 755 "$0"
  exec runuser -u "${RBTE_OWNER}" -- env \
    RBTE_ROOT="${RBTE_ROOT}" \
    RBTE_OWNER="${RBTE_OWNER}" \
    bash "$0" --as-owner
fi

CURRENT="${RBTE_ROOT}/current"
cd "${CURRENT}"

STAMP="$(date +%Y%m%d-%H%M%S)"
for ENV_FILE in "${RBTE_ROOT}/current/.env.local" "${RBTE_ROOT}/repo/.env.local"; do
  if [ -f "${ENV_FILE}" ] && grep -qE '[?&]schema=' "${ENV_FILE}"; then
    cp -a "${ENV_FILE}" "${ENV_FILE}.bak-${STAMP}"
    sed -i -E 's/\?schema=[^"&[:space:]]*&/?/g; s/([?&])schema=[^"&[:space:]]*//g' "${ENV_FILE}"
    echo "Removed unsupported schema parameter from ${ENV_FILE}"
  fi
done

set -a
# shellcheck disable=SC1091
source .env.local
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set in ${CURRENT}/.env.local."
  exit 1
fi

# ORM connection strings may contain ?schema=public. libpq/psql does not
# recognize that query parameter, so remove it only for psql calls.
PSQL_DATABASE_URL="${DATABASE_URL%%\?schema=*}"
PSQL_DATABASE_URL="${PSQL_DATABASE_URL%%&schema=*}"

echo "Applying users schema repair..."
psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 <<'RBTE_USERS_SQL'
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
UPDATE users
SET email = 'legacy-' || id::text || '@rbte.local'
WHERE email IS NULL OR btrim(email) = '';
UPDATE users
SET name = 'Legacy user ' || left(id::text, 8)
WHERE name IS NULL OR btrim(name) = '';
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
COMMIT;
RBTE_USERS_SQL

echo "Verifying users table..."
psql "${PSQL_DATABASE_URL}" -v ON_ERROR_STOP=1 -c \
  "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('email','name') ORDER BY column_name;"

export RBTE_ROOT
export RBTE_LOGS="${RBTE_ROOT}/../rbte-logs"
pm2 reload rbte-pilot --update-env
pm2 save

echo "USERS SCHEMA FIXED"
