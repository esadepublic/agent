import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La clau d'API mai s'exposa al client
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
