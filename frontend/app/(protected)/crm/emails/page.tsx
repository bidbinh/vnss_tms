"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Send,
  Inbox,
  Plus,
  Search,
  Clock,
  CheckCircle,
  Building2,
  Calendar,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Activity {
  id: string;
  activity_type: string;
  subject: string;
  description: string | null;
  status: string;
  email_to: string | null;
  email_cc: string | null;
  email_status: string | null;
  account_id: string | null;
  created_at: string | null;
  completed_at: string | null;
}

interface ActivitiesResponse {
  items: Activity[];
  total: number;
}

const EMAIL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  DELIVERED: "Đã nhận",
  OPENED: "Đã mở",
  CLICKED: "Đã click",
  BOUNCED: "Thất bại",
};

export default function EmailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    email_to: "",
    email_cc: "",
    description: "",
    status: "COMPLETED",
    email_status: "SENT",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchEmails();
  }, [router, search, filterStatus]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page_size: "100",
        activity_type: "EMAIL",
      });
      if (search) params.append("search", search);
      if (filterStatus) params.append("status", filterStatus);

      const res = await apiFetch<ActivitiesResponse>(`/crm/activities?${params}`);
      setEmails(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
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
          activity_type: "EMAIL",
          start_date: new Date().toISOString().split("T")[0],
        }),
      });
      setShowModal(false);
      resetForm();
      fetchEmails();
    } catch (error) {
      console.error("Failed to create email:", error);
      alert("Lỗi khi tạo email");
    }
  };

  const resetForm = () => {
    setFormData({
      subject: "",
      email_to: "",
      email_cc: "",
      description: "",
      status: "COMPLETED",
      email_status: "SENT",
    });
  };

  const getEmailStatusBadge = (status: string | null) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-700",
      SENT: "bg-blue-100 text-blue-700",
      DELIVERED: "bg-green-100 text-green-700",
      OPENED: "bg-purple-100 text-purple-700",
      CLICKED: "bg-orange-100 text-orange-700",
      BOUNCED: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const sentEmails = emails.filter((e) => e.email_status === "SENT" || e.email_status === "DELIVERED");
  const openedEmails = emails.filter((e) => e.email_status === "OPENED" || e.email_status === "CLICKED");

  if (loading && emails.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Email</h1>
          <p className="text-gray-600 mt-1">Theo dõi email gửi đến khách hàng</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Ghi nhận email
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng email</div>
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
              <div className="text-xl font-bold">{sentEmails.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã mở</div>
              <div className="text-xl font-bold">{openedEmails.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tỷ lệ mở</div>
              <div className="text-xl font-bold">
                {sentEmails.length > 0
                  ? ((openedEmails.length / sentEmails.length) * 100).toFixed(0)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Email List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="divide-y divide-gray-200">
          {emails.map((email) => (
            <div key={email.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{email.subject}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {email.email_to && <span>Đến: {email.email_to}</span>}
                      {email.email_cc && <span className="ml-3">CC: {email.email_cc}</span>}
                    </div>
                    {email.description && (
                      <div className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {email.description}
                      </div>
                    )}
                    {email.created_at && (
                      <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {email.created_at}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {email.email_status && (
                    <span className={`text-xs px-2 py-1 rounded ${getEmailStatusBadge(email.email_status)}`}>
                      {EMAIL_STATUS_LABELS[email.email_status] || email.email_status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Chưa có email nào
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Ghi nhận email</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
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
                    Gửi đến
                  </label>
                  <input
                    type="email"
                    value={formData.email_to}
                    onChange={(e) => setFormData({ ...formData, email_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CC
                  </label>
                  <input
                    type="text"
                    value={formData.email_cc}
                    onChange={(e) => setFormData({ ...formData, email_cc: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={formData.email_status}
                    onChange={(e) => setFormData({ ...formData, email_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SENT">Đã gửi</option>
                    <option value="DELIVERED">Đã nhận</option>
                    <option value="OPENED">Đã mở</option>
                    <option value="DRAFT">Nháp</option>
                  </select>
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
