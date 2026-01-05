"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Filter,
  Phone,
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
  pickup_address?: string;
  delivery_address?: string;
  pickup_time?: string;
  delivery_time?: string;

  driver_payment?: number;
  payment_status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ nhận", color: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Đã nhận", color: "bg-blue-100 text-blue-700" },
  IN_TRANSIT: { label: "Đang chạy", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Đã giao", color: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

export default function DriverWorkPage() {
  const { worker } = useWorker();
  const [orders, setOrders] = useState<AssignedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");

  useEffect(() => {
    if (worker) {
      fetchOrders();
    }
  }, [worker, statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter === "ACTIVE") {
        params.append("status", "PENDING,ACCEPTED,IN_TRANSIT");
      } else if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/assigned-to-me?${params}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!worker) return null;

  // Count by status
  const activeCount = orders.filter((o) =>
    ["PENDING", "ACCEPTED", "IN_TRANSIT"].includes(o.status)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace/network"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Đơn hàng được giao
              </h1>
              <p className="text-gray-500 text-sm">
                {activeCount} đơn đang hoạt động
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "ACTIVE", label: "Đang hoạt động" },
            { value: "ALL", label: "Tất cả" },
            { value: "COMPLETED", label: "Đã hoàn thành" },
            { value: "CANCELLED", label: "Đã hủy" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Order List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">Chưa có đơn hàng nào</p>
            <Link
              href="/workspace/network/dispatchers"
              className="text-blue-600 hover:underline"
            >
              Kết nối với điều phối viên để nhận đơn
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/workspace/driver-work/${order.id}`}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {order.order_code}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          STATUS_LABELS[order.status]?.color || "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[order.status]?.label || order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Users className="w-4 h-4" />
                      <span>{order.dispatcher_name}</span>
                      <a
                        href={`tel:${order.dispatcher_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {order.driver_payment && (
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {order.driver_payment.toLocaleString("vi-VN")}đ
                      </p>
                      <p
                        className={`text-xs ${
                          order.payment_status === "PAID"
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {order.payment_status === "PAID"
                          ? "Đã thanh toán"
                          : "Chưa TT"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Addresses */}
                <div className="space-y-2 text-sm">
                  {order.pickup_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 line-clamp-1">
                        {order.pickup_address}
                      </span>
                    </div>
                  )}
                  {order.delivery_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 line-clamp-1">
                        {order.delivery_address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Time */}
                {order.pickup_time && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    Lấy hàng: {formatDate(order.pickup_time)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
