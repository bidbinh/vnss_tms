// Use empty string to leverage Next.js rewrites for same-origin API calls
// This solves cross-origin cookie issues in development
// In production, rewrites also work - the backend URL is configured in next.config.ts
export const API_BASE = "";
console.log("API_BASE = (using Next.js rewrites)");

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  // Only set Content-Type for requests with body (POST, PUT, PATCH with body)
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  // Token is now sent via cookie automatically with credentials: 'include'

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // If caller already passed an /api/v1 path, keep it; otherwise prefix once.
  const versionedPath = normalizedPath.startsWith("/api/v1")
    ? normalizedPath
    : `/api/v1${normalizedPath}`;
  const url = joinUrl(API_BASE, versionedPath);
  console.log("API CALL:", url);

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // nếu có endpoint trả 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  let p = path.startsWith("/") ? path : `/${path}`;
  // nếu base đã có /api/v1 mà path lại có /api/v1 thì bỏ 1 bên
  if (b.endsWith("/api/v1") && p.startsWith("/api/v1/")) {
    p = p.replace("/api/v1", "");
  }
  return b + p;
}

// Upload file với FormData (không set Content-Type, để browser tự set với boundary)
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  // Token is now sent via cookie automatically with credentials: 'include'
  // KHÔNG set Content-Type - browser sẽ tự set với boundary cho multipart/form-data

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith("/api/v1")
    ? normalizedPath
    : `/api/v1${normalizedPath}`;
  const url = joinUrl(API_BASE, versionedPath);
  console.log("API UPLOAD:", url);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
