"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Truck,
  MapPin,
  Calendar,
  User,
  Phone,
  Building2,
  CheckCircle,
  Clock,
  Play,
  AlertCircle,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8000");

interface OrderDetail {
  id: string;
  order_code: string;
  order_date: string;
  status: string;
  customer?: { id: string; name: string };
  driver?: { id: string; name: string };
  vehicle?: { id: string; plate_number: string };
  pickup_site?: { id: string; company_name: string; address: string };
  delivery_site?: { id: string; company_name: string; address: string };
  container_no?: string;
  seal_no?: string;
  note?: string;
  created_at: string;
}

export default function WorkerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { worker } = useWorker();
  const tenantId = params.tenantId as string;
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState("");

  useEffect(() => {
    if (worker && tenantId && orderId) {
      fetchOrder();
    }
  }, [worker, tenantId, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${orderId}?tenant_id=${tenantId}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Không thể tải đơn hàng");
      }

      const data = await res.json();
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    if (!confirm(`Bạn có chắc muốn chuyển trạng thái sang "${getStatusLabel(newStatus)}"?`)) return;

    setUpdating(true);
    setUpdateSuccess("");
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-tenant/orders/${orderId}/status?tenant_id=${tenantId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Không thể cập nhật trạng thái");
      }

      setUpdateSuccess("Đã cập nhật trạng thái!");
      fetchOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setUpdating(false);
    }
  };

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

  // Get available next statuses based on current
  const getNextStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case "NEW": return ["ACCEPTED", "CANCELLED"];
      case "ACCEPTED": return ["ASSIGNED", "CANCELLED"];
      case "ASSIGNED": return ["IN_TRANSIT", "CANCELLED"];
      case "IN_TRANSIT": return ["DELIVERED", "CANCELLED"];
      case "DELIVERED": return ["COMPLETED"];
      default: return [];
    }
  };

  if (!worker) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/workspace/tenant/${tenantId}/orders`}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900">
                {order?.order_code || "Chi tiết đơn hàng"}
              </h1>
              {order && (
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusLabel(order.status)}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success */}
        {updateSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{updateSuccess}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Đang tải...</p>
          </div>
        ) : order ? (
          <>
            {/* Status Actions */}
            {getNextStatuses(order.status).length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700 mb-3">Cập nhật trạng thái:</p>
                <div className="flex flex-wrap gap-2">
                  {getNextStatuses(order.status).map((status) => {
                    const buttonColors = {
                      ACCEPTED: "bg-blue-500 hover:bg-blue-600",
                      ASSIGNED: "bg-indigo-500 hover:bg-indigo-600",
                      IN_TRANSIT: "bg-yellow-500 hover:bg-yellow-600",
                      DELIVERED: "bg-green-500 hover:bg-green-600",
                      COMPLETED: "bg-green-600 hover:bg-green-700",
                      CANCELLED: "bg-red-500 hover:bg-red-600",
                    };
                    return (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        disabled={updating}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white ${
                          buttonColors[status as keyof typeof buttonColors] || "bg-gray-500 hover:bg-gray-600"
                        } disabled:opacity-50`}
                      >
                        {updating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : status === "IN_TRANSIT" ? (
                          <Play className="w-4 h-4" />
                        ) : status === "CANCELLED" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {getStatusLabel(status)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Info */}
            <div className="bg-white rounded-xl border p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Mã đơn hàng</label>
                  <p className="font-semibold text-blue-600">{order.order_code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Ngày đơn hàng</label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {order.order_date
                      ? new Date(order.order_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </p>
                </div>
              </div>

              {order.customer && (
                <div>
                  <label className="text-sm text-gray-500">Khách hàng</label>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {order.customer.name}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Container</label>
                  <p className="font-medium">{order.container_no || "-"}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Seal</label>
                  <p className="font-medium">{order.seal_no || "-"}</p>
                </div>
              </div>

              {order.driver && (
                <div>
                  <label className="text-sm text-gray-500">Tài xế</label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {order.driver.name}
                  </p>
                </div>
              )}

              {order.vehicle && (
                <div>
                  <label className="text-sm text-gray-500">Xe</label>
                  <p className="font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    {order.vehicle.plate_number}
                  </p>
                </div>
              )}
            </div>

            {/* Pickup / Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {order.pickup_site && (
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                    <MapPin className="w-4 h-4" />
                    Điểm lấy hàng
                  </div>
                  <p className="font-semibold">{order.pickup_site.company_name}</p>
                  <p className="text-sm text-gray-500 mt-1">{order.pickup_site.address}</p>
                </div>
              )}

              {order.delivery_site && (
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-blue-600 font-medium mb-2">
                    <MapPin className="w-4 h-4" />
                    Điểm giao hàng
                  </div>
                  <p className="font-semibold">{order.delivery_site.company_name}</p>
                  <p className="text-sm text-gray-500 mt-1">{order.delivery_site.address}</p>
                </div>
              )}
            </div>

            {/* Note */}
            {order.note && (
              <div className="bg-white rounded-xl border p-4">
                <label className="text-sm text-gray-500">Ghi chú</label>
                <p className="mt-1 whitespace-pre-wrap">{order.note}</p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
