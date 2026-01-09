"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  X,
  Clock,
  Calendar,
  CheckCircle,
  Send,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Timer,
  FileText,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  project_id: string;
  project_name: string;
  task_id: string | null;
  task_name: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  overtime_hours: number;
  is_billable: boolean;
  work_type: string | null;
  description: string;
}

interface Timesheet {
  id: string;
  user_id: string;
  user_name: string;
  period_start: string;
  period_end: string;
  period_type: string;
  status: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_billable_hours: number;
  total_non_billable_hours: number;
  submitted_at: string | null;
  entries?: TimesheetEntry[];
}

const STATUSES = [
  { value: "DRAFT", label: "Nháp", color: "bg-gray-100 text-gray-700" },
  { value: "SUBMITTED", label: "Đã gửi", color: "bg-blue-100 text-blue-700" },
  { value: "APPROVED", label: "Đã duyệt", color: "bg-green-100 text-green-700" },
  { value: "REJECTED", label: "Từ chối", color: "bg-red-100 text-red-700" },
];

const WORK_TYPES = [
  { value: "DEVELOPMENT", label: "Phát triển" },
  { value: "MEETING", label: "Họp" },
  { value: "REVIEW", label: "Review" },
  { value: "TESTING", label: "Testing" },
  { value: "DOCUMENTATION", label: "Tài liệu" },
  { value: "SUPPORT", label: "Hỗ trợ" },
  { value: "RESEARCH", label: "Nghiên cứu" },
  { value: "OTHER", label: "Khác" },
];

const DAYS_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const initialFormData = {
  project_id: "",
  project_name: "",
  task_id: "",
  task_name: "",
  work_date: "",
  start_time: "",
  end_time: "",
  hours: 8,
  overtime_hours: 0,
  is_billable: true,
  work_type: "DEVELOPMENT",
  description: "",
};

