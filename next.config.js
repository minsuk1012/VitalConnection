/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3', 'apify-client', 'sharp', '@imgly/background-removal-node'],
};

module.exports = nextConfig;
