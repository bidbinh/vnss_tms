"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Plus,
  XCircle,
  AlertCircle,
  Building2,
  Filter,
  X,
  Check,
  Truck,
  Edit3,
  MoreHorizontal,
} from "lucide-react";
import { useAggregatedApi } from "../layout";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

// Types
interface Order {
  id: string;
  order_code: string;
  customer_id: string;
  customer_name?: string;
  status: string;
  pickup_text?: string;
  delivery_text?: string;
  equipment?: string;
  qty: number;
  cargo_note?: string;
  container_code?: string;
  driver_id?: string;
  driver_name?: string;
  eta_pickup_at?: string;
  eta_delivery_at?: string;
  customer_requested_date?: string;
  created_at: string;
  order_date: string;
  // Multi-tenant fields
  tenant_id: string;
  tenant_name: string;
  tenant_code: string;
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  phone?: string;
  status: string;
  tenant_id: string;
  tenant_name: string;
}

// Tab config
const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "NEW", label: "Mới" },
  { key: "ASSIGNED", label: "Đã giao" },
  { key: "IN_TRANSIT", label: "Đang chạy" },
  { key: "DELIVERED", label: "Đã giao hàng" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Đã huỷ" },
];

// Status colors & labels
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  NEW: { color: "bg-blue-100 text-blue-700", label: "Mới" },
  ASSIGNED: { color: "bg-indigo-100 text-indigo-700", label: "Đã giao TX" },
  PROCESSING: { color: "bg-yellow-100 text-yellow-700", label: "Đang xử lý" },
  IN_TRANSIT: { color: "bg-orange-100 text-orange-700", label: "Đang chạy" },
  DELIVERED: { color: "bg-green-100 text-green-700", label: "Đã giao hàng" },
  COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "Hoàn thành" },
  CANCELLED: { color: "bg-red-100 text-red-700", label: "Đã huỷ" },
  REJECTED: { color: "bg-red-100 text-red-700", label: "Đã huỷ" },
};

// Tenant colors for visual distinction
const TENANT_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
];

function getTenantColor(tenantId: string, tenants: Array<{id: string}>): string {
  const index = tenants.findIndex(t => t.id === tenantId);
  return TENANT_COLORS[index % TENANT_COLORS.length];
}

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatDateHeader(dateStr: string): string {
  if (dateStr === "no-date") return "Không có ngày";
  // Parse YYYY-MM-DD format
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parseInt(parts[2])}/${parseInt(parts[1])}`;
  }
  return dateStr;
}

function formatShiftDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const hour = d.getHours();
  let shift = "S"; // Sáng
  if (hour >= 12 && hour < 18) shift = "C"; // Chiều
  if (hour >= 18) shift = "T"; // Tối

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${shift} ${day}/${month}`;
}

