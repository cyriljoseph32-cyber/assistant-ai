/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API routes that receive Twilio webhooks must run on the Node.js runtime
  // (signature validation + twilio SDK are not edge-compatible).
  experimental: {
    serverComponentsExternalPackages: ["twilio", "@anthropic-ai/sdk"],
  },
};

module.exports = nextConfig;
