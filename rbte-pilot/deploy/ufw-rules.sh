#!/usr/bin/env bash
set -euo pipefail

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow HTTP for ACME certbot challenges
ufw allow 80/tcp comment 'HTTP ACME'

# Allow HTTPS
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall non-interactive
ufw --force enable
