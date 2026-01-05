"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  DollarSign,
  Truck,
  Phone,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Loader2,
  Building2,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface DispatcherOrder {
  id: string;
  order_code: string;
  status: string;
  dispatcher_id: string;
  driver_id?: string;
  connection_id?: string;

  customer_name?: string;
  customer_phone?: string;
  customer_company?: string;

  pickup_address?: string;
  pickup_contact?: string;
  pickup_phone?: string;
  pickup_time?: string;

  delivery_address?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  delivery_time?: string;

  equipment?: string;
  container_code?: string;
  cargo_description?: string;
  weight_kg?: number;

  freight_charge?: number;
  driver_payment?: number;
  payment_status: string;

  notes?: string;
  created_at: string;
  updated_at: string;

  driver_name?: string;
  driver_phone?: string;
}

interface ConnectedDriver {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  DRAFT: {
    label: "Nháp",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  PENDING: {
    label: "Chờ tài xế nhận",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  ACCEPTED: {
    label: "Tài xế đã nhận",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  IN_TRANSIT: {
    label: "Đang vận chuyển",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  DELIVERED: {
    label: "Đã giao hàng",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  COMPLETED: {
    label: "Hoàn thành",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  CANCELLED: {
    label: "Đã hủy",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};

export default function DispatcherOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { worker } = useWorker();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<DispatcherOrder | null>(null);
  const [drivers, setDrivers] = useState<ConnectedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");

  useEffect(() => {
    if (worker && orderId) {
      fetchOrder();
      fetchDrivers();
    }
  }, [worker, orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        router.push("/workspace/dispatcher/orders");
      }
    } catch (e) {
      console.error("Failed to fetch order:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/my-drivers`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
    }
  };

  const handleAssign = async () => {
    if (!selectedDriver) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/assign`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driver_id: selectedDriver }),
        }
      );

      if (res.ok) {
        fetchOrder();
        setShowAssignModal(false);
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể giao đơn");
      }
    } catch (e) {
      console.error("Failed to assign:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleUnassign = async () => {
    if (!confirm("Hủy giao đơn cho tài xế này?")) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/unassign`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to unassign:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!confirm("Đánh dấu đã thanh toán cho tài xế?")) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/mark-paid`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to mark paid:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Đánh dấu đơn hàng đã hoàn thành?")) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/complete`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to complete:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Hủy đơn hàng này?")) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/cancel`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to cancel:", e);
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!worker) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Không tìm thấy đơn hàng</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/workspace/dispatcher/orders"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {order.order_code}
                  </h1>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">
                  Tạo: {formatDateTime(order.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Customer */}
        {(order.customer_name || order.customer_phone) && (
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Khách hàng
            </h3>
            <div className="space-y-2">
              {order.customer_name && (
                <p className="text-gray-900">{order.customer_name}</p>
              )}
              {order.customer_company && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {order.customer_company}
                </p>
              )}
              {order.customer_phone && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-sm text-blue-600 flex items-center gap-1"
                >
                  <Phone className="w-4 h-4" />
                  {order.customer_phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Addresses */}
        <div className="bg-white rounded-xl border p-4 space-y-4">
          {/* Pickup */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              Điểm lấy hàng
            </h4>
            <p className="text-gray-600">{order.pickup_address || "-"}</p>
            {order.pickup_contact && (
              <p className="text-sm text-gray-500 mt-1">
                {order.pickup_contact}
                {order.pickup_phone && (
                  <a
                    href={`tel:${order.pickup_phone}`}
                    className="ml-2 text-blue-600"
                  >
                    {order.pickup_phone}
                  </a>
                )}
              </p>
            )}
            {order.pickup_time && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(order.pickup_time)}
              </p>
            )}
          </div>

          <hr />

          {/* Delivery */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Điểm giao hàng
            </h4>
            <p className="text-gray-600">{order.delivery_address || "-"}</p>
            {order.delivery_contact && (
              <p className="text-sm text-gray-500 mt-1">
                {order.delivery_contact}
                {order.delivery_phone && (
                  <a
                    href={`tel:${order.delivery_phone}`}
                    className="ml-2 text-blue-600"
                  >
                    {order.delivery_phone}
                  </a>
                )}
              </p>
            )}
            {order.delivery_time && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime(order.delivery_time)}
              </p>
            )}
          </div>
        </div>

        {/* Cargo */}
        {(order.equipment || order.cargo_description) && (
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              Hàng hóa
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {order.equipment && (
                <div>
                  <p className="text-gray-500">Loại xe/Cont</p>
                  <p className="text-gray-900">{order.equipment}</p>
                </div>
              )}
              {order.container_code && (
                <div>
                  <p className="text-gray-500">Số cont</p>
                  <p className="text-gray-900">{order.container_code}</p>
                </div>
              )}
              {order.weight_kg && (
                <div>
                  <p className="text-gray-500">Trọng lượng</p>
                  <p className="text-gray-900">
                    {order.weight_kg.toLocaleString()} kg
                  </p>
                </div>
              )}
            </div>
            {order.cargo_description && (
              <p className="text-gray-600 mt-3">{order.cargo_description}</p>
            )}
          </div>
        )}

        {/* Driver */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-green-500" />
            Tài xế
          </h3>

          {order.driver_id ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{order.driver_name}</p>
                  {order.driver_phone && (
                    <a
                      href={`tel:${order.driver_phone}`}
                      className="text-sm text-blue-600 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {order.driver_phone}
                    </a>
                  )}
                </div>
              </div>

              {["DRAFT", "PENDING"].includes(order.status) && (
                <button
                  onClick={handleUnassign}
                  disabled={processing}
                  className="text-sm text-red-600 hover:underline"
                >
                  Hủy giao
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">Chưa giao tài xế</p>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Giao cho tài xế
              </button>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-400" />
            Thanh toán
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Cước thu từ KH</p>
              <p className="text-lg font-semibold text-gray-900">
                {order.freight_charge?.toLocaleString("vi-VN") || 0} đ
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trả cho tài xế</p>
              <p className="text-lg font-semibold text-gray-900">
                {order.driver_payment?.toLocaleString("vi-VN") || 0} đ
              </p>
            </div>
          </div>

          {order.driver_payment && order.driver_payment > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {order.payment_status === "PAID" ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-green-600 font-medium">
                        Đã thanh toán
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-orange-500" />
                      <span className="text-orange-600 font-medium">
                        Chưa thanh toán
                      </span>
                    </>
                  )}
                </div>

                {order.payment_status === "PENDING" &&
                  order.status === "COMPLETED" && (
                    <button
                      onClick={handleMarkPaid}
                      disabled={processing}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                    >
                      Đánh dấu đã thanh toán
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!["COMPLETED", "CANCELLED"].includes(order.status) && (
          <div className="flex gap-3">
            {order.status === "DELIVERED" && (
              <button
                onClick={handleComplete}
                disabled={processing}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Hoàn thành đơn
              </button>
            )}

            {["DRAFT", "PENDING"].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="flex-1 py-3 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Hủy đơn
              </button>
            )}
          </div>
        )}
      </main>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Giao đơn cho tài xế
            </h3>

            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">-- Chọn tài xế --</option>
              {drivers.map((d) => (
                <option key={d.driver_id} value={d.driver_id}>
                  {d.driver_name} - {d.driver_phone}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedDriver || processing}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
              >
                {processing ? "Đang xử lý..." : "Giao đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
