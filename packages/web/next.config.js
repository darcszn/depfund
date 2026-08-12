/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing from the CLI package in the monorepo
  transpilePackages: [],
};

module.exports = nextConfig;
