"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Search,
  Plus,
  Eye,
  Edit,
  Truck,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Building2,
  X,
  Play,
  ChevronDown,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

interface Order {
  id: string;
  order_code: string;
  order_date: string;
  status: string;
  customer_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  pickup_site_id?: string;
  delivery_site_id?: string;
  container_no?: string;
  seal_no?: string;
  note?: string;
  created_at: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  code?: string;
}

interface Site {
  id: string;
  company_name: string;
  code?: string;
  detailed_address?: string;
}

interface TenantInfo {
  id: string;
  name: string;
  code: string;
}

interface Permissions {
  modules: string[];
  permissions: Record<string, string[]>;
}

export default function WorkerTenantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const { worker } = useWorker();
  const tenantId = params.tenantId as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [total, setTotal] = useState(0);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (worker && tenantId) {
      fetchAll();
    }
  }, [worker, tenantId, statusFilter]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch permissions first
      const permRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/permissions?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (permRes.ok) {
        const permData = await permRes.json();
        setPermissions(permData.permissions);
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

      // Fetch orders
      let url = `${API_BASE}/api/v1/worker-tenant/orders?tenant_id=${tenantId}&limit=100`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const ordersRes = await fetch(url, { credentials: "include" });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
        setTotal(data.total || 0);
      }

      // Fetch drivers if has permission
      const driversRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/drivers?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.drivers || []);
      }

      // Fetch customers
      const customersRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/customers?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }

      // Fetch sites
      const sitesRes = await fetch(
        `${API_BASE}/api/v1/worker-tenant/sites?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const canAssign = permissions?.permissions?.orders?.includes("assign");
  const canUpdateStatus = permissions?.permissions?.orders?.includes("update_status") ||
                          permissions?.permissions?.orders?.includes("update");
  const canCreate = permissions?.permissions?.orders?.includes("create");

  const handleAssignDriver = async () => {
    if (!selectedOrder || !assignDriverId) return;
    setAssigning(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${selectedOrder.id}/assign?tenant_id=${tenantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ driver_id: assignDriverId }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể gán tài xế");
      }
      setShowAssignModal(false);
      setSelectedOrder(null);
      setAssignDriverId("");
      fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${selectedOrder.id}/status?tenant_id=${tenantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Không thể cập nhật trạng thái");
      }
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus("");
      setStatusNote("");
      fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setAssignDriverId(order.driver_id || "");
    setShowAssignModal(true);
  };

  const openStatusModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus("");
    setStatusNote("");
    setShowStatusModal(true);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.container_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-gray-100 text-gray-700";
      case "ACCEPTED": return "bg-blue-100 text-blue-700";
      case "ASSIGNED": return "bg-indigo-100 text-indigo-700";
      case "IN_TRANSIT": return "bg-yellow-100 text-yellow-700";
      case "DELIVERED": return "bg-green-100 text-green-700";
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "NEW": return "Mới";
      case "ACCEPTED": return "Đã nhận";
      case "ASSIGNED": return "Đã gán";
      case "IN_TRANSIT": return "Đang vận chuyển";
      case "DELIVERED": return "Đã giao";
      case "COMPLETED": return "Hoàn thành";
      case "CANCELLED": return "Đã hủy";
      default: return status;
    }
  };

  const getNextStatuses = (current: string) => {
    switch (current) {
      case "NEW": return ["ACCEPTED", "CANCELLED"];
      case "ACCEPTED": return ["ASSIGNED", "CANCELLED"];
      case "ASSIGNED": return ["IN_TRANSIT", "CANCELLED"];
      case "IN_TRANSIT": return ["DELIVERED", "CANCELLED"];
      case "DELIVERED": return ["COMPLETED"];
      default: return [];
    }
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return null;
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name;
  };

  if (!worker) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/workspace" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">Đơn hàng</h1>
                  {tenantInfo && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {tenantInfo.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {canCreate && (
              <Link
                href={`/workspace/tenant/${tenantId}/orders/new`}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo đơn
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn, container..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Mới</option>
            <option value="ACCEPTED">Đã nhận</option>
            <option value="ASSIGNED">Đã gán</option>
            <option value="IN_TRANSIT">Đang vận chuyển</option>
            <option value="DELIVERED">Đã giao</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <div className="text-sm text-gray-500">{total} đơn hàng</div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Orders List */}
        <div className="bg-white rounded-xl border shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Không có đơn hàng nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-blue-600">{order.order_code}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {order.driver_id && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getDriverName(order.driver_id)}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {order.order_date
                            ? new Date(order.order_date).toLocaleDateString("vi-VN")
                            : "-"}
                        </span>
                        {order.container_no && (
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-gray-400" />
                            {order.container_no}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Assign Driver Button */}
                      {canAssign && !order.driver_id && order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                        <button
                          onClick={() => openAssignModal(order)}
                          className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm rounded-lg flex items-center gap-1"
                        >
                          <User className="w-4 h-4" />
                          Gán TX
                        </button>
                      )}

                      {/* Update Status Button */}
                      {canUpdateStatus && getNextStatuses(order.status).length > 0 && (
                        <button
                          onClick={() => openStatusModal(order)}
                          className="px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm rounded-lg flex items-center gap-1"
                        >
                          <Play className="w-4 h-4" />
                          Cập nhật
                        </button>
                      )}

                      {/* View Detail */}
                      <Link
                        href={`/workspace/tenant/${tenantId}/orders/${order.id}`}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-lg flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Assign Driver Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" />
                Gán tài xế - {selectedOrder.order_code}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn tài xế</label>
                <select
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Chọn tài xế --</option>
                  {drivers.filter(d => d.status === "ACTIVE").map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAssignDriver}
                  disabled={!assignDriverId || assigning}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {assigning ? "Đang gán..." : "Gán tài xế"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-yellow-600" />
                Cập nhật trạng thái - {selectedOrder.order_code}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái hiện tại: <span className="text-blue-600">{getStatusLabel(selectedOrder.status)}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chuyển sang</label>
                <div className="grid grid-cols-2 gap-2">
                  {getNextStatuses(selectedOrder.status).map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      className={`p-3 border rounded-lg text-left ${
                        newStatus === status
                          ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Thêm ghi chú..."
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || updatingStatus}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  {updatingStatus ? "Đang cập nhật..." : "Cập nhật"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
