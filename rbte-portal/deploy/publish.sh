#!/usr/bin/env bash
# Requires a working certificate and completed preparation. rbte.pro only.
set -euo pipefail
[[ $(id -u) == 0 ]] || exit 1
cd /opt/rbte-portal/current
test -f /etc/letsencrypt/live/rbte.pro/fullchain.pem
runuser -u rbteportal -- .venv/bin/python manage.py check --deploy --fail-level WARNING
# Refuse publication while no active administrator exists.
runuser -u rbteportal -- .venv/bin/python manage.py shell -c 'from accounts.models import User; assert User.objects.filter(is_superuser=True,is_active=True).exists(), "Create administrator first"'
systemctl enable --now rbte-portal.service
python3 - <<'PY'
import time, urllib.request
for attempt in range(20):
    try:
        req = urllib.request.Request('http://127.0.0.1:8100/health/', headers={'Host': 'rbte.pro', 'X-Forwarded-Proto': 'https'})
        with urllib.request.urlopen(req, timeout=3) as response:
            assert response.status == 200
        break
    except Exception:
        if attempt == 19: raise SystemExit('Portal health check failed; inspect journalctl -u rbte-portal')
        time.sleep(1)
PY
BACKUP="$(mktemp /etc/nginx/sites-available/rbte.pro.before-publish.XXXXXX)"
cp /etc/nginx/sites-available/rbte.pro "$BACKUP"
install -m 0644 deploy/rbte.pro.https.conf /etc/nginx/sites-available/rbte.pro
if ! nginx -t; then
    cp "$BACKUP" /etc/nginx/sites-available/rbte.pro
    echo "Previous Nginx config restored; publication stopped."
    exit 1
fi
systemctl reload nginx
systemctl enable --now rbte-portal-mail.timer rbte-portal-clean.timer
echo "Published: https://rbte.pro/ ; administration: https://rbte.pro/admin/"
