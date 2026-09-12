import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image (apps/web/Dockerfile) — bundles only
  // the traced production dependencies instead of the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
