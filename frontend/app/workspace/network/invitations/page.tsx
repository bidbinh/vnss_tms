"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  Truck,
  Users,
  Clock,
  UserPlus,
  Building2,
} from "lucide-react";
import { useWorker } from "@/lib/worker-context";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000";

interface PendingInvitation {
  id: string;
  type: "INVITATION" | "REQUEST";
  from_worker_id: string;
  from_worker_name: string;
  from_worker_phone: string;
  from_worker_company?: string;
  from_worker_avatar_url?: string;
  from_worker_role: "DISPATCHER" | "DRIVER";
  message?: string;
  created_at: string;
}

export default function InvitationsPage() {
  const { worker } = useWorker();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [requests, setRequests] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"invitations" | "requests">("invitations");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (worker) {
      fetchPending();
    }
  }, [worker]);

  // Transform backend response to frontend format
  const transformConnection = (
    conn: any,
    type: "INVITATION" | "REQUEST"
  ): PendingInvitation => {
    // Nếu type = INVITATION: Dispatcher gửi cho Driver -> from = dispatcher
    // Nếu type = REQUEST: Driver xin vào mạng Dispatcher -> from = driver
    const fromWorker = type === "INVITATION" ? conn.dispatcher : conn.driver;
    const fromRole = type === "INVITATION" ? "DISPATCHER" : "DRIVER";

    return {
      id: conn.id,
      type,
      from_worker_id: fromWorker?.id || "",
      from_worker_name: fromWorker?.full_name || fromWorker?.username || "Unknown",
      from_worker_phone: fromWorker?.phone || "",
      from_worker_company: fromWorker?.job_title || "",
      from_worker_avatar_url: fromWorker?.avatar_url,
      from_worker_role: fromRole,
      message: conn.message,
      created_at: conn.created_at,
    };
  };

  const fetchPending = async () => {
    try {
      const [invRes, reqRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/worker-connections/pending-invitations`, {
          credentials: "include",
        }),
        fetch(`${API_BASE}/api/v1/worker-connections/pending-driver-requests`, {
          credentials: "include",
        }),
      ]);

      if (invRes.ok) {
        const data = await invRes.json();
        // Backend returns: { invitations: [...], total: N }
        const items = data.invitations || [];
        setInvitations(items.map((c: any) => transformConnection(c, "INVITATION")));
      }
      if (reqRes.ok) {
        const data = await reqRes.json();
        // Backend returns: { requests: [...], total: N }
        const items = data.requests || [];
        setRequests(items.map((c: any) => transformConnection(c, "REQUEST")));
      }
    } catch (e) {
      console.error("Failed to fetch pending:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (
    connectionId: string,
    accept: boolean,
    isRequest: boolean
  ) => {
    setProcessing(connectionId);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/worker-connections/${connectionId}/respond`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accept }),
        }
      );

      if (res.ok) {
        if (isRequest) {
          setRequests(requests.filter((r) => r.id !== connectionId));
        } else {
          setInvitations(invitations.filter((i) => i.id !== connectionId));
        }
      }
    } catch (e) {
      console.error("Failed to respond:", e);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Vừa xong";
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  };

  if (!worker) return null;

  const totalInvitations = invitations.length;
  const totalRequests = requests.length;
  const currentList = tab === "invitations" ? invitations : requests;

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
                Yêu cầu kết nối
              </h1>
              <p className="text-gray-500 text-sm">
                {totalInvitations + totalRequests} yêu cầu đang chờ xử lý
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-xl border">
          <button
            onClick={() => setTab("invitations")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tab === "invitations"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Lời mời ({totalInvitations})
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tab === "requests"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Yêu cầu tham gia ({totalRequests})
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {tab === "invitations"
                ? "Không có lời mời nào đang chờ"
                : "Không có yêu cầu tham gia nào"}
            </p>
            <Link
              href="/workspace/network/search"
              className="text-blue-600 hover:underline"
            >
              Tìm và kết nối với người khác
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      item.from_worker_role === "DRIVER"
                        ? "bg-green-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {item.from_worker_avatar_url ? (
                      <img
                        src={item.from_worker_avatar_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : item.from_worker_role === "DRIVER" ? (
                      <Truck className="w-6 h-6 text-green-600" />
                    ) : (
                      <Users className="w-6 h-6 text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {item.from_worker_name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.from_worker_role === "DRIVER"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.from_worker_role === "DRIVER"
                          ? "Tài xế"
                          : "Điều phối"}
                      </span>
                    </div>

                    {item.from_worker_company && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {item.from_worker_company}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mt-1">
                      {item.from_worker_phone}
                    </p>

                    {item.message && (
                      <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg">
                        "{item.message}"
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() =>
                      handleRespond(item.id, true, tab === "requests")
                    }
                    disabled={processing === item.id}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Chấp nhận
                  </button>
                  <button
                    onClick={() =>
                      handleRespond(item.id, false, tab === "requests")
                    }
                    disabled={processing === item.id}
                    className="flex-1 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
