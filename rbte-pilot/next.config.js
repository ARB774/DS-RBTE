/** @type {import('next').NextConfig} */
module.exports = {
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
