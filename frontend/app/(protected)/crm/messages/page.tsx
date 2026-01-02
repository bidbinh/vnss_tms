"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Clock,
  CheckCircle,
  Building2,
  Calendar,
  Phone,
  Mail,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Activity {
  id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  status: string;
  account_id: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface ActivitiesResponse {
  items: Activity[];
  total: number;
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  SMS: "SMS",
  ZALO: "Zalo",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  OTHER: "Khác",
};

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    status: "COMPLETED",
    message_type: "SMS",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchMessages();
  }, [router, search]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page_size: "100",
        activity_type: "MESSAGE",
      });
      if (search) params.append("search", search);

      const res = await apiFetch<ActivitiesResponse>(`/crm/activities?${params}`);
      setMessages(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
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
          activity_type: "MESSAGE",
          start_date: new Date().toISOString().split("T")[0],
        }),
      });
      setShowModal(false);
      resetForm();
      fetchMessages();
    } catch (error) {
      console.error("Failed to create message:", error);
      alert("Lỗi khi tạo tin nhắn");
    }
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      description: "",
      status: "COMPLETED",
      message_type: "SMS",
    });
  };

  if (loading && messages.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tin nhắn</h1>
          <p className="text-gray-600 mt-1">Theo dõi tin nhắn SMS, Zalo, Facebook...</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ghi nhận tin nhắn
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng tin nhắn</div>
              <div className="text-xl font-bold">{total}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã gửi</div>
              <div className="text-xl font-bold">
                {messages.filter((m) => m.status === "COMPLETED").length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đang chờ</div>
              <div className="text-xl font-bold">
                {messages.filter((m) => m.status === "PENDING").length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tin nhắn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Message List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="divide-y divide-gray-200">
          {messages.map((msg) => (
            <div key={msg.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{msg.subject}</div>
                    {msg.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {msg.description}
                      </div>
                    )}
                    {msg.created_at && (
                      <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {msg.created_at}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      msg.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {msg.status === "COMPLETED" ? "Đã gửi" : "Đang chờ"}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Chưa có tin nhắn nào
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Ghi nhận tin nhắn</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại tin nhắn
                  </label>
                  <select
                    value={formData.message_type}
                    onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SMS">SMS</option>
                    <option value="ZALO">Zalo</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
