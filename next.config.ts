import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/training-log-explorer',
  assetPrefix: '/training-log-explorer',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
