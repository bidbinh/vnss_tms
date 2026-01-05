"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { useWorkspaceApi } from "../layout";

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
}

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  phone?: string;
  status: string;
}

// Tab config
const TABS = [
  { key: "", label: "Tất cả" },
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
  ASSIGNED: { color: "bg-indigo-100 text-indigo-700", label: "Đã giao" },
  PROCESSING: { color: "bg-yellow-100 text-yellow-700", label: "Đang xử lý" },
  IN_TRANSIT: { color: "bg-orange-100 text-orange-700", label: "Đang chạy" },
  DELIVERED: { color: "bg-green-100 text-green-700", label: "Đã giao hàng" },
  COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "Hoàn thành" },
  CANCELLED: { color: "bg-red-100 text-red-700", label: "Đã huỷ" },
};

// Helper functions
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatDateHeader(dateStr: string): string {
  if (dateStr === "no-date") return "Không có ngày";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
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
  // Lấy chữ cái đầu của họ + tên cuối
  const lastName = parts[parts.length - 1];
  const firstName = parts[0];
  // Nếu có họ lót thì lấy chữ đầu họ + tên
  if (parts.length >= 2) {
    return firstName.charAt(0) + ". " + lastName;
  }
  return lastName;
}

function groupOrdersByDate(orders: Order[]): Map<string, Order[]> {
  const grouped = new Map<string, Order[]>();

  for (const order of orders) {
    const date = order.customer_requested_date || order.order_date || order.created_at;
    const dateKey = date ? new Date(date).toISOString().split("T")[0] : "no-date";

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(order);
  }

  // Sort by date descending
  return new Map([...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

export default function WorkspaceTmsOrdersPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { api, permissions } = useWorkspaceApi();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [activeTab, setActiveTab] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(50);

  // Collapsed dates
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");

  // Permission checks
  const canView = permissions?.permissions?.orders?.includes("view");
  const canEdit = permissions?.permissions?.orders?.includes("edit");
  const canAssign = permissions?.permissions?.orders?.includes("assign");
  const canCreate = permissions?.permissions?.orders?.includes("create");

  useEffect(() => {
    // Fetch data when permissions are loaded (either has permission or explicitly no permission)
    if (permissions !== null) {
      if (canView) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [permissions, canView]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, driversData] = await Promise.all([
        api.getOrders({ limit: 200 }),
        api.getDrivers(),
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

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Tab filter
    if (activeTab) {
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
        o.delivery_text?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [orders, activeTab, searchTerm]);

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

  // Assign driver
  const handleAssignDriver = async () => {
    if (!selectedOrder || !assignDriverId) return;

    try {
      await api.assignDriver(selectedOrder.id, assignDriverId);
      setShowAssignModal(false);
      setSelectedOrder(null);
      setAssignDriverId("");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Không thể gán tài xế");
    }
  };

  // Update status
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Không thể cập nhật trạng thái");
    }
  };

  if (!canView && permissions !== null) {
    return (
      <div className="p-6 text-center">
        <XCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-gray-800">Không có quyền truy cập</h2>
        <p className="text-gray-500 mt-2">Bạn không có quyền xem đơn hàng.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Role: Worker</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium">
              <Plus className="w-4 h-4" />
              + New Order
            </button>
          )}
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Làm mới"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Header */}
      <div className="border-b bg-gray-50">
        <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 uppercase gap-2">
          <div className="w-16">CUST. DATE</div>
          <div className="w-20">ORDER CODE</div>
          <div className="w-24">DRIVER</div>
          <div className="flex-1 min-w-[200px]">PICKUP → DELIVERY</div>
          <div className="w-20 text-center">CONTAINER</div>
          <div className="w-28">CONT. CODE</div>
          <div className="w-44">CARGO NOTE</div>
          <div className="w-20">GIỜ LẤY</div>
          <div className="w-20">GIỜ GIAO</div>
          <div className="w-24">STATUS</div>
          <div className="w-24">ACTIONS</div>
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
            placeholder="Tìm theo mã đơn, container, tài xế..."
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
                </div>

                {/* Orders */}
                {!collapsedDates.has(dateKey) && (
                  <div>
                    {dateOrders.map((order) => {
                      const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.NEW;
                      const driverColor = getDriverColor(order.driver_name);
                      const driverShort = getDriverShortName(order.driver_name);

                      return (
                        <div
                          key={order.id}
                          className="flex items-center px-4 py-3 border-b hover:bg-gray-50 text-sm gap-2"
                        >
                          {/* Cust Date */}
                          <div className="w-16 text-gray-500">
                            {order.customer_requested_date ? formatDate(order.customer_requested_date) : "-"}
                          </div>

                          {/* Order Code */}
                          <div className="w-20 font-medium text-gray-900">
                            {order.order_code}
                          </div>

                          {/* Driver */}
                          <div className="w-24 flex items-center gap-2">
                            {order.driver_name ? (
                              <>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${driverColor}`}>
                                  <User className="w-4 h-4" />
                                </div>
                                <span className="text-gray-700 truncate text-xs font-medium">{driverShort}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>

                          {/* Route */}
                          <div className="flex-1 min-w-[200px] text-gray-600 truncate">
                            {order.pickup_text || "-"} → {order.delivery_text || "-"}
                          </div>

                          {/* Container Type */}
                          <div className="w-20 text-center text-gray-600">
                            {order.equipment ? `1x${order.equipment}` : "-"}
                          </div>

                          {/* Container Code */}
                          <div className="w-28 font-mono text-xs text-gray-600 truncate">
                            {order.container_code || "-"}
                          </div>

                          {/* Cargo Note */}
                          <div className="w-44 text-xs text-gray-500 truncate" title={order.cargo_note}>
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

                          {/* Status */}
                          <div className="w-24">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="w-24 flex items-center gap-1 flex-wrap">
                            {canEdit && (
                              <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                                Edit
                              </button>
                            )}
                            {canAssign && !order.driver_id && order.status === "NEW" && (
                              <button
                                className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowAssignModal(true);
                                }}
                              >
                                Đã giao
                              </button>
                            )}
                            {canEdit && order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                              <button
                                className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200"
                                onClick={() => handleUpdateStatus(order.id, "CANCELLED")}
                              >
                                Cancel
                              </button>
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
      <div className="border-t px-6 py-2 text-sm text-gray-500 bg-white">
        Hiển thị 1 - {Math.min(filteredOrders.length, pageSize)} / {filteredOrders.length} đơn hàng
      </div>

      {/* Assign Driver Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Gán tài xế</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Đơn hàng: <strong>{selectedOrder.order_code}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn tài xế
              </label>
              <select
                value={assignDriverId}
                onChange={(e) => setAssignDriverId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn tài xế --</option>
                {drivers
                  .filter((d) => d.status === "ACTIVE")
                  .map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} {driver.phone ? `(${driver.phone})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={!assignDriverId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Gán tài xế
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
