"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Package,
  MapPin,
  Clock,
  Truck,
  DollarSign,
  MoreVertical,
  Phone,
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
  customer_name?: string;
  customer_phone?: string;
  pickup_address?: string;
  delivery_address?: string;
  pickup_time?: string;
  delivery_time?: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  freight_charge?: number;
  driver_payment?: number;
  payment_status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-gray-100 text-gray-700" },
  PENDING: { label: "Chờ nhận", color: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Đã nhận", color: "bg-blue-100 text-blue-700" },
  IN_TRANSIT: { label: "Đang chạy", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "Đã giao", color: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
};

export default function DispatcherOrdersPage() {
  const { worker } = useWorker();
  const [orders, setOrders] = useState<DispatcherOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (worker) {
      fetchOrders();
    }
  }, [worker, statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }

      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders?${params}`,
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

  const handleCancel = async (orderId: string) => {
    if (!confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/dispatcher-orders/${orderId}/cancel`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error("Failed to cancel:", e);
    }
    setMenuOpen(null);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_code.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!worker) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/workspace/network"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Đơn hàng của tôi
                </h1>
                <p className="text-gray-500 text-sm">{orders.length} đơn</p>
              </div>
            </div>
            <Link
              href="/workspace/dispatcher/orders/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tạo đơn mới
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, khách hàng, tài xế..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Nháp</option>
            <option value="PENDING">Chờ nhận</option>
            <option value="ACCEPTED">Đã nhận</option>
            <option value="IN_TRANSIT">Đang chạy</option>
            <option value="DELIVERED">Đã giao</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Order List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {search ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}
            </p>
            {!search && (
              <Link
                href="/workspace/dispatcher/orders/new"
                className="text-blue-600 hover:underline"
              >
                Tạo đơn hàng đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/workspace/dispatcher/orders/${order.id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {order.order_code}
                      </Link>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          STATUS_LABELS[order.status]?.color || "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[order.status]?.label || order.status}
                      </span>
                      {order.payment_status === "PENDING" &&
                        order.driver_payment && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            Chưa TT
                          </span>
                        )}
                    </div>
                    {order.customer_name && (
                      <p className="text-sm text-gray-600 mt-1">
                        KH: {order.customer_name}
                        {order.customer_phone && ` - ${order.customer_phone}`}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === order.id ? null : order.id)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === order.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 w-40 z-10">
                        <Link
                          href={`/workspace/dispatcher/orders/${order.id}`}
                          className="block px-4 py-2 hover:bg-gray-50"
                        >
                          Chi tiết
                        </Link>
                        {order.status === "DRAFT" && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600"
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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

                {/* Driver & Payment */}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {order.driver_id ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.driver_name}
                          </p>
                          {order.driver_phone && (
                            <a
                              href={`tel:${order.driver_phone}`}
                              className="text-xs text-gray-500 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {order.driver_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Chưa giao tài xế
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {order.driver_payment && (
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {order.driver_payment.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
