"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Plus,
  Check,
  X,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
}

interface OvertimeRequest {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  ot_type: string;
  multiplier: number;
  reason: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  employee?: Employee;
}

interface OvertimeResponse {
  items: OvertimeRequest[];
  total: number;
  page: number;
  page_size: number;
}

const OT_TYPE_CONFIG: Record<string, { label: string; rate: string; color: string }> = {
  WEEKDAY: { label: "Ngày thường", rate: "150%", color: "bg-blue-100 text-blue-700" },
  WEEKEND: { label: "Cuối tuần", rate: "200%", color: "bg-purple-100 text-purple-700" },
  HOLIDAY: { label: "Lễ/Tết", rate: "300%", color: "bg-red-100 text-red-700" },
  NIGHT: { label: "Ca đêm", rate: "130%", color: "bg-gray-100 text-gray-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Đã duyệt", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Từ chối", color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-gray-100 text-gray-700" },
};

export default function OvertimePage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().substring(0, 7)
  );

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    employee_id: "",
    request_date: new Date().toISOString().split("T")[0],
    start_time: "18:00",
    end_time: "21:00",
    ot_type: "WEEKDAY",
    reason: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, monthFilter]);

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch<{ items: Employee[] }>("/hrm/employees?page_size=200&status=ACTIVE");
      setEmployees(data.items || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (statusFilter) params.set("status", statusFilter);
      if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
        params.set("date_from", startDate);
        params.set("date_to", endDate);
      }

      const data = await apiFetch<OvertimeResponse>(`/hrm/attendance/overtime?${params.toString()}`);
      setRequests(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
    } catch (error) {
      console.error("Failed to fetch overtime requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.employee_id || !form.request_date || !form.reason) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/hrm/attendance/overtime", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowCreateModal(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      setError(error?.message || "Không thể tạo đơn tăng ca");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      await apiFetch(`/hrm/attendance/overtime/${selectedRequest.id}/approve`, {
        method: "POST",
      });
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      setError(error?.message || "Không thể duyệt đơn");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      await apiFetch(`/hrm/attendance/overtime/${selectedRequest.id}/reject`, {
        method: "POST",
      });
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      setError(error?.message || "Không thể từ chối đơn");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      employee_id: "",
      request_date: new Date().toISOString().split("T")[0],
      start_time: "18:00",
      end_time: "21:00",
      ot_type: "WEEKDAY",
      reason: "",
    });
    setError(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  // Calculate total OT hours for the month
  const totalOTHours = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.hours, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tăng ca</h1>
          <p className="text-gray-600 mt-1">Đăng ký và duyệt làm thêm giờ</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Đăng ký tăng ca
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Chờ duyệt</div>
              <div className="text-xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === "PENDING").length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Đã duyệt</div>
              <div className="text-xl font-bold text-green-600">
                {requests.filter((r) => r.status === "APPROVED").length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Từ chối</div>
              <div className="text-xl font-bold text-red-600">
                {requests.filter((r) => r.status === "REJECTED").length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Tổng giờ OT (đã duyệt)</div>
              <div className="text-xl font-bold text-blue-600">{totalOTHours}h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tháng</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Chưa có đơn tăng ca nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Nhân viên
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Ngày
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Thời gian
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Số giờ
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Loại OT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Lý do
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => {
                  const typeConfig = OT_TYPE_CONFIG[req.ot_type] || OT_TYPE_CONFIG.WEEKDAY;
                  const statusConfig = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {req.employee?.full_name || "-"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {req.employee?.employee_code}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(req.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatTime(req.start_time)} - {formatTime(req.end_time)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {req.hours}h
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${typeConfig.color}`}>
                          {typeConfig.label} ({typeConfig.rate})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setShowApproveModal(true);
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Duyệt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Trang {page} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Đăng ký tăng ca</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên *
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày tăng ca *
                </label>
                <input
                  type="date"
                  value={form.request_date}
                  onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ
                  </label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại OT
                </label>
                <select
                  value={form.ot_type}
                  onChange={(e) => setForm({ ...form, ot_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WEEKDAY">Ngày thường (150%)</option>
                  <option value="WEEKEND">Cuối tuần (200%)</option>
                  <option value="HOLIDAY">Lễ/Tết (300%)</option>
                  <option value="NIGHT">Ca đêm (130%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả công việc cần làm thêm..."
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Đăng ký"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Duyệt đơn tăng ca</h2>

            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Nhân viên:</span>
                <span className="font-medium">{selectedRequest.employee?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Ngày:</span>
                <span className="font-medium">{formatDate(selectedRequest.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian:</span>
                <span className="font-medium">
                  {formatTime(selectedRequest.start_time)} - {formatTime(selectedRequest.end_time)} ({selectedRequest.hours}h)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loại OT:</span>
                <span className="font-medium">
                  {OT_TYPE_CONFIG[selectedRequest.ot_type]?.label || selectedRequest.ot_type}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Lý do:</span>
                <p className="mt-1 text-gray-900">{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Đóng
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
