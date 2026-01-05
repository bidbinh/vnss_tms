"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  ClipboardList,
  Users,
  MapPin,
  MapPinned,
  DollarSign,
  Fuel,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Building2,
  ArrowLeft,
  Menu,
  X,
  Bell,
  Search,
  User,
  Briefcase,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";
import { createWorkspaceApi, WorkspaceApi } from "@/lib/workspace-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

// Workspace API Context
interface WorkspaceApiContextValue {
  api: WorkspaceApi;
  permissions: Permissions | null;
  tenantInfo: TenantInfo | null;
  loading: boolean;
}

interface Permissions {
  modules: string[];
  permissions: Record<string, string[]>;
}

interface TenantInfo {
  id: string;
  name: string;
  code: string;
}

const WorkspaceApiContext = createContext<WorkspaceApiContextValue | null>(null);

export function useWorkspaceApi() {
  const ctx = useContext(WorkspaceApiContext);
  if (!ctx) throw new Error("useWorkspaceApi must be used within WorkspaceTmsLayout");
  return ctx;
}

// Menu configuration for TMS module
interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string; // e.g., "orders:view"
}

interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

export default function WorkspaceTmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { worker } = useWorker();
  const tenantId = params.tenantId as string;

  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    operations: true,
    masterData: false,
    reports: false,
  });

  // Create API instance
  const api = useMemo(() => createWorkspaceApi({ tenantId }), [tenantId]);

  // Base path for all routes
  const basePath = `/workspace/tenant/${tenantId}/tms`;

  // Menu configuration
  const menuGroups: MenuGroup[] = [
    {
      key: "operations",
      label: "Vận hành",
      items: [
        { label: "Dashboard", href: "", icon: Truck },
        { label: "Đơn hàng", href: "/orders", icon: ClipboardList, permission: "orders:view" },
        { label: "Điều phối", href: "/dispatch", icon: Package, permission: "orders:assign" },
      ],
    },
    {
      key: "masterData",
      label: "Dữ liệu",
      items: [
        { label: "Tài xế", href: "/drivers", icon: Users, permission: "drivers:view" },
        { label: "Xe", href: "/vehicles", icon: Truck, permission: "vehicles:view" },
        { label: "Khách hàng", href: "/customers", icon: Building2, permission: "customers:view" },
        { label: "Địa điểm", href: "/locations", icon: MapPin, permission: "locations:view" },
        { label: "Điểm giao nhận", href: "/sites", icon: MapPinned, permission: "sites:view" },
        { label: "Bảng giá", href: "/rates", icon: DollarSign, permission: "rates:view" },
      ],
    },
    {
      key: "reports",
      label: "Báo cáo",
      items: [
        { label: "Doanh thu", href: "/reports/revenue", icon: BarChart3, permission: "reports:view" },
        { label: "Nhiên liệu", href: "/reports/fuel", icon: Fuel, permission: "reports:view" },
      ],
    },
  ];

  useEffect(() => {
    if (worker && tenantId) {
      fetchData();
    }
  }, [worker, tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch permissions
      const permRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/permissions?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (permRes.ok) {
        const data = await permRes.json();
        setPermissions(data.permissions);
      }

      // Fetch tenant info
      const tenantRes = await fetch(`${API_BASE}/api/v1/workspace/my-tenants`, {
        credentials: "include",
      });
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        const tenant = data.tenants?.find((t: any) => t.tenant.id === tenantId);
        if (tenant) {
          setTenantInfo(tenant.tenant);
        }
      }
    } catch (e) {
      console.error("Error fetching workspace data:", e);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    const [resource, action] = permission.split(":");
    return permissions?.permissions?.[resource]?.includes(action) ?? false;
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (href === "") {
      return pathname === basePath || pathname === `${basePath}/`;
    }
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  if (!worker) {
    return null;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceApiContext.Provider value={{ api, permissions, tenantInfo, loading }}>
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-16"
          } bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 flex flex-col h-full hidden md:flex`}
        >
          {/* Sidebar Header */}
          <div className="px-4 py-4 border-b flex items-center justify-between flex-shrink-0">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {tenantInfo?.name || "Workspace"}
                  </div>
                  <div className="text-xs text-gray-500">TMS</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Back to Workspace */}
          <div className="px-2 py-2 border-b">
            <Link
              href="/workspace"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 ${
                !sidebarOpen && "justify-center"
              }`}
              title="Về Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
              {sidebarOpen && <span>Về Workspace</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            {menuGroups.map((group) => {
              // Filter items by permission
              const visibleItems = group.items.filter((item) => hasPermission(item.permission));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.key} className="mb-2">
                  {sidebarOpen && (
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase hover:bg-gray-50 rounded"
                    >
                      <span>{group.label}</span>
                      {expandedGroups[group.key] ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {(expandedGroups[group.key] || !sidebarOpen) && (
                    <div className="space-y-1 mt-1">
                      {visibleItems.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={`${basePath}${item.href}`}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                              active
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            } ${!sidebarOpen && "justify-center"}`}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {sidebarOpen && <span>{item.label}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Info */}
          {sidebarOpen && (
            <div className="p-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{worker.full_name}</div>
                  <div className="text-xs text-gray-500 truncate">{worker.email}</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform md:hidden ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Mobile Header */}
          <div className="px-4 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-sm">{tenantInfo?.name || "Workspace"}</div>
                <div className="text-xs text-gray-500">TMS</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <Link
              href="/workspace"
              className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Workspace</span>
            </Link>

            {menuGroups.map((group) => {
              const visibleItems = group.items.filter((item) => hasPermission(item.permission));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.key} className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={`${basePath}${item.href}`}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            active
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Link href="/workspace" className="hover:text-gray-700">
                  Workspace
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{tenantInfo?.name}</span>
                <span>/</span>
                <span className="text-blue-600">TMS</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-500" />
              </button>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{worker.full_name}</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </WorkspaceApiContext.Provider>
  );
}

// Helper component for chevron
function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
