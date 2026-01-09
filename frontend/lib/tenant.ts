/**
 * Tenant utilities for multi-tenant subdomain routing
 *
 * URL patterns:
 * - tinhung.9log.tech → Tenant "Tín Hưng Logistics"
 * - adg.9log.tech → Tenant "ADG Logistics"
 * - demo.9log.tech or app.9log.tech → Demo Tenant (default)
 */

// Default subdomains that don't map to specific tenants
const DEFAULT_SUBDOMAINS = ["app", "www", "demo", "localhost"];

// Main domains
const MAIN_DOMAINS = ["9log.tech", "9log.local", "localhost", "127.0.0.1"];

export interface TenantPublicInfo {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  primary_color: string | null;
  is_active: boolean;
}

/**
 * Extract subdomain from current hostname
 * Examples:
 * - tinhung.9log.tech → "tinhung"
 * - adg.9log.tech → "adg"
 * - app.9log.tech → null (default)
 * - localhost:3000 → null
 */
export function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;

  const host = window.location.hostname;

  for (const mainDomain of MAIN_DOMAINS) {
    if (host === mainDomain) {
      return null;
    }

    if (host.endsWith(`.${mainDomain}`)) {
      const subdomain = host.replace(`.${mainDomain}`, "");
      if (DEFAULT_SUBDOMAINS.includes(subdomain)) {
        return null;
      }
      return subdomain;
    }
  }

  return null;
}

/**
 * Get tenant code from subdomain or localStorage
 */
export function getTenantCode(): string | null {
  // First try subdomain
  const subdomain = getSubdomain();
  if (subdomain) return subdomain;

  // Then try localStorage (for localhost dev)
  if (typeof window !== "undefined") {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const parsed = JSON.parse(user);
        return parsed.tenant_code || null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Fetch public tenant info from API
 */
export async function fetchTenantPublicInfo(
  tenantCode: string
): Promise<TenantPublicInfo | null> {
  // Skip fetch if no tenant code
  if (!tenantCode) {
    return null;
  }

  try {
    // Use relative path to leverage Next.js rewrites
    const response = await fetch(
      `/api/v1/tenant/public/${tenantCode}`,
      { credentials: "include" }
    );

    if (!response.ok) {
      // Don't log error for 404 - tenant not found is expected in some cases
      if (response.status !== 404) {
        console.error("Failed to fetch tenant info:", response.status);
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching tenant info:", error);
    return null;
  }
}

/**
 * Build URL for a specific tenant subdomain
 */
export function buildTenantUrl(tenantCode: string, path: string = "/"): string {
  if (typeof window === "undefined") return path;

  const protocol = window.location.protocol;

  // In development, just use localhost
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return path;
  }

  // In production, build subdomain URL
  return `${protocol}//${tenantCode}.9log.tech${path}`;
}

/**
 * Redirect to correct tenant subdomain after login
 * Cookie is shared across all subdomains via domain=.9log.tech
 */
export function redirectToTenantSubdomain(tenantCode: string): void {
  if (typeof window === "undefined") return;

  const currentSubdomain = getSubdomain();

  // If already on correct subdomain, do nothing
  if (currentSubdomain === tenantCode) return;

  // In development, don't redirect
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return;
  }

  // Redirect to tenant subdomain dashboard (cookie will be sent automatically)
  const newUrl = buildTenantUrl(tenantCode, "/dashboard");
  window.location.href = newUrl;
}
