"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  Check,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_type: string | null;
  reason: string;
  status: string;
  created_at: string;
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
  } | null;
  leave_type: {
    id: string;
    code: string;
    name: string;
    is_paid: boolean;
  } | null;
}

interface LeaveRequestsResponse {
  items: LeaveRequest[];
  total: number;
  page: number;
  page_size: number;
}

interface LeaveType {
  id: string;
  code: string;
  name: string;
  days_per_year: number;
  is_paid: boolean;
}

const STATUS_COLORS: Record<string, { color: string; icon: React.ElementType }> = {
  PENDING: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
  APPROVED: { color: "bg-green-100 text-green-700", icon: Check },
  REJECTED: { color: "bg-red-100 text-red-700", icon: X },
  CANCELLED: { color: "bg-gray-100 text-gray-700", icon: X },
};

function LeavesPageContent() {
  const t = useTranslations("hrm.leavesPage");
  const tCommon = useTranslations("common");

  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    is_half_day: false,
    half_day_type: "MORNING",
    reason: "",
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, typeFilter]);

  const fetchLeaveTypes = async () => {
    try {
      const data = await apiFetch<LeaveType[]>("/hrm/leaves/types");
      setLeaveTypes(data);
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", pageSize.toString());
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("leave_type_id", typeFilter);

      const data = await apiFetch<LeaveRequestsResponse>(`/hrm/leaves/requests?${params.toString()}`);
      setRequests(data.items);
      setTotal(data.total);
      setTotalPages(Math.ceil(data.total / pageSize));
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await apiFetch(`/hrm/leaves/requests/${selectedRequest.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ notes: approveNotes }),
      });
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Failed to approve:", error);
      alert(t("errors.approveFailed"));
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason) return;

    try {
      await apiFetch(`/hrm/leaves/requests/${selectedRequest.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      setShowApproveModal(false);
      setSelectedRequest(null);
      setRejectReason("");
      fetchRequests();
    } catch (error) {
      console.error("Failed to reject:", error);
      alert(t("errors.rejectFailed"));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const openApproveModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setApproveNotes("");
    setRejectReason("");
    setShowApproveModal(true);
  };

  const handleCreateRequest = async () => {
    if (!createForm.leave_type_id || !createForm.start_date || !createForm.end_date || !createForm.reason) {
      setError(t("errors.fillRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiFetch("/hrm/leaves/requests", {
        method: "POST",
        body: JSON.stringify({
          leave_type_id: createForm.leave_type_id,
          start_date: createForm.start_date,
          end_date: createForm.end_date,
          is_half_day: createForm.is_half_day,
          half_day_type: createForm.is_half_day ? createForm.half_day_type : null,
          reason: createForm.reason,
        }),
      });

      setShowCreateModal(false);
      setCreateForm({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        is_half_day: false,
        half_day_type: "MORNING",
        reason: "",
      });
      fetchRequests();
    } catch (err: any) {
      setError(err.message || t("errors.createFailed"));
    } finally {
      setSaving(false);
    }
  };

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
            setError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          {t("createRequest")}
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
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">{t("stats.total")}</div>
              <div className="text-xl font-bold text-blue-600">{total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="PENDING">{t("filters.pending")}</option>
            <option value="APPROVED">{t("filters.approved")}</option>
            <option value="REJECTED">{t("filters.rejected")}</option>
            <option value="CANCELLED">{t("filters.cancelled")}</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("filters.allTypes")}</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center p-8 text-gray-500">{t("noData")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.employee")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.leaveType")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.duration")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.days")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.reason")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.status")}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => {
                  const statusConfig = STATUS_COLORS[req.status] || STATUS_COLORS.PENDING;
                  const StatusIcon = statusConfig.icon;

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
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            req.leave_type?.is_paid
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {req.leave_type?.name || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` - ${formatDate(req.end_date)}`}
                          </span>
                        </div>
                        {req.is_half_day && (
                          <div className="text-xs text-gray-500 mt-1">
                            {t("halfDay")} ({req.half_day_type === "MORNING" ? t("morning") : t("afternoon")})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {req.total_days} {t("daysUnit")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {t(`status.${req.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === "PENDING" && (
                          <button
                            onClick={() => openApproveModal(req)}
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
              {t("pagination.page")} {page} {t("pagination.of")} {totalPages}
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

      {/* Approve/Reject Modal */}
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
                <span className="text-gray-600">{t("approveModal.leaveType")}:</span>
                <span className="font-medium">{selectedRequest.leave_type?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.duration")}:</span>
                <span className="font-medium">
                  {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("approveModal.days")}:</span>
                <span className="font-medium">{selectedRequest.total_days} {t("daysUnit")}</span>
              </div>
              <div>
                <span className="text-gray-600">{t("approveModal.reason")}:</span>
                <p className="mt-1 text-gray-900">{selectedRequest.reason}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("approveModal.approveNotes")}
                </label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder={t("approveModal.approveNotesPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("approveModal.rejectReason")}
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder={t("approveModal.rejectReasonPlaceholder")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("approveModal.close")}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {t("approveModal.reject")}
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {t("approveModal.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Leave Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{t("createModal.title")}</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("createModal.leaveType")} <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.leave_type_id}
                  onChange={(e) => setCreateForm({ ...createForm, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t("createModal.selectLeaveType")}</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.days_per_year} {t("daysUnit")}/year)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("createModal.startDate")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("createModal.endDate")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_half_day}
                    onChange={(e) => setCreateForm({ ...createForm, is_half_day: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{t("createModal.halfDay")}</span>
                </label>

                {createForm.is_half_day && (
                  <select
                    value={createForm.half_day_type}
                    onChange={(e) => setCreateForm({ ...createForm, half_day_type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="MORNING">{t("createModal.morningSession")}</option>
                    <option value="AFTERNOON">{t("createModal.afternoonSession")}</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("createModal.reason")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={t("createModal.reasonPlaceholder")}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                {t("createModal.cancel")}
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={saving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {t("createModal.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeavesPage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>}>
      <LeavesPageContent />
    </Suspense>
  );
}
