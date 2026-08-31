/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucia", "drizzle-orm", "zod"],
  },
  transpilePackages: ["lucia", "drizzle-orm", "bcryptjs"],
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, ".");
    return config;
  },
};

module.exports = nextConfig;