function getDriverColor(name?: string): string {
  if (!name) return "bg-gray-200 text-gray-500";
  const colors = [
    "bg-red-100 text-red-600",
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-orange-100 text-orange-600",
    "bg-pink-100 text-pink-600",
    "bg-cyan-100 text-cyan-600",
    "bg-amber-100 text-amber-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getDriverShortName(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 3);
  const lastName = parts[parts.length - 1];
  const firstName = parts[0];
  if (parts.length >= 2) {
    return firstName.charAt(0) + ". " + lastName;
  }
  return lastName;
}

function extractDateString(dateStr?: string): string {
  if (!dateStr) return "no-date";
  // Handle ISO format
  if (dateStr.includes("T")) {
    return dateStr.split("T")[0];
  }
  // Already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return "no-date";
}

function groupOrdersByDate(orders: Order[]): Map<string, Order[]> {
  const grouped = new Map<string, Order[]>();

  for (const order of orders) {
    const date = order.customer_requested_date || order.order_date || order.created_at;
    const dateKey = extractDateString(date);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(order);
  }

  // Sort by date descending
  return new Map([...grouped.entries()].sort((a, b) => {
    if (a[0] === "no-date") return 1;
    if (b[0] === "no-date") return -1;
    return b[0].localeCompare(a[0]);
  }));
}

export default function WorkspaceTmsOrdersPage() {
  const { tenants, selectedTenantIds, fetchOrders, fetchDrivers, loading: apiLoading } = useAggregatedApi();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("PROCESSING");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [filterTenantId, setFilterTenantId] = useState<string>(""); // Additional tenant filter

  // Collapsed dates
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Dropdown states
  const [openDriverDropdown, setOpenDriverDropdown] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiLoading) {
      fetchData();
    }
  }, [apiLoading, selectedTenantIds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, driversData] = await Promise.all([
        fetchOrders({ limit: 500 }),
        fetchDrivers(),
      ]);
      setOrders(ordersData.orders || []);
      setDrivers(driversData.drivers || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDriverDropdown(null);
        setOpenStatusDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Assign driver to order
  const handleAssignDriver = async (orderId: string, driverId: string, tenantId: string) => {
    setAssigning(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${orderId}/assign?tenant_id=${tenantId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driver_id: driverId }),
        }
      );

      if (res.ok) {
        const result = await res.json();
        // Update local state
        setOrders(prev => prev.map(o =>
          o.id === orderId
            ? { ...o, driver_id: driverId, driver_name: result.driver_name, status: result.status }
            : o
        ));
        setOpenDriverDropdown(null);
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể giao đơn hàng");
      }
    } catch (e) {
      console.error("Assign error:", e);
      alert("Lỗi kết nối");
    } finally {
      setAssigning(false);
    }
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: string, tenantId: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${orderId}/status?tenant_id=${tenantId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.ok) {
        // Update local state
        setOrders(prev => prev.map(o =>
          o.id === orderId ? { ...o, status: newStatus } : o
        ));
        setOpenStatusDropdown(null);
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể cập nhật trạng thái");
      }
    } catch (e) {
      console.error("Status update error:", e);
      alert("Lỗi kết nối");
    }
  };

  // Get drivers for a specific tenant
  const getDriversForTenant = (tenantId: string) => {
    return drivers.filter(d => d.tenant_id === tenantId && d.status === "ACTIVE");
  };

  // Available statuses for transition
  const getAvailableStatuses = (currentStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      NEW: ["ASSIGNED", "CANCELLED"],
      ASSIGNED: ["IN_TRANSIT", "NEW", "CANCELLED"],
      IN_TRANSIT: ["DELIVERED", "ASSIGNED"],
      DELIVERED: ["COMPLETED", "IN_TRANSIT"],
      COMPLETED: [],
      CANCELLED: ["NEW"],
    };
    return statusFlow[currentStatus] || [];
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Additional tenant filter (on top of sidebar selection)
    if (filterTenantId) {
      result = result.filter(o => o.tenant_id === filterTenantId);
    }

    // Tab filter
    if (activeTab !== "ALL") {
      if (activeTab === "PROCESSING") {
        result = result.filter(o => ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(o.status));
      } else {
        result = result.filter(o => o.status === activeTab);
      }
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.order_code?.toLowerCase().includes(search) ||
        o.container_code?.toLowerCase().includes(search) ||
        o.driver_name?.toLowerCase().includes(search) ||
        o.pickup_text?.toLowerCase().includes(search) ||
        o.delivery_text?.toLowerCase().includes(search) ||
        o.tenant_name?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [orders, activeTab, searchTerm, filterTenantId]);

  // Group by date
  const groupedOrders = useMemo(() => groupOrdersByDate(filteredOrders), [filteredOrders]);

  // Toggle date collapse
  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // Get unique tenants in current view
  const tenantsInView = useMemo(() => {
    const tenantIds = new Set(orders.map(o => o.tenant_id));
    return tenants.filter(t => tenantIds.has(t.id));
  }, [orders, tenants]);

  if (apiLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">
            Tổng hợp từ {tenantsInView.length} công ty • {filteredOrders.length} đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tenant Filter Pills */}
      {tenantsInView.length > 1 && (
        <div className="px-6 py-2 border-b bg-gray-50 flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setFilterTenantId("")}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !filterTenantId
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border"
            }`}
          >
            Tất cả
          </button>
          {tenantsInView.map((tenant) => (
            <button
              key={tenant.id}
              onClick={() => setFilterTenantId(tenant.id === filterTenantId ? "" : tenant.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterTenantId === tenant.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${getTenantColor(tenant.id, tenants)}`}></span>
              {tenant.name}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 border-b">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            // Count orders for each tab
            let count = 0;
            if (tab.key === "ALL") {
              count = orders.filter(o => !filterTenantId || o.tenant_id === filterTenantId).length;
            } else if (tab.key === "PROCESSING") {
              count = orders.filter(o =>
                ["NEW", "ASSIGNED", "IN_TRANSIT"].includes(o.status) &&
                (!filterTenantId || o.tenant_id === filterTenantId)
              ).length;
            } else {
              count = orders.filter(o =>
                o.status === tab.key &&
                (!filterTenantId || o.tenant_id === filterTenantId)
              ).length;
            }

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    activeTab === tab.key ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b bg-gray-50">
        <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase gap-2">
          <div className="w-20">CÔNG TY</div>
          <div className="w-16">NGÀY KH</div>
          <div className="w-24">MÃ ĐƠN</div>
          <div className="w-24">TÀI XẾ</div>
          <div className="flex-1 min-w-[200px]">LẤY → GIAO</div>
          <div className="w-16 text-center">CONT</div>
          <div className="w-28">MÃ CONT</div>
          <div className="w-40">GHI CHÚ</div>
          <div className="w-20">GIỜ LẤY</div>
          <div className="w-20">GIỜ GIAO</div>
          <div className="w-24">TRẠNG THÁI</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 border-b flex items-center justify-between bg-white">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã đơn, container, tài xế, công ty..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Hiển thị</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p>{error}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Không có đơn hàng nào</p>
          </div>
        ) : (
          <div>
            {Array.from(groupedOrders.entries()).map(([dateKey, dateOrders]) => (
              <div key={dateKey}>
                {/* Date Header */}
                <div
                  onClick={() => toggleDateCollapse(dateKey)}
                  className="px-4 py-2 bg-white border-b flex items-center gap-2 cursor-pointer hover:bg-gray-50"
                >
                  {collapsedDates.has(dateKey) ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-500" />
                  )}
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-800">{formatDateHeader(dateKey)}</span>
                  <span className="text-sm text-blue-600 font-medium">{dateOrders.length} đơn</span>

                  {/* Show tenant breakdown */}
                  {tenantsInView.length > 1 && !filterTenantId && (
                    <div className="flex items-center gap-1 ml-2">
                      {tenantsInView.map(tenant => {
                        const count = dateOrders.filter(o => o.tenant_id === tenant.id).length;
                        if (count === 0) return null;
                        return (
                          <span
                            key={tenant.id}
                            className="flex items-center gap-1 text-xs text-gray-500"
                          >
                            <span className={`w-2 h-2 rounded-full ${getTenantColor(tenant.id, tenants)}`}></span>
                            {count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Orders */}
                {!collapsedDates.has(dateKey) && (
                  <div>
                    {dateOrders.map((order) => {
                      const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.NEW;
                      const driverColor = getDriverColor(order.driver_name);
                      const driverShort = getDriverShortName(order.driver_name);
                      const tenantColor = getTenantColor(order.tenant_id, tenants);

                      return (
                        <div
                          key={order.id}
                          className="flex items-center px-4 py-3 border-b hover:bg-gray-50 text-sm gap-2"
                        >
                          {/* Tenant */}
                          <div className="w-20 flex items-center gap-1.5" title={order.tenant_name}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tenantColor}`}></span>
                            <span className="text-gray-600 truncate text-xs font-medium">
                              {order.tenant_code || order.tenant_name?.substring(0, 6)}
                            </span>
                          </div>

                          {/* Cust Date */}
                          <div className="w-16 text-gray-500 text-xs">
                            {order.customer_requested_date ? formatDate(order.customer_requested_date) : "-"}
                          </div>

                          {/* Order Code */}
                          <div className="w-24 font-medium text-gray-900 truncate" title={order.order_code}>
                            {order.order_code}
                          </div>

                          {/* Driver - with dropdown assignment */}
                          <div className="w-24 relative" ref={openDriverDropdown === order.id ? dropdownRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDriverDropdown(openDriverDropdown === order.id ? null : order.id);
                                setOpenStatusDropdown(null);
                              }}
                              className="flex items-center gap-2 w-full hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
                              title="Click để giao tài xế"
                            >
                              {order.driver_name ? (
                                <>
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${driverColor}`}>
                                    <User className="w-4 h-4" />
                                  </div>
                                  <span className="text-gray-700 truncate text-xs font-medium">{driverShort}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                  <Plus className="w-3 h-3" /> Giao TX
                                </span>
                              )}
                            </button>

                            {/* Driver dropdown */}
                            {openDriverDropdown === order.id && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 py-1 max-h-64 overflow-y-auto">
                                <div className="px-3 py-2 text-xs text-gray-500 border-b">
                                  Chọn tài xế ({order.tenant_name})
                                </div>
                                {getDriversForTenant(order.tenant_id).length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-400">Không có tài xế</div>
                                ) : (
                                  getDriversForTenant(order.tenant_id).map((driver) => (
                                    <button
                                      key={driver.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssignDriver(order.id, driver.id, order.tenant_id);
                                      }}
                                      disabled={assigning}
                                      className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 ${
                                        order.driver_id === driver.id ? "bg-blue-50 text-blue-700" : ""
                                      }`}
                                    >
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getDriverColor(driver.name)}`}>
                                        <User className="w-3 h-3" />
                                      </div>
                                      <div className="flex-1 truncate">
                                        <div className="font-medium">{driver.name}</div>
                                        {driver.phone && <div className="text-xs text-gray-400">{driver.phone}</div>}
                                      </div>
                                      {order.driver_id === driver.id && <Check className="w-4 h-4 text-blue-600" />}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Route */}
                          <div className="flex-1 min-w-[200px] text-gray-600 truncate text-xs">
                            {order.pickup_text || "-"} → {order.delivery_text || "-"}
                          </div>

                          {/* Container Type */}
                          <div className="w-16 text-center text-gray-600 text-xs">
                            {order.equipment ? `1x${order.equipment}` : "-"}
                          </div>

                          {/* Container Code */}
                          <div className="w-28 font-mono text-xs text-gray-600 truncate">
                            {order.container_code || "-"}
                          </div>

                          {/* Cargo Note */}
                          <div className="w-40 text-xs text-gray-500 truncate" title={order.cargo_note}>
                            {order.cargo_note || "-"}
                          </div>

                          {/* ETA Pickup */}
                          <div className="w-20 text-gray-600 text-xs">
                            {order.eta_pickup_at ? formatShiftDate(order.eta_pickup_at) : "-"}
                          </div>

                          {/* ETA Delivery */}
                          <div className="w-20 text-gray-600 text-xs">
                            {order.eta_delivery_at ? formatShiftDate(order.eta_delivery_at) : "-"}
                          </div>

                          {/* Status - with dropdown */}
                          <div className="w-24 relative" ref={openStatusDropdown === order.id ? dropdownRef : null}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusDropdown(openStatusDropdown === order.id ? null : order.id);
                                setOpenDriverDropdown(null);
                              }}
                              className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color} hover:opacity-80 transition-opacity cursor-pointer`}
                              title="Click để đổi trạng thái"
                            >
                              {statusConfig.label}
                            </button>

                            {/* Status dropdown */}
                            {openStatusDropdown === order.id && (
                              <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-50 py-1">
                                <div className="px-3 py-2 text-xs text-gray-500 border-b">
                                  Đổi trạng thái
                                </div>
                                {getAvailableStatuses(order.status).length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-400">Không thể đổi</div>
                                ) : (
                                  getAvailableStatuses(order.status).map((newStatus) => {
                                    const newConfig = STATUS_CONFIG[newStatus] || STATUS_CONFIG.NEW;
                                    return (
                                      <button
                                        key={newStatus}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(order.id, newStatus, order.tenant_id);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                      >
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${newConfig.color}`}>
                                          {newConfig.label}
                                        </span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-2 text-sm text-gray-500 bg-white flex items-center justify-between">
        <span>Hiển thị {Math.min(filteredOrders.length, pageSize)} / {filteredOrders.length} đơn hàng</span>
        {tenantsInView.length > 1 && (
          <div className="flex items-center gap-3">
            {tenantsInView.map(tenant => {
              const count = filteredOrders.filter(o => o.tenant_id === tenant.id).length;
              return (
                <span key={tenant.id} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${getTenantColor(tenant.id, tenants)}`}></span>
                  {tenant.name}: {count}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
