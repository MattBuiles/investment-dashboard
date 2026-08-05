import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.79.23", "localhost"],
  transpilePackages: ["invest-ui"],
};

export default nextConfig;
