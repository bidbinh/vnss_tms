/**
 * Workspace API Context
 *
 * This module provides API functions for workers accessing tenant data.
 * It wraps the worker-tenant API endpoints and can be used as a drop-in
 * replacement for the main app's API calls when working in workspace context.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

export interface WorkspaceApiConfig {
  tenantId: string;
}

/**
 * Create workspace API client for a specific tenant
 */
export function createWorkspaceApi(config: WorkspaceApiConfig) {
  const { tenantId } = config;
  const baseUrl = `${API_BASE}/api/v1/worker-tenant`;

  async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.includes("?")
      ? `${baseUrl}${endpoint}&tenant_id=${tenantId}`
      : `${baseUrl}${endpoint}?tenant_id=${tenantId}`;

    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    return res.json();
  }

  return {
    // Permissions
    getPermissions: () => fetchWithAuth("/permissions"),

    // Orders
    getOrders: (params?: {
      status?: string;
      driver_id?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.driver_id) searchParams.set("driver_id", params.driver_id);
      if (params?.date_from) searchParams.set("date_from", params.date_from);
      if (params?.date_to) searchParams.set("date_to", params.date_to);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.offset) searchParams.set("offset", params.offset.toString());
      const query = searchParams.toString();
      return fetchWithAuth(`/orders${query ? `?${query}` : ""}`);
    },

    getOrder: (orderId: string) => fetchWithAuth(`/orders/${orderId}`),

    createOrder: (data: {
      customer_id: string;
      order_date?: string;
      pickup_site_id?: string;
      delivery_site_id?: string;
      pickup_text?: string;
      delivery_text?: string;
      driver_id?: string;
      equipment?: string;
      container_code?: string;
      cargo_note?: string;
      freight_charge?: number;
    }) => fetchWithAuth("/orders", { method: "POST", body: JSON.stringify(data) }),

    assignDriver: (orderId: string, driverId: string, vehicleId?: string) =>
      fetchWithAuth(`/orders/${orderId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ driver_id: driverId, vehicle_id: vehicleId }),
      }),

    updateOrderStatus: (orderId: string, status: string, note?: string) =>
      fetchWithAuth(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }),

    // Drivers
    getDrivers: (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : "";
      return fetchWithAuth(`/drivers${query}`);
    },

    // Vehicles
    getVehicles: (params?: { status?: string; vehicle_type?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.vehicle_type) searchParams.set("vehicle_type", params.vehicle_type);
      const query = searchParams.toString();
      return fetchWithAuth(`/vehicles${query ? `?${query}` : ""}`);
    },

    // Sites
    getSites: (params?: { site_type?: string; location_id?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.site_type) searchParams.set("site_type", params.site_type);
      if (params?.location_id) searchParams.set("location_id", params.location_id);
      const query = searchParams.toString();
      return fetchWithAuth(`/sites${query ? `?${query}` : ""}`);
    },

    // Locations
    getLocations: () => fetchWithAuth("/locations"),

    // Customers
    getCustomers: (params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : "";
      return fetchWithAuth(`/customers${query}`);
    },

    // Config
    tenantId,
    baseUrl,
  };
}

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>;
