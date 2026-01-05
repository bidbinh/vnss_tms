"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Truck,
  ArrowLeft,
  Search,
  User,
  Package,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  Building2,
  Clock,
  Play,
  Filter,
  X,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

interface Driver {
  id: string;
  name: string;
  short_name?: string;
  phone?: string;
  status: string;
  source?: string;
  vehicle_id?: string;
  tractor_id?: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type?: string;
  status: string;
  brand?: string;
  model?: string;
}

interface Order {
  id: string;
  order_code: string;
  order_date: string;
  status: string;
  customer_id?: string;
  driver_id?: string;
  pickup_site_id?: string;
  delivery_site_id?: string;
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

export default function WorkerTenantDispatchPage() {
  const params = useParams();
  const { worker } = useWorker();
  const tenantId = params.tenantId as string;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [activeTab, setActiveTab] = useState<"unassigned" | "drivers" | "vehicles">("unassigned");
  const [searchTerm, setSearchTerm] = useState("");

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (worker && tenantId) {
      fetchData();
      fetchTenantInfo();
      fetchPermissions();
    }
  }, [worker, tenantId]);

  const fetchPermissions = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/permissions?tenant_id=${tenantId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions);
      }
    } catch (e) {
      console.error("Error fetching permissions:", e);
    }
  };

  const fetchTenantInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/workspace/my-tenants`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const tenant = data.tenants?.find((t: any) => t.tenant.id === tenantId);
        if (tenant) {
          setTenantInfo(tenant.tenant);
        }
      }
    } catch (e) {
      console.error("Error fetching tenant info:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [driversRes, vehiclesRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/worker-tenant/drivers?tenant_id=${tenantId}`, {
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/v1/worker-tenant/vehicles?tenant_id=${tenantId}`, {
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/v1/worker-tenant/orders?tenant_id=${tenantId}&limit=100`, {
          credentials: "include",
        }),
      ]);

      if (driversRes.ok) {
        const data = await driversRes.json();
        setDrivers(data.drivers || []);
      }

      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.vehicles || []);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        // Filter unassigned orders
        const unassigned = (data.orders || []).filter(
          (o: Order) => !o.driver_id && o.status !== "COMPLETED" && o.status !== "CANCELLED"
        );
        setUnassignedOrders(unassigned);
      }

      if (!driversRes.ok && !vehiclesRes.ok && !ordersRes.ok) {
        throw new Error("Không thể tải dữ liệu");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const canAssign = permissions?.permissions?.orders?.includes("assign");

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
      fetchData(); // Refresh data
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setAssigning(false);
    }
  };

  const openAssignModal = (order: Order) => {
    setSelectedOrder(order);
    setAssignDriverId("");
    setShowAssignModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "AVAILABLE":
        return "bg-green-100 text-green-700";
      case "BUSY":
      case "IN_USE":
        return "bg-yellow-100 text-yellow-700";
      case "INACTIVE":
      case "MAINTENANCE":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "Hoạt động";
      case "AVAILABLE":
        return "Sẵn sàng";
      case "BUSY":
        return "Đang bận";
      case "IN_USE":
        return "Đang sử dụng";
      case "INACTIVE":
        return "Không hoạt động";
      case "MAINTENANCE":
        return "Bảo trì";
      default:
        return status;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-gray-100 text-gray-700";
      case "ACCEPTED": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "NEW": return "Mới";
      case "ACCEPTED": return "Đã nhận";
      default: return status;
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm)
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = unassignedOrders.filter(
    (o) => o.order_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active drivers
  const activeDrivers = drivers.filter(d => d.status === "ACTIVE").length;

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
              <Link
                href="/workspace"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900">Điều phối</h1>
                  {tenantInfo && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {tenantInfo.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Làm mới"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-orange-600">{unassignedOrders.length}</div>
            <div className="text-sm text-gray-500">Đơn chưa gán</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-green-600">{activeDrivers}</div>
            <div className="text-sm text-gray-500">Tài xế hoạt động</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-2xl font-bold text-blue-600">{vehicles.length}</div>
            <div className="text-sm text-gray-500">Xe</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border p-1 inline-flex gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab("unassigned")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "unassigned"
                ? "bg-orange-100 text-orange-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Chưa gán ({unassignedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("drivers")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "drivers"
                ? "bg-green-100 text-green-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Tài xế ({drivers.length})
          </button>
          <button
            onClick={() => setActiveTab("vehicles")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "vehicles"
                ? "bg-blue-100 text-blue-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Xe ({vehicles.length})
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === "drivers"
                  ? "Tìm theo tên, số điện thoại..."
                  : activeTab === "vehicles"
                  ? "Tìm theo biển số, loại xe..."
                  : "Tìm theo mã đơn hàng..."
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
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

        {/* Content */}
        <div className="bg-white rounded-xl border shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : activeTab === "unassigned" ? (
            /* Unassigned Orders */
            filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                <p>Tất cả đơn hàng đã được gán tài xế!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-blue-600">{order.order_code}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {order.order_date
                            ? new Date(order.order_date).toLocaleDateString("vi-VN")
                            : "-"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canAssign && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1"
                          >
                            <User className="w-4 h-4" />
                            Gán TX
                          </button>
                        )}
                        <Link
                          href={`/workspace/tenant/${tenantId}/orders/${order.id}`}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === "drivers" ? (
            /* Drivers List */
            filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Không có tài xế nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredDrivers.map((driver) => (
                  <div key={driver.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          driver.status === "ACTIVE" ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          <User className={`w-5 h-5 ${
                            driver.status === "ACTIVE" ? "text-green-600" : "text-gray-500"
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {driver.name}
                          </div>
                          {driver.phone && (
                            <a
                              href={`tel:${driver.phone}`}
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {driver.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {driver.source && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            driver.source === "INTERNAL"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                          }`}>
                            {driver.source === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            driver.status
                          )}`}
                        >
                          {getStatusLabel(driver.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Vehicles List */
            filteredVehicles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Không có xe nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {vehicle.plate_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {vehicle.vehicle_type || "Xe tải"}
                            {vehicle.brand && ` - ${vehicle.brand}`}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          vehicle.status
                        )}`}
                      >
                        {getStatusLabel(vehicle.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Quick Links */}
        <div className="flex gap-3">
          <Link
            href={`/workspace/tenant/${tenantId}/orders`}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Tất cả đơn hàng
          </Link>
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
    </div>
  );
}
