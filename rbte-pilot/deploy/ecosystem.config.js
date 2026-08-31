const path = require('path');
const fs = require('fs');
const os = require('os');

const home = os.homedir();
const RBTE_ROOT = process.env.RBTE_ROOT || path.join(home, 'rbte');
const RBTE_LOGS = process.env.RBTE_LOGS || path.join(home, 'rbte-logs');

try {
  fs.mkdirSync(RBTE_LOGS, { recursive: true });
  fs.mkdirSync(path.join(RBTE_ROOT, 'current'), { recursive: true });
} catch (_) {}

let envLocal = {};
try {
  const dotenvPath = path.resolve(RBTE_ROOT, 'current', '.env.local');
  if (fs.existsSync(dotenvPath)) {
    const raw = fs.readFileSync(dotenvPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      let key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envLocal[key] = val;
    }
  }
} catch (_) {
  envLocal = {};
}

module.exports = {
  apps: [
    {
      name: 'rbte-pilot',
      cwd: path.join(RBTE_ROOT, 'current'),
      script: path.join(RBTE_ROOT, 'current', '.next', 'standalone', 'server.js'),
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 8000,
      listen_timeout: 15000,
      wait_ready: false,
      error_file: path.join(RBTE_LOGS, 'error.log'),
      out_file: path.join(RBTE_LOGS, 'out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        RBTE_PILOT_EDITION: '2026-08-23.14',
        NEXT_TELEMETRY_DISABLED: '1',
        ...envLocal,
      },
    },
  ],
};
