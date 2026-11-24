#!/usr/bin/env bash
# First installation only. Never overwrites an existing deployment.
set -euo pipefail
umask 027
[[ $(id -u) == 0 ]] || { echo "Run as root"; exit 1; }
SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=rbte-portal-20260917
DEST="/opt/rbte-portal/releases/$VERSION"
[[ ! -e /opt/rbte-portal && ! -L /opt/rbte-portal ]] || { echo "STOP: /opt/rbte-portal exists. See update/restore instructions."; exit 1; }
[[ ! -e /etc/rbte-portal ]] || { echo "STOP: /etc/rbte-portal exists."; exit 1; }
[[ ! -e /var/lib/rbte-portal ]] || { echo "STOP: portal data already exists."; exit 1; }
! getent passwd rbteportal >/dev/null || { echo "STOP: rbteportal user already exists; inspect before installation."; exit 1; }
cd "$SOURCE_DIR"
sha256sum -c MANIFEST.sha256 > /tmp/rbte-portal-manifest.log
apt-get update
apt-get install -y python3-venv nginx certbot python3-certbot-nginx
python3 -c 'import sys; assert (3,12) <= sys.version_info[:2] <= (3,14), "Python 3.12-3.14 required"'
useradd --system --user-group --home-dir /var/lib/rbte-portal --shell /usr/sbin/nologin rbteportal
install -d -m 0755 /opt/rbte-portal/releases "$DEST"
install -d -o root -g rbteportal -m 0750 /etc/rbte-portal
install -d -o rbteportal -g rbteportal -m 0700 /var/lib/rbte-portal
cp -R "$SOURCE_DIR/." "$DEST/"
chown -R root:root /opt/rbte-portal
find "$DEST" -type d -exec chmod 0755 {} +
find "$DEST" -type f -exec chmod 0644 {} +
ln -s "$DEST" /opt/rbte-portal/current
python3 -m venv "$DEST/.venv"
"$DEST/.venv/bin/python" -m pip install --no-index --find-links "$DEST/wheels" --require-hashes -r "$DEST/requirements.lock"
"$DEST/.venv/bin/python" -m pip check
# venv inherits umask 027; application user needs read/traverse, never write.
chmod -R a+rX "$DEST/.venv"
cd "$DEST"
TEST_DIR="$(mktemp -d /var/lib/rbte-portal/install-test.XXXXXX)"
chown rbteportal:rbteportal "$TEST_DIR"
runuser -u rbteportal -- env RBTE_TESTING=1 RBTE_TEST_DATA="$TEST_DIR" PYTHONDONTWRITEBYTECODE=1 "$DEST/.venv/bin/python" manage.py test --noinput
echo "Files installed and tests passed. Next: configure.py, migrate, collectstatic, createsuperuser."
