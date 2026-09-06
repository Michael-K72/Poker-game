import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mk/poker-engine", "@mk/shared"],
  reactStrictMode: true,
};

export default nextConfig;
