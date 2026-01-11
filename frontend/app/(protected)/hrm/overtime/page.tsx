"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

const OT_TYPE_COLORS: Record<string, string> = {
  WEEKDAY: "bg-blue-100 text-blue-700",
  WEEKEND: "bg-purple-100 text-purple-700",
  HOLIDAY: "bg-red-100 text-red-700",
  NIGHT: "bg-gray-100 text-gray-700",
};

const OT_TYPE_RATES: Record<string, string> = {
  WEEKDAY: "150%",
  WEEKEND: "200%",
  HOLIDAY: "300%",
  NIGHT: "130%",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

export default function OvertimePage() {
  const t = useTranslations("hrm.overtimePage");
  const tCommon = useTranslations("common");

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
      setError(t("errors.fillRequired"));
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
      setError(error?.message || t("errors.createFailed"));
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
      setError(error?.message || t("errors.approveFailed"));
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
      setError(error?.message || t("errors.rejectFailed"));
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
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          {t("registerOT")}
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
              <div className="text-sm text-gray-600">{t("stats.pending")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.approved")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.rejected")}</div>
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
              <div className="text-sm text-gray-600">{t("stats.totalOTHours")}</div>
              <div className="text-xl font-bold text-blue-600">{totalOTHours}h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{t("filters.month")}</label>
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
            <label className="block text-sm text-gray-600 mb-1">{t("filters.status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tCommon("all")}</option>
              <option value="PENDING">{t("status.PENDING")}</option>
              <option value="APPROVED">{t("status.APPROVED")}</option>
              <option value="REJECTED">{t("status.REJECTED")}</option>
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
            <p>{t("noData")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.employee")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.date")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.time")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.hours")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.otType")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.reason")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.status")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {tCommon("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => {
                  const typeColor = OT_TYPE_COLORS[req.ot_type] || OT_TYPE_COLORS.WEEKDAY;
                  const typeRate = OT_TYPE_RATES[req.ot_type] || OT_TYPE_RATES.WEEKDAY;
                  const statusColor = STATUS_COLORS[req.status] || STATUS_COLORS.PENDING;

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
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
                          {t(`otTypes.${req.ot_type}`)} ({typeRate})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                          {t(`status.${req.status}`)}
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
                            {t("actions.approve")}
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
              {tCommon("page")} {page} / {totalPages}
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
            <h2 className="text-lg font-semibold mb-4">{t("modal.createTitle")}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.employee")} *
                </label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("modal.selectEmployee")}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} - {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.overtimeDate")} *
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
                    {t("modal.from")}
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
                    {t("modal.to")}
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
                  {t("modal.otType")}
                </label>
                <select
                  value={form.ot_type}
                  onChange={(e) => setForm({ ...form, ot_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WEEKDAY">{t("otTypes.WEEKDAY")} (150%)</option>
                  <option value="WEEKEND">{t("otTypes.WEEKEND")} (200%)</option>
                  <option value="HOLIDAY">{t("otTypes.HOLIDAY")} (300%)</option>
                  <option value="NIGHT">{t("otTypes.NIGHT")} (130%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("modal.reason")} *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t("modal.reasonPlaceholder")}
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
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? tCommon("loading") : t("registerOT")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{t("approveModal.title")}</h2>

            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.employee")}:</span>
                <span className="font-medium">{selectedRequest.employee?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.date")}:</span>
                <span className="font-medium">{formatDate(selectedRequest.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.time")}:</span>
                <span className="font-medium">
                  {formatTime(selectedRequest.start_time)} - {formatTime(selectedRequest.end_time)} ({selectedRequest.hours}h)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.otType")}:</span>
                <span className="font-medium">
                  {t(`otTypes.${selectedRequest.ot_type}`)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">{t("approveModal.reason")}:</span>
                <p className="mt-1 text-gray-900">{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {tCommon("close")}
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {t("actions.reject")}
              </button>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {t("actions.approve")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
