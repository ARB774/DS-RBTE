#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || exit 1
umask 077
BACKUP_DIR="$(mktemp -d /root/rbte-backup-$(date +%Y%m%d-%H%M%S).XXXXXX)"
python3 - "$BACKUP_DIR/portal.sqlite3" <<'PY'
import sqlite3, sys
with sqlite3.connect('file:/var/lib/rbte-portal/portal.sqlite3?mode=ro', uri=True) as source:
    with sqlite3.connect(sys.argv[1]) as target:
        source.backup(target)
        if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise SystemExit('Backup integrity check failed')
PY
cp /etc/rbte-portal/config.json "$BACKUP_DIR/config.json"
readlink -f /opt/rbte-portal/current > "$BACKUP_DIR/release-path.txt"
echo "Protected backup: $BACKUP_DIR. Copy to encrypted storage outside the VPS."
