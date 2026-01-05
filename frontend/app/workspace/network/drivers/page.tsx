"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MoreVertical,
  UserMinus,
  Settings,
  Package,
  DollarSign,
  Search,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface ConnectedDriver {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  driver_email: string;
  driver_avatar_url?: string;
  status: string;
  enable_payment_tracking: boolean;
  default_payment_per_order?: number;
  total_orders_completed: number;
  total_amount_paid: number;
  total_amount_pending: number;
  connected_at: string;
}

export default function MyDriversPage() {
  const { worker } = useWorker();
  const [drivers, setDrivers] = useState<ConnectedDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (worker) {
      fetchDrivers();
    }
  }, [worker]);

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/worker-connections/my-drivers`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Bạn có chắc muốn hủy kết nối với tài xế này?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/${connectionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (res.ok) {
        setDrivers(drivers.filter((d) => d.id !== connectionId));
      }
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
    setMenuOpen(null);
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.driver_name.toLowerCase().includes(search.toLowerCase()) ||
      d.driver_phone.includes(search)
  );

  if (!worker) return null;

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
                Tài xế đã kết nối
              </h1>
              <p className="text-gray-500 text-sm">
                {drivers.length} tài xế trong mạng lưới
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Driver List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : filteredDrivers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {search
                ? "Không tìm thấy tài xế"
                : "Chưa có tài xế nào trong mạng lưới"}
            </p>
            {!search && (
              <Link
                href="/workspace/network/search?role=DRIVER"
                className="text-blue-600 hover:underline"
              >
                Tìm và mời tài xế
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      {driver.driver_avatar_url ? (
                        <img
                          src={driver.driver_avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Truck className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {driver.driver_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {driver.driver_phone}
                        </span>
                        {driver.driver_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {driver.driver_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === driver.id ? null : driver.id)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === driver.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 w-48 z-10">
                        <button
                          onClick={() => {
                            /* TODO: Settings modal */
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Cài đặt thanh toán
                        </button>
                        <button
                          onClick={() => handleDisconnect(driver.id)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <UserMinus className="w-4 h-4" />
                          Hủy kết nối
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                      <Package className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {driver.total_orders_completed}
                    </p>
                    <p className="text-xs text-gray-500">Đơn hoàn thành</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-green-600">
                      {driver.total_amount_paid.toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-gray-500">Đã thanh toán</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-orange-600">
                      {driver.total_amount_pending.toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-gray-500">Chưa thanh toán</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/workspace/dispatcher/orders/new?driver=${driver.driver_id}`}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center text-sm font-medium"
                  >
                    Giao đơn mới
                  </Link>
                  <a
                    href={`tel:${driver.driver_phone}`}
                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