export default function TimesheetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  // Calculate week dates
  const getWeekDates = useCallback((offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + offset * 7;
    const monday = new Date(today.setDate(diff));
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0].toISOString().split("T")[0];

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: Project[] }>("/project/projects?size=200");
      setProjects(data.items || []);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  const fetchTimesheet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Timesheet>("/project/timesheets/current-week", {
        method: "POST",
      });
      setTimesheet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchTimesheet();
  }, [fetchProjects, fetchTimesheet]);

  const handleCreate = async () => {
    if (!formData.project_id || !formData.work_date || !formData.description) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const selectedProject = projects.find((p) => p.id === formData.project_id);
      await apiFetch("/project/timesheet-entries", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          project_name: selectedProject?.name || "",
          hours: Number(formData.hours),
          overtime_hours: Number(formData.overtime_hours),
        }),
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchTimesheet();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEntry || !formData.project_id || !formData.work_date || !formData.description) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const selectedProject = projects.find((p) => p.id === formData.project_id);
      await apiFetch(`/project/timesheet-entries/${selectedEntry.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          project_name: selectedProject?.name || "",
          hours: Number(formData.hours),
          overtime_hours: Number(formData.overtime_hours),
        }),
      });
      setShowEditModal(false);
      setSelectedEntry(null);
      setFormData(initialFormData);
      fetchTimesheet();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;

    try {
      await apiFetch(`/project/timesheet-entries/${entryId}`, {
        method: "DELETE",
      });
      fetchTimesheet();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const handleSubmit = async () => {
    if (!timesheet) return;

    if (!confirm("Bạn có chắc muốn gửi timesheet này để duyệt?")) return;

    try {
      await apiFetch(`/project/timesheets/${timesheet.id}/submit`, {
        method: "POST",
      });
      fetchTimesheet();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const openCreateModal = (date?: Date) => {
    setFormData({
      ...initialFormData,
      work_date: date?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setFormData({
      project_id: entry.project_id,
      project_name: entry.project_name || "",
      task_id: entry.task_id || "",
      task_name: entry.task_name || "",
      work_date: entry.work_date?.split("T")[0] || "",
      start_time: entry.start_time || "",
      end_time: entry.end_time || "",
      hours: entry.hours,
      overtime_hours: entry.overtime_hours,
      is_billable: entry.is_billable,
      work_type: entry.work_type || "DEVELOPMENT",
      description: entry.description,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const getStatusInfo = (status: string) => {
    return STATUSES.find((s) => s.value === status) || STATUSES[0];
  };

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return timesheet?.entries?.filter((e) => e.work_date?.startsWith(dateStr)) || [];
  };

  const getHoursForDate = (date: Date) => {
    const entries = getEntriesForDate(date);
    return entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${end.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  };

  const canEdit = timesheet?.status === "DRAFT" || timesheet?.status === "REJECTED";
  const statusInfo = timesheet ? getStatusInfo(timesheet.status) : STATUSES[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chấm công</h1>
          <p className="text-gray-500">Ghi nhận thời gian làm việc theo tuần</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTimesheet}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Thêm giờ
              </button>
              {timesheet && timesheet.entries && timesheet.entries.length > 0 && (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  Gửi duyệt
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timesheet?.total_regular_hours?.toFixed(1) || 0}h</p>
              <p className="text-sm text-gray-500">Giờ thường</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Timer className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timesheet?.total_overtime_hours?.toFixed(1) || 0}h</p>
              <p className="text-sm text-gray-500">Giờ OT</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{timesheet?.total_billable_hours?.toFixed(1) || 0}h</p>
              <p className="text-sm text-gray-500">Tính phí</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
              <p className="text-sm text-gray-500 mt-1">Trạng thái</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-4">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="font-medium">{formatWeekRange()}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="ml-2 text-sm text-blue-600 hover:underline"
            >
              Tuần này
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchTimesheet}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Weekly Calendar View */}
      {!error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-gray-100">
              {weekDates.map((date, index) => {
                const entries = getEntriesForDate(date);
                const totalHours = getHoursForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isWeekend = index >= 5;

                return (
                  <div
                    key={date.toISOString()}
                    className={`min-h-[300px] ${isWeekend ? "bg-gray-50" : ""}`}
                  >
                    {/* Day Header */}
                    <div
                      className={`p-3 border-b ${isToday ? "bg-blue-50" : "bg-gray-50"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-gray-600"}`}>
                            {DAYS_OF_WEEK[index]}
                          </p>
                          <p className={`text-lg font-bold ${isToday ? "text-blue-600" : ""}`}>
                            {formatDate(date)}
                          </p>
                        </div>
                        {totalHours > 0 && (
                          <span className={`text-sm font-medium px-2 py-1 rounded ${totalHours >= 8 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {totalHours}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Day Content */}
                    <div className="p-2 space-y-2">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-blue-700 truncate">{entry.project_name}</p>
                              <p className="text-gray-600 text-xs mt-1 line-clamp-2">{entry.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{entry.hours}h</span>
                                {entry.is_billable && (
                                  <span className="text-xs text-green-600">Tính phí</span>
                                )}
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => openEditModal(entry)}
                                  className="p-1 hover:bg-blue-100 rounded"
                                >
                                  <Edit className="w-3 h-3 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="p-1 hover:bg-red-100 rounded"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {canEdit && (
                        <button
                          onClick={() => openCreateModal(date)}
                          className="w-full p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 text-sm flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Thêm
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Thêm giờ làm việc</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dự án *</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn dự án</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày làm việc *</label>
                <input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ thường *</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ OT</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
                  <select
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {WORK_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="is_billable"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="is_billable" className="ml-2 text-sm text-gray-700">
                    Tính phí khách hàng
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả công việc đã thực hiện..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chỉnh sửa giờ làm việc</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dự án *</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn dự án</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày làm việc *</label>
                <input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ thường *</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ OT</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại công việc</label>
                  <select
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {WORK_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="edit_is_billable"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="edit_is_billable" className="ml-2 text-sm text-gray-700">
                    Tính phí khách hàng
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Hủy
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
