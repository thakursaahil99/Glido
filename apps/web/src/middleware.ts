import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Derive ws(s):// variants of the configured API/socket origins for connect-src —
// the browser talks to both the plain HTTPS API and its WebSocket namespace.
function wsOrigin(httpOrigin: string) {
  return httpOrigin.replace(/^http/, "ws");
}

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api\/?$/, "");
const socketOrigin = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/**
 * Sets a per-request Content-Security-Policy with a fresh nonce every time.
 * Next.js App Router needs this to be nonce-based rather than a static header:
 * it injects its own inline <script> tags for hydration/streaming data, and
 * automatically adds `nonce="..."` to them ONLY when it detects a nonce on the
 * request via the `x-nonce` header set below — a static CSP without
 * 'unsafe-inline' would otherwise block Next's own scripts and break hydration
 * site-wide (this was tried and confirmed broken before switching to this).
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${apiOrigin} ${wsOrigin(apiOrigin)} ${socketOrigin} ${wsOrigin(socketOrigin)} https://checkout.razorpay.com`,
    `frame-src https://checkout.razorpay.com https://api.razorpay.com`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets/images — only pages need the CSP + nonce plumbing.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
