"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  Users,
  FileText,
  Clock,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Calendar,
  MapPin,
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
  end_date: string | null;
  duration_minutes: number | null;
  account: {
    id: string;
    name: string;
  } | null;
  contact: {
    id: string;
    full_name: string;
  } | null;
  lead: {
    id: string;
    full_name: string;
  } | null;
  opportunity: {
    id: string;
    name: string;
  } | null;
  assigned_to: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  CALL: "Cuộc gọi",
  EMAIL: "Email",
  MEETING: "Cuộc họp",
  TASK: "Công việc",
  NOTE: "Ghi chú",
  VISIT: "Thăm khách hàng",
  DEMO: "Demo",
  FOLLOW_UP: "Theo dõi",
};

const TYPE_COLORS: Record<string, string> = {
  CALL: "bg-green-100 text-green-700",
  EMAIL: "bg-blue-100 text-blue-700",
  MEETING: "bg-purple-100 text-purple-700",
  TASK: "bg-yellow-100 text-yellow-700",
  NOTE: "bg-gray-100 text-gray-700",
  VISIT: "bg-orange-100 text-orange-700",
  DEMO: "bg-pink-100 text-pink-700",
  FOLLOW_UP: "bg-indigo-100 text-indigo-700",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Đã lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  DEFERRED: "Hoãn lại",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  DEFERRED: "bg-gray-100 text-gray-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

function getTypeIcon(type: string, className: string = "w-4 h-4") {
  switch (type) {
    case "CALL":
      return <Phone className={className} />;
    case "EMAIL":
      return <Mail className={className} />;
    case "MEETING":
      return <Users className={className} />;
    case "VISIT":
      return <MapPin className={className} />;
    default:
      return <Clock className={className} />;
  }
}

export default function ActivitiesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    fetchActivities();
  }, [page, search, typeFilter, statusFilter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (search) params.set("search", search);
      if (typeFilter) params.set("activity_type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await apiFetch<{
        items: Activity[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>(`/crm/activities?${params.toString()}`);

      setActivities(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedActivity) return;

    try {
      await apiFetch(`/crm/activities/${selectedActivity.id}`, {
        method: "DELETE",
      });
      setShowDeleteModal(false);
      setSelectedActivity(null);
      fetchActivities();
    } catch (error) {
      console.error("Failed to delete activity:", error);
      alert("Không thể xóa hoạt động này");
    }
  };

  const handleComplete = async () => {
    if (!selectedActivity) return;
    setProcessing(true);

    try {
      await apiFetch(`/crm/activities/${selectedActivity.id}/complete`, {
        method: "POST",
      });
      setShowCompleteModal(false);
      setSelectedActivity(null);
      fetchActivities();
    } catch (error) {
      console.error("Failed to complete activity:", error);
      alert("Không thể hoàn thành hoạt động này");
    } finally {
      setProcessing(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const canComplete = (status: string) => {
    return ["PLANNED", "IN_PROGRESS"].includes(status);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hoạt động</h1>
          <p className="text-gray-600 mt-1">Quản lý các hoạt động CRM</p>
        </div>
        <Link
          href="/crm/activities/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm hoạt động
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo chủ đề..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả loại</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chủ đề
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Liên quan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ưu tiên
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-600">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy hoạt động nào
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${TYPE_COLORS[activity.activity_type] || "bg-gray-100 text-gray-700"}`}>
                        {getTypeIcon(activity.activity_type, "w-3 h-3")}
                        {TYPE_LABELS[activity.activity_type] || activity.activity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/crm/activities/${activity.id}`} className="hover:underline">
                        <div className="text-sm font-medium text-gray-900">{activity.subject}</div>
                        {activity.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {activity.description}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {activity.account ? (
                        <Link
                          href={`/crm/accounts/${activity.account.id}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3" />
                          {activity.account.name}
                        </Link>
                      ) : activity.lead ? (
                        <Link
                          href={`/crm/leads/${activity.lead.id}`}
                          className="text-sm text-green-600 hover:underline"
                        >
                          {activity.lead.full_name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        {activity.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {activity.start_date}
                            {activity.start_time && ` ${activity.start_time}`}
                          </div>
                        )}
                        {activity.duration_minutes && (
                          <div className="text-xs text-gray-500">
                            {activity.duration_minutes} phút
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${PRIORITY_COLORS[activity.priority] || "text-gray-500"}`}>
                        {PRIORITY_LABELS[activity.priority] || activity.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[activity.status] || "bg-gray-100 text-gray-700"}`}>
                        {STATUS_LABELS[activity.status] || activity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/crm/activities/${activity.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/crm/activities/${activity.id}/edit`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {canComplete(activity.status) && (
                          <button
                            onClick={() => {
                              setSelectedActivity(activity);
                              setShowCompleteModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-green-100 text-gray-500 hover:text-green-600"
                            title="Hoàn thành"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedActivity(activity);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} / {total} hoạt động
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa hoạt động <strong>{selectedActivity.subject}</strong>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedActivity(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Hoàn thành hoạt động
            </h3>
            <p className="text-gray-600 mb-6">
              Đánh dấu hoạt động <strong>{selectedActivity.subject}</strong> là hoàn thành?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedActivity(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Hủy
              </button>
              <button
                onClick={handleComplete}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Hoàn thành
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
