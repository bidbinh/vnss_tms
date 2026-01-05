"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  DollarSign,
  Users,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Truck,
  Loader2,
  Building2,
  Navigation,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface AssignedOrder {
  id: string;
  order_code: string;
  status: string;
  dispatcher_id: string;
  dispatcher_name: string;
  dispatcher_phone: string;

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
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: "Chờ bạn nhận",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  ACCEPTED: {
    label: "Đã nhận - Chờ chạy",
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

export default function DriverWorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { worker } = useWorker();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<AssignedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (worker && orderId) {
      fetchOrder();
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
        router.push("/workspace/driver-work");
      }
    } catch (e) {
      console.error("Failed to fetch order:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/accept`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (res.ok) {
        fetchOrder();
      } else {
        const err = await res.json();
        alert(err.detail || "Không thể nhận đơn");
      }
    } catch (e) {
      console.error("Failed to accept:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm("Từ chối đơn hàng này?")) return;
    setProcessing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/decline`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (res.ok) {
        router.push("/workspace/driver-work");
      }
    } catch (e) {
      console.error("Failed to decline:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleStart = async () => {
    setProcessing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/start`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to start:", e);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliver = async () => {
    setProcessing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/deliver`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error("Failed to deliver:", e);
    } finally {
      setProcessing(false);
    }
  };

  const openMap = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
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

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/driver-work"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Dispatcher Info */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Điều phối viên
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{order.dispatcher_name}</p>
              <p className="text-sm text-gray-500">{order.dispatcher_phone}</p>
            </div>
            <a
              href={`tel:${order.dispatcher_phone}`}
              className="p-3 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
            >
              <Phone className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tiền công chuyến này</p>
              <p className="text-2xl font-bold text-gray-900">
                {order.driver_payment?.toLocaleString("vi-VN") || 0} đ
              </p>
            </div>
            <div
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                order.payment_status === "PAID"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {order.payment_status === "PAID" ? "Đã thanh toán" : "Chưa TT"}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Pickup */}
          <div className="p-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
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
              {order.pickup_address && (
                <button
                  onClick={() => openMap(order.pickup_address!)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
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
              {order.delivery_address && (
                <button
                  onClick={() => openMap(order.delivery_address!)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Navigation className="w-5 h-5" />
                </button>
              )}
            </div>
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

        {/* Notes */}
        {order.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">{order.notes}</p>
          </div>
        )}
      </main>

      {/* Fixed Bottom Actions */}
      {!["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.status) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            {order.status === "PENDING" && (
              <>
                <button
                  onClick={handleDecline}
                  disabled={processing}
                  className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Từ chối
                </button>
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Nhận đơn
                </button>
              </>
            )}

            {order.status === "ACCEPTED" && (
              <button
                onClick={handleStart}
                disabled={processing}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Bắt đầu chạy
              </button>
            )}

            {order.status === "IN_TRANSIT" && (
              <button
                onClick={handleDeliver}
                disabled={processing}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Đã giao hàng
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
