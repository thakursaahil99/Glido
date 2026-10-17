import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker image (apps/web/Dockerfile) only — Vercel
  // does its own serverless bundling and the build breaks if this is set there
  // (its trace-collection step expects the default output mode).
  output: process.env.VERCEL ? undefined : "standalone",
  // Content-Security-Policy is set per-request in middleware.ts, not here — Next.js
  // App Router needs a fresh nonce on every request for its own inline hydration
  // scripts (a static header here would need 'unsafe-inline', which defeats most of
  // the point of having a script-src at all).
  // When API_PROXY_TARGET is set (the Vercel deployment), the browser calls this
  // site's own /api and /uploads paths and Next forwards them to the API — same-origin,
  // so the API's CORS allowlist doesn't need to know this site's domain. Pair it with
  // NEXT_PUBLIC_API_URL="/api". Unset locally, where the API is called directly.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    if (!target) return [];
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
      { source: "/uploads/:path*", destination: `${target}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
