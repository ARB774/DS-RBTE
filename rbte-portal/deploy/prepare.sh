#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || exit 1
cd /opt/rbte-portal/current
python3 deploy/configure.py
runuser -u rbteportal -- .venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput
find staticfiles -type d -exec chmod 0755 {} +
find staticfiles -type f -exec chmod 0644 {} +
runuser -u rbteportal -- .venv/bin/python manage.py check --deploy --fail-level WARNING
install -m 0644 deploy/rbte-portal*.service deploy/rbte-portal*.timer /etc/systemd/system/
systemctl daemon-reload
echo "Prepared. Create administrator and test SMTP before publishing."
