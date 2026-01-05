"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MoreVertical,
  UserMinus,
  Package,
  DollarSign,
  Search,
  Building2,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface ConnectedDispatcher {
  id: string;
  dispatcher_id: string;
  dispatcher_name: string;
  dispatcher_phone: string;
  dispatcher_email: string;
  dispatcher_company?: string;
  dispatcher_avatar_url?: string;
  status: string;
  enable_payment_tracking: boolean;
  total_orders_completed: number;
  total_amount_paid: number;
  total_amount_pending: number;
  connected_at: string;
}

export default function MyDispatchersPage() {
  const { worker } = useWorker();
  const [dispatchers, setDispatchers] = useState<ConnectedDispatcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (worker) {
      fetchDispatchers();
    }
  }, [worker]);

  const fetchDispatchers = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/my-dispatchers`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const data = await res.json();
        setDispatchers(data);
      }
    } catch (e) {
      console.error("Failed to fetch dispatchers:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Bạn có chắc muốn hủy kết nối với điều phối viên này?")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/${connectionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (res.ok) {
        setDispatchers(dispatchers.filter((d) => d.id !== connectionId));
      }
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
    setMenuOpen(null);
  };

  const filteredDispatchers = dispatchers.filter(
    (d) =>
      d.dispatcher_name.toLowerCase().includes(search.toLowerCase()) ||
      d.dispatcher_phone.includes(search) ||
      d.dispatcher_company?.toLowerCase().includes(search.toLowerCase())
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
                Điều phối viên đã kết nối
              </h1>
              <p className="text-gray-500 text-sm">
                {dispatchers.length} điều phối viên trong mạng lưới
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
            placeholder="Tìm theo tên, số điện thoại hoặc công ty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dispatcher List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : filteredDispatchers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {search
                ? "Không tìm thấy điều phối viên"
                : "Chưa kết nối với điều phối viên nào"}
            </p>
            {!search && (
              <Link
                href="/workspace/network/search?role=DISPATCHER"
                className="text-blue-600 hover:underline"
              >
                Tìm và kết nối với điều phối viên
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDispatchers.map((dispatcher) => (
              <div
                key={dispatcher.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      {dispatcher.dispatcher_avatar_url ? (
                        <img
                          src={dispatcher.dispatcher_avatar_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {dispatcher.dispatcher_name}
                      </h3>
                      {dispatcher.dispatcher_company && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {dispatcher.dispatcher_company}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {dispatcher.dispatcher_phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpen(
                          menuOpen === dispatcher.id ? null : dispatcher.id
                        )
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    {menuOpen === dispatcher.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 w-48 z-10">
                        <button
                          onClick={() => handleDisconnect(dispatcher.id)}
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
                      {dispatcher.total_orders_completed}
                    </p>
                    <p className="text-xs text-gray-500">Đơn đã chạy</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-green-600">
                      {dispatcher.total_amount_paid.toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-gray-500">Đã nhận</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-lg font-semibold text-orange-600">
                      {dispatcher.total_amount_pending.toLocaleString("vi-VN")}
                    </p>
                    <p className="text-xs text-gray-500">Chờ thanh toán</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/workspace/driver-work"
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-center text-sm font-medium"
                  >
                    Xem đơn từ người này
                  </Link>
                  <a
                    href={`tel:${dispatcher.dispatcher_phone}`}
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
