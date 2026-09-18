"use client";

import { useEffect, useRef } from "react";
import { loadGoogleScript } from "@/lib/google-signin";

/** Renders Google's own "Continue with Google" button and hands the resulting
 * ID token to `onToken` — nothing renders if no client id is configured. */
export function GoogleSignInButton({ onToken }: { onToken: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onToken(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
