const { execFileSync } = require('node:child_process');

function applicationCommit() {
  if (process.env.RBTE_APP_COMMIT) return process.env.RBTE_APP_COMMIT;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/** @type {import('next').NextConfig} */
module.exports = {
  env: { RBTE_APP_COMMIT: applicationCommit() },
  output: 'standalone',
  serverExternalPackages: ['@modelcontextprotocol/client'],
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    agentUpgrade: 'security',
    serverActions: { bodySizeLimit: '128kb' },
  },
};
