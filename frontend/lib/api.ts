// Use empty string to leverage Next.js rewrites for same-origin API calls
// This solves cross-origin cookie issues in development
// In production, rewrites also work - the backend URL is configured in next.config.ts
export const API_BASE = "";
console.log("API_BASE = (using Next.js rewrites)");

// Custom error class for permission denied
export class PermissionDeniedError extends Error {
  resource?: string;
  action?: string;

  constructor(message: string, resource?: string, action?: string) {
    super(message);
    this.name = "PermissionDeniedError";
    this.resource = resource;
    this.action = action;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  // Only set Content-Type for requests with body (POST, PUT, PATCH with body)
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  // Add Authorization header from localStorage token
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // If caller already passed an /api/v1 path, keep it; otherwise prefix once.
  const versionedPath = normalizedPath.startsWith("/api/v1")
    ? normalizedPath
    : `/api/v1${normalizedPath}`;
  const url = joinUrl(API_BASE, versionedPath);
  console.log("API CALL:", url);

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  // Handle 403 Permission Denied with structured error
  if (res.status === 403) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      // Not JSON, use text
    }

    if (errorData?.detail?.error === "permission_denied") {
      throw new PermissionDeniedError(
        errorData.detail.message || "Không có quyền truy cập",
        errorData.detail.resource,
        errorData.detail.action
      );
    }

    // Legacy 403 response (string detail)
    const message = errorData?.detail || "Không có quyền truy cập";
    throw new PermissionDeniedError(
      typeof message === "string" ? message : JSON.stringify(message)
    );
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
  // Add Authorization header from localStorage token
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  // KHÔNG set Content-Type - browser sẽ tự set với boundary cho multipart/form-data

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith("/api/v1")
    ? normalizedPath
    : `/api/v1${normalizedPath}`;
  const url = joinUrl(API_BASE, versionedPath);
  console.log("API UPLOAD:", url);

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("access_token");
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
