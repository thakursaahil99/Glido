import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image (apps/web/Dockerfile) only — Vercel
  // does its own serverless bundling and the build breaks if this is set there
  // (its trace-collection step expects the default output mode).
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
