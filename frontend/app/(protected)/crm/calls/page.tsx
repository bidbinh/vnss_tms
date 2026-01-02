"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  Search,
  Clock,
  CheckCircle,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Activity {
  id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  call_direction: string | null;
  call_result: string | null;
  phone_number: string | null;
  account_id: string | null;
  contact_id: string | null;
  outcome: string | null;
  created_at: string | null;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface ActivitiesResponse {
  items: Activity[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const CALL_RESULT_LABELS: Record<string, string> = {
  ANSWERED: "Đã nghe máy",
  NO_ANSWER: "Không nghe máy",
  BUSY: "Máy bận",
  VOICEMAIL: "Hộp thư thoại",
  WRONG_NUMBER: "Sai số",
  CALLBACK: "Gọi lại sau",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Đã lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export default function CallsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<Activity[]>([]);
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    account_id: "",
    phone_number: "",
    call_direction: "OUTBOUND",
    start_date: new Date().toISOString().split("T")[0],
    start_time: new Date().toTimeString().slice(0, 5),
    duration_minutes: 5,
    call_result: "",
    outcome: "",
    status: "PLANNED",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchCalls();
  }, [router, page, search, filterStatus, filterDirection]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "50",
        activity_type: "CALL",
      });
      if (search) params.append("search", search);
      if (filterStatus) params.append("status", filterStatus);

      const res = await apiFetch<ActivitiesResponse>(`/crm/activities?${params}`);

      // Filter by direction if needed
      let filteredCalls = res.items;
      if (filterDirection) {
        filteredCalls = res.items.filter((c) => c.call_direction === filterDirection);
      }

      setCalls(filteredCalls);
      setTotal(res.total);

      // Fetch account info for calls
      const accountIds = [...new Set(filteredCalls.filter((c) => c.account_id).map((c) => c.account_id!))];
      if (accountIds.length > 0) {
        const accountMap: Record<string, Account> = {};
        for (const id of accountIds.slice(0, 20)) {
          try {
            const acc = await apiFetch<Account>(`/crm/accounts/${id}`);
            accountMap[id] = acc;
          } catch {
            // Ignore errors
          }
        }
        setAccounts(accountMap);
      }
    } catch (error) {
      console.error("Failed to fetch calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          activity_type: "CALL",
        }),
      });
      setShowModal(false);
      resetForm();
      fetchCalls();
    } catch (error) {
      console.error("Failed to create call:", error);
      alert("Lỗi khi tạo cuộc gọi");
    }
  };

  const handleMarkComplete = async (call: Activity) => {
    const result = prompt("Kết quả cuộc gọi (ANSWERED, NO_ANSWER, BUSY, VOICEMAIL):", "ANSWERED");
    if (!result) return;

    try {
      await apiFetch(`/crm/activities/${call.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "COMPLETED",
          call_result: result.toUpperCase(),
        }),
      });
      fetchCalls();
    } catch (error) {
      console.error("Failed to update call:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      description: "",
      account_id: "",
      phone_number: "",
      call_direction: "OUTBOUND",
      start_date: new Date().toISOString().split("T")[0],
      start_time: new Date().toTimeString().slice(0, 5),
      duration_minutes: 5,
      call_result: "",
      outcome: "",
      status: "PLANNED",
    });
  };

  const getCallIcon = (call: Activity) => {
    if (call.call_result === "NO_ANSWER" || call.call_result === "BUSY") {
      return <PhoneMissed className="w-4 h-4 text-red-500" />;
    }
    if (call.call_direction === "INBOUND") {
      return <PhoneIncoming className="w-4 h-4 text-green-500" />;
    }
    return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PLANNED: "bg-blue-100 text-blue-700",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  // Stats
  const totalCalls = calls.length;
  const completedCalls = calls.filter((c) => c.status === "COMPLETED").length;
  const inboundCalls = calls.filter((c) => c.call_direction === "INBOUND").length;
  const outboundCalls = calls.filter((c) => c.call_direction === "OUTBOUND").length;

  if (loading && calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Cuộc gọi</h1>
          <p className="text-gray-600 mt-1">Theo dõi và ghi nhận các cuộc gọi với khách hàng</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Ghi nhận cuộc gọi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng cuộc gọi</div>
              <div className="text-xl font-bold">{totalCalls}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Hoàn thành</div>
              <div className="text-xl font-bold">{completedCalls}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <PhoneOutgoing className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Gọi đi</div>
              <div className="text-xl font-bold">{outboundCalls}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhoneIncoming className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Gọi đến</div>
              <div className="text-xl font-bold">{inboundCalls}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm cuộc gọi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PLANNED">Đã lên kế hoạch</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <select
          value={filterDirection}
          onChange={(e) => setFilterDirection(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả hướng</option>
          <option value="OUTBOUND">Gọi đi</option>
          <option value="INBOUND">Gọi đến</option>
        </select>
      </div>

      {/* Calls List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="divide-y divide-gray-200">
          {calls.map((call) => (
            <div key={call.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getCallIcon(call)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{call.subject}</div>
                    <div className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                      {call.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {call.phone_number}
                        </span>
                      )}
                      {call.account_id && accounts[call.account_id] && (
                        <Link
                          href={`/crm/accounts/${call.account_id}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Building2 className="w-3 h-3" />
                          {accounts[call.account_id].name}
                        </Link>
                      )}
                      {call.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {call.start_date} {call.start_time || ""}
                        </span>
                      )}
                      {call.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {call.duration_minutes} phút
                        </span>
                      )}
                    </div>
                    {call.outcome && (
                      <div className="text-sm text-gray-500 mt-2">
                        Kết quả: {call.outcome}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {call.call_result && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {CALL_RESULT_LABELS[call.call_result] || call.call_result}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(call.status)}`}>
                    {STATUS_LABELS[call.status] || call.status}
                  </span>
                  {call.status !== "COMPLETED" && call.status !== "CANCELLED" && (
                    <button
                      onClick={() => handleMarkComplete(call)}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Hoàn thành
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {calls.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Chưa có cuộc gọi nào
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Ghi nhận cuộc gọi</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề cuộc gọi *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Gọi tư vấn dịch vụ vận tải"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0912345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hướng cuộc gọi
                    </label>
                    <select
                      value={formData.call_direction}
                      onChange={(e) => setFormData({ ...formData, call_direction: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="OUTBOUND">Gọi đi</option>
                      <option value="INBOUND">Gọi đến</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giờ
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời lượng (phút)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kết quả cuộc gọi
                    </label>
                    <select
                      value={formData.call_result}
                      onChange={(e) => setFormData({ ...formData, call_result: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn --</option>
                      <option value="ANSWERED">Đã nghe máy</option>
                      <option value="NO_ANSWER">Không nghe máy</option>
                      <option value="BUSY">Máy bận</option>
                      <option value="VOICEMAIL">Hộp thư thoại</option>
                      <option value="CALLBACK">Gọi lại sau</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PLANNED">Đã lên kế hoạch</option>
                      <option value="COMPLETED">Hoàn thành</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú / Nội dung cuộc gọi
                  </label>
                  <textarea
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Nội dung trao đổi trong cuộc gọi..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Lưu cuộc gọi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
