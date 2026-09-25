const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const ACCESS_KEY = "glido_access_token";
const REFRESH_KEY = "glido_refresh_token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getTokens() {
  if (typeof window === "undefined") return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const { refreshToken } = getTokens();
    if (refreshToken) {
      const r = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (r.ok) {
        const data = await r.json();
        setTokens(data.accessToken, data.refreshToken);
        return request<T>(path, options, false);
      }
    }
    clearTokens();
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message =
      (data as { message?: string } | null)?.message ?? "Something went wrong. Please try again.";
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** The API's origin with no /api suffix — uploaded file URLs (e.g. /uploads/x.jpg) hang off this. */
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Resolves a stored image value to a renderable URL: absolute URLs pass through, local uploads get the API origin prefixed. */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:)?\/\//.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const { accessToken } = getTokens();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data as { message?: string } | null)?.message ?? "Could not upload image.";
    throw new ApiError(message, res.status);
  }

  return data as { url: string };
}

/** Downloads a file from an authenticated API endpoint (e.g. a PDF invoice) and
 * triggers the browser's normal save-file flow — plain <a href> can't carry the
 * bearer token, so this fetches as a blob and clicks a temporary object-URL link. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  if (!res.ok) {
    let message = "Could not download file.";
    try {
      message = (await res.json())?.message ?? message;
    } catch {
      // no JSON body
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { API_URL };
