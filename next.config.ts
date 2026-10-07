import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  agentRules: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.EMA_BACKEND_URL || "http://127.0.0.1:8010"}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
