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
  outputFileTracingIncludes: {
    '/*': [
      './scripts/pack-toc-mcp.mjs',
      './knowledge/pack-toc/**/*',
      './lib/pack-toc-sources.json',
      './node_modules/@modelcontextprotocol/server/**/*',
      './node_modules/zod/**/*',
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    agentUpgrade: 'security',
    serverActions: { bodySizeLimit: '128kb' },
  },
};
