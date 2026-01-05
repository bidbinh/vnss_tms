"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Truck,
  Users,
  MapPin,
  LayoutDashboard,
  ChevronLeft,
  Building2,
  Menu,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

// Aggregated API context
interface AggregatedApiContextType {
  tenants: Array<{ id: string; name: string; code: string }>;
  selectedTenantIds: string[];
  setSelectedTenantIds: (ids: string[]) => void;
  fetchOrders: (params?: any) => Promise<any>;
  fetchDrivers: (params?: any) => Promise<any>;
  fetchVehicles: (params?: any) => Promise<any>;
  loading: boolean;
}

const AggregatedApiContext = createContext<AggregatedApiContextType>({
  tenants: [],
  selectedTenantIds: [],
  setSelectedTenantIds: () => {},
  fetchOrders: async () => ({ orders: [], total: 0, tenants: [] }),
  fetchDrivers: async () => ({ drivers: [], tenants: [] }),
  fetchVehicles: async () => ({ vehicles: [], tenants: [] }),
  loading: true,
});

export function useAggregatedApi() {
  return useContext(AggregatedApiContext);
}

const NAV_ITEMS = [
  { href: "/workspace/tms", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace/tms/orders", label: "Đơn hàng", icon: Package },
  { href: "/workspace/tms/drivers", label: "Tài xế", icon: Users },
  { href: "/workspace/tms/vehicles", label: "Xe", icon: Truck },
];

export default function WorkspaceTmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { worker } = useWorker();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial tenant list from aggregated orders endpoint
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/worker-tenant/aggregated/orders?limit=1`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants || []);
          // Select all tenants by default
          setSelectedTenantIds((data.tenants || []).map((t: any) => t.id));
        }
      } catch (err) {
        console.error("Failed to fetch tenants:", err);
      } finally {
        setLoading(false);
      }
    };

    if (worker) {
      fetchTenants();
    }
  }, [worker]);

  // Aggregated API functions
  const fetchOrders = async (params?: any) => {
    const searchParams = new URLSearchParams();
    if (selectedTenantIds.length > 0 && selectedTenantIds.length < tenants.length) {
      searchParams.set("tenant_ids", selectedTenantIds.join(","));
    }
    if (params?.status) searchParams.set("status", params.status);
    if (params?.date_from) searchParams.set("date_from", params.date_from);
    if (params?.date_to) searchParams.set("date_to", params.date_to);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString();
    const res = await fetch(
      `${API_BASE}/api/v1/worker-tenant/aggregated/orders${query ? `?${query}` : ""}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch orders");
    }
    return res.json();
  };

  const fetchDrivers = async (params?: any) => {
    const searchParams = new URLSearchParams();
    if (selectedTenantIds.length > 0 && selectedTenantIds.length < tenants.length) {
      searchParams.set("tenant_ids", selectedTenantIds.join(","));
    }
    if (params?.status) searchParams.set("status", params.status);

    const query = searchParams.toString();
    const res = await fetch(
      `${API_BASE}/api/v1/worker-tenant/aggregated/drivers${query ? `?${query}` : ""}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch drivers");
    }
    return res.json();
  };

  const fetchVehicles = async (params?: any) => {
    const searchParams = new URLSearchParams();
    if (selectedTenantIds.length > 0 && selectedTenantIds.length < tenants.length) {
      searchParams.set("tenant_ids", selectedTenantIds.join(","));
    }
    if (params?.status) searchParams.set("status", params.status);
    if (params?.vehicle_type) searchParams.set("vehicle_type", params.vehicle_type);

    const query = searchParams.toString();
    const res = await fetch(
      `${API_BASE}/api/v1/worker-tenant/aggregated/vehicles${query ? `?${query}` : ""}`,
      { credentials: "include" }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch vehicles");
    }
    return res.json();
  };

  return (
    <AggregatedApiContext.Provider
      value={{
        tenants,
        selectedTenantIds,
        setSelectedTenantIds,
        fetchOrders,
        fetchDrivers,
        fetchVehicles,
        loading,
      }}
    >
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-56" : "w-16"
          } bg-gray-900 text-white transition-all duration-300 flex flex-col`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            {sidebarOpen && (
              <Link href="/workspace" className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="font-semibold">Workspace TMS</span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Tenant Filter (when sidebar is open) */}
          {sidebarOpen && tenants.length > 1 && (
            <div className="p-3 border-b border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Công ty</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {tenants.map((tenant) => (
                  <label
                    key={tenant.id}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTenantIds.includes(tenant.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTenantIds([...selectedTenantIds, tenant.id]);
                        } else {
                          setSelectedTenantIds(
                            selectedTenantIds.filter((id) => id !== tenant.id)
                          );
                        }
                      }}
                      className="rounded text-blue-500"
                    />
                    <Building2 className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{tenant.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Worker Info */}
          {sidebarOpen && worker && (
            <div className="p-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">Đăng nhập với</div>
              <div className="text-sm font-medium truncate">{worker.full_name || worker.username}</div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </AggregatedApiContext.Provider>
  );
}
